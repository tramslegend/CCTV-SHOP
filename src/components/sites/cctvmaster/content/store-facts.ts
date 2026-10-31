// Contact-form subjects (as on the source's /contact). The shop's address, phone, email and opening hours are not
// here: they come from /admin/settings (see src/lib/settings).

export const CONTACT_SUBJECTS = [
  { value: "product", label: "Product question" },
  { value: "advice", label: "Help speccing a system" },
  { value: "order", label: "Order or delivery question" },
  { value: "returns", label: "Returns / warranty" },
  { value: "other", label: "Something else" },
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]["value"];
