# APIVue — Ultimate Visual Transformation

**Branch:** `arena/34f1571e-apivue` (based on `1f31ff6`) · **PR #6 stays open and un-merged.** No deploy, no push.
**Date:** 2026-11-19

---

## 0. Honest statement about visual verification

I could not run the app in a browser in this sandbox. `npx playwright install chromium` fails
(`Failed to download Chrome for Testing 159.0.8154.6 (playwright chromium v1255), code=1`), and there is
no system Chromium/Firefox or Puppeteer cache. **No screenshots were produced and nothing in this
document is a claim of visual inspection.**

What *was* verified, mechanically:

| Check | Result |
| --- | --- |
| `npx tsc -b` (strict, project refs) | **PASS**, 0 errors |
| `npm run build` (vite production) | **PASS** — CSS 143.6 kB / gzip 23.8 kB; entry JS 188.59 kB / gzip 50.45 kB |
| `npx vitest run` | **PASS** — 11 files, 110 passed, 13 skipped |
| `npm run lint` | **PASS** — 0 errors, 19 pre-existing `react-refresh`/`exhaustive-deps` warnings |
| Utility existence in emitted CSS | `.stagger-item`, `.route-enter`, `.nav-item`, `.tok-key`, `.progress-track`, `.bg-surface-2`, `.animate-apivue-enter-sm`, `.shadow-elev-lg` all present |
| Class-reference audit | every custom class used in TSX has a definition in a stylesheet |

Everything below is either **(V)** verified by a command above, or **(U)** an unverified design
decision that needs a human look in a browser.

---

## 1. Overall transformation

APIVue had a lot of strong surface-level styling — a full landing page language, a bespoke auth
visual panel, tone-coded platform cards — but the design system underneath it was thin: tokens were
mostly Tailwind defaults, "card" hover meant five different ad-hoc transform/shadow recipes, page
changes had no transition, and skeletons were `animate-pulse` grey blocks of the wrong shape.

The transformation keeps that identity and installs a spine:

* a **four-step surface ladder** (`background → surface-1 → surface-2 → surface-3`) so layering is a
  token decision, not per-component taste;
* a **single motion vocabulary** in CSS (`stagger`, `route-enter`, `nav-item`, `press`, `skeleton`,
  `response-enter`, `progress-sweep`) with one reduced-motion kill switch;
* a **shared elevation scale** (`--elev-1/2/3`) so hovering a card, a dialog and a dropdown all read
  as the same physical model at different heights;
* **monospace discipline** for anything technical — methods, URLs, status codes, timings, sizes,
  headers, JSON, identifiers.

Visual identity: near-black/charcoal grounds, violet primary (`hsl(258 84% 58%)` light /
`hsl(258 90% 68%)` dark), cyan `accent-2` reserved for *data* rather than decoration, status colors
mapped to semantic tokens (`success`/`warning`/`info`/`destructive`). No rainbow gradients, no glow
on every border, no glass on everything.

## 2. New design system

**Tokens** (`src/index.css`, rewritten; all `--apivue-*` landing tokens preserved at the bottom of the
file so the marketing page is untouched):

* `--surface-1|2|3` — raised / inset / well, ~2–3 % lightness apart.
* `--elev-1|2|3` — three shadow recipes, tuned separately for light and dark.
* `--ease-out`, `--ease-in-out`, `--dur-fast/base/slow` — every transition references these.
* `--accent-2` — cyan, used only for data accents (activity, chart secondary series).
* Type: `text-balance` on headings, `text-pretty` on prose, `tabular-nums` for figures.

**Primitives rewritten or refined** (`src/components/ui/`): `button` (new `subtle` variant, `xs` and
`icon-sm` sizes, `active:translate-y-px` press instead of scale), `input`, `textarea` (inset surface,
softer focus ring), `tabs` (shared list chrome; panels now animate), `card` (radius + `shadow-elev`),
`dialog` (blurred scrim, `shadow-elev-lg`), `tooltip`, `skeleton`, `command`.

**Tailwind config** (`tailwind.config.ts`): `surface.{1,2,3}`, `accent-2`, `boxShadow.{elev,elev-md,elev-lg}`,
`transitionTimingFunction.{out,in-out}`, and the `enter-up` / `scale-in` / `shimmer` /
`apivue-enter-sm` animations.

**Reusable classes**: `.surface-lift` (hover elevation for cards), `.surface-inset`, `.focus-ring`,
`.eyebrow`, `.interactive`, `.code-surface`, `.status-{ok,warn,error,info,neutral}`, `.tok-*`
(JSON tokens), `.grid-texture`, `.divider-fade`, `.scrollbar-thin`.

## 3. Animations

CSS-first. No animation dependency was added (`framer-motion`/`motion` was never installed and is not
installed now); only the already-present `tailwindcss-animate` and the stylesheet I wrote.

| Motion | Where | Behaviour |
| --- | --- | --- |
| Route entrance | `DashboardLayout` (`route-enter`, keyed on `pathname`) | 280 ms fade + 6 px rise; no cross-fade, no layout animation |
| Staggered reveal | Overview (`stagger` / `stagger-item`) | 45 ms step, capped at 10 items, 400 ms each |
| Sidebar active state | `AppSidebar` | 2 px primary rail grows in; icon/colour transition 150 ms |
| Button press | `.press` + button base | 1 px translate on `:active`; no scaling, no bounce |
| Card hover | `.surface-lift` | −2 px + `--elev-3` + border tint, 220 ms |
| Dialog | Radix + `animate-in` | fade + 95 % zoom, blurred scrim |
| Command palette | Radix dialog + cmdk | same dialog motion; lazy-loaded chunk |
| Response arrival | `.response-enter` | 320 ms fade/rise once per response |
| In-flight | `.progress-sweep` | indeterminate 2 px sweep — **not** a fake percentage |
| Skeletons | `.skeleton` | shimmer gradient sweep; geometry matches the real layout |
| Number roll | `CountUp` | animates only when the value actually changes (see §5) |

Guardrails: transform/opacity only, ≤ 450 ms, no scroll-jacking, no canvas, no continuous blur. A
blanket `@media (prefers-reduced-motion: reduce)` block in `src/styles/motion.css` collapses every
duration to 0.01 ms **and** pins entrance elements at their final state so nothing is left invisible;
ambient loops (`.live-dot`, sweeps, landing flow) are switched off.

## 4. Components redesigned

* **`AppSidebar`** — section labels tightened to 10 px/0.14em, active item gets a growing rail instead
  of a dot, icons tint to primary only when active. All links, `matchPrefix` logic and the profile
  footer are untouched.
* **`DashboardLayout`** — header keeps its breadcrumb; the placeholder "Search" input (which only
  reacted to Enter) is replaced by **`CommandPalette`** (`src/components/CommandPalette.tsx`):
  real cmdk fuzzy search over all 11 dashboard destinations, plus working *Switch theme* and
  *Sign out* actions. `⌘/Ctrl+K` toggles, `Esc` closes, route changes close it, and it is
  `React.lazy`-loaded so the initial bundle is unchanged (188.59 kB before and after).
* **`KeyValueEditor`** — row headers align to the input grid, fields use inset surfaces that resolve
  to a normal field on focus, delete affordance appears on row hover (and on keyboard focus).
* **`ResponseViewer`** — see §6.
* **`ThemeToggle`, `CountUp`, `TimeRangeChart`, `PublicProfileCard`, skeleton helpers** — retuned to
  the shared vocabulary rather than their own gradients/zooms.

## 5. Dashboard

* Cards use `surface-lift` + `shadow-elev`; the identity header gains a `grid-texture` wash and a
  layered card instead of a flat panel.
* Key metrics: label/icon/value hierarchy unchanged, values are `tabular-nums` and still come only
  from `numericMetrics()`.
* **`CountUp` was fixed to be honest.** It used to seed `display = 0` and animate 0 → value on mount,
  which meant a real number briefly rendered as `0`. It now seeds from the real value, keeps a
  settled-value ref, and returns immediately when `from === value`. Numbers animate **only on a real
  data change** (a refetch that returns different data), and reduced-motion users get the final value
  immediately.
* Charts (`TimeRangeChart`): axis lines removed, ticks muted, tooltip on `--popover` with `--elev-2`,
  2 px stroke, 450 ms ease-out draw. Empty state still says plainly that no dated activity was
  returned — nothing is invented. `GitHubContributionImage` and the rest of the analytics stack are
  untouched apart from radius/blur tokens.
* Loading states: skeletons now mirror the real block sizes, carry `aria-busy` and an `sr-only`
  label, and every `animate-pulse` in the app was replaced with the shared `.skeleton`.

## 6. API workspace

The goal was "looks like a tool someone uses daily", without inventing behaviour.

* **URL bar** sits on `surface-1/30`; method select is monospace, letter-spaced, on `surface-2/60`;
  the URL field is an inset surface so the *editable* thing reads as a well. Send button carries a
  `⌘↵` badge that matches the real global handler in `RequestsView`.
* **Request pane** keeps Params / Headers / Body / Auth, now with the shared tab chrome and counts in
  monospace tabular figures.
* **Response inspector** (rewritten `ResponseViewer.tsx`):
  * status pill via `.status-ok/warn/error/info`, plus mono chips for duration and size;
  * **JSON syntax highlighting** with a hand-written, single-pass tokenizer (`tok-key`,
    `tok-string`, `tok-number`, `tok-boolean`, `tok-null`, `tok-punct`) that renders React spans —
    response bodies can never inject markup;
  * hover copy buttons on the body and raw panes, copy feedback still routed through the existing
    `onCopy` toast;
  * genuinely distinct states: in-flight (indeterminate sweep + "you can cancel"), no-response,
    **HTTP error** (status shown as a normal response), **network error** (CORS explainer), timeout,
    cancelled;
  * headers table with hover rows; "Valid JSON / Not JSON" line with the real content type.
* **Collections, saved requests, environments, local history** are untouched functionally. `statusTone`
  now returns semantic classes, so history rows inherit the same status language.
* Forced-layout rule: the request/response split is still `xl:grid-cols-2` with a scroll-owning
  column, so nothing jumps when a long body arrives. No fake progress bars anywhere.

## 7. Auth UI

* `LoginPage`: inline email validation (only after blur, never blocking a valid submit), `aria-invalid`
  + `aria-describedby` wiring, trimmed email on submit, password toggle with `aria-pressed`, and
  `aria-busy` on the submit button. Confirmation-email notice and "resend" path preserved.
* `SignupPage`: same trim-on-submit; existing live password-strength meter retained.
* `ForgotPasswordPage` / `ResetPasswordPage`: brought onto the same card/elevation/typography
  language, shared ambient wash, 44 px targets, icons moved to a centred transform so they no longer
  drift, and `aria-busy`/`sr-only` on the async states. The recovery-session gate is untouched.
* `auth-experience.css`: the entrance animations were `filter: blur(12px)` on full-height panels —
  replaced with transform+opacity only. Ambient orbs/rings/nodes are now opacity/transform loops
  without `drop-shadow` or ring rotation, and a reduced-motion block neutralises them.
* **Supabase auth flow untouched**: same hooks, same `signIn`/`signUp`/`resetPassword`/`resendConfirmation`
  calls, same redirect logic, same `providers.google` gating, same `next` sanitisation.

## 8. Responsive

No layout rewrites; the existing breakpoints are kept (`lg` sidebar, `xl` request/response split, `sm`
header). What changed is density and tap targets: header 56 px, auth inputs 44–50 px, `icon-sm`
buttons for row actions, key/value header row hidden below `sm` (the inputs are self-labelled by
placeholder + `aria-label`), and grid gaps tightened from `gap-4` to `gap-3` on stat rows so four
cards fit laptop widths without truncation. Untested visually — see §0.

## 9. Performance

| Metric | Before | After |
| --- | --- | --- |
| Entry JS | 188.66 kB / 50.64 kB gzip | **188.59 kB / 50.45 kB gzip** |
| CSS | 136.03 kB / 22.28 kB gzip | **143.60 kB / 23.81 kB gzip** |
| Animation dependency added | — | **none** |
| Command palette | (was inline input) | separate lazy chunk 17.58 kB / 6.44 kB gzip |

The +7.5 kB CSS is the token ladder, motion layer and JSON token styles; it replaced a similar amount
of ad-hoc utility strings. Motion is transform/opacity, no `filter` animations on large surfaces, no
long-lived `will-change` outside hover-only `.surface-lift`, and no new images or fonts.

## 10. Accessibility

* Every icon-only control reached in this pass has an `aria-label`; decorative icons are
  `aria-hidden` (Lighthouse-style check done by hand across the modified files).
* Password visibility toggles expose `aria-pressed`; email fields expose `aria-invalid` +
  `aria-describedby` pointing at the inline error.
* Route changes announce `<span role="status" aria-live="polite">` with the page name.
* Loading regions use `aria-busy` plus `sr-only` text, so screen-reader users are not left with an
  unexplained shimmer.
* Global `:focus-visible` outline in `motion.css` (2 px `--ring`, 2 px offset) applies to anything
  focusable, including the non-`Button` controls in the workspace.
* Command palette is a Radix Dialog: focus trap, `Esc`, restore focus, arrow-key navigation all come
  from the primitives rather than being re-implemented.
* Contrast: body text on `surface-1/2` uses the existing `--muted-foreground`; the copy I added uses
  the same token rather than a new grey. Status text pairs (`-600` on light, `-400` on dark) are
  unchanged from the previous tone map. **Contrast was not measured with a tool** — flagged as
  unverified.

## 11. Files modified

Modified (34): `src/index.css`, `src/main.tsx`, `tailwind.config.ts`, `src/components/auth-experience.css`,
`src/components/{AppSidebar,AuthExperience,DashboardLayout}.tsx`,
`src/components/analytics/TimeRangeChart.tsx`, `src/components/apivue/{CountUp,ProfileBits}.tsx`,
`src/components/ui/{button,card,command,dialog,input,skeleton,tabs,textarea,tooltip}.tsx`,
`src/features/analyze/AnalyzeView.tsx`, `src/features/compare/CompareView.tsx`,
`src/features/explore/{ExploreView.tsx,components/PublicDataOverview.tsx,components/PublicProfileCard.tsx}`,
`src/features/goals/GoalsView.tsx`, `src/features/overview/OverviewView.tsx`,
`src/features/profiles/{ProfilesView,ProfileDetailView,SecurityProfileView}.tsx`,
`src/features/requests/RequestsView.tsx`,
`src/features/requests/components/{KeyValueEditor,ResponseViewer}.tsx`,
`src/pages/{LoginPage,SignupPage,ForgotPasswordPage,ResetPasswordPage}.tsx`.

Added (3): `src/components/CommandPalette.tsx`, `src/styles/motion.css`,
`src/test/requests/response-viewer.test.tsx`.

No Supabase migration, policy, auth setting, data row, or deploy configuration was touched.

## 12. Tests executed and results

```
npx tsc -b                     → PASS (0 errors)
npm run build                  → PASS in 9.32 s (CSS 143.60 kB / gz 23.81 kB; entry 188.59 kB / gz 50.45 kB)
npx vitest run                 → 11 files · 110 passed · 13 skipped
npm run lint                   → 0 errors · 19 warnings (all pre-existing categories)
```

New coverage (`src/test/requests/response-viewer.test.tsx`, 6 tests) asserts the claims made in §6:
status/time/size rendering, that the tokenizer produced `.tok-key/string/number/boolean/null` spans
(and that the JSON text survives intact), that the in-flight state shows **no** fabricated numbers,
that a 404 is rendered as a response while a network failure renders the CORS panel, that non-JSON
bodies are labelled as text, and that "Copy body" hands the formatted JSON to the callback.
The existing 104 expectations were kept as-is and still pass.

## 13. Remaining issues / risks

1. **No browser verification** (see §0). Spacing, focus rings on real browsers, chart tooltip
   alignment at narrow widths, and the reduced-motion sweep are all reasoned-about, not seen.
2. **Contrast not measured.** I kept existing token pairs instead of inventing new greys, but no
   automated audit ran.
3. `.grid-texture`, `.divider-fade`, `.surface-inset`, `.text-gradient` are defined and only partially
   used; they are cheap (utility CSS) but not load-bearing yet.
4. `tsconfig.app.tsbuildinfo` is dirty again after the builds (tracked file, pre-existing behaviour);
   revert with `git checkout 1f31ff6 -- tsconfig.app.tsbuildinfo` before committing if the diff should
   stay clean.
5. The command palette uses `cmdk` via the existing `ui/command.tsx`; its inline `cmdk-*` utility soup
   was left mostly intact, so that one component's styling is less systematised than the rest.
6. `src/features/explore/*` and `SecurityProfileView` were only retuned (radius/blur), not redesigned;
   they still carry some older gradient/badge styling.
7. Landing page (`LandingPage.tsx`, `apivue-*` CSS) intentionally untouched.

## 14. Before / after

**Not available.** Screenshots require a working browser, and installing one in this sandbox fails
(§0). To review the change visually: `npm run dev`, then compare on these ten surfaces —
`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/dashboard`, `/dashboard/requests`
(empty / in-flight / 200 / 404 / network error), `/dashboard/profiles`, `/dashboard/analytics`,
`/dashboard/goals`, and `⌘K` — in dark and light, and once with "reduce motion" enabled in the OS.

---

### Separation of verified vs assumed

**Verified by command:** typecheck, build, bundle sizes, test suite (110 passing incl. 6 new),
lint (0 errors), existence of every CSS utility the new components reference, and that no
`animate-pulse` remains.

**Assumed, needs a human look:** visual hierarchy and spacing at each breakpoint, focus-ring
appearance, contrast ratios, chart tooltip rendering, palette keyboard feel, and the actual perceived
quality of the motion timing.
