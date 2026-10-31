const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/** "29 Oct 2026, 14:03" in UK time — formatted on the server so client and server markup always match. */
export const formatDateTime = (iso: string | Date) => dateTimeFormat.format(typeof iso === "string" ? new Date(iso) : iso);

/** Site origin shown in the search-result preview, e.g. "https://www.example.co.uk". */
export const siteHost = () => new URL(process.env.SITE_URL ?? "http://localhost:3000").origin;
