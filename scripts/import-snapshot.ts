// Loads snapshot/shop.ejson.gz (a copy of the local development database, never committed) into MONGODB_URI
// before `next build` prerenders, so the deployment shows the same data as localhost:3000. Vercel holds the database
// connection as a sensitive variable, so the copy has to happen inside the build.
//
// Runs once per snapshot: the target database records the snapshot's hash in `snapshot_imports`, and later builds
// leave the data alone. Without a snapshot file it does nothing. It never writes to the database the snapshot came from.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { BSON, type Document } from "mongodb";

const file = path.resolve("snapshot/shop.ejson.gz");

interface Snapshot {
  source: { host: string; db: string };
  exportedAt: string;
  collections: Record<string, Document[]>;
}

async function main() {
  if (!fs.existsSync(file)) {
    console.log("[snapshot] no snapshot/shop.ejson.gz: nothing to import");
    return;
  }
  const { db, ensureIndexes } = await import("../src/db");
  try {
    const target = db.raw;
    const imports = target.collection<{ _id: string; exportedAt: string; importedAt: Date }>("snapshot_imports");
    const host = (() => {
      try {
        return new URL(process.env.MONGODB_URI!.replace(/^mongodb(\+srv)?:/, "http:")).host;
      } catch {
        return "";
      }
    })();
    const gz = fs.readFileSync(file);
    const hash = createHash("sha256").update(gz).digest("hex");
    const snapshot = BSON.EJSON.parse(gunzipSync(gz).toString("utf8"), { relaxed: false }) as Snapshot;

    if (host === snapshot.source.host && target.databaseName === snapshot.source.db) {
      throw new Error("Refusing to import a snapshot into the database it was exported from.");
    }
    if (await imports.findOne({ _id: hash })) {
      console.log(`[snapshot] ${hash.slice(0, 12)} already imported into "${target.databaseName}": leaving the data alone`);
      return;
    }

    console.log(`[snapshot] importing ${hash.slice(0, 12)} (exported ${snapshot.exportedAt}) into "${target.databaseName}"`);
    for (const { name } of await target.listCollections({}, { nameOnly: true }).toArray()) {
      if (!name.startsWith("system.")) await target.collection(name).drop();
    }
    await ensureIndexes();
    for (const [name, docs] of Object.entries(snapshot.collections)) {
      for (let i = 0; i < docs.length; i += 1000) await target.collection(name).insertMany(docs.slice(i, i + 1000), { ordered: false });
      console.log(`[snapshot]   ${name}: ${docs.length}`);
    }
    await imports.insertOne({ _id: hash, exportedAt: snapshot.exportedAt, importedAt: new Date() });
    console.log("[snapshot] done");
  } finally {
    await db.client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
