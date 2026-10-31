// Runs before `next build`, after use-brand-logo.ts. A shop that still carries the reference site's identity (store
// name "CCTV Master") is rebranded once, so the site can be public:
//  - store details: name "CCTV Spania"; the reference company's phone, email, address, map link, opening hours, company
//    name and numbers cleared (empty fields are hidden; add your own in Admin → Settings → Store details);
//  - page titles ("%s | CCTV Master");
//  - catalogue and blog text: "CCTV Master" becomes "CCTV Spania" and the reference phone number is taken out;
//  - the blog post about the reference shop's London trade counter goes back to draft.
// A shop with any other name is left alone, so this is safe to run on every build.
import { db } from "../src/db";

const NAME = "CCTV Spania";
const OLD_NAME = /^cctv master$/i;
const MENTIONS = /cctv master|020 ?8153 ?4657/i;
const CONTENT = ["blog_posts", "categories", "products", "media", "product_images", "settings"] as const;
const TRADE_COUNTER_POST = "cctv-hanger-lane-trade-counter-collection";

function rewrite(text: string) {
  return text
    .replace(/\b(Phone|Ring|Call) 020 ?8153 ?4657/g, "Contact us")
    .replace(/\b(phone|ring|call) 020 ?8153 ?4657/g, "contact us")
    .replace(/ on 020 ?8153 ?4657/g, "")
    .replace(/020 ?8153 ?4657/g, "us")
    .replace(/CCTV Master UK/gi, NAME)
    .replace(/CCTV Master/gi, NAME);
}

/** Rewrites every string in a stored document; dates, ids and numbers are kept as they are. */
function rewriteDeep(value: unknown): unknown {
  if (typeof value === "string") return rewrite(value);
  if (Array.isArray(value)) return value.map(rewriteDeep);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteDeep(v)]));
  }
  return value;
}

async function main() {
  try {
    const settings = db.raw.collection<{ _id: string; value: { name?: string } }>("settings");
    const store = await settings.findOne({ _id: "store" });
    if (!store || !OLD_NAME.test(store.value.name ?? "")) {
      console.log("[rebrand] the shop isn't named CCTV Master: nothing to change");
      return;
    }

    await settings.updateOne(
      { _id: "store" },
      {
        $set: {
          "value.name": NAME,
          "value.legalName": "",
          "value.phone": "",
          "value.email": "",
          "value.address": { line1: "", line2: "", city: "", county: "", postcode: "", country: "" },
          "value.mapUrl": "",
          "value.openingHours": [],
          "value.companyNumber": "",
          "value.vatNumber": "",
          "value.registeredOffice": "",
          updatedAt: new Date(),
        },
      },
    );

    let rewritten = 0;
    for (const name of CONTENT) {
      const collection = db.raw.collection<{ _id: unknown }>(name);
      for (const doc of await collection.find().toArray()) {
        if (!MENTIONS.test(JSON.stringify(doc))) continue;
        const next = rewriteDeep(doc) as typeof doc;
        if (JSON.stringify(next) === JSON.stringify(doc)) continue;
        await collection.replaceOne({ _id: doc._id }, next);
        rewritten++;
      }
    }

    const hidden = await db.raw.collection("blog_posts").updateOne({ slug: TRADE_COUNTER_POST }, { $set: { status: "draft", updatedAt: new Date() } });
    await db.catalogState.updateOne({ _id: 1 }, { $inc: { version: 1 }, $set: { updatedAt: new Date() } });
    console.log(`[rebrand] now ${NAME}: store details cleared, ${rewritten} records rewritten, trade-counter post hidden: ${hidden.modifiedCount === 1}`);
  } finally {
    await db.client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
