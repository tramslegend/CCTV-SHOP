// Dates in the content admin, formatted on the server in UK time so client and server markup always match.
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "29 Oct 2026, 14:03" */
export const formatDateTime = (d: string | Date) => dateTimeFormat.format(typeof d === "string" ? new Date(d) : d);

/** Publish dates are calendar days stored at midnight UTC: "29 Oct 2026". */
export const formatDay = (d: Date) => dateFormat.format(d);

/** Date → "2026-10-29" for date inputs (UTC calendar day). */
export const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Today's date in the UK, "2026-10-29". */
export const todayInUk = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
