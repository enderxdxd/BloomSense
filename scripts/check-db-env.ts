/**
 * Preflight for the deploy build.
 *
 * `prisma migrate deploy` reports a malformed connection string as a bare
 * `P1013: the scheme is not recognized` — it names neither the variable at
 * fault nor what is wrong with it, which turns every fix into another
 * five-minute build. Worse, a reachable-but-wrong endpoint makes it hang
 * rather than fail. This runs first and turns both into a fast, specific
 * error, without ever printing credentials.
 */
import net from "node:net";
import { config } from "dotenv";
import { explainConnectionFault, inspectConnectionString } from "../src/lib/db-url";

config({ path: ".env.local" });
config();

interface Check {
  name: string;
  expectation: string;
}

const CHECKS: Check[] = [
  {
    name: "DATABASE_URL",
    expectation: "transaction pooler, port 6543",
  },
  {
    name: "DIRECT_URL",
    expectation: "session pooler, port 5432 — used by prisma migrate deploy",
  },
];

const PROBE_TIMEOUT_MS = 15_000;

/** A description of the URL that carries no user or password. */
function describe(url: URL): string {
  const params = [...url.searchParams.keys()];
  const query = params.length > 0 ? `?${params.join("&")}` : "";
  return `${url.protocol}//${url.hostname}:${url.port || "(default)"}${url.pathname}${query}`;
}

/**
 * Say which build this is. Without it a stale redeploy is indistinguishable
 * from a fresh one, and an old log gets read as evidence about current code.
 */
function banner(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const env = process.env.VERCEL_ENV;
  const where = [sha && `commit ${sha}`, env && `env ${env}`].filter(Boolean);
  return where.length > 0
    ? `BloomSense preflight (${where.join(", ")})`
    : "BloomSense preflight (local)";
}

/** Can we open a TCP connection at all? Auth is not attempted. */
function probe(
  host: string,
  port: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    const finish = (result: { ok: true } | { ok: false; reason: string }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once("connect", () => finish({ ok: true }));
    socket.once("timeout", () =>
      finish({
        ok: false,
        reason: `no response within ${PROBE_TIMEOUT_MS / 1000}s`,
      }),
    );
    socket.once("error", (error: NodeJS.ErrnoException) =>
      finish({ ok: false, reason: error.code ?? error.message }),
    );
  });
}

async function main(): Promise<void> {
  console.log(banner());

  const problems: string[] = [];
  let migrationTarget: URL | undefined;

  for (const check of CHECKS) {
    const result = inspectConnectionString(process.env[check.name]);

    if (!result.ok) {
      problems.push(
        explainConnectionFault(check.name, result.fault, check.expectation),
      );
      continue;
    }

    const url = result.url;
    console.log(`  ${check.name}: ${describe(url)}`);

    // Fatal, not advisory: prisma migrate deploy takes a session-scoped
    // advisory lock, which pgbouncer in transaction mode never grants. The
    // command does not fail — it hangs until the build hits its time limit,
    // so this has to stop the build now rather than warn about it.
    if (check.name === "DIRECT_URL" && url.port === "6543") {
      problems.push(
        `DIRECT_URL is on the transaction pooler (port 6543). Migrations take ` +
          `a session-scoped advisory lock that pgbouncer never grants in ` +
          `transaction mode, so prisma migrate deploy would hang until the ` +
          `build times out. Point DIRECT_URL at the session pooler on port ` +
          `5432 — same host, same credentials, only the port differs from ` +
          `DATABASE_URL.`,
      );
      continue;
    }

    if (url.hostname.startsWith("db.") && url.hostname.endsWith(".supabase.co")) {
      console.log(
        `    warning: ${check.name} uses the direct Supabase host, which is ` +
          `IPv6-only and unreachable from most build runners. Use the pooler host.`,
      );
    }

    if (check.name === "DIRECT_URL") migrationTarget = url;
  }

  // Only worth probing once the string itself is sound.
  if (problems.length === 0 && migrationTarget) {
    const host = migrationTarget.hostname;
    const port = Number(migrationTarget.port || 5432);
    let reachable = await probe(host, port);
    if (!reachable.ok) reachable = await probe(host, port); // one retry

    if (reachable.ok) {
      console.log(`  reachable: ${host}:${port}`);
    } else {
      problems.push(
        `DIRECT_URL points at ${host}:${port}, which did not accept a ` +
          `connection (${reachable.reason}). prisma migrate deploy would hang ` +
          `here until the build times out. Check that the Supabase project is ` +
          `not paused, and that this is the pooler host — the direct host ` +
          `db.<ref>.supabase.co is IPv6-only and unreachable from build runners.`,
      );
    }
  }

  if (problems.length > 0) {
    console.error("\nDatabase environment is not usable:\n");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      "\nFix these in your host's environment variables (Vercel: Settings > " +
        "Environment Variables) and redeploy.\n",
    );
    process.exit(1);
  }

  console.log("Database environment OK.");
}

void main();
