# GATE 7 — AI Art Guide (Google ImageFX)

## How to use ImageFX (step by step)
1. Go to **labs.google/fx/tools/image-fx** and sign in with a Google account (free).
2. Paste a prompt from below into the text box.
3. Find the **aspect ratio** selector (small ratio buttons, e.g. 1:1 / 3:4 / 9:16).
   Pick the ratio listed for that asset. ImageFX does NOT use pixel sizes — ratio is all that matters.
4. Press **Create**. It returns 4 images.
5. Hover the one you like → **download** → it saves as a PNG/JPG.
6. **Rename** it to the exact filename in the tables and drop it in `assets/img/`.

## Two facts about ImageFX
- **No transparency.** Every image has a solid background. That's fine — our art is
  dark, so a "plain dark background" blends into the UI. Do not look for a transparent option.
- **No exact pixels.** Use the aspect ratio given; the game scales/crops to fit.

## Master style — PREPEND to every prompt
```
grim noir illustration, 1980s Eastern-bloc border checkpoint aesthetic,
muted desaturated palette (amber, olive, oxblood, cold grey), heavy film
grain, dramatic single-source lamp light, hand-painted gouache texture,
oppressive bureaucratic mood, serious, NOT cartoonish, cinematic, detailed
```

## Background LOCK — APPEND to every character prompt
This keeps every portrait consistent (same wall, tight framing) instead of a
different full scene each time:
```
tight head-and-shoulders portrait, face fills the frame, subject alone against
a plain weathered dark grey concrete wall, no other people, no background
scenery, single dim lamp from above
```

---

## ESSENTIAL — character portraits  (aspect ratio **3:4**) → `assets/img/<key>.png`
Frame note baked into prompts: "head and shoulders, centered, space above the head"
so the face is never cropped.

| File | Prompt (after master style) |
|---|---|
| `tourist.png` | weary middle-aged traveler, worn coat, clutching a small suitcase, nervous polite smile, head and shoulders, centered, space above the head |
| `worker.png` | tired steelworker, calloused hands, flat cap, soot on collar, stoic exhausted expression, head and shoulders, centered, space above the head |
| `elder.png` | frail old man, thick glasses, threadbare scarf, hopeful pleading eyes, head and shoulders, centered, space above the head |
| `merchant.png` | smug well-fed trader, gold rings, expensive coat, sly knowing grin, faint sweat, head and shoulders, centered, space above the head |
| `refugee.png` | young mother in a headscarf holding a small child, no luggage, desperate but dignified, hollow cheeks, head and shoulders, centered, space above the head |
| `kemal.png` | relaxed fellow border officer in uniform, coffee cup, easy careless grin, head and shoulders, centered, space above the head |
| `stranger.png` | shadowy figure in a grey coat, hat brim hiding the eyes, face half in darkness, menacing calm, head and shoulders, centered, space above the head |
| `student.png` | young anxious student, backpack strap, glasses, first-time-abroad uncertainty, head and shoulders, centered, space above the head |
| `patient.png` | gaunt sick traveler, pale, trembling, holding medical papers, head and shoulders, centered, space above the head |
| `smuggler.png` | shifty traveler in an oversized heavy coat, eyes darting sideways, forced calm, head and shoulders, centered, space above the head |
| `boss.png` | stern senior supervisor in a decorated uniform, cold authoritative stare, head and shoulders, centered, space above the head |
| `family.png` | worried father holding a feverish little girl, both tired, tender and desperate, head and shoulders, centered, space above the head |
| `diplomat.png` | arrogant aristocratic state official, top hat, fur collar, contemptuous smirk, head and shoulders, centered, space above the head |

## ESSENTIAL — app icon  (aspect ratio **1:1**) → `assets/img/icon-512.png`
```
app icon, a worn rubber stamp pressed over a passport, bold, centered,
dark amber background, minimal, flat, iconic
```
> After downloading, save the SAME file twice: once as `icon-512.png` and once as
> `icon-192.png`. The browser handles the rest.

## OPTIONAL — desk background  (aspect ratio **9:16**) → `assets/img/desk-bg.png`
```
first-person view of a cramped border officer's desk at night, rubber stamp,
ink pad, desk lamp, a small sliding window onto a dark queue outside, rain on glass
```

## SKIP for now — documents
The passports/visas are drawn by the game as styled text, so you do NOT need to
generate document images. Skip them.

---

## Wiring art in (I do this once you add the files)
- Portrait: set `portrait: "tourist"` on a scenario in `js/data/scenarios.js`
  (code already loads `assets/img/<portrait>.png`, falling back to the emoji).
- Icons + desk bg: just drop the files in `assets/img/`.
