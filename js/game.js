/* ============================================================
   GAME — main loop. Boot → language → daily radio → process
   passengers until quota → day summary → next day. Resolves
   endings when a resource hits a boundary or suspicion maxes.
   ============================================================ */
(function () {
  const $ = UI.$;
  const t = (k, v) => I18N.t(k, v);

  /* radio headline + daily directive per day (i18n keys) */
  const DAY_INTRO = {
    1: { news: "radio.d1", rule: "rule.d1" },
    2: { news: "radio.d2", rule: "rule.d2" },
    3: { news: "radio.d3", rule: "rule.d3" },
    4: { news: "radio.d4", rule: "rule.d4" },
  };
  function introFor(day) { return DAY_INTRO[day] || { news: "radio.generic", rule: "rule.generic" }; }

  /* endings: which boundary maps to which ending */
  const ENDINGS = {
    "reputation:low":  { title: "end.fired.t",   text: "end.fired.x" },
    "reputation:high": { title: "end.promoted.t",text: "end.promoted.x" },
    "money:low":       { title: "end.broke.t",   text: "end.broke.x" },
    "money:high":      { title: "end.greed.t",   text: "end.greed.x" },
    "fear:low":        { title: "end.reckless.t",text: "end.reckless.x" },
    "fear:high":       { title: "end.paranoid.t",text: "end.paranoid.x" },
    "conscience:low":  { title: "end.hollow.t",  text: "end.hollow.x" },
    "conscience:high": { title: "end.broken.t",  text: "end.broken.x" },
    "suspicion:high":  { title: "end.arrest.t",  text: "end.arrest.x" },
  };

  let pendingBribe = null; // bribe outcome awaiting decision

  /* ---------- boot ---------- */
  async function boot() {
    buildLangGrid();
    await I18N.load(I18N.detect());
    markSelectedLang();
    if (STATE.hasSave()) $("#btn-continue").hidden = false;

    $("#btn-start").addEventListener("click", startNew);
    $("#btn-continue").addEventListener("click", () => { STATE.load(); beginDay(); });
    $("#btn-open-gate").addEventListener("click", beginGameplay);
    $("#btn-next-day").addEventListener("click", () => { STATE.nextDay(); beginDay(); });
    $("#btn-restart").addEventListener("click", () => { STATE.reset(); UI.show("boot-screen"); $("#btn-continue").hidden = true; });
    $("#btn-approve").addEventListener("click", () => UI.choose("approve"));
    $("#btn-deny").addEventListener("click", () => UI.choose("deny"));
    $("#btn-inspect").addEventListener("click", () => $("#docs-drawer").classList.toggle("open"));
    $("#docs-toggle").addEventListener("click", () => $("#docs-drawer").classList.toggle("open"));

    document.addEventListener("card:rendered", (e) => offerBribe(e.detail));
    UI.initSwipe();
  }

  function buildLangGrid() {
    const grid = $("#lang-grid");
    grid.innerHTML = "";
    I18N.LANGS.forEach((l) => {
      const b = document.createElement("button");
      b.className = "lang-btn";
      b.textContent = l.label;
      b.dataset.code = l.code;
      b.addEventListener("click", async () => { await I18N.load(l.code); markSelectedLang(); });
      grid.appendChild(b);
    });
  }
  function markSelectedLang() {
    document.querySelectorAll(".lang-btn").forEach((b) =>
      b.classList.toggle("sel", b.dataset.code === I18N.current));
  }

  function startNew() { STATE.reset(); beginDay(); }

  /* ---------- day intro (radio) ---------- */
  function beginDay() {
    if (STATE.S.ended) { STATE.reset(); }
    const intro = introFor(STATE.S.day);
    UI.renderIntro(STATE.S.day, intro.news, intro.rule);
    UI.show("intro-screen");
  }

  function beginGameplay() {
    UI.show("game-screen");
    UI.renderMeters();
    nextCard();
  }

  /* ---------- core loop ---------- */
  function nextCard() {
    if (STATE.endDayReady()) return endDay();
    const sc = STATE.nextScenario();
    if (!sc) return endDay(); // ran out of eligible content
    UI.renderCard(sc, (choiceName) => resolveChoice(sc, choiceName), (probe) => resolveProbe(sc, probe));
  }

  /* a probe: interrogating the passenger / cross-checking papers.
     Costs are small (time pressure, annoyance). Probing innocents too
     much nicks reputation; probing the guilty reveals contradictions. */
  function resolveProbe(scenario, probe) {
    STATE.applyEffects(probe.effects);
    STATE.addSuspicion(probe.suspicion || 0);
    STATE.setFlags(probe.setFlags);
    STATE.save();
    UI.applyProbeResult(probe);
    UI.renderMeters();
    if (probe.resultKey) UI.toast(t(probe.resultKey));
  }

  function resolveChoice(scenario, choiceName) {
    const outcome = scenario[choiceName];
    if (!outcome) return;
    UI.flyOut(choiceName === "approve" ? "right" : "left", () => {
      finishOutcome(scenario, outcome);
    });
  }

  function finishOutcome(scenario, outcome) {
    const hits = STATE.process(outcome, scenario);
    if (outcome.resultKey) UI.toast(t(outcome.resultKey));
    UI.renderMeters();
    pendingBribe = null;

    const ending = pickEnding(hits);
    if (ending) return setTimeout(() => triggerEnding(ending), 900);
    setTimeout(nextCard, 700);
  }

  /* bribe: if a scenario offers one, show a transient prompt */
  function offerBribe(scenario) {
    pendingBribe = scenario.bribeOption || null;
    if (pendingBribe) {
      UI.toast(t("game.bribe_hint", { n: pendingBribe.amount }), 3500);
      // tapping the money stat accepts the bribe
      const moneyStat = document.querySelector('.stat[data-stat="money"]');
      moneyStat.onclick = () => {
        if (!pendingBribe) return;
        const b = pendingBribe; pendingBribe = null; moneyStat.onclick = null;
        UI.flyOut("right", () => finishOutcome(scenario, b));
      };
    }
  }

  /* ---------- endings ---------- */
  function pickEnding(hits) {
    if (!hits || !hits.length) return null;
    const h = hits[0];
    return ENDINGS[h.stat + ":" + h.bound] || null;
  }

  function triggerEnding(ending) {
    STATE.S.ended = true; STATE.save();
    const epitaph = t("end.epitaph", { days: STATE.S.day });
    UI.renderEnding(ending.title, ending.text, epitaph);
  }

  /* ---------- day summary ---------- */
  function endDay() {
    const r = STATE.S.resources;
    const entries = [
      { label: t("field.reputation") || "Reputation", value: r.reputation },
      { label: t("summary.processed"), value: STATE.S.processedToday },
    ];
    // a teasing hook for "one more day"
    const teaseKeys = ["summary.tease1", "summary.tease2", "summary.tease3"];
    const tease = teaseKeys[STATE.S.day % teaseKeys.length];
    UI.renderSummary(STATE.S.day, entries, tease);
    UI.show("summary-screen");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
