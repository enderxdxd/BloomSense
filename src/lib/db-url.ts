const QUOTED = /^(["'])([\s\S]*)\1$/;
const ENV_PREFIX = /^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/;

/**
 * Normalise a connection string coming from an environment variable.
 *
 * Hosting dashboards (Vercel, Railway, Fly) store the value exactly as pasted,
 * so a line copied out of `.env.local` arrives carrying its surrounding quotes
 * and sometimes the `DATABASE_URL=` prefix. Prisma rejects both with an opaque
 * `P1013: the scheme is not recognized`, which only surfaces mid-deploy.
 * Stripping them here keeps a stray quote from costing a deployment.
 */
export function normalizeConnectionString(
  raw: string | undefined | null,
): string | undefined {
  if (!raw) return undefined;

  let value = raw.trim();
  // Prefix and quotes can nest either way round, so peel until stable.
  for (let i = 0; i < 4; i += 1) {
    const before = value;
    value = value.replace(ENV_PREFIX, "").trim();
    const quoted = QUOTED.exec(value);
    if (quoted) value = quoted[2].trim();
    if (value === before) break;
  }

  return value.length > 0 ? value : undefined;
}

/**
 * The scheme of a connection string, safe to log — everything before `://`,
 * which never contains credentials. Used to explain a bad value without
 * leaking the password inside it.
 */
export function connectionScheme(value: string): string {
  const separator = value.indexOf("://");
  return separator > 0 ? value.slice(0, separator) : value.slice(0, 12);
}

/**
 * Characters that genuinely break the URL parser when left raw in a
 * password — each one ends the credentials section early. Verified against
 * Node's parser: a raw space, `@`, `%` or bracket in the password does not
 * throw, so listing them here would send people chasing the wrong character.
 */
const MUST_ENCODE: Array<[string, string]> = [
  ["/", "%2F"],
  ["#", "%23"],
  ["?", "%3F"],
];

export type ConnectionFault =
  | { kind: "missing" }
  | { kind: "empty" }
  | { kind: "fragment"; length: number }
  | { kind: "wrongScheme"; scheme: string; firstChar: string | undefined }
  | { kind: "unencoded"; suspects: string[] }
  | { kind: "badPort"; port: string }
  | { kind: "unparseable" };

export type ConnectionInspection =
  | { ok: true; url: URL }
  | { ok: false; fault: ConnectionFault };

/** Name the first character when it is something that should not be there. */
function describeFirstChar(value: string): string | undefined {
  const names: Record<number, string> = {
    0x22: 'a double quote (")',
    0x27: "a single quote (')",
    0x60: "a backtick (`)",
    0x20: "a space",
  };
  return names[value.codePointAt(0) ?? 0];
}

/** Split a connection string at the last `@` into credentials and the rest. */
function splitAuthority(value: string): { credentials: string; hostPort: string } {
  const afterScheme = value.slice(value.indexOf("://") + 3);
  const at = afterScheme.lastIndexOf("@");
  if (at < 0) return { credentials: "", hostPort: afterScheme };
  return {
    credentials: afterScheme.slice(0, at),
    hostPort: afterScheme.slice(at + 1),
  };
}

/** Reserved characters in the credentials that end the section early. */
function unencodedSuspects(credentials: string): string[] {
  return MUST_ENCODE.filter(([char]) => credentials.includes(char)).map(
    ([char, encoded]) => `${char} → ${encoded}`,
  );
}

/** The port as written, when it is present but not a number. */
function badPort(hostPort: string): string | undefined {
  const host = hostPort.split("/")[0];
  const colon = host.lastIndexOf(":");
  if (colon < 0) return undefined;
  const port = host.slice(colon + 1);
  return port !== "" && !/^\d+$/.test(port) ? port : undefined;
}

/**
 * Classify a connection string without ever exposing its contents.
 *
 * The distinction that matters: a value carrying a valid scheme that still
 * fails to parse is almost always a password with reserved characters left
 * unencoded, which is a completely different fix from a bad scheme — and
 * reporting it as "expected postgresql, got postgresql" helps nobody.
 */
export function inspectConnectionString(
  raw: string | undefined | null,
): ConnectionInspection {
  if (raw === undefined || raw === null) {
    return { ok: false, fault: { kind: "missing" } };
  }

  const value = normalizeConnectionString(raw);
  if (!value) return { ok: false, fault: { kind: "empty" } };

  if (!value.includes("://")) {
    return { ok: false, fault: { kind: "fragment", length: value.length } };
  }

  const scheme = connectionScheme(value);
  if (!/^postgres(ql)?$/i.test(scheme)) {
    return {
      ok: false,
      fault: {
        kind: "wrongScheme",
        scheme,
        firstChar: describeFirstChar(value),
      },
    };
  }

  try {
    return { ok: true, url: new URL(value) };
  } catch {
    // The scheme is right, so work out which part the parser choked on.
    const { credentials, hostPort } = splitAuthority(value);

    const suspects = unencodedSuspects(credentials);
    if (suspects.length > 0) {
      return { ok: false, fault: { kind: "unencoded", suspects } };
    }

    const port = badPort(hostPort);
    if (port !== undefined) {
      return { ok: false, fault: { kind: "badPort", port } };
    }

    return { ok: false, fault: { kind: "unparseable" } };
  }
}

/** Turn a fault into an instruction. Contains nothing drawn from the value. */
export function explainConnectionFault(
  name: string,
  fault: ConnectionFault,
  expectation: string,
): string {
  switch (fault.kind) {
    case "missing":
      return `${name} is not set. Expected ${expectation}.`;
    case "empty":
      return `${name} is set but empty. Expected ${expectation}.`;
    case "fragment":
      return (
        `${name} contains no "://" at all, so it is a fragment rather than a ` +
        `whole connection string (${fault.length} characters). Nothing of it ` +
        `is shown here because a fragment can start inside the password. ` +
        `Re-copy the full string from Supabase (Project Settings > Database > ` +
        `Connection string > URI) and substitute your password into it.`
      );
    case "wrongScheme":
      return (
        `${name} has scheme "${fault.scheme}", expected "postgresql".` +
        (fault.firstChar ? ` It starts with ${fault.firstChar}.` : "") +
        ` Paste the value only — no surrounding quotes, no "${name}=" prefix.`
      );
    case "unencoded":
      return (
        `${name} starts with postgresql:// but will not parse, because the ` +
        `password contains characters that end the credentials early and must ` +
        `be percent-encoded: ${fault.suspects.join(", ")}. Replace them inside ` +
        `the password only, leaving the rest of the URL alone.`
      );
    case "badPort":
      return (
        `${name} starts with postgresql:// but its port is "${fault.port}", ` +
        `which is not a number. Use 6543 for the transaction pooler or 5432 ` +
        `for the session pooler.`
      );
    case "unparseable":
      return (
        `${name} starts with postgresql:// but will not parse as a URL. ` +
        `Check the host for stray spaces or brackets, and percent-encode any ` +
        `/, # or ? inside the password. Nothing of the value is shown here ` +
        `because it may contain the password.`
      );
  }
}

/**
 * Read and normalise a connection-string env var, warning (never throwing —
 * `prisma generate` must keep working without a database) when the result
 * still is not something Prisma can parse.
 */
export function readConnectionString(name: string): string | undefined {
  const value = normalizeConnectionString(process.env[name]);
  if (!value) return undefined;

  if (!/^postgres(ql)?:\/\//i.test(value)) {
    console.warn(
      `[db-url] ${name} does not look like a PostgreSQL connection string ` +
        `(scheme: "${connectionScheme(value)}"). Expected it to start with ` +
        `postgresql://. Check for stray quotes or a copied variable name.`,
    );
  }

  return value;
}
