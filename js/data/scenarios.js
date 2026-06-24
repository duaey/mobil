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
      { type: "passport", data: { name: "Otto Reyes", country: "Federation", dob: "1955-06-30", expires: "2024-12-01", id: "FD-1190" }, flagged: true },
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
      { type: "vehicle", data: { plate: "EM-77-K", owner: "Cyrus Bahn", cargo: "Textiles (undeclared)", weight: "2,400 kg" }, flagged: true },
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
      { type: "passport", data: { name: "Hal Brunt", country: "Federation", dob: "1988-13-02", expires: "2030-01-01", id: "FD-0000" }, flagged: true },
    ],
    // dob "13" month is impossible — forged. Denying correct.
    approve: { effects: { reputation: -6 }, suspicion: 6, resultKey: "sc.pool_forged.ok" },
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
];
