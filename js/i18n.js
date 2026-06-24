/* ============================================================
   i18n — lightweight internationalization
   - Loads /locales/<lang>.json
   - Replaces [data-i18n] text on demand
   - t("key.path", {vars}) for dynamic strings
   - RTL languages flip document direction
   ============================================================ */
(function () {
  const RTL = ["ar", "fa", "he", "ur"];
  const LANGS = [
    { code: "en", label: "English" },
    { code: "tr", label: "Türkçe" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" },
    { code: "pt", label: "Português" },
    { code: "ru", label: "Русский" },
    { code: "zh", label: "中文" },
    { code: "ja", label: "日本語" },
    { code: "ko", label: "한국어" },
    { code: "ar", label: "العربية" },
  ];

  let dict = {};
  let current = "en";

  // resolve "a.b.c" from nested object
  function resolve(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
  }

  function t(key, vars) {
    let str = resolve(dict, key);
    if (str == null) return key; // fall back to the key itself
    // a value may be an array of variants — pick one at random for variety
    if (Array.isArray(str)) str = str[Math.floor(Math.random() * str.length)];
    if (vars) for (const k in vars) str = str.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
    return str;
  }

  async function load(lang) {
    try {
      const res = await fetch(`locales/${lang}.json`);
      if (!res.ok) throw new Error("no locale");
      dict = await res.json();
      current = lang;
    } catch (e) {
      // fall back to English if a locale is missing
      if (lang !== "en") return load("en");
      dict = {};
    }
    document.documentElement.lang = current;
    document.documentElement.dir = RTL.includes(current) ? "rtl" : "ltr";
    localStorage.setItem("gate7_lang", current);
    apply();
  }

  // replace all [data-i18n] elements currently in the DOM
  function apply(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = resolve(dict, key);
      if (val != null) el.textContent = Array.isArray(val) ? val[0] : val;
    });
  }

  function detect() {
    const saved = localStorage.getItem("gate7_lang");
    if (saved) return saved;
    const nav = (navigator.language || "en").slice(0, 2);
    return LANGS.some((l) => l.code === nav) ? nav : "en";
  }

  // raw value (no random pick) — used when a caller needs the whole array
  function raw(key) { return resolve(dict, key); }

  window.I18N = { t, raw, load, apply, detect, LANGS, get current() { return current; } };
})();
