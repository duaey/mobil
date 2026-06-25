/* ============================================================
   BOOTH — procedural pixel-art checkpoint interior backdrop.
   Draws the city window (sky, skyline, falling snow, pedestrians),
   the wooden booth walls with pigeonhole shelves, and the desk
   ledge. Rendered once to a canvas and used as the desk background;
   the traveler portrait sits in the window cut into the wall.
   ============================================================ */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const W = 180, H = 200;
  let cached = null;

  // window opening (city + where the portrait overlays), in logical px
  const WIN = { x: 46, y: 20, w: 88, h: 104 };

  function build() {
    if (cached) return cached;
    const r = mulberry32(20231103);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

    // ---------- wooden wall ----------
    px(0, 0, W, H, "#3a2c1c");
    for (let y = 0; y < H; y += 1) { // subtle horizontal grain
      if (y % 5 === 0) { px(0, y, W, 1, "#33271a"); }
    }
    // vertical planks
    for (let x = 0; x < W; x += 22) { px(x, 0, 1, H, "#2c2014"); px(x + 1, 0, 1, H, "#43331f"); }

    // ---------- pigeonhole shelves (left & right of window) ----------
    function shelfGrid(ox, oy, cols, rows) {
      const cw = 18, ch = 15;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = ox + i * cw, y = oy + j * ch;
        px(x, y, cw - 2, ch - 2, "#241a10");
        px(x, y, cw - 2, 1, "#4a3823");
        px(x, y, 1, ch - 2, "#4a3823");
        // a paper/object in some cubbies
        if (r() < 0.5) { px(x + 3, y + ch - 7, cw - 8, 4, r() < .5 ? "#cdbf9c" : "#9a8a64"); }
        if (r() < 0.2) { px(x + 4, y + 2, 4, 5, "#7a3a2a"); }
      }
    }
    shelfGrid(2, 22, 2, 6);
    shelfGrid(W - 38, 22, 2, 6);

    // a couple of posters/pennants on the wall
    px(8, 4, 24, 12, "#6a2a24"); px(8, 4, 24, 1, "#9a4438"); px(14, 7, 12, 2, "#d8c060");
    px(W - 30, 4, 22, 12, "#244a3a"); px(W - 27, 7, 16, 2, "#d8c060");

    // ---------- city window ----------
    const { x, y, w, h } = WIN;
    // sky gradient
    for (let i = 0; i < h; i++) {
      const t = i / h;
      g.fillStyle = mix("#9aa0a8", "#5a6068", t);
      g.fillRect(x, y + i, w, 1);
    }
    // distant skyline silhouettes
    let bx = x;
    while (bx < x + w) {
      const bw = 6 + Math.floor(r() * 12);
      const bh = 18 + Math.floor(r() * 40);
      const by = y + h - bh;
      px(bx, by, Math.min(bw, x + w - bx), bh, mix("#3a4048", "#2a3038", r()));
      // lit windows
      for (let wy = by + 3; wy < y + h - 3; wy += 5)
        for (let wx = bx + 2; wx < bx + bw - 2; wx += 4)
          if (r() < 0.35) px(wx, wy, 1, 2, "#d8c87a");
      bx += bw + 1 + Math.floor(r() * 3);
    }
    // ground haze at window base
    px(x, y + h - 6, w, 6, "#4a4e52");
    // tiny pedestrians (dark ticks) on the ground line
    for (let i = 0; i < 6; i++) { const pxp = x + 4 + Math.floor(r() * (w - 8)); px(pxp, y + h - 9, 1, 3, "#20242a"); }
    // falling snow
    for (let i = 0; i < 40; i++) px(x + Math.floor(r() * w), y + Math.floor(r() * h), 1, 1, "rgba(255,255,255,.5)");

    // window frame (metal bars + sill)
    px(x - 3, y - 3, w + 6, 3, "#1c1610");          // top
    px(x - 3, y + h, w + 6, 4, "#2a2014");          // sill
    px(x - 3, y - 3, 3, h + 6, "#1c1610");          // left
    px(x + w, y - 3, 3, h + 6, "#1c1610");          // right
    px(x + Math.floor(w / 2), y, 1, h, "#1c161088"); // center mullion
    px(x, y + Math.floor(h / 2), w, 1, "#1c161088"); // cross bar

    // ---------- desk ledge ----------
    px(0, H - 26, W, 26, "#2a1f14");
    px(0, H - 26, W, 2, "#4a3722");
    px(0, H - 14, W, 1, "#1c140c");
    // a faint inkpad + papers hint on the desk corners
    px(8, H - 20, 16, 10, "#241a10"); px(W - 26, H - 20, 18, 10, "#241a10");

    cached = c.toDataURL("image/png");
    return cached;
  }

  function mix(a, b, t) {
    const pa = hx(a), pb = hx(b);
    const R = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    const G = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    const B = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }
  function hx(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }

  // expose the window rect (as % of the backdrop) so the portrait can be placed in it
  window.BOOTH = {
    build,
    win: { xPct: WIN.x / W, yPct: WIN.y / H, wPct: WIN.w / W, hPct: WIN.h / H },
  };
})();
