// Creates every MongoDB index (unique SKUs, slugs, order numbers, discount codes…). Safe to run again.
//   npm run db:setup            (uses MONGODB_URI from .env.local, or the environment)
import { db, ensureIndexes } from "../src/db";

async function main() {
  try {
    await ensureIndexes();
    console.log(`Indexes ready in database "${db.raw.databaseName}".`);
  } finally {
    await db.client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
