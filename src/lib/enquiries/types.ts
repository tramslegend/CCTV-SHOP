// Shared types for enquiries (storefront forms and the admin inbox). Plain module: safe for client and server.

export const ENQUIRY_TYPES = ["contact", "quote", "trade", "parts"] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const ENQUIRY_STATUSES = ["new", "open", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const TYPE_LABEL: Record<EnquiryType, string> = {
  contact: "Contact",
  quote: "Quote",
  trade: "Trade",
  parts: "Parts",
};

export const STATUS_LABEL: Record<EnquiryStatus, string> = { new: "New", open: "Open", closed: "Closed" };

/** Result of a storefront form submission. Field errors are keyed by the form's field names. */
export type EnquiryResult<F extends string = string> =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<F, string>>;
      /** "token": the anti-spam token expired; the form fetches a new one before the next try. */
      retry?: "token";
    };

/** Internal note or in-app reply, stored in `enquiries.details.notes`. */
export interface EnquiryNote {
  at: string;
  by: string;
  text: string;
  /** Absent for plain notes. */
  kind?: "reply";
  /** Email subject, for replies. */
  subject?: string;
}

/** Where a submission came from; stored in `enquiries.details.source` (never shown to customers). */
export interface EnquirySource {
  page?: string;
  ipHash?: string;
  userAgent?: string;
}
