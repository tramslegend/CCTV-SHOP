// Admin → Checkout forms: the values each section edits (amounts as typed) and their validation on the server.
// Error paths ("options.2.price") match the form's field ids, so each message shows next to its field.
import { z } from "zod";
import { slugify } from "@/components/admin/products/utils";
import { type CheckoutSettings, type DeliveryKind, type DeliveryOption, parseAreas, type PhoneRule, STANDARD_DELIVERY_ID } from "./settings";

export interface OrderingFormValues {
  enabled: boolean;
  pausedMessage: string;
}

export interface DeliveryOptionValues {
  /** Client-side list key. */
  key: string;
  /** "" for an option added in the form (the server gives it an id). */
  id: string;
  name: string;
  kind: DeliveryKind;
  price: string;
  freeFrom: string;
  estimate: string;
  excludedAreas: string;
  enabled: boolean;
}

export interface DeliveryOptionsFormValues {
  options: DeliveryOptionValues[];
}

export interface FormRulesValues {
  guestCheckout: boolean;
  phone: PhoneRule;
  company: boolean;
  notes: boolean;
  requireTerms: boolean;
  minimumOrder: string;
}

export interface MessagesFormValues {
  notice: string;
  thankYou: string;
  emailNote: string;
}

const amountText = (n: number | null) => (n === null ? "" : n.toFixed(2));

export const orderingToForm = (s: CheckoutSettings): OrderingFormValues => ({ ...s.ordering });
export const deliveryOptionsToForm = (s: CheckoutSettings): DeliveryOptionsFormValues => ({
  options: s.delivery.map((o) => ({
    key: o.id,
    id: o.id,
    name: o.name,
    kind: o.kind,
    price: amountText(o.price),
    freeFrom: amountText(o.freeFrom),
    estimate: o.estimate,
    excludedAreas: o.excludedAreas.join(", "),
    enabled: o.enabled,
  })),
});
export const formRulesToForm = (s: CheckoutSettings): FormRulesValues => ({ ...s.form, minimumOrder: s.form.minimumOrder ? amountText(s.form.minimumOrder) : "" });
export const messagesToForm = (s: CheckoutSettings): MessagesFormValues => ({ ...s.messages });

// ---------- schemas ----------

const MONEY_RE = /^\d{1,7}(\.\d{1,2})?$/;
const cleanAmount = (v: string) => v.trim().replace(/[£,\s]/g, "");

/** An amount in pounds; blank becomes `blank` (null = blank not allowed). */
const amount = (max: number, missing: string | null) =>
  z.string().transform((raw, ctx): number | null => {
    const v = cleanAmount(raw);
    if (!v) {
      if (missing) ctx.addIssue({ code: "custom", message: missing });
      return null;
    }
    if (!MONEY_RE.test(v) || Number(v) > max) {
      ctx.addIssue({ code: "custom", message: max >= 1000 ? `Enter an amount such as 4.99, up to £${max.toLocaleString("en-GB")}.` : "Enter an amount such as 4.99." });
      return z.NEVER;
    }
    return Math.round(Number(v) * 100) / 100;
  });

const message = (max: number) => z.string().trim().max(max, `Keep this under ${max.toLocaleString("en-GB")} characters.`);

export const orderingSchema = z.object({ enabled: z.boolean(), pausedMessage: message(500) });

const optionSchema = z.object({
  key: z.string(),
  id: z.string().max(40),
  name: z.string().trim().min(1, "Give this option a name customers will recognise.").max(80, "Keep the name under 80 characters."),
  kind: z.enum(["delivery", "collect"]),
  price: amount(1000, "Enter the price (0 for free)."),
  freeFrom: amount(1_000_000, null),
  estimate: message(80),
  excludedAreas: z
    .string()
    .max(2000, "That's too many areas. Use whole areas such as IV instead of every district.")
    .transform((v, ctx) => {
      const { areas, invalid } = parseAreas(v);
      if (invalid.length) {
        ctx.addIssue({ code: "custom", message: `“${invalid[0]}” isn't a postcode area. Use areas like BT, districts like IV1 or ranges like PA20-49.` });
        return z.NEVER;
      }
      return areas;
    }),
  enabled: z.boolean(),
});

export const deliveryOptionsSchema = z
  .object({ options: z.array(optionSchema).min(1, "Keep standard delivery.").max(12, "Up to 12 delivery options.") })
  .superRefine((v, ctx) => {
    if (v.options[0]?.id !== STANDARD_DELIVERY_ID) ctx.addIssue({ code: "custom", path: ["options"], message: "Standard delivery must stay first." });
    if (v.options[0] && v.options[0].freeFrom === null)
      ctx.addIssue({
        code: "custom",
        path: ["options", 0, "freeFrom"],
        message: "Enter the amount from which standard delivery is free (0 for always free). The shop's delivery messages show it.",
      });
    const names = new Map<string, number>();
    v.options.forEach((o, i) => {
      const key = o.name.toLowerCase();
      if (names.has(key)) ctx.addIssue({ code: "custom", path: ["options", i, "name"], message: "Another option already has this name." });
      else names.set(key, i);
    });
  })
  .transform(({ options }): DeliveryOption[] => {
    const taken = new Set(options.map((o) => o.id).filter((id) => /^[a-z0-9-]{1,40}$/.test(id)));
    return options.map((o, i) => {
      let id = i === 0 ? STANDARD_DELIVERY_ID : o.id;
      if (i > 0 && (!/^[a-z0-9-]{1,40}$/.test(id) || id === STANDARD_DELIVERY_ID)) {
        const base = slugify(o.name).slice(0, 34) || "option";
        id = base;
        for (let n = 2; taken.has(id) || id === STANDARD_DELIVERY_ID; n++) id = `${base}-${n}`;
        taken.add(id);
      }
      const kind = i === 0 ? "delivery" : o.kind;
      return {
        id,
        name: o.name,
        kind,
        price: o.price ?? 0,
        freeFrom: o.freeFrom,
        estimate: o.estimate,
        excludedAreas: kind === "collect" ? [] : o.excludedAreas,
        enabled: i === 0 ? true : o.enabled,
      };
    });
  });

export const formRulesSchema = z.object({
  guestCheckout: z.boolean(),
  phone: z.enum(["required", "optional", "hidden"]),
  company: z.boolean(),
  notes: z.boolean(),
  requireTerms: z.boolean(),
  minimumOrder: amount(100_000, null).transform((v) => v ?? 0),
});

export const messagesSchema = z.object({ notice: message(500), thankYou: message(1000), emailNote: message(1000) });
