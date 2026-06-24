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

  /* ---------- meters ---------- */
  function renderMeters() {
    const r = STATE.S.resources;
    document.querySelectorAll(".stat").forEach((el) => {
      const key = el.getAttribute("data-stat");
      const fill = el.querySelector(".meter-fill");
      const val = r[key];
      if (fill.style.width !== val + "%") fill.classList.add("flash");
      fill.style.width = val + "%";
      setTimeout(() => fill.classList.remove("flash"), 500);
    });
    $("#hud-day").textContent = STATE.S.day;
    $("#hud-queue").textContent = Math.max(0, STATE.quota() - STATE.S.processedToday);
  }

  /* ---------- documents ---------- */
  function renderDocs(docs) {
    const drawer = $("#docs-drawer");
    drawer.innerHTML = "";
    $("#docs-count").textContent = docs.length;
    docs.forEach((d) => {
      const def = DOC_TYPES[d.type];
      if (!def) return;
      const el = document.createElement("div");
      el.className = "doc" + (d.flagged ? " flagged" : "");
      let html = `<h4>${t(def.titleKey)}</h4>`;
      def.fields.forEach((f) => {
        const label = t(docFieldLabel(f));
        const value = d.data[f] != null ? d.data[f] : "—";
        html += `<div class="row"><span class="k">${label}</span><span class="v">${value}</span></div>`;
      });
      el.innerHTML = html;
      drawer.appendChild(el);
    });
  }

  /* ---------- card ---------- */
  let currentScenario = null;
  let onChoice = null; // callback(outcomeName)

  function renderCard(scenario, choiceCb) {
    currentScenario = scenario;
    onChoice = choiceCb;
    const card = $("#card");
    card.style.transform = "";
    card.style.opacity = "";
    card.className = "card fly-in";

    $("#card-name").textContent = t(scenario.nameKey);
    $("#card-speech").textContent = t(scenario.speechKey);
    const portrait = $("#card-portrait");
    portrait.textContent = scenario.emoji || "👤";
    if (scenario.portrait) {
      portrait.style.backgroundImage = `url(assets/img/${scenario.portrait}.png)`;
      portrait.textContent = "";
    } else {
      portrait.style.backgroundImage = "";
    }

    renderDocs(scenario.documents || []);
    $("#docs-drawer").classList.remove("open");

    // surface bribe as an extra option via toast prompt button (handled in game.js)
    document.dispatchEvent(new CustomEvent("card:rendered", { detail: scenario }));
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
      li.innerHTML = `<span>${e.label}</span><span>${e.value}</span>`;
      list.appendChild(li);
    });
    $("#summary-tease").textContent = teaseKey ? t(teaseKey) : "";
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
    toast, renderIntro, renderSummary, renderEnding,
    get currentScenario() { return currentScenario; },
  };
})();
