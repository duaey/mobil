/* ============================================================
   PORTRAIT — procedural pixel-art faces (high quality).
   A face is composed from layered parts on a 64x76 pixel grid with
   directional shading (light from upper-right), then scaled up with
   nearest-neighbor for a crisp pixel look. A seeded PRNG makes each
   traveler unique but stable, so card portrait == passport photo.
   ============================================================ */
(function () {
  // ---- seeded PRNG ----
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

  // ---- palettes: [base, shadow, highlight] ----
  const SKINSETS = [
    ["#f3cda8", "#d9ac82", "#fbe0c0"],
    ["#e8b88c", "#cb955f", "#f4cda4"],
    ["#d49a6a", "#b07a48", "#e3b487"],
    ["#bb7f4f", "#965f33", "#cf9a6b"],
    ["#9c6b43", "#794c28", "#b3824f"],
    ["#7a5230", "#5c3a1e", "#946a42"],
    ["#5e3f25", "#452c17", "#774f30"],
    ["#f8dcc0", "#e3bd99", "#ffeeda"],
  ];
  const HAIRSETS = [
    ["#1b1410", "#0e0a07", "#2e231a"], ["#332314", "#1f1610", "#4a3622"],
    ["#4a2f1a", "#311e10", "#6b482a"], ["#6b4423", "#4a2e16", "#8a6238"],
    ["#8a6a3a", "#624a28", "#b08c52"], ["#b89048", "#8c6c34", "#dcb46a"],
    ["#caa24c", "#9c7a34", "#ecca78"], ["#7a2a1a", "#561c10", "#9c4434"],
    ["#3a3a3a", "#222", "#555"], ["#777", "#555", "#9a9a9a"],
    ["#a8a8a8", "#808080", "#cfcfcf"], ["#d8d8d8", "#aeaeae", "#f0f0f0"],
  ];
  const GREYSETS = [["#9a9a9a", "#727272", "#bcbcbc"], ["#bcbcbc", "#909090", "#dcdcdc"], ["#cfcfcf", "#a4a4a4", "#ececec"]];
  const CLOTHSETS = [
    ["#39507a", "#28395a", "#4a648f"], ["#6a3540", "#4a2430", "#854450"],
    ["#356b4a", "#234a33", "#458a60"], ["#7a5a30", "#574020", "#9a7440"],
    ["#4a3a5a", "#352840", "#5f4d72"], ["#2f3640", "#202530", "#414b58"],
    ["#8a4a2a", "#643418", "#a8643a"], ["#444", "#2c2c2c", "#5f5f5f"],
    ["#5a6a3a", "#414f28", "#74854a"],
  ];
  const EYE = ["#3a2a1a", "#2a4458", "#35502f", "#222", "#4a3520", "#5a3a22"];
  const WALL = [["#2b2620", "#211d18"], ["#26241d", "#1c1a14"], ["#2a2622", "#201d1a"], ["#242a2a", "#1a2020"]];
  const HAT = [["#262626", "#171717", "#3a3a3a"], ["#3a2a1a", "#261a10", "#54402a"], ["#1c2a3a", "#121d28", "#2c4358"], ["#4a3a1a", "#332810", "#6a542a"]];

  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function chance(r, p) { return r() < p; }

  const W = 64, H = 76;
  const cache = {};

  function build(seed, opts) {
    const key = seed + "|" + ((opts && opts.gender) || "?") + "|" + ((opts && opts.age) || "");
    if (cache[key]) return cache[key];
    const r = mulberry32(hashSeed(seed));
    const gender = (opts && opts.gender) || (chance(r, 0.5) ? "m" : "f");
    const elder = opts && opts.age === "old";

    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    // horizontal symmetric span helper for face rows
    const row = (y, x0, x1, col) => px(x0, y, x1 - x0, 1, col);

    const skin = pick(r, SKINSETS);
    const cloth = pick(r, CLOTHSETS);
    const wall = pick(r, WALL);
    let hair = elder ? pick(r, GREYSETS) : pick(r, HAIRSETS);
    const eyeCol = pick(r, EYE);
    const [sk, skS, skH] = skin;
    const [cl, clS, clH] = cloth;
    const [hr, hrS, hrH] = hair;

    // ---------- background ----------
    px(0, 0, W, H, wall[1]);
    // soft top-light gradient
    for (let y = 0; y < H; y++) { const f = 1 - y / H; g.fillStyle = mix(wall[0], wall[1], 1 - f); g.fillRect(0, y, W, 1); }
    // gentle rim light upper-right
    g.fillStyle = "rgba(255,235,200,.05)"; g.fillRect(34, 4, 30, 30);

    // ---------- shoulders / clothing ----------
    // rounded shoulders
    px(8, 66, 48, 10, cl);
    px(6, 70, 52, 6, cl);
    px(8, 66, 48, 2, clH);            // top light
    px(8, 73, 52, 3, clS);            // bottom shade
    // collar
    px(24, 64, 16, 6, clS);
    px(26, 64, 12, 2, clH);

    // ---------- neck ----------
    px(27, 56, 10, 10, sk);
    px(27, 56, 10, 3, skS);          // jaw shadow on neck
    px(27, 56, 2, 10, skS);          // left neck shade

    // ---------- head base (oval) ----------
    const headRows = [
      [16, 26, 38], [17, 24, 40], [18, 23, 41], [19, 22, 42], [20, 21, 43],
      [21, 20, 44], [44, 20, 44], [45, 21, 43], [46, 21, 43], [47, 22, 42],
      [48, 23, 41], [49, 24, 40], [50, 25, 39], [51, 26, 38], [52, 28, 36],
    ];
    // fill main block then taper
    px(20, 21, 24, 32, sk);
    headRows.forEach(([y, a, b]) => row(y, a, b, sk));

    // ---------- ears ----------
    px(18, 36, 3, 8, sk); px(43, 36, 3, 8, sk);
    px(18, 38, 2, 5, skS); px(44, 38, 2, 5, skS);

    // ---------- skin shading (light upper-right) ----------
    // left cheek/temple shadow
    px(21, 24, 4, 26, skS);
    px(21, 24, 2, 28, mix(skS, "#000", .15));
    // jaw underside shadow
    px(24, 50, 16, 3, skS);
    // forehead + nose-bridge + right cheek highlight
    px(30, 20, 10, 6, skH);
    px(38, 26, 5, 16, skH);

    // ---------- eyebrows ----------
    const browCol = elder ? mix(hrH, "#888", .4) : hrS;
    const browY = 33 + (gender === "f" ? 0 : 0);
    px(24, browY, 8, 2, browCol); px(32, browY, 8, 2, browCol);
    if (gender === "m") { px(24, browY - 1, 8, 1, browCol); px(32, browY - 1, 8, 1, browCol); }

    // ---------- eye sockets ----------
    px(24, 36, 7, 1, skS); px(33, 36, 7, 1, skS);

    // ---------- eyes ----------
    const eW = 6, eH = 4, eY = 37;
    const eLx = 24, eRx = 34;
    px(eLx, eY, eW, eH, "#f3eee2"); px(eRx, eY, eW, eH, "#f3eee2");
    px(eLx, eY, eW, 1, mix(skS, "#000", .2)); px(eRx, eY, eW, 1, mix(skS, "#000", .2)); // upper lid line
    const gaze = Math.floor(r() * 2);
    px(eLx + 2 + gaze, eY + 1, 2, 3, eyeCol); px(eRx + 1 + gaze, eY + 1, 2, 3, eyeCol);  // iris
    px(eLx + 2 + gaze, eY + 1, 1, 2, "#120c08"); px(eRx + 1 + gaze, eY + 1, 1, 2, "#120c08"); // pupil
    px(eLx + 3 + gaze, eY + 1, 1, 1, "#fff"); px(eRx + 2 + gaze, eY + 1, 1, 1, "#fff");        // catchlight

    // ---------- nose ----------
    px(31, 38, 3, 8, sk);
    px(31, 38, 1, 8, skS);             // left side
    px(33, 39, 1, 6, skH);             // bridge light
    px(30, 45, 5, 2, skS);             // base shadow
    px(30, 46, 1, 1, mix(skS, "#000", .3)); px(34, 46, 1, 1, mix(skS, "#000", .3)); // nostrils

    // ---------- mouth ----------
    const lip = mix(sk, "#9a4038", .7);
    if (gender === "f") {
      px(27, 49, 10, 2, mix(lip, "#b0504a", .5));
      px(28, 51, 8, 1, mix(lip, "#000", .15));
      px(29, 50, 6, 1, mix(lip, "#fff", .25));
    } else {
      px(28, 50, 8, 1, mix(lip, "#000", .1));
      px(28, 49, 8, 1, lip);
      px(29, 51, 6, 1, skS);
    }

    // ---------- facial hair (men) ----------
    if (gender === "m" && !elder ? chance(r, 0.5) : (gender === "m" && chance(r, 0.55))) {
      const bc = elder ? pick(r, GREYSETS)[0] : hrS;
      const bcH = elder ? "#cfcfcf" : hr;
      const style = Math.floor(r() * 4);
      if (style === 0) { px(27, 48, 10, 2, bc); }                          // moustache
      else if (style === 1) { px(29, 52, 6, 4, bc); px(28, 53, 8, 1, bc); } // goatee
      else { // full beard with shading
        px(22, 46, 20, 9, bc); px(22, 46, 20, 1, bcH);
        px(24, 54, 16, 2, mix(bc, "#000", .25));
        px(20, 42, 3, 12, bc); px(41, 42, 3, 12, bc);
        // carve mouth back in
        px(28, 49, 8, 1, lip); px(28, 50, 8, 1, mix(lip, "#000", .1));
      }
    }

    // ---------- hair / hat ----------
    const wearHat = chance(r, gender === "m" ? 0.3 : 0.16);
    if (wearHat) {
      const [hc, hcS, hcH] = pick(r, HAT);
      px(19, 10, 26, 9, hc);
      px(19, 10, 26, 2, hcH);
      px(17, 17, 30, 3, hcS);          // brim
      px(19, 18, 26, 1, mix(hcS, "#000", .3));
    } else {
      const long = gender === "f" ? chance(r, 0.8) : chance(r, 0.12);
      const bald = elder && chance(r, 0.45) && gender === "m";
      if (!bald) {
        // crown volume
        px(20, 12, 24, 9, hr);
        px(20, 12, 24, 3, hrH);        // top highlight
        px(20, 19, 24, 2, hrS);        // under-crown shadow onto forehead
        // sides
        const sideLen = long ? 30 : 12;
        px(19, 18, 3, sideLen, hr); px(42, 18, 3, sideLen, hr);
        px(19, 18, 1, sideLen, hrS); px(44, 18, 1, sideLen, hrH);
        if (long) { px(18, 22, 2, 26, hr); px(44, 22, 2, 26, hr); }
        // fringe style
        const fr = Math.floor(r() * 3);
        if (fr === 0) px(21, 18, 22, 3, hr);
        else if (fr === 1) { px(21, 18, 11, 4, hr); px(40, 18, 4, 3, hr); }
        else { px(33, 18, 11, 4, hr); px(20, 18, 4, 3, hr); }
      } else {
        px(20, 14, 24, 4, hr); px(19, 22, 3, 18, hr); px(42, 22, 3, 18, hr);
      }
    }

    // glasses
    if (chance(r, gender === "m" ? 0.2 : 0.14)) {
      const gl = "#1c1812";
      g.strokeStyle = gl; g.lineWidth = 1.4;
      g.strokeRect(23.5, 36.5, 7, 5); g.strokeRect(33.5, 36.5, 7, 5);
      px(30, 38, 4, 1, gl);
      g.fillStyle = "rgba(200,220,255,.18)"; g.fillRect(24, 37, 6, 2); g.fillRect(34, 37, 6, 2);
    }
    // earrings
    if (gender === "f" && chance(r, 0.4)) { px(19, 43, 1, 2, "#e8c45a"); px(45, 43, 1, 2, "#e8c45a"); }

    // subtle overall vignette
    const vg = g.createRadialGradient(W / 2, 34, 10, W / 2, 40, 46);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.28)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);

    const data = c.toDataURL("image/png");
    cache[key] = data;
    return data;
  }

  // blend two hex colors, t=0 → a, t=1 → b
  function mix(a, b, t) {
    const pa = hx(a), pb = hx(b);
    const R = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    const G = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    const B = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }
  function hx(h) { h = h.replace("#", ""); if (h.length < 6) h = "000000"; return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]; }

  window.PORTRAIT = { build };
})();
