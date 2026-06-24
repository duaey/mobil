# GATE 7 — AI Art Prompt Sheet

All assets share ONE master style so the game looks cohesive.
Prepend the **Master Style** block to every prompt.

## Where to generate (free)
- **Google ImageFX** (labs.google/fx/tools/image-fx) — best for noir, free, Imagen 4
- **Leonardo.ai** — free daily credits, best for *consistent* character faces
- **Bing / Copilot Image Creator** (bing.com/images/create) — free DALL·E 3
- **Krea.ai** — free, fast

Export as PNG. Save into `assets/img/` with the exact filename listed.

---

## MASTER STYLE (prepend to everything)
```
grim noir illustration, 1980s Eastern-bloc border checkpoint aesthetic,
muted desaturated palette (amber, olive, oxblood, cold grey), heavy film
grain, dramatic single-source lamp light, hand-painted gouache texture,
oppressive bureaucratic mood, serious tone, NOT cartoonish, cinematic, detailed
```

---

## 1. Character portraits — 400×500 px → `assets/img/<key>.png`

| File | Prompt (after master style) |
|---|---|
| `tourist.png` | weary middle-aged traveler, worn coat, clutching a small suitcase, nervous polite smile, waist-up portrait facing forward, plain dark booth background |
| `worker.png` | tired steelworker, calloused hands, flat cap, soot on collar, stoic exhausted expression |
| `elder.png` | frail old man, thick glasses, threadbare scarf, hopeful pleading eyes |
| `merchant.png` | smug well-fed trader, gold rings, expensive coat, sly knowing grin, faint sweat |
| `refugee.png` | young mother in headscarf holding a child's hand, no luggage, desperate but dignified, hollow cheeks |
| `kemal.png` | relaxed fellow border officer in uniform, coffee cup, easy careless grin, cigarette |
| `stranger.png` | shadowy figure in grey coat, hat brim hiding eyes, face half in darkness, menacing calm |
| `student.png` | young anxious student, backpack, glasses, first-time-abroad uncertainty |
| `patient.png` | gaunt sick traveler, pale, leaning on the counter, trembling hand holding papers |
| `smuggler.png` | shifty traveler with an oversized coat, eyes darting sideways, forced calm |
| `officer_boss.png` | stern senior supervisor in decorated uniform, cold authoritative stare, dim office |

> Tip on Leonardo: lock a "seed" and reuse it to keep the same art style across all portraits.

## 2. Document templates — 800×500 px → `assets/img/doc-<type>.png`

| File | Prompt (after master style) |
|---|---|
| `doc-passport.png` | aged fictional passport inner page, faded official stamps, watermark, empty mugshot frame, monospace serial numbers, coffee stains, invented cyrillic-like script |
| `doc-visa.png` | bureaucratic entry visa form, stamped, perforated edge, invented official seal |
| `doc-permit.png` | work permit card, photo corner, factory letterhead, hole-punched |
| `doc-health.png` | medical clearance certificate, clinic stamp, faint red cross, typewriter text |
| `doc-vehicle.png` | vehicle border pass, cargo manifest table, grease smudges, license plate field |

## 3. Atmosphere & UI

| File | Size | Prompt (after master style) |
|---|---|---|
| `desk-bg.png` | 1080×1920 | first-person view of a cramped border officer's desk at night, rubber stamp, ink pad, desk lamp, small sliding window onto a dark queue outside, rain on glass |
| `icon-512.png` | 512×512 | app icon, worn rubber APPROVED/DENIED stamp crossed over a passport, bold, centered, dark amber background, minimal, flat |
| `icon-192.png` | 192×192 | same as icon-512, simplified |
| `stamp-approve.png` | 300×300 | green ink "APPROVED" rubber stamp mark, slightly smudged, transparent background |
| `stamp-deny.png` | 300×300 | red ink "DENIED" rubber stamp mark, slightly smudged, transparent background |

---

## How to wire art into the game
- Character art: set `portrait: "tourist"` on a scenario object in `js/data/scenarios.js`
  (the code already looks for `assets/img/<portrait>.png`, falling back to the emoji).
- App icons: just drop `icon-192.png` / `icon-512.png` in `assets/img/` (manifest already points there).
