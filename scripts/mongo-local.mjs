// Local MongoDB for development (npm run db:local): a one-member replica set (transactions need one) on port 27017,
// keeping its data in .data/mongo between runs. The first start downloads the MongoDB server once.
// Point MONGODB_URI at mongodb://127.0.0.1:27017/?replicaSet=rs0 in .env.local.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const dbPath = path.resolve(".data/mongo");
mkdirSync(dbPath, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
  // The first start on Windows can be slow (the new server program gets scanned), so allow two minutes.
  instanceOpts: [{ port: 27017, dbPath, ip: "127.0.0.1", launchTimeout: 120_000 }],
});
console.log(`MongoDB running: mongodb://127.0.0.1:27017/?replicaSet=rs0 (data in ${dbPath})`);

const stop = async () => {
  // Keep the data folder: it holds the local database.
  await replSet.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
