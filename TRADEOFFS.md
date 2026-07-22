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
