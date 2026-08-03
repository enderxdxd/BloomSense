/**
 * Preflight for the deploy build.
 *
 * `prisma migrate deploy` reports a malformed connection string as a bare
 * `P1013: the scheme is not recognized` — it names neither the variable at
 * fault nor what is wrong with it, which turns every fix into another
 * five-minute build. This runs first and says exactly which variable is
 * broken and how, without ever printing credentials.
 */
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

console.log(banner());

const problems: string[] = [];

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

  // Non-fatal advice: these produce confusing failures further along.
  if (url.hostname.startsWith("db.") && url.hostname.endsWith(".supabase.co")) {
    console.log(
      `    warning: ${check.name} uses the direct Supabase host, which is ` +
        `IPv6-only and unreachable from most build runners. Use the pooler host.`,
    );
  }
  if (check.name === "DIRECT_URL" && url.port === "6543") {
    console.log(
      `    warning: DIRECT_URL is on the transaction pooler (6543). Migrations ` +
        `cannot run through pgbouncer in transaction mode — use port 5432.`,
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
