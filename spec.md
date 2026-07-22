# Expecta — Product Spec v1.0

> **"Is this safe for my baby?" Answered in 3 seconds, at the shelf.**

Expecta is an iOS app (React Native + Expo) for pregnant and nursing women. Point the camera at a product barcode — medicine, food, skincare — and get a clear, trimester-aware safety verdict with the clinical reasoning behind it.

**Hackathon reality check:** V1 is **fully local**. There is no real backend. Every "network call" is a beautifully faked service layer with simulated latency, streaming analysis states, and a bundled on-device database — indistinguishable from a production app in a demo. The architecture is written so a real backend can be swapped in behind one interface later.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Demo Strategy — Local, But Looks Full-Stack](#2-demo-strategy)
3. [Tech Stack](#3-tech-stack)
4. [Design System — "Lavender Glass"](#4-design-system)
5. [Information Architecture & Screens](#5-screens)
6. [Animation Spec](#6-animation-spec)
7. [Verdict Engine (Local)](#7-verdict-engine)
8. [Data Layer & Fake Backend](#8-data-layer)
9. [Real APIs (Future Integration Map)](#9-real-apis)
10. [Project Structure](#10-project-structure)
11. [Demo Script](#11-demo-script)
12. [Copy, Tone & Legal](#12-copy-tone-legal)
13. [Milestones](#13-milestones)

---

## 1. Product Vision

### The problem
A pregnant woman asks "is this safe?" a dozen times a day. The answer exists — in LactMed, in FDA labels, in teratology databases — but her access runs through Google, forums, and dated blog posts. The first trimester goes to learning which ingredients to research; the rest goes to second-guessing what slipped past.

### The product
- **Scan** a barcode or product label with the camera.
- **Cross-reference** ingredients against pregnancy/lactation safety data.
- **Verdict** in one glance: `Safe` / `Caution` / `Avoid` / `Unknown` — with the *why* one tap away.
- **Stage-aware**: the same ingredient can flip from Caution (1st trimester) to Safe (3rd) to Caution again (nursing). The app knows where she is and adjusts.

### Who it's for
- Primary: pregnant women (weeks 4–40), checking products at the shelf or at home.
- Secondary: nursing mothers, partners doing the shopping, people trying to conceive.

### The one-line demo promise
> She picks up a retinol serum in Sephora, scans it, and in three seconds sees a soft coral "Avoid during pregnancy" card with the exact ingredient highlighted and a plain-English explanation. No Google. No forums. No panic.

---

## 2. Demo Strategy — Local, But Looks Full-Stack {#2-demo-strategy}

This is the core trick of V1 and it must be executed flawlessly.

### Principles
1. **One interface, two implementations.** Every data access goes through `ExpectaAPI` (a TypeScript interface). V1 ships `LocalExpectaAPI`. A future `RemoteExpectaAPI` implements the same contract. Zero UI changes needed later.
2. **Fake the physics of a network, not just the data.** Real backends have latency, jitter, loading states, and occasional slowness. Simulate all of it:
   - Randomized latency per call: `280–900ms` (normal), occasional `1.4s` "slow analysis" (5% of calls) that triggers the extended analyzing animation.
   - A staged "analysis pipeline" that reports progress events: `fetching product → parsing ingredients → cross-referencing databases → generating verdict`. Each stage emits to the UI so the analyzing screen feels like real server work.
3. **Streaming verdict reveal.** The reasoning paragraph "streams in" word-by-word like an LLM response (it's a local string chunked on a timer). This single detail sells "AI backend" harder than anything else.
4. **Seeded demo database.** ~120 hand-curated products across the categories judges will actually have on them or recognize: Tylenol, Advil, ibuprofen, melatonin, a retinol serum, The Ordinary niacinamide, CeraVe, sunscreen (chemical + mineral), prenatal vitamins, Red Bull, kombucha, tuna, soft cheese, deli meat, herbal teas, CBD gummies, hair dye, nail polish, insect repellent (DEET), whitening strips.
5. **Graceful unknown.** Any barcode not in the seed DB gets a designed "We haven't analyzed this yet" state — framed as *coverage expanding* ("Added to our research queue — we'll notify you"), never as failure. Optionally, unknown food barcodes fall through to a live Open Food Facts fetch if network exists (it's free, no key) — a real API sprinkled in makes the fake ones more believable.
6. **Demo mode switch.** Hidden dev toggle (long-press the logo 5×): forces every scan to resolve instantly against the seed DB, pins latency low, and enables a "scan simulator" (pick a product from a list and it plays the full scan → analyze → verdict flow) for when demo lighting kills the camera.

### What we never fake
No fake user counts, no fake reviews, no fake "FDA approved" claims. The fakery is *infrastructure* (backend), not *evidence*. Verdict content is real, hand-curated from real sources (see §9).

---

## 3. Tech Stack {#3-tech-stack}

| Layer | Choice | Why |
|---|---|---|
| Framework | **Expo SDK 54+, React Native, TypeScript (strict)** | iOS 26 Liquid Glass support landed in SDK 54; fastest path to a polished iOS app |
| Navigation | **expo-router** (native stack) + **NativeTabs** | Native tabs give a real system Liquid Glass tab bar for free on iOS 26 |
| Animation | **react-native-reanimated 4** | Worklet-driven 120fps animations, CSS-style transitions, layout animations |
| Advanced graphics | **@shopify/react-native-skia** | Scan beam, aurora mesh-gradient backgrounds, progress rings, particle shimmer |
| Glass | **expo-glass-effect** (`GlassView`, iOS 26+) with **expo-blur** fallback (`BlurView`, iOS < 26) | True `UIVisualEffectView` liquid glass; graceful degrade |
| Camera / barcode | **expo-camera** (`CameraView` with built-in barcode scanning: EAN-13, UPC-A, UPC-E, EAN-8) | No native config pain; barcode events out of the box |
| Haptics | **expo-haptics** | Every meaningful state change gets a haptic signature |
| Gestures | **react-native-gesture-handler** | Sheet drags, swipe-to-dismiss, pull-to-refresh scan history |
| State | **zustand** | Tiny, no boilerplate, works with Reanimated |
| Persistence | **react-native-mmkv** | Scan history, profile, settings — instant, synchronous |
| Fonts | System **SF Pro / SF Pro Rounded** via `expo-font` dynamic weights | Apple-native feel; SF Rounded for numerals & verdict labels |
| Lottie (optional) | **lottie-react-native** | Onboarding illustrations only; everything interactive is Reanimated/Skia |
| Lint/format | ESLint + Prettier, absolute imports via `@/` | Hygiene |

**Non-goals for V1:** Android polish (build must not crash, but iOS is the show), real auth, push notifications (UI affordances only), App Store submission.

---

## 4. Design System — "Lavender Glass" {#4-design-system}

Think: **Apple Health had a baby with a Aesop store.** Calm, clinical-but-warm, enormous whitespace, one accent family (lavender), verdicts as the only other color in the app. Every surface that floats is glass.

### 4.1 Color

**Neutrals (light mode)**
| Token | Hex | Use |
|---|---|---|
| `bg.canvas` | `#FBFAFE` | App background (barely-lavender white) |
| `bg.elevated` | `#FFFFFF` | Cards, sheets |
| `ink.primary` | `#1C1B22` | Headlines, body |
| `ink.secondary` | `#6E6A7C` | Captions, metadata |
| `ink.tertiary` | `#A8A4B8` | Placeholders, disabled |
| `line` | `#ECE9F4` | Hairline dividers (0.5pt) |

**Lavender scale (the brand)**
| Token | Hex | Use |
|---|---|---|
| `lav.50` | `#F6F4FC` | Tinted section backgrounds |
| `lav.100` | `#EDE8FA` | Selected states, chips |
| `lav.200` | `#DCD3F5` | Progress track, borders |
| `lav.300` | `#C3B2EE` | Secondary accents, glows |
| `lav.400` | `#A98FE4` | Icons, links |
| `lav.500` | `#8F6FD8` | **Primary.** Buttons, active tab, scan ring |
| `lav.600` | `#7657BE` | Pressed states |
| `lav.700` | `#5E4399` | Text-on-lavender-tint |
| `lav.glow` | `#B79CFF` @ 35% | Skia glows, aurora, glass tint |

**Verdict colors** (desaturated, calm — never alarm-red)
| Verdict | Base | Tint bg | Notes |
|---|---|---|---|
| Safe | `#4CAF8D` (sage) | `#EAF6F1` | Rounded check icon |
| Caution | `#E0A83C` (honey) | `#FBF3E2` | Rounded warning icon |
| Avoid | `#E2726E` (soft coral — **not** fire-engine red) | `#FBECEB` | Never scary; she's anxious enough |
| Unknown | `#8B87A0` (grey-lavender) | `#F1F0F6` | Question icon, hopeful copy |

**Dark mode:** canvas `#131218`, elevated `#1C1A24`, lavender shifts one step lighter (`lav.400` becomes primary), glass tints at 20% opacity. Dark mode ships in V1 — glass looks *best* in dark.

### 4.2 Liquid Glass rules

Glass is a material, not a gimmick. Rules:

- **What gets glass:** tab bar (system, free), floating scan button, verdict header card while scrolling, camera overlay chrome (top bar, hint pill, controls), modal sheet grabber zones, ingredient "pill" chips over imagery.
- **What never gets glass:** body text surfaces, list rows, forms. Reading happens on solid `bg.elevated`.
- **Implementation:** `GlassView` from `expo-glass-effect` with `tintColor` pulled from `lav.glow`; `isInteractive` on tappable glass (button shimmer + press deformation come free from the system). Capability check → `BlurView` (intensity 40, tint `light`) + 1pt `rgba(255,255,255,0.35)` inner border + lavender gradient overlay at 8% on iOS < 26.
- **Glass over motion:** the analyzing screen puts glass panels over the animated Skia aurora — the refraction of moving color through glass is the single most premium frame in the app. Screenshot this for the deck.
- Never stack glass on glass. Never put glass over pure white (invisible) — every glass surface must have color or imagery behind it.

### 4.3 Typography

SF Pro (text) + SF Pro Rounded (display/numerals/verdict labels).

| Style | Font | Size/Line | Weight | Use |
|---|---|---|---|---|
| `display` | SF Rounded | 34/40 | Bold | Verdict word ("Caution"), week number |
| `title1` | SF Pro | 28/34 | Bold | Screen titles |
| `title2` | SF Pro | 22/28 | Semibold | Card headers, product names |
| `headline` | SF Pro | 17/22 | Semibold | Row titles, buttons |
| `body` | SF Pro | 17/24 | Regular | Reasoning text |
| `callout` | SF Pro | 16/21 | Regular | Secondary body |
| `footnote` | SF Pro | 13/18 | Regular | Metadata, sources |
| `caption` | SF Pro | 12/16 | Medium | Chips, timestamps, tracking +0.3 |

Letter-spacing tightened (−0.4) on display sizes. Line length ≤ ~64ch. Text is `ink.primary` or `ink.secondary` — never pure black.

### 4.4 Space, shape, depth

- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64. Screen gutter: 20. Cards breathe: 20 internal padding minimum.
- **Radii:** chips 100 (full), buttons 16, cards 24, sheets 32 top, scan frame 28 (continuous/squircle curves via Skia where possible).
- **Shadows:** one soft ambient only — `y:8 blur:24 rgba(30,20,60,0.08)`. Depth comes from glass + blur + scale, not from heavy shadows.
- **Icons:** SF Symbols via `expo-symbols`, weight `medium`, hierarchical rendering tinted `lav.500`.

### 4.5 Component inventory

`Button` (primary lavender / glass / ghost) · `VerdictBadge` · `IngredientChip` (tappable, verdict-tinted dot) · `Card` · `GlassPanel` (auto-fallback wrapper) · `Sheet` (detent-based modal) · `ProgressRing` (Skia) · `StreamingText` · `ScanFrame` · `StagePicker` (trimester dial) · `EmptyState` · `Skeleton` (shimmer) · `Toast` (glass pill, top drop-in)

---

## 5. Information Architecture & Screens {#5-screens}

```
Onboarding (first run) → Tabs:
  ● Home ("Today")
  ● Scan  (center, raised glass button → full-screen camera)
  ● History
Modals/pushes: Analyzing → Verdict → Ingredient Detail · Search · Profile/Settings
```

### 5.1 Onboarding (3 screens + stage setup, < 45 seconds)

1. **Hello.** Aurora background (slow Skia mesh gradient in lavenders), app mark floating on glass. "Every product. One clear answer." Fade+rise text entrance.
2. **How it works.** Phone illustration scanning a bottle; a Caution badge blooms out of it. Copy: "Scan anything. We check every ingredient against clinical research."
3. **Stage setup — the emotional beat.** "Where are you in your journey?" Options: `Trying` · `Pregnant` · `Nursing`. Choosing Pregnant reveals a **due-date wheel**; picking a date animates a progress arc filling to the current week and the header morphs to "Week 22 · Second trimester". This personalization moment is when she trusts the app. Haptic `soft` on every wheel tick, `success` notification haptic when confirmed.
4. Camera permission primer (custom glass sheet explaining *why* before the system prompt).

Skippable. No account. No email. Nothing between her and the first scan.

### 5.2 Home — "Today"

- **Header:** "Week 22" in `display` SF Rounded, "Second trimester · 126 days to go", with a thin Skia progress ring around a small avatar/stage glyph. Tapping opens Profile.
- **Hero card:** if she's never scanned → "Scan your first product" card with a subtle looping shimmer on a product-bottle illustration. After scans exist → most recent verdict card.
- **"This week" insight card:** stage-specific tip from local content ("Week 22: baby's taste buds are forming — caffeine crosses the placenta; keep under 200mg/day"). Rotates weekly; feels like a living backend.
- **Recent scans:** horizontal snap-scroll of mini verdict cards (product image placeholder, name, badge).
- **Category shortcuts:** Medicine · Skincare · Food & Drink · Supplements — each opens curated search.
- Pull-to-refresh runs a fake "sync" (glass pill toast: "Database updated · 12 new products" — pulled from the fake network layer, rotating numbers).

### 5.3 Scan (the hero)

Full-screen camera, custom chrome, presented with a fade-through (no default push).

- **Scan frame:** centered rounded rect (72% width), drawn in Skia — four corner arcs, not a full border. A **laser-line sweep** in `lav.glow` runs top→bottom on a 1.8s loop with a soft gradient trail.
- **Idle micro-state:** corners breathe (scale 1.0→1.03, 2.4s ease-in-out loop). Hint pill (glass): "Point at a barcode".
- **Detection:** the instant a barcode lands, the frame corners **snap** to the barcode's bounding box (spring), stroke flips to solid `lav.500`, sweep line stops, haptic `rigid`. Freeze-frame the camera (150ms), then the frame *becomes* the analyzing card via shared-element-style morph.
- **Chrome:** top glass bar (close ×, flash toggle), bottom glass row: `manual search` (magnifier) · shutter-style scan-simulator (demo mode only) · `history` (clock). All glass, all with press-scale.
- **Failure path:** 4s without detection → hint pill swaps to "Try the name instead →" opening Search. Never a dead end.

### 5.4 Analyzing (the theater — 1.5–3s of pure show)

This screen *is* the fake backend, dressed up.

- Background: dimmed frozen camera frame under a heavy blur + lavender aurora bleeding in from edges.
- Center: **glass panel** with the product name (resolved from barcode, appears first) and a Skia **orbital loader** — three thin arcs in `lav.300/400/500` orbiting at different speeds around a pulsing core.
- **Pipeline ticker** beneath, each stage checked off as the fake network emits progress:
  1. `Product identified ✓`
  2. `Reading 14 ingredients ✓`
  3. `Cross-referencing safety databases ✓`  *(logos-free, but names flash in caption: "FDA · LactMed · cosmetics registry")*
  4. `Preparing your verdict…`
- Each tick: haptic `light`, check icon draws itself in (Skia path animation, 220ms).
- Exit: the orbital collapses into the verdict badge color and the whole panel morphs into the verdict header (see transition spec §6.4).

### 5.5 Verdict (the payoff)

A push (not a sheet) — this is a destination.

- **Header block** (tinted `bg` of the verdict color): huge verdict word in SF Rounded (`Caution`), animated icon (check draws / warning pops / coral circle-slash), product name + brand + category chip, and the **stage line**: "for you · Week 22, 2nd trimester". Header condenses into a glass bar on scroll (large-title collapse).
- **Reasoning card:** 2–4 sentence plain-English explanation, **streamed in** word-by-word (§6.5). Sources footnote: "Based on FDA labeling & lactation research". A small "AI-generated summary — verify with your provider" caption.
- **Ingredient breakdown:** every ingredient as a row — name, verdict dot, one-line note. Rows stagger in (40ms cascade). Flagged ingredients auto-sort to top and get tinted backgrounds. Tap → Ingredient Detail sheet.
- **Stage slider (the wow feature):** a horizontal control — `T1 · T2 · T3 · Nursing` — scrubbing it **live-recomputes the verdict**. Watch a coffee flip Safe→Caution as you drag from T3 to T1, colors cross-fading through the whole screen (header tint, badge, flagged rows). This demonstrates trimester-awareness in one gesture and is the demo's money shot.
- **Actions row:** `Save` (bookmark, springs into history tab with a flying-dot animation), `Share` (renders a branded verdict card image via Skia snapshot → share sheet), `Suggest alternative` → shows 1–3 safer products from the same category (seed data).
- **Unknown variant:** grey-lavender header, "We haven't analyzed this yet", a "Notify me when it's ready" button (stores locally, fake-confirms), and the manual ingredient-entry path.

### 5.6 Ingredient Detail (sheet, 60% detent → full)

Ingredient name + aliases (INCI), verdict per stage shown as a 4-segment mini-map (T1/T2/T3/N with colored dots), "What the research says" (2 short paragraphs, local content), "Found in" (other scanned products), evidence-grade chip (`Strong evidence` / `Limited data` / `Expert consensus`).

### 5.7 History

Grouped by day, searchable, filter chips by verdict. Each row: product, badge, time. Swipe-to-delete (row collapses with spring). Top summary card: "23 scans · 17 safe · 4 caution · 2 avoid" with a tiny Skia stacked bar. Empty state: soft illustration + "Your scans live here".

### 5.8 Search

Instant local fuzzy search over seed DB (name, brand, ingredient). Results appear with 80ms stagger. Category browse when empty. Selecting a result skips straight to Analyzing (yes — even manual search gets the theater; consistency sells the backend).

### 5.9 Profile / Settings

Stage editor (same due-date wheel), verdict strictness (`Standard` / `Extra cautious` — shifts Caution thresholds), appearance (auto/light/dark), disclaimers & sources page, hidden dev menu (long-press version number: demo mode, latency sliders, reset).

---

## 6. Animation Spec {#6-animation-spec}

Global rules:
- **Physics, not durations.** Springs everywhere: default `spring(damping 18, stiffness 180, mass 1)` ("calm"); snappy variant `(damping 22, stiffness 320)` for chips/buttons; gentle `(damping 26, stiffness 120)` for sheets.
- Durations only for fades/color: 180ms (micro), 260ms (standard), 420ms (screen) — `Easing.bezier(0.2, 0, 0, 1)`.
- Everything on the UI thread (Reanimated worklets). Target 120fps ProMotion. Zero JS-thread jank during camera.
- **Haptic map:** selection tick = `selection`; button press = `light`; barcode lock = `rigid`; verdict Safe = `success`; Caution = `warning`; Avoid = `error` (single, not repeated); stage-slider detents = `soft`.
- Respect `Reduce Motion`: swap morphs for cross-fades, kill aurora drift, keep streaming text (it's informational pacing, but allow tap-to-complete).

### 6.1 Micro-interactions
- **Press:** scale 0.97 + brightness −4%, spring back on release. Glass buttons additionally get the system interactive shimmer (`isInteractive`).
- **Chips:** selected state pops 1.0→1.06→1.0 with color fill sliding in from the dot.
- **Toast:** drops from top with overshoot, glass pill, auto-dismiss 2.4s with fade+rise.
- **Tab switch:** icon does a tiny squash-and-stretch; active tint cross-fades.

### 6.2 Screen transitions
- Tab → Scan: fade-through black 220ms while camera warms (masks camera init latency — intentional).
- Push transitions: native stack default (iOS spring) — don't fight the platform.
- Sheets: detent-based with rubber-banding; background scales to 0.94 + 24 radius (Apple-style zoom-behind).

### 6.3 Scan screen loops
- Laser sweep: Skia linear gradient bar, translateY loop 1.8s, `easeInOutSine`, opacity feathered at frame edges.
- Corner breathing: scale 1.0↔1.03, 2.4s, staggered 300ms between corners for organic feel.
- Barcode lock-on: corners animate from frame position to detected bounds via spring; stroke color `lav.300`→`lav.500`; sweep opacity→0 in 120ms.

### 6.4 The Morph (Analyzing → Verdict) — signature transition
1. Orbital arcs accelerate 300ms, converge to core.
2. Core flashes white 80ms → dilates into a filled circle of the verdict color (scale spring with overshoot).
3. Circle un-clips into the verdict header block (border-radius 999→0 top, height expands) while the glass panel's product name text *retargets* to its header position (measured layout transition, ~350ms).
4. Verdict word letters rise in with 24ms stagger; icon self-draws.
5. Content cascade: reasoning card, then ingredient rows at 40ms stagger.
Total: ~900ms. One continuous thought — no screen "change" perceptible.

### 6.5 Streaming text
Words appear at 30–45ms intervals (jittered ±10ms), each fading in 120ms with 2px rise. A soft `lav.300` caret pulses at the head. Tap anywhere to complete instantly. (Implementation: pre-split string, `FlatList`-free, single `Text` with animated substring index driven by a worklet timer.)

### 6.6 Stage slider recompute
Drag between detents: verdict colors interpolate live (`interpolateColor` across header tint, badge, flagged rows). On detent settle: `soft` haptic, verdict word cross-fades if changed, changed ingredient rows flip their dot with a 180° Y-rotation.

### 6.7 Ambient
Aurora background (onboarding, analyzing): Skia mesh/radial gradients in `lav.100–glow`, 3 blobs drifting on 8–14s noise loops, 20% saturation ceiling — felt, not seen. Paused when off-screen.

---

## 7. Verdict Engine (Local) {#7-verdict-engine}

Pure TypeScript, no network, fully unit-testable.

### 7.1 Model
```ts
type Stage = 'ttc' | 't1' | 't2' | 't3' | 'nursing';
type Verdict = 'safe' | 'caution' | 'avoid' | 'unknown';

interface IngredientRule {
  id: string;                 // e.g. 'retinol'
  names: string[];            // aliases + INCI: ['retinol','vitamin a','retinyl palmitate']
  verdicts: Record<Stage, Verdict>;
  severity: 1 | 2 | 3;        // tie-breaking weight within a verdict class
  evidence: 'strong' | 'limited' | 'consensus';
  summary: string;            // one-liner for chips/rows
  detail: string;             // 2 short paragraphs for the sheet
  maxSafeDose?: string;       // e.g. '200mg/day' (caffeine)
}

interface Product {
  barcode: string;            // EAN-13/UPC-A
  name: string; brand: string;
  category: 'medicine' | 'skincare' | 'food' | 'supplement' | 'household';
  ingredients: string[];      // raw label order
  imageHint?: string;         // local asset key
  reasoningTemplate?: string; // hand-written verdict prose (preferred over generated)
  alternatives?: string[];    // barcodes of safer picks
}
```

### 7.2 Logic
1. Normalize ingredients (lowercase, strip parentheticals, match against alias table — exact then fuzzy `startsWith`/token match).
2. Each matched ingredient yields a stage-specific verdict. **Product verdict = worst ingredient verdict** (`avoid > caution > safe`), with `unknown` ingredients never *upgrading* a verdict but noted in output.
3. `Extra cautious` mode: `limited`-evidence Safe becomes Caution.
4. ≥40% of ingredients unmatched *and* nothing flagged → product verdict `unknown` (honesty rule — encode medical caution, never overclaim).
5. Output: `{ verdict, flagged: IngredientMatch[], reasoning: string, perStage: Record<Stage, Verdict> }` — `perStage` precomputed so the stage slider scrubs with zero recompute cost.
6. Reasoning: use `reasoningTemplate` when present; else assemble from sentence fragments ("**Retinol** is a form of vitamin A linked to birth defects at high doses; topical use is discouraged throughout pregnancy."). All prose hand-written per rule — this is the "AI", curated.

### 7.3 Seed rule coverage (~60 rules for V1)
- **Medicine:** acetaminophen (safe/all), ibuprofen & NSAIDs (caution T1-T2 → avoid T3), aspirin, pseudoephedrine (caution T1), antihistamines, melatonin (caution), doxylamine (safe).
- **Skincare:** retinoids (avoid preg / caution nursing), high-dose salicylic acid (caution), benzoyl peroxide (safe), hydroquinone (avoid), chemical sunscreen filters — oxybenzone (caution) vs mineral zinc/titanium (safe), essential oils subset, phthalates/parabens (caution), hyaluronic acid, niacinamide, vitamin C (all safe — show off green!).
- **Food/drink:** caffeine (dose-based), alcohol (avoid), high-mercury fish (avoid) vs salmon (safe), unpasteurized dairy (avoid), deli meat (caution), raw sprouts, kombucha (caution), artificial sweeteners (safe/caution split), herbal teas (chamomile caution, ginger safe).
- **Supplements:** vitamin A >10k IU (avoid), folic acid (safe+encouraged), fish oil (safe), CBD (avoid), ashwagandha (avoid).

---

## 8. Data Layer & Fake Backend {#8-data-layer}

```
src/services/
  api/
    ExpectaAPI.ts          // the interface (contract)
    LocalExpectaAPI.ts     // V1: seed DB + verdict engine + FakeNetwork
    RemoteExpectaAPI.ts    // stub, throws NotImplemented — proves the seam
  fakeNetwork/
    FakeNetwork.ts         // latency jitter, progress event emitter, failure injection (off by default)
  db/
    products.seed.json     // ~120 products
    ingredients.rules.json // ~60 rules
    tips.weekly.json       // 40 weeks of insight-card content
```

- `analyze(barcode)` returns an **async iterable of pipeline events** (`identified`, `parsed`, `crossref`, `verdict`) — the analyzing screen just renders the stream. A real backend would emit the same events over SSE/WebSocket; the UI never knows the difference.
- MMKV stores: `profile` (stage, dueDate, strictness), `history` (scan records), `bookmarks`, `settings`.
- Optional live fallthrough: unmatched **food** barcodes → `GET world.openfoodfacts.org/api/v2/product/{barcode}` (free, no key) → run ingredients through the local engine → verdict is real end-to-end for any grocery item on earth. Ship it behind a flag; it's the best "wait, that actually works?" moment.

---

## 9. Real APIs (Future Integration Map) {#9-real-apis}

What the real backend will consume — also our sourcing bibliography for hand-curating V1 content.

### 9.1 The core trio (free, official, no-key — implement first)

**A. openFDA — Drug Labels (Pregnancy & Lactation sections)**
- Endpoint: `https://api.fda.gov/drug/label.json`
- Query pattern: `?search=openfda.brand_name:"tylenol"&limit=1` (or by `openfda.generic_name` / `active_ingredient`)
- Gives us: full text of **Section 8.1 (Pregnancy)** and **Section 8.2 (Lactation)** under the FDA Pregnancy and Lactation Labeling Rule (PLLR), plus warnings and active ingredients. No API key needed at basic rate limits (240 req/min per IP; key bumps it).
- Role: the authoritative source for every medicine verdict.

**B. DailyMed (NIH/NLM) — Official package inserts, 140k+ products**
- Endpoint: `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json`
- Query pattern: `?drug_name=ibuprofen` → SPL set IDs → `/spls/{setid}.json` for the full structured label
- Gives us: exact **active/inactive ingredient breakdowns** and contraindication warnings for pregnant/breastfeeding women, in structured SPL format.
- Role: ingredient-level ground truth when openFDA's label text is ambiguous; covers consumer healthcare products beyond Rx.

**C. Open Food Facts — Barcode → product resolution**
- Endpoint: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Gives us: product name, brand, images, and the **full raw ingredient list string** straight from a camera barcode scan. Free, no key, covers foods + (via sister projects) cosmetics.
- Role: **shipped in V1** behind the live-fallthrough flag (§8) — scan any grocery item, resolve ingredients live, run them through the local verdict engine. Real end-to-end.

### 9.2 Full source map

| Source | What | Access | V1 role / V2 role |
|---|---|---|---|
| **Open Food Facts** | Food products by barcode: ingredients, allergens, additives | Free REST, no key (`world.openfoodfacts.org/api/v2/product/{barcode}.json`) | V1 live fallthrough / V2 primary food resolver |
| **Open Beauty Facts** | Cosmetics by barcode with INCI lists | Free REST, same family | V2 skincare resolver |
| **Open Products Facts** | General products | Free REST | V2 catch-all |
| **openFDA** | Drug labeling: PLLR §8.1/§8.2, adverse events | Free REST (`api.fda.gov/drug/label.json`), key optional | Sourcing for V1 medicine rules / V2 live drug data |
| **DailyMed (NLM)** | Official FDA SPL drug labels, JSON/XML, structured ingredients | Free REST (`dailymed.nlm.nih.gov/dailymed/services/v2/spls.json`) | V2 authoritative drug labels |
| **LactMed (NCBI Bookshelf)** | Drugs & chemicals in lactation — the nursing gold standard | Free (Bookshelf/E-utilities; bulk download) | Sourcing for all nursing verdicts |
| **RxNorm (NLM)** | Drug name normalization (brand↔generic↔ingredient) | Free REST | V2 medicine name resolution |
| **MotherToBaby (OTIS)** | Plain-English exposure fact sheets, clinically reviewed | Content (no API) — cite & link | Source of truth for V1 prose tone |
| **EWG Skin Deep** | Cosmetic ingredient hazard scores (~8.9k ingredients) | No public API — reference only | Cross-check for skincare rules |
| **Go-UPC / UPCitemdb / Barcode Lookup** | Commercial barcode→product (500M+ items) | Paid | V2 coverage backfill for non-food |
| **Claude API (Anthropic)** | Verdict prose generation constrained to retrieved evidence | Paid | V2: the streaming reasoning becomes real |

V2 architecture in one line: barcode → resolver waterfall (OFF/OBF → commercial UPC) → ingredient normalization (RxNorm/INCI) → rules + retrieved evidence (openFDA/DailyMed/LactMed) → Claude composes the cited verdict → cache into the proprietary DB (the moat).

---

## 10. Project Structure {#10-project-structure}

```
expecta/
  app/                      # expo-router
    _layout.tsx             # providers, fonts, theme
    onboarding/
    (tabs)/
      _layout.tsx           # NativeTabs (glass)
      index.tsx             # Home
      history.tsx
    scan.tsx                # full-screen modal
    analyzing.tsx
    verdict/[id].tsx
    ingredient/[id].tsx     # sheet
    search.tsx
    profile.tsx
  src/
    components/  ui/ · scan/ · verdict/ · glass/
    services/    api/ · fakeNetwork/ · db/
    engine/      verdict.ts · normalize.ts · __tests__/
    stores/      profile.ts · history.ts · settings.ts
    theme/       colors.ts · type.ts · spacing.ts · springs.ts · haptics.ts
    hooks/       useAnalysis.ts · useStage.ts · useGlassCapability.ts
  assets/        fonts/ · lottie/ · product-images/
```

**Git workflow:** `main` = always-demoable. Feature branches: `feat/design-system`, `feat/scan`, `feat/verdict`, `feat/engine`, `feat/home`, `feat/onboarding`. PR to main, squash merge. Tag `demo-vX` before every rehearsal.

---

## 11. Demo Script (3 minutes) {#11-demo-script}

1. **Cold open (0:00)** — hand someone a real retinol serum. Open Expecta: Home shows "Week 22". Tap scan.
2. **Scan (0:20)** — laser sweep, lock-on snap + haptic, morph into analyzing. Pipeline ticks. Verdict streams in: **Avoid** — retinol highlighted, plain-English why.
3. **The slider (1:00)** — scrub T1→Nursing: watch the verdict shift live. "Safety isn't binary — it moves with the pregnancy. The app moves with it."
4. **Range (1:30)** — scan Tylenol (green, instant relief moment), then a Red Bull (caution, caffeine dose math shown).
5. **Coverage honesty (2:10)** — scan something obscure → the Unknown state → "added to research queue." (If OFF fallthrough is on: scan any random grocery item live — it *works*.)
6. **Close (2:40)** — History summary card, share-card render, one line on the data moat and subscription.

Backup: demo mode scan-simulator if lighting/camera fails. Rehearse the morph timing — it's the trailer moment.

---

## 12. Copy, Tone & Legal {#12-copy-tone-legal}

- **Voice:** calm nurse, not alarm system. Short sentences. Never "dangerous!!", always "best avoided — here's why." Reassure by default: most scans should end green.
- Second person, present tense: "Safe for you right now."
- **Disclaimer** (persistent, footer of every verdict + onboarding): "Expecta is educational information, not medical advice. Always confirm with your healthcare provider." Non-negotiable, shipped in V1.
- No diagnosis, no dosing instructions beyond published label maximums, no emergency guidance (link out: "Call your provider or Poison Control").

---

## 13. Milestones {#13-milestones}

| # | Milestone | Contents | Definition of done |
|---|---|---|---|
| 0 | **Scaffold** | Expo app, router, tabs, theme tokens, fonts, glass wrapper w/ fallback | Runs on device, glass tab bar visible |
| 1 | **Design system** | All tokens + core components + haptic map + dark mode | Storybook-style gallery screen |
| 2 | **Engine + seed data** | Verdict engine w/ tests, 60 rules, 120 products, tips | `npm test` green; engine returns correct per-stage verdicts |
| 3 | **Scan flow** | Camera, frame animations, barcode lock-on, fake pipeline, analyzing screen | Scan a real Tylenol box → analyzing plays |
| 4 | **Verdict screen** | Morph transition, streaming text, ingredient rows, stage slider, share card | The money shot works end-to-end |
| 5 | **Home + History + Search + Onboarding** | Everything else + empty states | Full app loop with no dead ends |
| 6 | **Polish pass** | 120fps audit, haptic tuning, reduce-motion, dark mode QA, demo mode | 3-min demo runs clean twice in a row |

---

*Built for the hackathon. Designed like it ships tomorrow.* 🪻
