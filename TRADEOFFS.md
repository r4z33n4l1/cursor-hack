# Expecta — Engineering Trade-offs Log

Running log of every non-obvious decision, what we chose, what we gave up, and why.
Newest phases at the bottom. Referenced from spec.md.

---

## Phase 0 — Foundation

### 1. Keep the existing Expo SDK 57 scaffold (vs. re-scaffold on SDK 54 per spec)
- **Chose:** build on the teammate's SDK 57 / RN 0.86 / React 19.2 scaffold already on `main`.
- **Gave up:** the battle-tested SDK 54 baseline the spec assumed; some community libs may lag on RN 0.86.
- **Why:** SDK 57 ships `expo-glass-effect`, NativeTabs, and the React Compiler as first-class citizens — exactly the Liquid Glass stack we want. Re-scaffolding would also throw away a collaborator's commit and invite merge pain. Risk accepted: bleeding-edge APIs (AGENTS.md explicitly says to check the v57 docs before writing code — we do).

### 2. AsyncStorage instead of MMKV
- **Chose:** `@react-native-async-storage/async-storage` for persistence (history, profile, settings).
- **Gave up:** MMKV's synchronous reads and ~30× raw speed.
- **Why:** MMKV requires a native dev build; AsyncStorage works in Expo Go, which keeps the iterate-on-device loop instant during the hackathon. Our data is tiny (a few KB of history/profile), so the perf difference is invisible. The storage access goes through one adapter module, so swapping to MMKV later is a one-file change.

### 3. System fonts (SF Pro / SF Rounded via `ui-rounded`) instead of bundled font files
- **Chose:** the template's `Platform.select` font mapping (`system-ui`, `ui-rounded`).
- **Gave up:** pixel-identical typography on Android/web.
- **Why:** zero font-loading time, zero license questions, and on iOS — the only demo target — `ui-rounded` *is* SF Pro Rounded. Exactly what the spec's type ramp wants.

### 4. Glass strategy: `expo-glass-effect` with `expo-blur` fallback, wrapped once
- **Chose:** a single `Glass` wrapper component; real `GlassView` on iOS 26+, `BlurView` elsewhere.
- **Gave up:** direct use of either lib at call sites.
- **Why:** iOS 26 Liquid Glass is a must-have for the demo, but simulators/older devices need a graceful path. One wrapper means zero conditional logic in screens and one place to tune.

### 5. Skia stays (laser sweep, orbital loader, aurora) — but only where Reanimated can't
- **Chose:** `@shopify/react-native-skia` for canvas-drawn effects only; Reanimated 4 for all layout/transform animation.
- **Gave up:** a single-animation-system codebase.
- **Why:** the scan laser, progress ring, and aurora mesh are draw-calls, not view transforms — Skia is the only way to hit them at 120fps. Everything that *can* be a view transform stays in Reanimated (cheaper, interruptible, gesture-driven).

### 6. Keep the repo flat (app at repo root) — no `apps/` monorepo
- **Chose:** the app lives at the repo root as the teammate laid it out.
- **Gave up:** room for a future real backend package alongside.
- **Why:** hackathon. `npx expo start` from the root, no workspace config, no path re-plumbing. The "backend" is `src/services` by design (spec §Fake Backend), so a package split adds ceremony with zero payoff this week.

---

## Phase 1A — Design System ("Lavender Glass")

### 7. StreamingText renders per-word `Animated.Text` in a wrapping row, not one `<Text>` with a growing substring
- **Chose:** each word is its own animated node (fade + 4px rise, ~38ms cadence with jitter).
- **Gave up:** native text justification/kerning across the paragraph.
- **Why:** iOS can't apply transforms to fragments inside a single `<Text>`; the per-word rise is the whole "LLM streaming" illusion. Mitigated with uniform spacing and matched lineHeight. Tap-to-complete included so demo timing never blocks on the animation.

### 8. `useTheme()` returns two prebuilt frozen Theme objects (light/dark), never built per render
- **Chose:** stable referential identity per scheme.
- **Gave up:** per-component theme overrides.
- **Why:** themes end up in dep arrays and memo comparisons everywhere; a fresh object per render would silently defeat all of it.

### 9. Glass fallback approximates, never imitates
- **Chose:** on non-iOS-26 the `Glass` wrapper is `BlurView` + an 8–14% lavender wash; `tint='clear'` lowers blur to 60% and drops the wash. Hairline borders live in `GlassCard`, not `Glass`.
- **Gave up:** pixel-parity with real Liquid Glass on old devices.
- **Why:** chasing parity with stacked borders/gradients on the base wrapper would force every hint pill and chrome bar into a bordered look. The demo device is iOS 26; the fallback just has to look intentional.

### 10. Haptics are semantic-only (`lockOn`, `verdictSafe`, `tick`…), no raw impact passthrough
- **Chose:** a closed map in `src/lib/haptics.ts`; `verdictUnknown` is a soft impact rather than a notification haptic.
- **Gave up:** ad-hoc flexibility at call sites.
- **Why:** keeps every haptic greppable and on-spec; an error-style buzz on "unknown" would overstate a result whose copy is deliberately hopeful. Haptic fires on press-in (iOS system feel), accepting slight over-fire on cancelled presses.

### 11. Aurora background accepts 3 tiny per-frame allocations
- **Chose:** one shared derived `vec()` per blob feeding both `Circle.c` and `RadialGradient.c`; 3 draw calls total, 22–30s drift loops, `paused` prop for off-screen/Reduce Motion.
- **Gave up:** a zero-allocation Group-transform approach.
- **Why:** the transform approach allocates a transform array per frame anyway, and sharing one point keeps gradient and shape perfectly locked.

---

## Phase 1C — Fake Backend + Stores

### 12. Barcode-seeded jitter (mulberry32) instead of `Math.random` for pipeline cadence
- **Chose:** each product's analyze rhythm is deterministic per barcode, jittered across events.
- **Gave up:** true randomness.
- **Why:** the demo is rehearsed. The same product should feel identical on every run-through, while different products still have organically different rhythms.

### 13. Triangular latency distribution (280–900ms, mode ~400ms)
- **Chose:** two lines of math over a uniform range.
- **Gave up:** nothing meaningful.
- **Why:** real networks cluster near a typical latency with a believable slow tail; uniform delays read as fake.

### 14. Abandonable `sleep` over AbortController-wired timers
- **Chose:** cancelled analyze generators leave a timer that resolves into the void and does nothing.
- **Gave up:** theoretical timer-precision hygiene.
- **Why:** meets the no-leaked-work rule (backing out of a scan does nothing after cancellation) without global timer bookkeeping.

### 15. Demo mode disables live Open Food Facts lookups entirely
- **Chose:** `demoMode` forces the seed-only path; a settings toggle re-enables live lookups for the "it actually works" beat.
- **Gave up:** live-network wow-factor inside the scripted demo.
- **Why:** never gamble on venue Wi-Fi mid-demo. The live call is a deliberate, controlled moment, not a default risk.

### 16. Engine accessed via a lazy runtime bridge during parallel build
- **Chose:** `src/services/engine-bridge.ts` guards `@/engine` access with an honest all-unknown fallback.
- **Gave up:** direct static imports (temporarily).
- **Why:** services and engine were built concurrently by different agents; the bridge let services typecheck standalone. To be collapsed to direct imports at integration.

---

## Phase 2 — The Speed Pivot (full app, one pass)

### 17. Hand-built screens in one pass instead of parallel screen agents
- **Chose:** cut the phase plan; one person (me) wrote shell, tabs, Home, History, Scan, Analyzing, Verdict, Onboarding directly.
- **Gave up:** search screen, profile screen, ingredient form-sheet route, Skia laser (plain Reanimated line instead), the 900ms morph transition (crossfade instead).
- **Why:** the goal shifted to "shows beautiful UI, works now." Every cut item is additive later; nothing structural blocks it.

### 18. Mini-engine (~120 lines) over the spec's full engine module set
- **Chose:** one `src/engine/index.ts`: normalize → whole-token alias match → worst-ingredient-wins per stage → honesty rule. Kept the killed agent's 89 real ingredient rules.
- **Gave up:** separate matcher/verdict/reasoning modules, fuzzy matching, the test harness.
- **Why:** the 89-rule database is the value; the algorithm around it only has to be correct for the seeded labels. Verified by simulation across all 15 seed products × 5 stages — the Advil caution→avoid→safe arc works.

### 19. Benign-filler recognition list inside the engine
- **Chose:** ~55 common excipients (water, glycerin, hypromellose…) count as "recognized, no finding"; fatty alcohols get rewritten so "cetyl alcohol" can never match the drinking-alcohol rule.
- **Gave up:** database purity — fillers live in code, not in the rules JSON.
- **Why:** without it the honesty rule marked Tylenol "unknown" (corn starch isn't in the DB) and nail polish matched "alcohol" via isopropyl alcohol. Both were demo-killing wrong answers.

### 20. Ephemeral scan-session handoff instead of route-param serialization
- **Chose:** a module-level `stashAnalysis`/`takeAnalysis` pair; verdict re-runs the engine locally when opened cold from History.
- **Gave up:** deep-linkable full analysis state.
- **Why:** `AnalysisResult` is too rich for URL params; the engine is deterministic and instant, so recompute-on-open is free.

---

## Tooling — Expo Skills adopted mid-build
- **Chose:** installed the official `expo/skills` set (23 skills) into `.claude/skills/`; all subsequent agents are steered to read the relevant skill references (`expo-router` tabs/sheets/zoom-transitions, `expo-native-ui` animations/visual-effects/icons/media) before writing screen code.
- **Why:** SDK 57 APIs drift from model training data (already bitten once by `glassEffectStyle` naming); Expo's own instructional files are the ground truth and are versioned with the SDK.
