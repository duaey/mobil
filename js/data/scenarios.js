/* ============================================================
   SCENARIOS — the content of the game.

   Each scenario object:
     id          unique string
     minDay      earliest day it may appear in the random pool
     fixedDay    (optional) forces it to appear on this exact day
     once        if true, never repeats once seen
     requireFlag / forbidFlag  story gating (string or array)
     portrait    asset key (assets/img/<key>.png) + emoji fallback
     emoji       fallback glyph if no art yet
     nameKey     i18n key for the passenger label
     speechKey   i18n key for what they say
     documents   [{ type, data:{field:value}, flagged:bool }]
     approve / deny   choice outcomes:
        effects   { reputation, money, fear, conscience }  (deltas)
        suspicion delta to the hidden suspicion meter
        setFlags  [..] / clearFlags [..]
        resultKey i18n key for the toast shown after choosing
        delayed   [{ afterDays, scenarioId }]  queue a future scripted card
        bribe     amount of money offered (shown as extra button)

   NOTE: this is the starter content set (Days 1-3 + core mechanics:
   bribe, refugee dilemma, the Organization recruitment chain, the
   Kemal subplot, and a delayed consequence). We expand to 30 days
   together from here.
   ============================================================ */
window.SCENARIOS = [

  /* ---------------- DAY 1: orientation ---------------- */
  {
    id: "d1_tourist", fixedDay: 1, once: true,
    emoji: "🧳", nameKey: "char.tourist", speechKey: "sc.d1_tourist.speech",
    documents: [
      { type: "passport", data: { name: "Lena Voss", country: "Federation", dob: "1990-04-12", expires: "2031-08-01", id: "FD-4471" } },
    ],
    approve: { effects: { reputation: 2 }, resultKey: "sc.d1_tourist.ok" },
    deny: { effects: { reputation: -3, conscience: -2 }, resultKey: "sc.d1_tourist.no" },
  },
  {
    id: "d1_worker", fixedDay: 1, once: true,
    emoji: "👷", nameKey: "char.worker", speechKey: "sc.d1_worker.speech",
    documents: [
      { type: "passport", data: { name: "Marek Dolan", country: "Federation", dob: "1985-11-02", expires: "2029-03-15", id: "FD-9982" } },
      { type: "permit", data: { name: "Marek Dolan", employer: "State Steelworks", role: "Welder", expires: "2027-01-01" } },
    ],
    approve: { effects: { reputation: 2, conscience: 1 }, resultKey: "sc.d1_worker.ok" },
    deny: { effects: { reputation: -2, conscience: -2 }, resultKey: "sc.d1_worker.no" },
  },
  {
    id: "d1_expired", fixedDay: 1, once: true,
    emoji: "🧓", nameKey: "char.elder", speechKey: "sc.d1_expired.speech",
    documents: [
      { type: "passport", data: { name: "Otto Reyes", country: "Federation", dob: "1955-06-30", expires: "2024-12-01", id: "FD-1190" } },
    ],
    probes: [
      { id: "check_expiry", labelKey: "probe.check_expiry", resultKey: "sc.d1_expired.found", flagDoc: 0 },
    ],
    // expired passport — denying is "correct"
    approve: { effects: { reputation: -5, conscience: 2 }, suspicion: 4, resultKey: "sc.d1_expired.ok" },
    deny: { effects: { reputation: 4, conscience: -1 }, resultKey: "sc.d1_expired.no" },
  },

  /* ---------------- DAY 2: first bribe + refugee ---------------- */
  {
    id: "d2_bribe_merchant", fixedDay: 2, once: true,
    emoji: "💼", nameKey: "char.merchant", speechKey: "sc.d2_bribe.speech",
    documents: [
      { type: "passport", data: { name: "Cyrus Bahn", country: "Eastmark", dob: "1978-02-20", expires: "2030-05-05", id: "EM-3320" } },
      { type: "vehicle", data: { plate: "EM-77-K", owner: "Cyrus Bahn", cargo: "Textiles", weight: "2,400 kg" } },
    ],
    probes: [
      { id: "open_cargo", labelKey: "probe.open_cargo", resultKey: "sc.d2_bribe.found", flagDoc: 1 },
    ],
    // bribe offered: taking it = money up, conscience/suspicion cost
    approve: { effects: { reputation: -2 }, resultKey: "sc.d2_bribe.wave" },
    deny: { effects: { reputation: 3, conscience: 1 }, resultKey: "sc.d2_bribe.no" },
    bribeOption: {
      amount: 12,
      effects: { money: 12, conscience: -4 }, suspicion: 8,
      resultKey: "sc.d2_bribe.take", setFlags: ["took_first_bribe"],
    },
  },
  {
    id: "d2_refugee", fixedDay: 2, once: true,
    emoji: "🧕", nameKey: "char.refugee", speechKey: "sc.d2_refugee.speech",
    documents: [
      { type: "passport", data: { name: "Amina Sah", country: "Southreach", dob: "1996-09-09", expires: "—", id: "(none)" }, flagged: true },
    ],
    probes: [
      { id: "ask_daughter", labelKey: "probe.ask_daughter", resultKey: "sc.d2_refugee.found" },
    ],
    approve: { effects: { reputation: -4, conscience: 6 }, suspicion: 3, resultKey: "sc.d2_refugee.ok", setFlags: ["helped_refugee"] },
    deny: { effects: { reputation: 3, conscience: -7, fear: 2 }, resultKey: "sc.d2_refugee.no",
      delayed: [{ afterDays: 2, scenarioId: "c_refugee_news" }] },
  },

  /* delayed consequence card (not in random pool; queued by choice) */
  {
    id: "c_refugee_news", scripted: true, once: true,
    emoji: "📰", nameKey: "char.clerk", speechKey: "sc.c_refugee_news.speech",
    documents: [],
    approve: { effects: { conscience: -3 }, resultKey: "sc.c_refugee_news.ack" },
    deny: { effects: { conscience: -3, fear: 2 }, resultKey: "sc.c_refugee_news.ack" },
  },

  /* ---------------- KEMAL subplot ---------------- */
  {
    id: "kemal_intro", fixedDay: 2, once: true,
    emoji: "🧑‍✈️", nameKey: "char.kemal", speechKey: "sc.kemal_intro.speech",
    documents: [],
    approve: { effects: { fear: -2 }, resultKey: "sc.kemal_intro.ok", setFlags: ["met_kemal"] },
    deny: { effects: {}, resultKey: "sc.kemal_intro.ok", setFlags: ["met_kemal"] },
  },
  {
    id: "kemal_vanish", fixedDay: 3, once: true, requireFlag: "met_kemal",
    emoji: "🚪", nameKey: "char.clerk", speechKey: "sc.kemal_vanish.speech",
    documents: [],
    approve: { effects: { fear: 5 }, resultKey: "sc.kemal_vanish.ack", setFlags: ["kemal_gone"] },
    deny: { effects: { fear: 5 }, resultKey: "sc.kemal_vanish.ack", setFlags: ["kemal_gone"] },
  },

  /* ---------------- THE ORGANIZATION (recruitment chain) ---------------- */
  {
    id: "org_offer_1", fixedDay: 3, once: true,
    emoji: "🕶️", nameKey: "char.stranger", speechKey: "sc.org_offer_1.speech",
    documents: [
      { type: "passport", data: { name: "—", country: "—", dob: "—", expires: "—", id: "—" } },
    ],
    approve: { effects: { money: 20, conscience: -5 }, suspicion: 10,
      resultKey: "sc.org_offer_1.yes", setFlags: ["org_member"] },
    deny: { effects: { reputation: 2, fear: 3 }, resultKey: "sc.org_offer_1.no", setFlags: ["org_refused"] },
  },

  /* ---------------- generic pool (repeatable filler) ---------------- */
  {
    id: "pool_student", minDay: 1,
    emoji: "🎓", nameKey: "char.student", speechKey: "sc.pool_student.speech",
    documents: [
      { type: "passport", data: { name: "Iris Penn", country: "Federation", dob: "2003-01-19", expires: "2032-09-09", id: "FD-7781" } },
      { type: "visa", data: { name: "Iris Penn", purpose: "Study", issued: "2025-09-01", expires: "2027-09-01" } },
    ],
    approve: { effects: { reputation: 1 }, resultKey: "sc.generic.ok" },
    deny: { effects: { reputation: -1, conscience: -2 }, resultKey: "sc.generic.no" },
  },
  {
    id: "pool_sick", minDay: 2,
    emoji: "🤒", nameKey: "char.patient", speechKey: "sc.pool_sick.speech",
    documents: [
      { type: "passport", data: { name: "Dorin Vale", country: "Eastmark", dob: "1970-07-07", expires: "2028-04-04", id: "EM-5512" } },
      { type: "health", data: { name: "Dorin Vale", clinic: "Capital General", status: "Dialysis — urgent", date: "weekly" } },
    ],
    approve: { effects: { reputation: -2, conscience: 5 }, resultKey: "sc.pool_sick.ok" },
    deny: { effects: { reputation: 2, conscience: -5 }, resultKey: "sc.pool_sick.no" },
  },
  {
    id: "pool_forged", minDay: 2,
    emoji: "🧔", nameKey: "char.traveler", speechKey: "sc.pool_forged.speech",
    documents: [
      { type: "passport", data: { name: "Hal Brunt", country: "Federation", dob: "1988-13-02", expires: "2030-01-01", id: "FD-0000" } },
    ],
    probes: [
      { id: "compare_dob", labelKey: "probe.compare_dob", resultKey: "sc.pool_forged.found", flagDoc: 0 },
    ],
    // dob "13" month is impossible — forged. If you miss it and approve,
    // it comes back to bite you days later (suspicion + investigation).
    approve: { effects: { reputation: -3 }, suspicion: 4, resultKey: "sc.pool_forged.ok",
      delayed: [{ afterDays: 3, scenarioId: "c_forged_caught" }] },
    deny: { effects: { reputation: 4 }, resultKey: "sc.pool_forged.no" },
  },
  {
    id: "pool_clean", minDay: 1,
    emoji: "🙂", nameKey: "char.tourist", speechKey: "sc.pool_clean.speech",
    documents: [
      { type: "passport", data: { name: "Sol Ardin", country: "Federation", dob: "1992-03-03", expires: "2031-03-03", id: "FD-2231" } },
    ],
    approve: { effects: { reputation: 1 }, resultKey: "sc.generic.ok" },
    deny: { effects: { reputation: -2, conscience: -2 }, resultKey: "sc.generic.no" },
  },

  /* delayed payback: you waved a forged passport through days ago */
  {
    id: "c_forged_caught", scripted: true, once: true,
    emoji: "🚨", nameKey: "char.boss", speechKey: "sc.c_forged_caught.speech",
    documents: [],
    approve: { effects: { reputation: -8 }, suspicion: 12, resultKey: "sc.c_forged_caught.ack" },
    deny: { effects: { reputation: -8 }, suspicion: 12, resultKey: "sc.c_forged_caught.ack" },
  },

  /* ---------------- DAY 4: directive + smuggler ---------------- */
  {
    id: "d4_directive", fixedDay: 4, once: true,
    emoji: "🧑‍✈️", nameKey: "char.boss", speechKey: "sc.d4_directive.speech",
    documents: [],
    approve: { effects: { reputation: 3, conscience: -2 }, resultKey: "sc.d4_directive.obey", setFlags: ["obeyed_quota"] },
    deny: { effects: { reputation: -4, conscience: 3 }, resultKey: "sc.d4_directive.refuse" },
  },
  {
    id: "pool_smuggler", minDay: 4,
    emoji: "🧥", nameKey: "char.smuggler", speechKey: "sc.pool_smuggler.speech",
    documents: [
      { type: "passport", data: { name: "Vint Calder", country: "Eastmark", dob: "1983-05-14", expires: "2029-09-09", id: "EM-6610" } },
      { type: "vehicle", data: { plate: "EM-12-X", owner: "Vint Calder", cargo: "Empty", weight: "1,900 kg" } },
    ],
    // weight says full but cargo says empty — a probe reveals the hidden compartment
    probes: [
      { id: "search_van", labelKey: "probe.search_van", resultKey: "sc.pool_smuggler.found", flagDoc: 1, suspicion: 0 },
    ],
    approve: { effects: { reputation: -4 }, suspicion: 6, resultKey: "sc.pool_smuggler.ok",
      delayed: [{ afterDays: 2, scenarioId: "c_forged_caught" }] },
    deny: { effects: { reputation: 5 }, resultKey: "sc.pool_smuggler.no" },
  },

  /* ---------------- DAY 3+: harder moral cases ---------------- */
  {
    id: "pool_family", minDay: 3,
    emoji: "👨‍👩‍👧", nameKey: "char.family", speechKey: "sc.pool_family.speech",
    documents: [
      { type: "passport", data: { name: "Pol Geier", country: "Southreach", dob: "1989-02-02", expires: "2027-07-07", id: "SR-3001" } },
      { type: "health", data: { name: "Mira Geier (child)", clinic: "—", status: "Fever, untreated", date: "today" }, flagged: true },
    ],
    probes: [
      { id: "ask_child", labelKey: "probe.ask_child", resultKey: "sc.pool_family.found" },
    ],
    approve: { effects: { reputation: -3, conscience: 5 }, resultKey: "sc.pool_family.ok" },
    deny: { effects: { reputation: 2, conscience: -6, fear: 2 }, resultKey: "sc.pool_family.no" },
  },
  {
    id: "pool_diplomat", minDay: 3,
    emoji: "🎩", nameKey: "char.diplomat", speechKey: "sc.pool_diplomat.speech",
    documents: [
      { type: "passport", data: { name: "Lord Vane", country: "Federation", dob: "1960-01-01", expires: "2035-01-01", id: "FD-0001" } },
      { type: "visa", data: { name: "Lord Vane", purpose: "State business", issued: "2026-01-01", expires: "2030-01-01" } },
    ],
    // papers flawless, but you know what he is. Denying is "right" but costly.
    approve: { effects: { reputation: 4, conscience: -5 }, resultKey: "sc.pool_diplomat.ok" },
    deny: { effects: { reputation: -10, conscience: 6 }, suspicion: 8, resultKey: "sc.pool_diplomat.no" },
  },

  /* ---------------- DAY 5: the spy + organization escalates ---------------- */
  {
    id: "pool_spy", minDay: 5,
    emoji: "🕴️", nameKey: "char.traveler", speechKey: "sc.pool_spy.speech",
    documents: [
      { type: "passport", data: { name: "Erik Holt", country: "Federation", dob: "1991-08-08", expires: "2032-08-08", id: "FD-4815" } },
    ],
    probes: [
      { id: "ask_address", labelKey: "probe.ask_address", resultKey: "sc.pool_spy.found", flagDoc: 0 },
    ],
    approve: { effects: { fear: 4 }, suspicion: 5, resultKey: "sc.pool_spy.ok",
      delayed: [{ afterDays: 2, scenarioId: "c_forged_caught" }] },
    deny: { effects: { reputation: 3, fear: 2 }, resultKey: "sc.pool_spy.no" },
  },
  {
    id: "org_offer_2", fixedDay: 5, once: true, requireFlag: "org_member",
    emoji: "🕶️", nameKey: "char.stranger", speechKey: "sc.org_offer_2.speech",
    documents: [],
    approve: { effects: { money: 25, conscience: -6 }, suspicion: 15, resultKey: "sc.org_offer_2.yes", setFlags: ["org_deep"] },
    deny: { effects: { fear: 8 }, suspicion: 5, resultKey: "sc.org_offer_2.no", setFlags: ["org_quit"] },
  },

  /* ===========================================================
     SUSPICION CONSEQUENCES (scripted, fired by hidden meter tiers)
     =========================================================== */

  /* Tier 1 (suspicion >= 30): Internal Affairs has noticed you. */
  {
    id: "s_audit_warning", scripted: true, once: true,
    emoji: "🗂️", nameKey: "char.boss", speechKey: "sc.s_audit_warning.speech",
    documents: [],
    approve: { effects: { fear: 6, reputation: -2 }, resultKey: "sc.s_audit_warning.ack" },
    deny: { effects: { fear: 6, reputation: -2 }, resultKey: "sc.s_audit_warning.ack" },
  },

  /* Tier 2 (suspicion >= 55): a STING. Clean papers, offers a bribe.
     Taking it (tap 💰) spikes suspicion past 100 -> instant arrest ending.
     Refusing the bribe is passing the test and LOWERS suspicion. */
  {
    id: "s_sting", scripted: true, once: true,
    emoji: "🎭", nameKey: "char.traveler", speechKey: "sc.s_sting.speech",
    documents: [
      { type: "passport", data: { name: "Ray Mund", country: "Federation", dob: "1987-06-06", expires: "2031-06-06", id: "FD-5050" } },
    ],
    approve: { effects: {}, suspicion: -15, resultKey: "sc.s_sting.clean" },
    deny: { effects: { reputation: -2 }, suspicion: -15, resultKey: "sc.s_sting.clean" },
    bribeOption: {
      amount: 50,
      effects: { money: 50 }, suspicion: 70,
      resultKey: "sc.s_sting.trap", setFlags: ["caught_in_sting"],
    },
  },

  /* Tier 3 (suspicion >= 80): final warning. One more slip ends it. */
  {
    id: "s_final_warning", scripted: true, once: true,
    emoji: "⚠️", nameKey: "char.boss", speechKey: "sc.s_final_warning.speech",
    documents: [],
    approve: { effects: { fear: 12 }, resultKey: "sc.s_final_warning.ack" },
    deny: { effects: { fear: 12 }, resultKey: "sc.s_final_warning.ack" },
  },
];
