// Runs the Next.js CLI with Node deprecation warnings silenced in every child process.
// Why: on Node 26, Tailwind's loader triggers a DeprecationWarning (DEP0205) inside Turbopack's PostCSS worker, and
// the warning text breaks the worker's message protocol, so every page fails with "Node.js subprocess crashed".
// NODE_OPTIONS is inherited by those workers; a flag on this process alone would not be.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nodeOptions = [process.env.NODE_OPTIONS, "--no-deprecation"].filter(Boolean).join(" ");
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
