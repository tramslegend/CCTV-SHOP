// Back-office input rules for discount codes (zod), shared by the form and the server actions. Client-safe.
import { z } from "zod";
import { CODE_RE, DISCOUNT_TYPES, normaliseCode, ukDayBoundary, type DiscountType } from "./rules";

/** What the form edits (numbers as typed, dates as UK "yyyy-mm-dd"). */
export interface DiscountFormValues {
  code: string;
  type: DiscountType;
  value: string;
  minSpend: string;
  startsOn: string;
  endsOn: string;
  maxUses: string;
  oncePerCustomer: boolean;
  active: boolean;
}

export const EMPTY_DISCOUNT: DiscountFormValues = {
  code: "",
  type: "percent",
  value: "",
  minSpend: "",
  startsOn: "",
  endsOn: "",
  maxUses: "",
  oncePerCustomer: false,
  active: true,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "£1,250.50" → 1250.5; "" → null; anything else → NaN. */
const toNumber = (raw: string) => {
  const text = raw.trim().replace(/^£/, "").replace(/,/g, "").replace(/%$/, "").trim();
  if (!text) return null;
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
};

const twoDecimals = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6;

export const discountInputSchema = z
  .object({
    code: z.string().max(60),
    type: z.enum(DISCOUNT_TYPES, { message: "Choose what the code gives." }),
    value: z.string().max(20),
    minSpend: z.string().max(20),
    startsOn: z.string().max(10),
    endsOn: z.string().max(10),
    maxUses: z.string().max(12),
    oncePerCustomer: z.boolean(),
    active: z.boolean(),
  })
  .transform((v, ctx) => {
    const issue = (path: keyof DiscountFormValues, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    const code = normaliseCode(v.code);
    if (!code) issue("code", "Enter the code customers will type, or generate one.");
    else if (!CODE_RE.test(code)) issue("code", "Use 3–32 letters and numbers (dashes and underscores are fine, no spaces).");

    let value = 0;
    if (v.type !== "free_delivery") {
      const n = toNumber(v.value);
      if (n === null) issue("value", v.type === "percent" ? "Enter the percentage off." : "Enter the amount off.");
      else if (!Number.isFinite(n) || !twoDecimals(n)) issue("value", "Enter a number with up to 2 decimal places.");
      else if (v.type === "percent" && (n <= 0 || n > 100)) issue("value", "A percentage must be more than 0 and at most 100.");
      else if (v.type === "fixed" && (n <= 0 || n > 10_000)) issue("value", "Enter an amount between £0.01 and £10,000.");
      else value = n;
    }

    const minRaw = toNumber(v.minSpend);
    let minSpend: number | null = null;
    if (minRaw !== null) {
      if (!Number.isFinite(minRaw) || !twoDecimals(minRaw) || minRaw > 100_000) issue("minSpend", "Enter an amount in pounds, e.g. 50 or 49.99.");
      else minSpend = minRaw > 0 ? minRaw : null;
    }

    const usesRaw = v.maxUses.trim();
    let maxUses: number | null = null;
    if (usesRaw) {
      const n = Number(usesRaw.replace(/,/g, ""));
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) issue("maxUses", "Enter a whole number of uses (1 or more), or leave it empty for no limit.");
      else maxUses = n;
    }

    const startsOn = v.startsOn.trim();
    const endsOn = v.endsOn.trim();
    if (startsOn && !DATE_RE.test(startsOn)) issue("startsOn", "Choose a date.");
    if (endsOn && !DATE_RE.test(endsOn)) issue("endsOn", "Choose a date.");
    if (startsOn && endsOn && DATE_RE.test(startsOn) && DATE_RE.test(endsOn) && endsOn < startsOn) {
      issue("endsOn", "The end date is before the start date.");
    }

    return {
      code,
      type: v.type,
      value,
      minSpend,
      maxUses,
      startsAt: startsOn && DATE_RE.test(startsOn) ? ukDayBoundary(startsOn) : null,
      endsAt: endsOn && DATE_RE.test(endsOn) ? ukDayBoundary(endsOn, true) : null,
      oncePerCustomer: v.oncePerCustomer,
      active: v.active,
    };
  });

export type DiscountInput = z.output<typeof discountInputSchema>;

export const codeIdSchema = z.number().int().positive().max(2_147_483_647);
