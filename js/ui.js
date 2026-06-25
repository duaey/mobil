/* ============================================================
   UI — rendering + input. Talks to STATE & I18N, emits high-level
   events the game loop (game.js) listens for.
   ============================================================ */
(function () {
  const $ = (sel) => document.querySelector(sel);
  const t = (k, v) => I18N.t(k, v);

  /* ---------- screen switching ---------- */
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("#" + id).classList.add("active");
  }

  /* ---------- in-world date: starts 03 NOV 1987, one day per shift ---------- */
  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  function gameDate(day) {
    const d = new Date(1987, 10, 3); // Nov 3 1987
    d.setDate(d.getDate() + (day - 1));
    const dd = String(d.getDate()).padStart(2, "0");
    return dd + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  /* ---------- meters ---------- */
  function renderMeters() {
    const r = STATE.S.resources;
    document.querySelectorAll(".stat[data-stat]").forEach((el) => {
      const key = el.getAttribute("data-stat");
      const fill = el.querySelector(".meter-fill");
      const valEl = el.querySelector(".stat-value");
      const val = r[key];
      if (fill && fill.style.width !== val + "%") {
        fill.classList.add("flash");
        fill.style.width = val + "%";
        setTimeout(() => fill.classList.remove("flash"), 500);
      }
      if (valEl) valEl.textContent = val;
    });
    $("#hud-day").textContent = STATE.S.day;
    const dateEl = $("#hud-date");
    if (dateEl) dateEl.textContent = gameDate(STATE.S.day);
    $("#hud-queue").textContent = Math.max(0, STATE.quota() - STATE.S.processedToday);
  }

  /* ---------- cross-document verification ----------
     Comparable fields (name, dob, country) that appear on 2+ papers can be
     cross-checked by the player. Some travelers carry a planted discrepancy
     (a forged secondary paper) the player must catch. */
  const COMPARABLE = ["name", "dob", "country"];
  const DOC_EMBLEM = { passport: "🛂", visa: "🎫", permit: "🏭", health: "⚕", vehicle: "🚚" };

  /* ---------- pixelate artwork ----------
     Downsample painterly portraits onto a tiny canvas, then let CSS scale
     them back up with nearest-neighbor — turns illustrations into pixel art. */
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // build a faux machine-readable zone for the passport data page
  function mrz(country, name, id, dob) {
    const fill = (s, n) => (s + "<".repeat(n)).slice(0, n);
    const cc = (String(country).replace(/[^A-Za-z]/g, "").toUpperCase() + "XXX").slice(0, 3);
    const parts = String(name).toUpperCase().replace(/[^A-Z ]/g, "").trim().split(/\s+/);
    const sur = (parts.pop() || "").slice(0, 10);
    const giv = parts.join("<").slice(0, 20);
    const line1 = fill("P<" + cc + sur + "<<" + giv, 44);
    const num = String(id).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const d = String(dob).replace(/[^0-9]/g, "").slice(2, 8) || "000000";
    const line2 = fill(fill(num, 9) + cc + d + "<<<<<<<<<<<<<<", 44);
    return esc(line1) + "<br>" + esc(line2);
  }

  const _pxCache = {};
  function applyPixelBg(el, url, smallW) {
    if (!el) return;
    if (_pxCache[url]) { el.style.backgroundImage = `url(${_pxCache[url]})`; el.textContent = ""; return; }
    const img = new Image();
    img.onload = () => {
      const w = smallW, h = Math.max(1, Math.round(smallW * (img.height / img.width)));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const cx = c.getContext("2d"); cx.imageSmoothingEnabled = false;
      cx.drawImage(img, 0, 0, w, h);
      let data; try { data = c.toDataURL("image/png"); } catch (e) { return; }
      _pxCache[url] = data;
      el.style.backgroundImage = `url(${data})`; el.textContent = "";
    };
    img.onerror = () => {};
    img.src = url;
  }

  let cardDocs = [];          // resolved [{type,def,flagged,fields:[{key,label,value}]}]
  let cardSeed = "";          // PRNG seed for the procedural face
  let cardFaceOpts = {};      // { gender, age } for the procedural face
  let cardDiscrepancy = null; // {kind,docIndex,label,expected,actual} | null
  let compareState = { activeKey: null, found: {} }; // per-card compare interaction

  // generate a plausible "wrong" full name distinct from `avoid`
  function otherName(avoid) {
    const first = firstPool(cardGender); const last = I18N.raw("names.last");
    if (!Array.isArray(first) || !Array.isArray(last)) return "—";
    let n = "—";
    for (let i = 0; i < 8; i++) { n = pick(first) + " " + pick(last); if (n !== avoid) break; }
    return n;
  }
  function shiftDate(s) {
    // nudge a YYYY-MM-DD by a few years/days so it reads as a clerical forgery
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return s;
    const yr = Math.max(1900, +m[1] + (Math.random() < .5 ? -1 : 1) * (1 + Math.floor(Math.random() * 6)));
    return yr + "-" + m[2] + "-" + m[3];
  }

  // build the resolved documents for the current card, applying the generated
  // identity and (optionally) injecting a single catchable discrepancy.
  function buildCardDocs(scenario) {
    cardDocs = []; cardDiscrepancy = null;
    compareState = { activeKey: null, found: {} };
    const docs = scenario.documents || [];
    docs.forEach((d) => {
      const def = DOC_TYPES[d.type];
      if (!def) { cardDocs.push(null); return; }
      const fields = def.fields.map((f) => {
        let value = d.data[f] != null ? d.data[f] : "—";
        if (cardIdentity && value !== "—" && value !== "(none)") {
          if (f === "name") value = cardIdentity.name;
          else if (f === "id") value = cardIdentity.id;
        }
        return { key: f, label: t(docFieldLabel(f)), value };
      });
      cardDocs.push({ type: d.type, def, flagged: !!d.flagged, fields });
    });

    // secondary papers inherit identity fields (name/dob/country) from the
    // passport when their own value is blank — so they can be cross-checked.
    const primary = cardDocs[0];
    if (primary) {
      cardDocs.forEach((dd, i) => {
        if (!dd || i === 0) return;
        COMPARABLE.forEach((key) => {
          const sf = dd.fields.find((x) => x.key === key);
          if (!sf || (sf.value !== "—" && sf.value !== "(none)")) return;
          const pf = primary.fields.find((x) => x.key === key);
          if (pf && pf.value !== "—" && pf.value !== "(none)") sf.value = pf.value;
        });
      });
    }

    // inject a discrepancy onto a secondary paper for eligible travelers
    maybeInjectDiscrepancy(scenario);
  }

  function maybeInjectDiscrepancy(scenario) {
    if (scenario.noDiscrepancy) return;
    // only random-pool travelers get planted forgeries (story beats stay authored)
    const random = scenario.fixedDay == null && !scenario.scripted;
    const chance = scenario.discrepancy === true ? 1 : (random ? 0.32 : 0);
    if (Math.random() >= chance) return;

    // find a comparable field shared by the passport (doc 0) and a later doc
    const primary = cardDocs[0];
    if (!primary) return;
    const candidates = [];
    COMPARABLE.forEach((key) => {
      const pf = primary.fields.find((x) => x.key === key && x.value !== "—" && x.value !== "(none)");
      if (!pf) return;
      for (let i = 1; i < cardDocs.length; i++) {
        const dd = cardDocs[i]; if (!dd) continue;
        const sf = dd.fields.find((x) => x.key === key);
        if (sf && sf.value !== "—" && sf.value !== "(none)") candidates.push({ key, docIndex: i, pf, sf });
      }
    });
    if (!candidates.length) return;
    const c = pick(candidates);
    const expected = c.pf.value;
    const actual = c.key === "name" ? otherName(expected) : shiftDate(expected);
    if (actual === expected) return;
    c.sf.value = actual;
    cardDiscrepancy = { kind: c.key, docIndex: c.docIndex, label: c.pf.label, expected, actual };
  }

  /* ---------- inspector: comparison + interrogation probes + documents ---------- */
  function renderInspector(scenario) {
    const drawer = $("#docs-drawer");
    drawer.innerHTML = "";
    const probes = scenario.probes || [];
    $("#docs-count").textContent = cardDocs.filter(Boolean).length;

    // which comparable fields appear on 2+ papers (so they can be cross-checked)
    const counts = {};
    cardDocs.forEach((d) => { if (!d) return; d.fields.forEach((f) => {
      if (COMPARABLE.includes(f.key) && f.value !== "—" && f.value !== "(none)") counts[f.key] = (counts[f.key] || 0) + 1;
    }); });
    const crossKeys = Object.keys(counts).filter((k) => counts[k] >= 2);

    // verification status bar
    if (crossKeys.length) drawer.appendChild(buildVerifyBar(crossKeys));

    // interrogation probe buttons
    if (probes.length) {
      const bar = document.createElement("div");
      bar.className = "probe-bar";
      probes.forEach((p) => {
        const used = !!probeState.used[p.id];
        const b = document.createElement("button");
        b.className = "probe-btn" + (used ? " used" : "");
        b.textContent = "🔍 " + t(p.labelKey);
        b.disabled = used;
        b.addEventListener("click", () => { if (onProbe) onProbe(p); });
        bar.appendChild(b);
      });
      drawer.appendChild(bar);
    }

    // revealed interrogation findings
    probeState.revealed.forEach((key) => {
      const r = document.createElement("div");
      r.className = "probe-finding";
      r.textContent = t(key);
      drawer.appendChild(r);
    });

    // documents
    const portraitKey = pickPortrait(scenario) || scenario.portrait;
    const activeKey = compareState.activeKey;
    // detect mismatch among the values of the active comparable key
    let mismatchVals = null;
    if (activeKey) {
      const vals = [];
      cardDocs.forEach((d) => { if (!d) return; const f = d.fields.find((x) => x.key === activeKey); if (f && f.value !== "—" && f.value !== "(none)") vals.push(f.value); });
      mismatchVals = new Set(vals).size > 1 ? new Set(vals) : null;
    }

    cardDocs.forEach((d, i) => {
      if (!d) return;
      const flagged = d.flagged || probeState.flaggedDocs[i];
      const el = document.createElement("div");
      el.className = "doc doc-" + d.type + (flagged ? " flagged" : "");
      const emblem = DOC_EMBLEM[d.type] || "📄";

      // field rows (carry the cross-check tap logic)
      let rows = "";
      d.fields.forEach((f) => {
        const cmp = crossKeys.includes(f.key);
        const isActive = activeKey === f.key;
        let cls = "row" + (cmp ? " cmp" : "") + (isActive ? " active" : "");
        if (isActive && mismatchVals && mismatchVals.size > 1) cls += " mismatch";
        const tap = cmp ? ` data-cmp="${f.key}"` : "";
        const badge = cmp ? `<span class="cmp-dot">⇄</span>` : "";
        rows += `<div class="${cls}"${tap}><span class="k">${f.label}${badge}</span><span class="v">${f.value}</span></div>`;
      });

      const country = (d.fields.find((x) => x.key === "country") || {}).value
        || (cardDocs[0] && (cardDocs[0].fields.find((x) => x.key === "country") || {}).value) || "FEDERATION";
      const title = t(d.def.titleKey);

      if (d.type === "passport") {
        const name = (d.fields.find((x) => x.key === "name") || {}).value || "";
        const idv = (d.fields.find((x) => x.key === "id") || {}).value || "";
        const dob = (d.fields.find((x) => x.key === "dob") || {}).value || "";
        el.innerHTML =
          `<div class="doc-head"><span class="doc-emblem">${emblem}</span>` +
          `<div class="doc-head-txt"><span class="doc-country">${esc(country)}</span>` +
          `<span class="doc-kind">${esc(title)}</span></div><span class="doc-seal">★</span></div>` +
          `<div class="doc-main"><div class="doc-photo"></div><div class="doc-fields">${rows}</div></div>` +
          `<div class="doc-mrz">${mrz(country, name, idv, dob)}</div>`;
      } else {
        el.innerHTML =
          `<div class="doc-head"><span class="doc-emblem">${emblem}</span>` +
          `<div class="doc-head-txt"><span class="doc-country">${esc(country)}</span>` +
          `<span class="doc-kind">${esc(title)}</span></div><span class="doc-stamp-seal">OFFICIAL</span></div>` +
          `<div class="doc-fields">${rows}</div>`;
      }
      drawer.appendChild(el);
    });

    // wire comparable-row taps
    drawer.querySelectorAll(".row.cmp").forEach((row) => {
      row.addEventListener("click", () => toggleCompare(row.getAttribute("data-cmp"), scenario));
    });

    // passport photo = the same procedural face as the card portrait
    const photo = drawer.querySelector(".doc-photo");
    if (photo && window.PORTRAIT) {
      photo.style.backgroundImage = `url(${PORTRAIT.build(cardSeed, cardFaceOpts)})`;
      photo.style.backgroundSize = "cover";
      photo.style.backgroundPosition = "center 14%";
      photo.textContent = "";
    }
  }

  function buildVerifyBar(crossKeys) {
    const bar = document.createElement("div");
    bar.className = "verify-bar";
    const active = compareState.activeKey;
    let status = t("verify.hint");
    let cls = "verify-status";
    if (active) {
      const vals = [];
      cardDocs.forEach((d) => { if (!d) return; const f = d.fields.find((x) => x.key === active); if (f && f.value !== "—" && f.value !== "(none)") vals.push(f.value); });
      const mism = new Set(vals).size > 1;
      const label = t(docFieldLabel(active));
      if (mism) { status = "⚠ " + t("verify.mismatch") + ": " + label; cls += " bad"; }
      else { status = "✓ " + t("verify.match") + ": " + label; cls += " ok"; }
    }
    bar.innerHTML = `<span class="${cls}">${status}</span>`;
    return bar;
  }

  // toggle which comparable field is being cross-checked; record catches
  function toggleCompare(key, scenario) {
    compareState.activeKey = compareState.activeKey === key ? null : key;
    if (compareState.activeKey) {
      const vals = [];
      cardDocs.forEach((d) => { if (!d) return; const f = d.fields.find((x) => x.key === key); if (f && f.value !== "—" && f.value !== "(none)") vals.push(f.value); });
      const mism = new Set(vals).size > 1;
      if (mism && !compareState.found[key]) {
        compareState.found[key] = true;
        AUDIO && AUDIO.sfx && AUDIO.sfx("alert");
        toast("⚠ " + t("verify.mismatch") + ": " + t(docFieldLabel(key)), 2200);
      } else {
        AUDIO && AUDIO.sfx && AUDIO.sfx("page");
      }
    }
    renderInspector(scenario);
  }

  // did the player uncover the planted discrepancy? (read by game.js)
  function discrepancyInfo() {
    if (!cardDiscrepancy) return { present: false, found: false };
    return { present: true, found: !!compareState.found[cardDiscrepancy.kind], kind: cardDiscrepancy.kind };
  }

  /* ---------- portrait variant picker ----------
     Each portrait key can have multiple numbered variants (tourist_1, tourist_2...).
     PORTRAIT_VARIANTS maps a key to how many variants exist.
     Add a number here when you drop a new file in assets/img/.
     If a key has 0 or is absent, falls back to the un-numbered file.        */
  const PORTRAIT_VARIANTS = {
    // For now one file each (tourist.png ...). When you add tourist_2.png,
    // bump the number to 2 — the picker will start randomizing.
    tourist:    1,
    worker:     1,
    elder:      1,
    merchant:   1,
    refugee:    1,
    kemal:      1,
    stranger:   1,
    student:    1,
    patient:    1,
    smuggler:   1,
    boss:       1,
    family:     1,
    diplomat:   1,
  };

  function pickPortrait(scenario) {
    const base = scenario.portrait;
    if (!base) return null;
    const count = PORTRAIT_VARIANTS[base] || 0;
    if (count <= 1) return base;               // only one file: use as-is
    const n = Math.floor(Math.random() * count) + 1;
    return base + "_" + n;                     // e.g. "tourist_3"
  }

  /* ---------- random identities ----------
     Story characters keep their authored names; everyone else draws a
     fresh first+last from the per-language pool so the same face/name
     never repeats. ID numbers are generated from the country prefix. */
  const FIXED_NAME_IDS = new Set([
    "d2_refugee", "org_offer_1", "pool_diplomat", "pool_family",
  ]);
  const COUNTRY_PREFIX = { Federation: "FD", Eastmark: "EM", Southreach: "SR" };

  // gender of each portrait's art, so a face never gets a mismatched name.
  // "?" = unknown art → pick at random. Per-scenario `gender` overrides this.
  const PORTRAIT_GENDER = {
    tourist: "f", worker: "m", elder: "m", merchant: "m", refugee: "f",
    kemal: "m", stranger: "m", student: "?", patient: "?", smuggler: "m",
    boss: "m", family: "f", diplomat: "m",
  };
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // pick a first-name pool for a gender, falling back to the combined list
  function firstPool(gender) {
    const g = gender === "f" ? I18N.raw("names.female")
      : gender === "m" ? I18N.raw("names.male") : null;
    return Array.isArray(g) && g.length ? g : I18N.raw("names.first");
  }
  function resolveGender(scenario) {
    let g = scenario.gender || PORTRAIT_GENDER[scenario.portrait] || "?";
    if (g === "?") g = Math.random() < 0.5 ? "m" : "f";
    return g;
  }

  let cardGender = "m";
  function makeIdentity(scenario) {
    cardGender = resolveGender(scenario);
    const first = firstPool(cardGender);
    const last = I18N.raw("names.last");
    if (!Array.isArray(first) || !Array.isArray(last)) return null;
    const country = (scenario.documents || []).map((d) => d.data && d.data.country)
      .find((c) => c && c !== "—") || "Federation";
    const prefix = COUNTRY_PREFIX[country] || "FD";
    const num = String(Math.floor(1000 + Math.random() * 8999));
    return { name: pick(first) + " " + pick(last), id: prefix + "-" + num };
  }

  /* ---------- typewriter voices ----------
     Each character type "speaks" at its own pitch and pace; the text types
     out and a short blip plays as it goes. Tap the speech to skip. */
  const VOICE = {
    elder:    { f: 150, type: "sine",     speed: 52 },
    patient:  { f: 165, type: "sine",     speed: 56 },
    worker:   { f: 200, type: "square",   speed: 30 },
    smuggler: { f: 130, type: "sawtooth", speed: 30 },
    boss:     { f: 110, type: "sawtooth", speed: 38 },
    refugee:  { f: 280, type: "sine",     speed: 40 },
    family:   { f: 300, type: "triangle", speed: 38 },
    student:  { f: 320, type: "square",   speed: 24 },
    tourist:  { f: 240, type: "triangle", speed: 30 },
    merchant: { f: 180, type: "sawtooth", speed: 34 },
    diplomat: { f: 170, type: "sine",     speed: 36 },
    kemal:    { f: 190, type: "square",   speed: 30 },
    stranger: { f: 140, type: "sawtooth", speed: 36 },
    _default: { f: 220, type: "triangle", speed: 32 },
  };
  function voiceFor(scenario) { return VOICE[scenario.portrait] || VOICE[scenario.voice] || VOICE._default; }

  let typeTimer = null;
  let typeDone = null; // call to finish instantly
  function typeSpeech(el, text, profile) {
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
    el.textContent = "";
    el.classList.add("typing");
    let i = 0;
    const finish = () => {
      if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
      el.textContent = text; typeDone = null; el.classList.remove("typing");
    };
    typeDone = finish;
    const tick = () => {
      if (i >= text.length) { typeTimer = null; typeDone = null; el.classList.remove("typing"); return; }
      const ch = text[i++];
      el.textContent += ch;
      if (ch.trim() && window.AUDIO) AUDIO.voice(profile);
      const pause = ",.!?؟،—".includes(ch) ? 170 : 0;
      typeTimer = setTimeout(tick, profile.speed + pause);
    };
    tick();
  }

  /* ---------- card ---------- */
  let currentScenario = null;
  let cardIdentity = null;  // {name,id} for random-name cards
  let onChoice = null;   // callback(outcomeName)
  let onProbe = null;    // callback(probe)
  // transient per-card interrogation state (not persisted)
  let probeState = { used: {}, flaggedDocs: {}, revealed: [] };

  function renderCard(scenario, choiceCb, probeCb) {
    currentScenario = scenario;
    onChoice = choiceCb;
    onProbe = probeCb;
    probeState = { used: {}, flaggedDocs: {}, revealed: [] };
    // give travelers a fresh identity unless they're a story character
    const hasPassport = (scenario.documents || []).some((d) => d.type === "passport" && d.data && d.data.name && d.data.name !== "—");
    cardIdentity = (hasPassport && !FIXED_NAME_IDS.has(scenario.id)) ? makeIdentity(scenario) : null;
    if (!cardIdentity) cardGender = resolveGender(scenario);
    // a stable seed so the card portrait and passport photo are the same face
    cardSeed = cardIdentity ? (cardIdentity.id + "|" + cardIdentity.name) : ("sc:" + scenario.id);
    cardFaceOpts = {
      gender: cardGender,
      age: (scenario.age === "old" || scenario.portrait === "elder" || scenario.portrait === "patient") ? "old" : "",
    };
    buildCardDocs(scenario);

    const card = $("#card");
    card.style.transform = "";
    card.style.opacity = "";
    card.className = "card fly-in";

    $("#card-name").textContent = t(scenario.nameKey);
    const speechEl = $("#card-speech");
    typeSpeech(speechEl, t(scenario.speechKey), voiceFor(scenario));
    const portrait = $("#card-portrait");
    portrait.textContent = "";
    if (window.PORTRAIT) {
      portrait.style.backgroundImage = `url(${PORTRAIT.build(cardSeed, cardFaceOpts)})`;
      portrait.style.backgroundSize = "cover";
      portrait.style.backgroundPosition = "center 18%";
      portrait.style.imageRendering = "pixelated";
    } else {
      portrait.style.backgroundImage = "";
    }

    renderInspector(scenario);
    $("#docs-drawer").classList.remove("open");

    // surface bribe as an extra option via toast prompt button (handled in game.js)
    document.dispatchEvent(new CustomEvent("card:rendered", { detail: scenario }));
  }

  // mark a probe used + flag a document (called by game.js after a probe resolves)
  function applyProbeResult(probe) {
    probeState.used[probe.id] = true;
    if (probe.flagDoc != null) probeState.flaggedDocs[probe.flagDoc] = true;
    if (probe.resultKey) probeState.revealed.push(probe.resultKey);
    if (currentScenario) renderInspector(currentScenario);
  }

  // slam a rubber stamp imprint onto the card before it flies away
  function stampEffect(kind) {
    const card = $("#card");
    if (!card) return;
    const old = card.querySelector(".stamp-imprint");
    if (old) old.remove();
    const s = document.createElement("div");
    s.className = "stamp-imprint " + (kind === "approve" ? "ok" : "no");
    s.textContent = kind === "approve" ? t("game.approved") : t("game.denied");
    card.appendChild(s);
    setTimeout(() => { try { s.remove(); } catch (e) {} }, 900);
  }

  function flyOut(dir, cb) {
    const card = $("#card");
    card.classList.add(dir === "right" ? "fly-right" : "fly-left");
    setTimeout(cb, 380);
  }

  /* ---------- swipe handling ---------- */
  function initSwipe() {
    const card = $("#card");
    let startX = 0, dx = 0, dragging = false;
    const hintL = card.querySelector(".swipe-hint-left");
    const hintR = card.querySelector(".swipe-hint-right");

    const down = (x) => { startX = x; dragging = true; card.style.transition = "none"; };
    const move = (x) => {
      if (!dragging) return;
      dx = x - startX;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
      hintR.style.opacity = dx > 30 ? Math.min(1, dx / 120) : 0;
      hintL.style.opacity = dx < -30 ? Math.min(1, -dx / 120) : 0;
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      card.style.transition = "";
      hintL.style.opacity = 0; hintR.style.opacity = 0;
      const THRESH = 90;
      if (dx > THRESH) choose("approve");
      else if (dx < -THRESH) choose("deny");
      else { card.style.transform = ""; }
      dx = 0;
    };

    card.addEventListener("touchstart", (e) => down(e.touches[0].clientX), { passive: true });
    card.addEventListener("touchmove", (e) => move(e.touches[0].clientX), { passive: true });
    card.addEventListener("touchend", up);
    card.addEventListener("mousedown", (e) => down(e.clientX));
    window.addEventListener("mousemove", (e) => move(e.clientX));
    window.addEventListener("mouseup", up);

    // tap the speech bubble to finish the typewriter instantly
    const speech = card.querySelector(".card-speech");
    if (speech) speech.addEventListener("click", (e) => { e.stopPropagation(); if (typeDone) typeDone(); });
  }

  function choose(name) {
    if (!onChoice || !currentScenario) return;
    const cb = onChoice;
    onChoice = null; // prevent double fire
    cb(name);
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg, ms) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), ms || 2600);
  }

  /* ---------- radio / intro ---------- */
  function renderIntro(day, newsKey, ruleKey) {
    $("#intro-day-num").textContent = day;
    const dateEl = $("#intro-date");
    if (dateEl) dateEl.textContent = gameDate(day);
    $("#radio-news").textContent = t(newsKey);
    $("#intro-rule").textContent = ruleKey ? t(ruleKey) : "";
  }

  /* ---------- day summary ---------- */
  function renderSummary(day, entries, teaseKey) {
    $("#summary-day-num").textContent = day;
    const list = $("#summary-list");
    list.innerHTML = "";
    entries.forEach((e) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${e.label}</span><span class="val">${e.value}</span>`;
      list.appendChild(li);
    });
    $("#summary-tease").textContent = teaseKey ? t(teaseKey) : "";
  }

  /* ---------- rulebook modal ---------- */
  function renderRulebook(day, ruleKey) {
    $("#rules-day").textContent = day;
    const dateEl = $("#rules-date");
    if (dateEl) dateEl.textContent = gameDate(day);
    $("#rules-directive").textContent = ruleKey ? t(ruleKey) : "";
    const list = $("#rules-list");
    list.innerHTML = "";
    // standing rules: rule.book is an array in the locale
    const book = I18N.raw("rule.book");
    const items = Array.isArray(book) ? book : (typeof book === "string" ? [book] : []);
    // fallback if locale not yet updated
    const lines = items.length ? items : [
      "Approve valid papers. Deny the invalid.",
      "Every passport must be unexpired and complete.",
      "Cross-check the photo, name and dates.",
      "Declare all cargo. Undeclared goods are contraband.",
      "Bribes are illegal. Internal Affairs is always watching.",
    ];
    lines.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      list.appendChild(li);
    });
  }

  /* ---------- ending ---------- */
  function renderEnding(titleKey, textKey, epitaph) {
    $("#ending-title").textContent = t(titleKey);
    $("#ending-text").textContent = t(textKey);
    $("#ending-epitaph").textContent = epitaph;
    show("ending-screen");
  }

  window.UI = {
    show, $, renderMeters, renderCard, flyOut, initSwipe, choose,
    toast, renderIntro, renderSummary, renderEnding, renderRulebook, applyProbeResult,
    discrepancyInfo, stampEffect,
    get currentScenario() { return currentScenario; },
  };
})();
