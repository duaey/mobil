/* ============================================================
   Document definitions.
   Each document TYPE declares which fields it shows and the
   i18n key for each field label. A scenario provides the field
   VALUES. This keeps rendering generic and content data-driven.
   ============================================================ */
window.DOC_TYPES = {
  passport: {
    titleKey: "doc.passport",
    fields: ["name", "country", "dob", "expires", "id"],
  },
  visa: {
    titleKey: "doc.visa",
    fields: ["name", "dob", "country", "purpose", "issued", "expires"],
  },
  permit: {
    titleKey: "doc.permit",
    fields: ["name", "dob", "employer", "role", "expires"],
  },
  health: {
    titleKey: "doc.health",
    fields: ["name", "dob", "clinic", "status", "date"],
  },
  vehicle: {
    titleKey: "doc.vehicle",
    fields: ["plate", "owner", "cargo", "weight"],
  },
};

// label key for a given field, e.g. field.country
window.docFieldLabel = (field) => "field." + field;
