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
import { connectionScheme, normalizeConnectionString } from "../src/lib/db-url";

config({ path: ".env.local" });
config();

interface Check {
  name: string;
  required: boolean;
  expectation: string;
}

const CHECKS: Check[] = [
  {
    name: "DATABASE_URL",
    required: true,
    expectation: "transaction pooler, port 6543",
  },
  {
    name: "DIRECT_URL",
    required: true,
    expectation: "session pooler, port 5432 — used by prisma migrate deploy",
  },
];

/** A description of the URL that carries no user or password. */
function describe(url: URL): string {
  const params = [...url.searchParams.keys()];
  const query = params.length > 0 ? `?${params.join("&")}` : "";
  return `${url.protocol}//${url.hostname}:${url.port || "(default)"}${url.pathname}${query}`;
}

/** Name the first character when it is something that should not be there. */
function firstCharHint(value: string): string {
  const code = value.codePointAt(0) ?? 0;
  const names: Record<number, string> = {
    0x22: 'a double quote (")',
    0x27: "a single quote (')",
    0x60: "a backtick (`)",
    0x20: "a space",
  };
  const name = names[code];
  return name ? ` It starts with ${name}.` : "";
}

const problems: string[] = [];

for (const check of CHECKS) {
  const raw = process.env[check.name];
  const value = normalizeConnectionString(raw);

  if (!value) {
    const state = raw === undefined ? "not set" : "set but empty";
    if (check.required) {
      problems.push(`${check.name} is ${state}. Expected ${check.expectation}.`);
    } else {
      console.log(`  ${check.name}: ${state} (optional)`);
    }
    continue;
  }

  let parsed: URL | undefined;
  try {
    parsed = new URL(value);
  } catch {
    parsed = undefined;
  }

  if (!parsed || !/^postgres(ql)?:$/i.test(parsed.protocol)) {
    // Distinguish a wrong scheme from no scheme at all — the second means the
    // stored value is a fragment, and saying "scheme" for it only misleads.
    const detail = value.includes("://")
      ? `Detected scheme "${connectionScheme(value)}", expected "postgresql".` +
        `${firstCharHint(value)} Paste the value only — no surrounding quotes, ` +
        `no "${check.name}=" prefix.`
      : `The value contains no "://" at all, so it is a fragment rather than a ` +
        `whole connection string (${value.length} characters). Nothing of it is ` +
        `shown here because a fragment can start inside the password. Re-copy ` +
        `the full string from Supabase (Project Settings > Database > ` +
        `Connection string > URI) and substitute your password into it.`;

    problems.push(`${check.name} is not a PostgreSQL connection string. ${detail}`);
    continue;
  }

  console.log(`  ${check.name}: ${describe(parsed)}`);

  // Non-fatal advice: these produce confusing failures further along.
  if (parsed.hostname.startsWith("db.") && parsed.hostname.endsWith(".supabase.co")) {
    console.log(
      `    warning: ${check.name} uses the direct Supabase host, which is ` +
        `IPv6-only and unreachable from most build runners. Use the pooler host.`,
    );
  }
  if (check.name === "DIRECT_URL" && parsed.port === "6543") {
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
