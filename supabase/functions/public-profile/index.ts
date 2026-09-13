import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GITHUB_CONTRIBUTIONS = "https://github.com/users";
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanHandle(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^@/, "") : "";
}

async function fetchGitHubCalendar(handle: string) {
  const days: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear() - 2, 0, 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));
  const url = `${GITHUB_CONTRIBUTIONS}/${encodeURIComponent(handle)}/contributions?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
  const response = await fetch(url, { headers: { Accept: "image/svg+xml,text/html;q=0.9,*/*;q=0.8", "User-Agent": "APIVue/1.0" } });
  if (!response.ok) throw new Error(`GitHub contribution calendar returned ${response.status}.`);
  const svg = await response.text();
  const rectPattern = /<rect[^>]*data-date=["'](\d{4}-\d{2}-\d{2})["'][^>]*data-level=["'](\d)["'][^>]*>/g;
  const titlePattern = /<tool-tip[^>]*>\s*([^<]*?)\s*<\/tool-tip>/g;
  let match: RegExpExecArray | null;
  while ((match = rectPattern.exec(svg))) days.push({ date: match[1], count: 0, level: Math.min(4, Number(match[2])) as 0 | 1 | 2 | 3 | 4 });
  if (!days.length) {
    const fallback = /<rect[^>]*data-level=["'](\d)["'][^>]*>/g;
    let i = 0;
    while ((match = fallback.exec(svg)) && i < 1100) { days.push({ date: new Date(from.getTime() + i * 86400000).toISOString().slice(0, 10), count: Number(match[1]) ? Number(match[1]) : 0, level: Math.min(4, Number(match[1])) as 0 | 1 | 2 | 3 | 4 }); i += 1; }
  }
  // GitHub's public SVG exposes level but not always count. Parse the accessible labels when present.
  const labels: number[] = [];
  while ((match = titlePattern.exec(svg))) {
    const countMatch = match[1].match(/(\d[\d,]*) contribution/);
    labels.push(countMatch ? Number(countMatch[1].replace(/,/g, "")) : 0);
  }
  if (labels.length && days.length) days.forEach((day, i) => { if (labels[i] !== undefined) day.count = labels[i]; });
  return { days: days.sort((a, b) => a.date.localeCompare(b.date)), totalContributions: days.reduce((s, d) => s + d.count, 0) };
}

const LEETCODE_QUERY = `query($username:String!) { matchedUser(username:$username) { username profile { realName userAvatar ranking aboutMe countryName reputation } submitStatsGlobal { acSubmissionNum { difficulty count submissions } } languageProblemCount { languageName problemsSolved } submissionCalendar badges { displayName } } userContestRanking { attendedContestsCount rating globalRanking topPercentage } userContestRankingHistory { attended rating ranking contest { title startTime } } allQuestionsCount { difficulty count } }`;

async function fetchLeetCode(handle: string) {
  const response = await fetch(LEETCODE_GRAPHQL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "APIVue/1.0" }, body: JSON.stringify({ query: LEETCODE_QUERY, variables: { username: handle } }) });
  if (!response.ok) throw new Error(`LeetCode request returned ${response.status}.`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0]?.message ?? "LeetCode request failed.");
  if (!payload.data?.matchedUser) throw new Error("LeetCode user not found.");
  return payload.data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json() as { provider?: string; handle?: string };
    const provider = String(body.provider ?? "").toLowerCase();
    const handle = cleanHandle(body.handle);
    if (!handle) return json({ error: "Missing profile handle." }, 400);
    if (provider === "github") return json({ data: await fetchGitHubCalendar(handle) });
    if (provider === "leetcode") return json({ data: await fetchLeetCode(handle) });
    return json({ error: `Unsupported public provider: ${provider}` }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Public profile request failed." }, 502);
  }
});
