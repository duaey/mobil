/* ============================================================
   PORTRAIT — procedural pixel-art faces.
   Builds a unique traveler face from layered parts (skin, hair,
   eyes, nose, mouth, facial hair, clothes, hat, glasses) driven
   by a seeded PRNG. The same seed always yields the same face, so
   a traveler's card portrait and passport photo match. Hundreds of
   combinations → players almost never see the same person twice.
   ============================================================ */
(function () {
  // ---- seeded PRNG (mulberry32) ----
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- palettes ----
  const SKIN   = ["#f0c9a0", "#e8b48a", "#d99a6c", "#c98a5a", "#a8693f", "#8a5430", "#6e4326", "#f5d6b0"];
  const HAIR   = ["#1c1410", "#2a1c10", "#4a2f1a", "#6b4423", "#8a6a3a", "#b08538", "#cfa14a", "#3a3a3a", "#6a6a6a", "#9a9a9a", "#c9c9c9", "#7a2a1a"];
  const GREY   = ["#9a9a9a", "#b5b5b5", "#cfcfcf", "#888"];
  const CLOTH  = ["#3a4a6a", "#5a3a3a", "#3a5a4a", "#6a5a3a", "#4a3a5a", "#2e3540", "#7a4a2a", "#444", "#5a6a3a", "#6a3a52"];
  const WALL   = ["#2a2620", "#27241d", "#2e2a22", "#242a2a", "#2a2426"];
  const EYE    = ["#3a2a1a", "#2a3a4a", "#3a4a2a", "#2a2a2a", "#4a3a2a"];
  const HATCOL = ["#2a2a2a", "#3a2a1a", "#1c2a3a", "#4a3a1a", "#3a1c1c"];

  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function chance(r, p) { return r() < p; }

  // shade a hex color by a factor (<1 darker, >1 lighter)
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let R = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
    let G = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
    let B = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
    return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }

  const W = 48, H = 60;          // logical pixel grid
  const cache = {};

  function build(seed, opts) {
    const key = seed + "|" + (opts && opts.gender || "?") + "|" + (opts && opts.age || "");
    if (cache[key]) return cache[key];
    const r = mulberry32(hashSeed(seed));
    const gender = (opts && opts.gender) || (chance(r, 0.5) ? "m" : "f");
    const elder = (opts && opts.age === "old");

    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

    // background wall with a soft vignette band
    const wall = pick(r, WALL);
    px(0, 0, W, H, wall);
    px(0, 0, W, 14, shade(wall, 0.82));

    // colors
    const skin = pick(r, SKIN);
    const skinSh = shade(skin, 0.8);
    const cloth = pick(r, CLOTH);
    const clothSh = shade(cloth, 0.78);
    let hair = elder ? pick(r, GREY) : pick(r, HAIR);
    const eyeCol = pick(r, EYE);

    // shoulders / clothing
    px(8, 50, 32, 10, cloth);
    px(8, 50, 32, 2, shade(cloth, 1.15));
    px(8, 56, 32, 4, clothSh);
    // collar
    px(20, 50, 8, 5, shade(cloth, 0.6));

    // neck
    px(21, 44, 6, 8, skinSh);

    // head (rounded rectangle look)
    px(15, 12, 18, 30, skin);
    px(14, 16, 1, 22, skin); px(33, 16, 1, 22, skin);      // side rounding
    px(16, 10, 16, 2, skin);                                 // top
    px(16, 41, 16, 2, shade(skin, 0.9));                     // jaw shade
    // ears
    px(13, 26, 2, 5, skin); px(33, 26, 2, 5, skin);

    // cheeks shading
    px(15, 30, 2, 8, skinSh); px(31, 30, 2, 8, skinSh);

    // ---- eyes ----
    const eyeY = 26;
    px(18, eyeY, 4, 3, "#f4efe6"); px(27, eyeY, 4, 3, "#f4efe6"); // whites
    const look = Math.floor(r() * 2);
    px(19 + look, eyeY, 2, 3, eyeCol); px(28 + look, eyeY, 2, 3, eyeCol); // iris
    // eyebrows
    const brow = elder ? shade(hair, 1.1) : shade(hair, 0.8);
    px(18, eyeY - 2, 4, 1, brow); px(27, eyeY - 2, 4, 1, brow);

    // glasses (sometimes)
    if (chance(r, gender === "m" ? 0.22 : 0.16)) {
      const gl = "#23201a";
      px(17, eyeY - 1, 6, 5, "rgba(0,0,0,0)");
      g.strokeStyle = gl; g.lineWidth = 1;
      g.strokeRect(17.5, eyeY - 0.5, 5, 4); g.strokeRect(26.5, eyeY - 0.5, 5, 4);
      px(22, eyeY + 1, 5, 1, gl);
    }

    // ---- nose ----
    px(23, 30, 2, 6, skinSh);
    px(22, 35, 4, 1, shade(skin, 0.72));

    // ---- mouth ----
    const mouthCol = "#9a4a44";
    if (chance(r, 0.12)) px(21, 39, 6, 1, mouthCol);              // thin line
    else { px(21, 39, 6, 2, mouthCol); px(22, 40, 4, 1, shade(mouthCol, 0.7)); }

    // ---- facial hair (men) ----
    if (gender === "m") {
      const beardCol = elder ? pick(r, GREY) : shade(hair, 0.95);
      const style = Math.floor(r() * 4);
      if (style === 1 || style === 3) px(20, 38, 8, 1, beardCol);          // moustache
      if (style === 2 || style === 3) {                                     // full beard
        px(16, 36, 16, 8, beardCol); px(17, 43, 14, 2, shade(beardCol, 0.8));
        // re-draw mouth over beard
        px(21, 39, 6, 1, mouthCol);
      }
      if (style === 0 && chance(r, 0.4)) px(20, 42, 8, 2, beardCol);        // stubble/goatee
    }

    // ---- hair / hat ----
    const wearHat = chance(r, gender === "m" ? 0.34 : 0.18);
    if (wearHat) {
      const hatc = pick(r, HATCOL);
      px(13, 6, 22, 6, hatc);                 // cap body
      px(12, 11, 24, 2, shade(hatc, 0.7));    // brim
      px(14, 5, 20, 2, shade(hatc, 1.2));     // highlight
    } else {
      const longHair = gender === "f" ? chance(r, 0.75) : chance(r, 0.12);
      // crown
      px(14, 8, 20, 6, hair);
      px(14, 8, 20, 2, shade(hair, 1.2));
      // sides
      px(14, 14, 2, longHair ? 22 : 8, hair);
      px(32, 14, 2, longHair ? 22 : 8, hair);
      if (longHair) { px(13, 16, 2, 20, hair); px(33, 16, 2, 20, hair); }
      // fringe variations
      const fr = Math.floor(r() * 3);
      if (fr === 0) px(15, 13, 18, 2, hair);
      else if (fr === 1) { px(15, 13, 8, 3, hair); }
      else { px(25, 13, 8, 3, hair); }
      if (elder && chance(r, 0.4)) { px(20, 9, 8, 4, wall); } // balding
    }

    // earrings (women, sometimes)
    if (gender === "f" && chance(r, 0.35)) { px(13, 31, 1, 1, "#e8b22e"); px(34, 31, 1, 1, "#e8b22e"); }

    const data = c.toDataURL("image/png");
    cache[key] = data;
    return data;
  }

  window.PORTRAIT = { build };
})();
