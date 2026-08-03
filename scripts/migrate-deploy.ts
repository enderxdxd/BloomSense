/**
 * `prisma migrate deploy` with a hard time limit.
 *
 * Migrations take a session-scoped advisory lock. When that lock is already
 * held — by a pooler that will not grant it, or by a session left behind
 * when an earlier build was killed mid-migration — the command does not
 * fail. It waits, silently, for as long as it is allowed to, which on a
 * host means the entire build limit.
 *
 * A migration that has not finished in a few minutes is not going to
 * finish. Kill it and say what to look at.
 */
import { spawn } from "node:child_process";

const TIMEOUT_MS = Number(process.env.MIGRATE_TIMEOUT_MS ?? 300_000);
const WINDOWS = process.platform === "win32";

const child = spawn("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: WINDOWS,
  // Own process group, so the whole tree can be signalled at once. npx and
  // the schema engine are separate processes; signalling only the direct
  // child leaves the engine alive, still holding the build open.
  detached: !WINDOWS,
});

/** Signal the child and everything it spawned. */
function killTree(signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  if (WINDOWS) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    // Group already gone.
  }
}

let timedOut = false;

const timer = setTimeout(() => {
  timedOut = true;
  killTree("SIGTERM");
  // The engine can ignore SIGTERM while blocked on the lock.
  setTimeout(() => killTree("SIGKILL"), 5_000).unref();
}, TIMEOUT_MS);

child.on("exit", (code, signal) => {
  clearTimeout(timer);

  if (timedOut) {
    console.error(
      `\nprisma migrate deploy did not finish within ${TIMEOUT_MS / 1000}s ` +
        `and was killed.\n\n` +
        `It was almost certainly blocked on Prisma's advisory lock, not doing ` +
        `slow work. The two causes:\n\n` +
        `  1. DIRECT_URL points at the transaction pooler (port 6543), which ` +
        `never grants a session-scoped lock. It must be port 5432.\n` +
        `  2. An earlier build was killed mid-migration and its session still ` +
        `holds the lock. In the Supabase SQL editor:\n\n` +
        `       select a.pid, a.state, a.state_change, a.query\n` +
        `         from pg_locks l join pg_stat_activity a using (pid)\n` +
        `        where l.locktype = 'advisory';\n\n` +
        `     then release it with select pg_terminate_backend(<pid>);\n`,
    );
    process.exit(1);
  }

  if (signal !== null) {
    console.error(`\nprisma migrate deploy was terminated by ${signal}.`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  clearTimeout(timer);
  console.error(`\nCould not run prisma migrate deploy: ${error.message}`);
  process.exit(1);
});
