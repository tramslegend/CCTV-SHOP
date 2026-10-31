// Runs before `next build`. Databases set up before the CCTV SPANIA logo existed still point at the reference site's
// logo: switch those to /brand/cctv-spania-logo.png (and its dark version). Any other logo, such as one chosen later in
// Admin → Settings → Store details, is left alone, so this is safe to run on every build.
import { db } from "../src/db";

const OLD = "/sites/cctvmaster/logos/cctv-master-logo-v3.png";
const OLD_DARK = "/sites/cctvmaster/logos/cctv-master-logo-v3-dark.png";
const LOGO = "/brand/cctv-spania-logo.png";
const LOGO_DARK = "/brand/cctv-spania-logo-dark.png";

async function main() {
  try {
    const settings = db.raw.collection<{ _id: string; value: { logoUrl?: string; logoDarkUrl?: string } }>("settings");
    const { modifiedCount } = await settings.updateOne(
      { _id: "store", "value.logoUrl": OLD, "value.logoDarkUrl": { $in: [OLD_DARK, "", null] } },
      { $set: { "value.logoUrl": LOGO, "value.logoDarkUrl": LOGO_DARK, updatedAt: new Date() } },
    );
    if (modifiedCount) {
      await db.catalogState.updateOne({ _id: 1 }, { $inc: { version: 1 }, $set: { updatedAt: new Date() } });
      console.log(`[logo] switched the shop logo to ${LOGO}`);
    } else {
      console.log("[logo] the shop doesn't use the reference logo: nothing to change");
    }
  } finally {
    await db.client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
