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
