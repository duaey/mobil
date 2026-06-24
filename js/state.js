/* ============================================================
   STATE — game state, resource logic, scenario selection,
   delayed-consequence queue, save/load, ending resolution.
   ============================================================ */
(function () {
  const SAVE_KEY = "gate7_save";
  const QUOTA_BASE = 6;        // passengers required on day 1
  const QUOTA_GROWTH = 1;      // +1 required passenger every 2 days

  const DEFAULT = () => ({
    day: 1,
    processedToday: 0,
    resources: { reputation: 50, money: 30, fear: 20, conscience: 70 },
    suspicion: 0,            // hidden meter; arrest at 100
    flags: {},              // story flags
    seen: {},               // scenario ids already shown (for once/repeat)
    delayed: [],            // [{ fireDay, scenarioId }]
    dayLog: [],             // entries for the end-of-day summary
    ended: false,
  });

  let S = DEFAULT();

  /* ---------- persistence ---------- */
  function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
  function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
  function load() {
    try { S = Object.assign(DEFAULT(), JSON.parse(localStorage.getItem(SAVE_KEY))); }
    catch (e) { S = DEFAULT(); }
  }
  function reset() { S = DEFAULT(); localStorage.removeItem(SAVE_KEY); }

  /* ---------- resources ---------- */
  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  // apply deltas; returns list of stats that hit a boundary (for endings)
  function applyEffects(effects) {
    const hits = [];
    if (!effects) return hits;
    for (const k in effects) {
      if (!(k in S.resources)) continue;
      const before = S.resources[k];
      const after = clamp(before + effects[k]);
      S.resources[k] = after;
      if (after <= 0) hits.push({ stat: k, bound: "low" });
      if (after >= 100) hits.push({ stat: k, bound: "high" });
    }
    return hits;
  }

  function addSuspicion(delta) {
    if (!delta) return;
    S.suspicion = clamp(S.suspicion + delta);
  }

  function setFlags(list) { (list || []).forEach((f) => (S.flags[f] = true)); }
  function clearFlags(list) { (list || []).forEach((f) => delete S.flags[f]); }
  function has(flag) { return !!S.flags[flag]; }

  /* ---------- quota ---------- */
  function quota() { return QUOTA_BASE + Math.floor((S.day - 1) / 2) * QUOTA_GROWTH; }

  /* ---------- delayed consequence queue ---------- */
  function queueDelayed(list) {
    (list || []).forEach((d) => S.delayed.push({ fireDay: S.day + d.afterDays, scenarioId: d.scenarioId }));
  }
  // pull any scripted scenario whose fire day has arrived
  function popDueDelayed() {
    const idx = S.delayed.findIndex((d) => d.fireDay <= S.day);
    if (idx === -1) return null;
    const due = S.delayed.splice(idx, 1)[0];
    return SCENARIOS.find((s) => s.id === due.scenarioId) || null;
  }

  /* ---------- scenario selection ---------- */
  function gateOk(sc) {
    const req = sc.requireFlag ? [].concat(sc.requireFlag) : [];
    const forb = sc.forbidFlag ? [].concat(sc.forbidFlag) : [];
    if (req.some((f) => !has(f))) return false;
    if (forb.some((f) => has(f))) return false;
    if (sc.once && S.seen[sc.id]) return false;
    return true;
  }

  function nextScenario() {
    // 1) due delayed/scripted cards take priority
    const due = popDueDelayed();
    if (due && gateOk(due)) return mark(due);

    // 2) fixed-day story beats for today
    const fixed = SCENARIOS.filter((s) => s.fixedDay === S.day && !s.scripted && gateOk(s) && !S.seen[s.id]);
    if (fixed.length) return mark(fixed[0]);

    // 3) random pool eligible for this day
    const pool = SCENARIOS.filter(
      (s) => !s.scripted && s.fixedDay == null && s.minDay != null && s.minDay <= S.day && gateOk(s)
    );
    if (!pool.length) return null;
    return mark(pool[Math.floor(Math.random() * pool.length)]);
  }

  function mark(sc) { S.seen[sc.id] = true; return sc; }

  /* ---------- processing a choice ---------- */
  function process(outcome, scenario) {
    const hits = applyEffects(outcome.effects);
    addSuspicion(outcome.suspicion || 0);
    setFlags(outcome.setFlags);
    clearFlags(outcome.clearFlags);
    queueDelayed(outcome.delayed);
    S.processedToday++;
    S.dayLog.push({ scenario: scenario.id, result: outcome.resultKey });
    // suspicion can trigger an arrest ending
    if (S.suspicion >= 100) hits.push({ stat: "suspicion", bound: "high" });
    save();
    return hits;
  }

  function endDayReady() { return S.processedToday >= quota(); }

  function nextDay() {
    S.day++;
    S.processedToday = 0;
    S.dayLog = [];
    save();
  }

  window.STATE = {
    get S() { return S; },
    DEFAULT, save, load, hasSave, reset,
    applyEffects, addSuspicion, setFlags, clearFlags, has,
    quota, nextScenario, process, endDayReady, nextDay,
    queueDelayed,
  };
})();
