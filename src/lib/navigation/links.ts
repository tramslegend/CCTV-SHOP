// Link rules for owner-entered menu, footer and homepage links. Client-safe.

/** Why a link can't be used, or null when it's fine. Empty links are checked by the caller. */
export function hrefProblem(href: string): string | null {
  const v = href.trim();
  if (!v) return null;
  if (/\s/.test(v)) return "Links can't contain spaces.";
  if (v.startsWith("/")) {
    if (v.startsWith("//") || v.includes("\\")) return "Enter a page on the shop such as /products.";
    return null;
  }
  if (v.startsWith("#")) return null;
  if (/^https?:\/\//i.test(v)) {
    try {
      const url = new URL(v);
      return url.hostname.includes(".") ? null : "Enter a full web address such as https://example.com/page.";
    } catch {
      return "Enter a full web address such as https://example.com/page.";
    }
  }
  if (/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(v)) return null;
  if (/^tel:\+?[\d()-]{5,}$/i.test(v)) return null;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v)) return "Start web addresses with https://, e.g. https://" + v.replace(/^\/+/, "");
  return "Enter a page on the shop such as /products, or a full web address starting with https://.";
}

/** Links that leave the shop's pages (web addresses, email, phone): rendered with a plain <a>, not a client-side Link. */
export const isExternalHref = (href: string) => /^(https?:|mailto:|tel:)/i.test(href);
