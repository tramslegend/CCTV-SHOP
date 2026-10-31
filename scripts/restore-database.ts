// Loads database/shop.ejson.gz (a full copy of the shop's MongoDB data, saved with this package) into the database in
// MONGODB_URI / MONGODB_DB, replacing everything in it, then creates the indexes. Login sessions aren't included.
//
//   npm run db:restore -- --replace      (uses MONGODB_URI from .env.local, or the environment)
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { BSON, type Document } from "mongodb";

const file = path.resolve("database/shop.ejson.gz");

if (!process.argv.includes("--replace")) {
  console.error("This replaces everything in the database. Run it again with --replace to go ahead.");
  process.exit(1);
}

async function main() {
  const { db, ensureIndexes } = await import("../src/db");
  try {
    const dump = BSON.EJSON.parse(gunzipSync(fs.readFileSync(file)).toString("utf8"), { relaxed: false }) as {
      exportedAt: string;
      collections: Record<string, Document[]>;
    };
    for (const { name } of await db.raw.listCollections({}, { nameOnly: true }).toArray()) {
      if (!name.startsWith("system.")) await db.raw.collection(name).drop();
    }
    await ensureIndexes();
    for (const [name, docs] of Object.entries(dump.collections)) {
      for (let i = 0; i < docs.length; i += 1000) await db.raw.collection(name).insertMany(docs.slice(i, i + 1000), { ordered: false });
      console.log(`${name}: ${docs.length}`);
    }
    console.log(`Restored the copy from ${dump.exportedAt} into "${db.raw.databaseName}".`);
  } finally {
    await db.client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
