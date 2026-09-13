import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { App } from "npm:octokit@5";

const APP_ID = "4921367";

type RecordValue = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function githubWithInstallation(installationId: number, path: string) {
  const privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY") ?? "";
  if (!privateKey) throw new Error("GitHub App private key is not configured.");
  const app = new App({ appId: APP_ID, privateKey });
  const octokit = await app.getInstallationOctokit(installationId);
  return octokit.request(path, { headers: { "X-GitHub-Api-Version": "2026-03-10" } });
}

function number(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }

function buildAnalytics(user: RecordValue, repos: RecordValue[], events: RecordValue[]) {
  const publicRepos = repos.filter((repo) => repo.private !== true);
  const privateRepos = repos.filter((repo) => repo.private === true);
  const originals = repos.filter((repo) => repo.fork !== true && repo.archived !== true && repo.disabled !== true);
  const stars = originals.reduce((sum, repo) => sum + number(repo.stargazers_count), 0);
  const forks = originals.reduce((sum, repo) => sum + number(repo.forks_count), 0);
  const issues = originals.reduce((sum, repo) => sum + number(repo.open_issues_count), 0);
  const languages = new Map<string, number>();
  const eventTypes = new Map<string, number>();
  const byDay = new Map<string, number>();
  let commits = 0;

  for (const repo of repos) {
    const language = text(repo.language);
    if (language) languages.set(language, (languages.get(language) ?? 0) + 1);
  }
  for (const event of events) {
    const date = text(event.created_at).slice(0, 10);
    if (date) byDay.set(date, (byDay.get(date) ?? 0) + 1);
    const type = text(event.type) || "Other";
    eventTypes.set(type, (eventTypes.get(type) ?? 0) + 1);
    if (type === "PushEvent") {
      const payload = event.payload as RecordValue | undefined;
      const eventCommits = payload && Array.isArray(payload.commits) ? payload.commits.length : number(payload?.size);
      commits += eventCommits;
    }
  }

  const metric = (key: string, label: string, value: number) => ({ key, label, value, format: "number" });
  const breakdown = (key: string, label: string, values: Map<string, number>) => ({
    key,
    label,
    items: Array.from(values, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 10),
  });

  return {
    metrics: [
      metric("repository_total", "Repositories", repos.length),
      metric("public_repository_total", "Public repositories", publicRepos.length),
      metric("private_repository_total", "Private repositories", privateRepos.length),
      metric("stars_total", "Stars", stars),
      metric("forks_total", "Forks", forks),
      metric("open_issues_total", "Open issues", issues),
      metric("followers", "Followers", number(user.followers)),
      metric("following", "Following", number(user.following)),
      metric("public_gists", "Public gists", number(user.public_gists)),
      metric("recent_events", "Recent events", events.length),
      metric("recent_commits", "Recent commits", commits),
      metric("active_days", "Active days", byDay.size),
    ],
    activity: Array.from(byDay, ([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    breakdowns: [
      breakdown("languages", "Languages across repositories", languages),
      breakdown("event_types", "Recent activity types", eventTypes),
      breakdown("visibility", "Repository visibility", new Map([...[publicRepos.length ? [["Public", publicRepos.length]] : []], ...[privateRepos.length ? [["Private", privateRepos.length]] : []]] as Array<[string, number]>)),
    ].filter((item) => item.items.length > 0),
    bio: text(user.bio) || undefined,
    location: text(user.location) || undefined,
    joinedAt: text(user.created_at) || undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing APIVue authorization" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);

  try {
    const { data: profile, error: profileError } = await supabase.from("tracked_profiles").select("id,handle,data").eq("user_id", userData.user.id).eq("platform", "github").order("last_synced_at", { ascending: false }).limit(1).maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return json({ error: "GitHub is not connected. Connect GitHub first." }, 404);

    const current = (profile.data ?? {}) as RecordValue;
    let installationId = typeof current.installationId === "number" ? current.installationId : undefined;
    if (!installationId) {
      const privateKey = Deno.env.get("GITHUB_APP_PRIVATE_KEY") ?? "";
      if (!privateKey) throw new Error("GitHub App private key is not configured.");
      const app = new App({ appId: APP_ID, privateKey });
      const response = await app.octokit.request("GET /users/{username}/installation", { username: profile.handle, headers: { "X-GitHub-Api-Version": "2026-03-10" } });
      installationId = response.data.id;
    }

    const repos: RecordValue[] = [];
    for (let page = 1; page <= 10; page += 1) {
      const response = await githubWithInstallation(installationId, `GET /installation/repositories?per_page=100&page=${page}`);
      const batch = (response.data as { repositories?: unknown[] }).repositories ?? [];
      repos.push(...batch.filter((repo): repo is RecordValue => !!repo && typeof repo === "object"));
      if (batch.length < 100) break;
    }

    const userResponse = await githubWithInstallation(installationId, `GET /users/${encodeURIComponent(profile.handle)}`);
    const githubUser = (userResponse.data ?? {}) as RecordValue;
    let events: RecordValue[] = [];
    try {
      const eventResponse = await githubWithInstallation(installationId, `GET /users/${encodeURIComponent(profile.handle)}/events/public?per_page=100`);
      const rawEvents = (eventResponse.data ?? []) as unknown[];
      events = rawEvents.filter((event): event is RecordValue => !!event && typeof event === "object");
    } catch { events = []; }

    const privateRepos = repos.filter((repo) => repo.private === true);
    const publicRepos = repos.filter((repo) => repo.private !== true);
    const analytics = buildAnalytics(githubUser, repos, events);
    const now = new Date().toISOString();
    const nextData = {
      ...current,
      ...analytics,
      privateAccess: privateRepos.length > 0,
      privateRepoCount: privateRepos.length,
      accessibleRepoCount: repos.length,
      installationId,
      repositories: repos,
      privateRepositories: privateRepos,
      publicRepositories: publicRepos,
      connectedGitHubLogin: profile.handle,
      githubProfile: { followers: number(githubUser.followers), following: number(githubUser.following), public_gists: number(githubUser.public_gists), avatar_url: text(githubUser.avatar_url), html_url: text(githubUser.html_url) },
    };

    const { error: updateError } = await supabase.from("tracked_profiles").update({ data: nextData, sync_error: null, last_synced_at: now }).eq("id", profile.id).eq("user_id", userData.user.id);
    if (updateError) throw updateError;
    const snapshotMetrics = Object.fromEntries(analytics.metrics.filter((item) => typeof item.value === "number").map((item) => [item.key, item.value]));
    const { error: snapshotError } = await supabase.from("profile_snapshots").insert({ profile_id: profile.id, user_id: userData.user.id, metrics: snapshotMetrics });
    if (snapshotError) throw snapshotError;
    return json({ login: profile.handle, syncedAt: now, privateAccess: privateRepos.length > 0, accessibleRepoCount: repos.length, privateRepoCount: privateRepos.length, metrics: analytics.metrics });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "GitHub private sync failed" }, 502);
  }
});
