# Visual QA — APIVue

Branch `arena/34f1571e-apivue` · commits `4fc8035` (transformation) and `39ee47f` (QA fixes).
PR #6 remains **open and un-merged**. Nothing was deployed or pushed during this pass.

---

## 1. Was real browser verification possible?

**No.** I want to be unambiguous about this, because a "looks good" claim here would be worthless.

The evidence trail, in the order I tried it:

| Attempt | Result |
| --- | --- |
| `npx playwright install chromium` | `Download failure, code=1` (Chrome for Testing 159.0.8154.6, playwright chromium v1255) |
| System browsers (`chromium`, `google-chrome`, `firefox`, `headless_shell`, …) | None on `PATH` |
| `~/.cache/ms-playwright`, `~/.cache/puppeteer` | Empty (a `.links` directory only) |
| `apt-get install libnss3` | `Permission denied` — not root, no `sudo` |
| `@sparticuz/chromium` + `playwright-core` from the npm registry | **Installed successfully**, binary extracted, `--no-sandbox` launch → `error while loading shared libraries: libnspr4.so` |
| Search whole filesystem for `libnss3/libnspr4/libnssutil3` | Not present anywhere |
| `https://deb.debian.org` (to fetch the libs) | `SSL_ERROR_SYSCALL` / empty reply — egress is restricted to the npm and PyPI registries |

So: the browser binary is obtainable, but its **glibc-dependent shared libraries are not**, and I have
no root to install them. Any screenshot would require those libraries. **I did not take a single
screenshot, and no claim below rests on one.**

### What I did instead (all executed, reproducible)

| Verification | How | Result |
| --- | --- | --- |
| App actually boots | `npm run dev` → `startup_wait`, then HTTP GET | 200 on `/`, `/login`, `/signup`, `/forgot-password`, `/dashboard/requests` |
| Every changed module compiles for real | Fetched each through the live Vite dev server | All returned transformed ES modules, no error overlay, no transform errors in the server log |
| Contrast | Parsed `src/index.css` tokens in a test and computed WCAG ratios over the real HSL values | Found failures, fixed them, now asserted permanently (`src/test/design-tokens.test.ts`) |
| Command palette behaviour | `jsdom` + Testing Library: Ctrl/Cmd+K, Escape, filtering all 11 routes, navigation, sign-out | 7 tests pass |
| Sidebar active state | Asserted `data-active` / `aria-current` on the active link only | Passes |
| Auth validation | Blur-gated error, `aria-describedby` resolves to the actual element, trim-on-submit, `aria-pressed` toggle | 5 tests pass |
| Touch reachability | Asserted the class contract on row actions | 3 tests pass |
| Dead CSS classes | Extracted all 1,206 class tokens used in TSX and matched them against the emitted bundle | Only 3 anomalies, **all pre-existing** (see §4) |

**What this cannot tell you:** spacing, actual colour rendering, focus-ring appearance in a real
engine, perceived motion quality, real breakpoint behaviour, or whether the chart tooltip looks right
at 380 px wide. §3 is the checklist for exactly those.

---

## 2. Defects found and fixed

Every item below was found by measurement or by executing the component — not by guessing.

| # | Defect | Severity | Evidence | Fix |
| --- | --- | --- | --- | --- |
| 1 | Light-theme status text failed WCAG AA: `success` **3.44:1**, `warning` **3.02:1**, `info` **3.76:1** against card; on their own 10–15 % tints, 2.73–3.34:1 | High (unreadable status text for low-vision users) | Ratio computed from the tokens | Retuned light `success/warning/info/destructive` and dark `destructive`; each now clears 4.5:1 on a 5–20 % tint |
| 2 | 54 call sites used `emerald-600`/`amber-600`/`sky-600`/`rose-600` in light mode — measured **3.19–4.10:1** on white | High | Same computation, per Tailwind hex | Swapped to the audited semantic tokens |
| 3 | Row delete / history delete / response copy were `opacity-0` + hover-only → **invisible and unusable on touch** | High (functional, mobile) | Class inspection + no hover on touch | Visible by default, hover-hidden only from `sm` up; still focus-revealed on desktop |
| 4 | `.animate-enter-sm` declared *after* `@tailwind utilities` → lost to same-specificity utilities, so inline validation errors never animated | Medium | CSS cascade order in `index.css` | Re-declared after the utilities layer |
| 5 | In-flight response sweep had no gradient inside its own 2 px box — the "Sending request…" affordance rendered as an empty rule | Medium | `.progress-sweep` had `background-image` but no element height/`inset` | Replaced with a translating bar (transform-only, 40 % wide) |
| 6 | `.live-dot` box-shadow pulse had disagreeing keyframes at the loop boundary → visible double-blink | Low | Keyframe comparison | Replaced with an opacity breathe |
| 7 | `aria-describedby="reset-sent"` referenced an id that never existed | Medium (AT) | Referential audit of every `aria-describedby` | The success alert now owns the id |
| 8 | Palette options were announced as "Requests API workspace" (hint text in the accessible name) | Medium (AT) | Test failure exposed it, then inspected the DOM | Hint is `aria-hidden`; names are now just the labels |

Also fixed while verifying: the pinned-star icon lost its `fill` during the colour swap — caught by
checking `fill-warning` existed in the emitted CSS.

### Explicitly not changed

- `col-span-53` in `ProfileAnalyticsKit.tsx` (heatmap uses `grid-flow-col grid-rows-7`; the span is
  inert). Pre-existing, unreachable-by-design value — **identical at base commit `1f31ff6`**.
- `animate-caret-blink` in `ui/input-otp.tsx`: Tailwind keyframes for it live inside the `command`
  plugin set that isn't registered. Pre-existing, and no OTP input is currently rendered.
- Landing page (`LandingPage.tsx` + all `apivue-*` CSS) — untouched by design.

---

## 3. Run it locally — exact steps

```bash
cd APIVue
git checkout arena/34f1571e-apivue      # 39ee47f is the commit under review
npm install                             # node_modules are not committed
npm run dev                             # http://localhost:5173
```

If you want the live HTTP path (request execution against a real echo server) instead of the
mocked one:

```bash
npm run dev:all        # mock API on :8788 + vite, with the dev proxy wired up
```

For the production build exactly as it ships:

```bash
npm run build && npm run preview
```

Two things to know before you click around:

- The preview/prod build needs `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`) to
  sign in. The marketing page and auth *screens* render without them; a session needs them.
- Google Fonts are fetched at runtime. If you are offline, expect system-font fallbacks — that is a
  font-loading difference, not a layout bug.

### Viewports to check

1440×900 (large desktop) · 1280×800 (laptop) · 834×1112 (tablet) · 390×844 (mobile).

DevTools device toolbar is enough; there is no print/PDF surface to check.

---

## 4. Inspection checklist

Record pass/fail per row. Anything failing here is a defect I could not see.

### A. Auth pages — `/login`, `/signup`, `/forgot-password`, `/reset-password`

- [ ] Split panel appears above `lg`; the visual panel is hidden (not squashed) below it.
- [ ] Below `lg`, the form column is full-height, no horizontal scrollbar at 390 px.
- [ ] Tab through the form: focus ring is visible on every control, including the password eye and
      the Google button.
- [ ] Type `not-an-email`, tab away → inline red message appears *below* the field with a small icon,
      and the field's border signals invalid.
- [ ] Correct the address → message disappears immediately, border returns to normal.
- [ ] Password eye toggles text/visibility; icon swaps; focus ring stays on the button.
- [ ] Submit with an empty password → browser-native required state, no layout jump.
- [ ] Submit valid credentials with wrong password → destructive alert appears, animates in once.
- [ ] `/forgot-password`: success alert replaces nothing and sits above the field; button reads
      "Email sent" and is disabled afterwards.
- [ ] `/reset-password` opened without a recovery session → the "only valid from a recovery email"
      card, centred, on the ambient wash.

### B. Dashboard shell — `/dashboard`

- [ ] First load: skeleton blocks match the real card geometry, so **nothing shifts** when data lands.
- [ ] Content fades/rises in sequence (header → signature → metrics → banner → sections), not all at once.
- [ ] Hover a stat card: lifts ~2 px with a slightly deeper shadow; **no** bounce, no scale.
- [ ] Sidebar: click between items — the 2 px violet rail grows in on the new item and shrinks on the old.
- [ ] Sidebar section labels are quiet, 10 px, letter-spaced; active label is brighter than inactive.
- [ ] Numbers in stat cards show real values immediately on load (they must not flash `0`).

### C. Command palette — `⌘K` / `Ctrl+K`, and the header Search button

- [ ] Opens from both. Closes on `Escape` and by clicking the scrim.
- [ ] Focusing moves into the input; typing filters the list live.
- [ ] Arrow keys move the highlight; `Enter` navigates; the palette closes afterwards.
- [ ] All 11 destinations listed under their sidebar groups.
- [ ] Type "goal" → only Goals remains. Type "zzz" → "No matching page or action."
- [ ] "Switch to light mode" flips the theme and closes the palette.
- [ ] "Sign out" ends the session (only test this when you're ready to sign back in).
- [ ] The dialog opens with a short fade/scale, and its scrim is dimmed with a slight blur.

### D. API request workspace — `/dashboard/requests`

- [ ] Method dropdown: monospace, uppercase, letter-spaced; the colour changes per method.
- [ ] URL field looks like an inset well and resolves to a normal field on focus.
- [ ] The Send button shows a `⌘↵` badge above `sm` and hides it below.
- [ ] **Empty state:** "No response yet" with the braces icon, inside a dashed panel.
- [ ] Press `⌘↵` with a valid URL (try `https://api.github.com/users/octocat`):
      the indeterminate sweep bar visibly moves, then the response appears.
- [ ] Response: status pill colour matches the class (2xx green, 3xx cyan, 4xx amber, 5xx red);
      duration and size are monospace with tabular figures.
- [ ] JSON body is **syntax-highlighted** — keys one colour, strings another, numbers, booleans, null.
- [ ] Hover the body → copy button fades in, top-right; click → toast confirms.
- [ ] Headers tab: table of mono key/value rows; row hover tints.
- [ ] Raw tab: status line + headers + body.
- [ ] Send to `https://example.com` → **network error** panel with the CORS explanation (not a status pill).
- [ ] Bad URL like `not a url` → "Invalid request".
- [ ] Params / Headers / Body / Auth tabs switch with a subtle panel fade.
- [ ] Add a header row, delete it (desktop: hover shows the trash; **mobile: trash always visible**).
- [ ] Compact viewport (390 px): no horizontal scroll; saved requests appear as the scrollable strip.

### E. Analytics surfaces — `/dashboard/profiles`, `/dashboard/analytics`, `/dashboard/goals`

- [ ] Cards lift on hover, consistent with the dashboard.
- [ ] Chart: axis labels muted, gridlines horizontal only, area stroke 2 px, hover tooltip dark card
      with rounded corners on a soft shadow.
- [ ] Chart empty state reads "No dated activity returned" — no invented data.
- [ ] Status text (success/warning) is legible in **light** mode on tinted backgrounds — this is the
      specific thing that was broken.

### F. Cross-cutting

- [ ] Dark **and** light theme on every surface above.
- [ ] **Reduced motion on** (macOS: System Settings → Accessibility → Display → Reduce motion;
      Windows: Settings → Accessibility → Visual effects → Animation effects off):
      nothing should move — content appears immediately at full opacity, sweep bar and live dots stop,
      sidebar rail appears without the grow.
- [ ] Keyboard only, no mouse: reach every control; the focus ring is always visible against both the
      page ground and cards.
- [ ] Zoom to 200 % (`Ctrl/Cmd + +`): no clipped text, no overlapping controls on auth and requests.
- [ ] No horizontal scrollbar at 390 px on any surface.
- [ ] Console: no errors on any route. (React Router v7 future-flag notices in dev are expected.)

---

## 5. Gate results at `39ee47f`

```
npx tsc -b                        PASS
npm run typecheck:server          PASS
npx vitest run                    15 files · 129 passed · 13 skipped
npm run build                     PASS · CSS 143.14 kB (gz 23.80) · entry 188.67 kB (gz 50.49)
npm run lint                      0 errors · 19 pre-existing warnings
npm run test:all (mock API)       24 passed
npm run dev                       200 on all five routes; all modules transform cleanly
```

---

## 6. Merge readiness

**Functionally green, visually unconfirmed.** Automated coverage now includes the interactions the
redesign claims (palette, sidebar state, auth validation, response inspector, touch reachability) and
a permanent contrast guard. What has never happened is a human or a browser looking at the rendered
result.

Recommendation: run §3 and walk §4 — it is roughly 20 minutes — then merge. Merging without that
step means shipping spacing, focus-ring rendering and motion timing that no one has actually seen.
