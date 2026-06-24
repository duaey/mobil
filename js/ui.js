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

  /* ---------- inspector: interrogation probes + documents ---------- */
  function renderInspector(scenario) {
    const drawer = $("#docs-drawer");
    drawer.innerHTML = "";
    const docs = scenario.documents || [];
    const probes = scenario.probes || [];
    $("#docs-count").textContent = docs.length;

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
    const DOC_EMBLEM = { passport: "🛂", visa: "🎫", permit: "🏭", health: "⚕", vehicle: "🚚" };
    const portraitKey = pickPortrait(scenario) || scenario.portrait;
    docs.forEach((d, i) => {
      const def = DOC_TYPES[d.type];
      if (!def) return;
      const flagged = d.flagged || probeState.flaggedDocs[i];
      const el = document.createElement("div");
      el.className = "doc" + (flagged ? " flagged" : "");
      const emblem = DOC_EMBLEM[d.type] || "📄";
      let html = `<h4><span class="doc-emblem">${emblem}</span> ${t(def.titleKey)}</h4>`;
      // a passport carries the holder's photo
      if (d.type === "passport") {
        const ph = portraitKey
          ? `style="background-image:url(assets/img/${portraitKey}.png)"` : "";
        html += `<div class="doc-photo" ${ph}>${portraitKey ? "" : "👤"}</div>`;
      }
      def.fields.forEach((f) => {
        const label = t(docFieldLabel(f));
        let value = d.data[f] != null ? d.data[f] : "—";
        // override name/id with the card's generated identity when applicable
        if (cardIdentity && value !== "—" && value !== "(none)") {
          if (f === "name") value = cardIdentity.name;
          else if (f === "id") value = cardIdentity.id;
        }
        html += `<div class="row"><span class="k">${label}</span><span class="v">${value}</span></div>`;
      });
      el.innerHTML = html;
      drawer.appendChild(el);
    });
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

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function makeIdentity(scenario) {
    const first = I18N.raw("names.first");
    const last = I18N.raw("names.last");
    if (!Array.isArray(first) || !Array.isArray(last)) return null;
    const country = (scenario.documents || []).map((d) => d.data && d.data.country)
      .find((c) => c && c !== "—") || "Federation";
    const prefix = COUNTRY_PREFIX[country] || "FD";
    const num = String(Math.floor(1000 + Math.random() * 8999));
    return { name: pick(first) + " " + pick(last), id: prefix + "-" + num };
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

    const card = $("#card");
    card.style.transform = "";
    card.style.opacity = "";
    card.className = "card fly-in";

    $("#card-name").textContent = t(scenario.nameKey);
    $("#card-speech").textContent = t(scenario.speechKey);
    const portrait = $("#card-portrait");
    portrait.textContent = scenario.emoji || "👤";
    const portraitKey = pickPortrait(scenario);
    if (portraitKey) {
      portrait.style.backgroundImage = `url(assets/img/${portraitKey}.png)`;
      portrait.textContent = "";
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
    get currentScenario() { return currentScenario; },
  };
})();
