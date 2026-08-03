/**
 * Regression cover for the P1013 deploy failure: a connection string pasted
 * into a host dashboard straight out of .env.local, quotes and all.
 */
import {
  connectionScheme,
  explainConnectionFault,
  inspectConnectionString,
  normalizeConnectionString,
  readConnectionString,
} from "@/lib/db-url";

const URL = "postgresql://user:p%40ss@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

describe("normalizeConnectionString", () => {
  it("leaves a clean connection string untouched", () => {
    expect(normalizeConnectionString(URL)).toBe(URL);
  });

  it("strips surrounding double and single quotes", () => {
    expect(normalizeConnectionString(`"${URL}"`)).toBe(URL);
    expect(normalizeConnectionString(`'${URL}'`)).toBe(URL);
  });

  it("strips a copied variable-name prefix", () => {
    expect(normalizeConnectionString(`DATABASE_URL=${URL}`)).toBe(URL);
  });

  it("strips a prefix and quotes together, in either order", () => {
    expect(normalizeConnectionString(`DATABASE_URL="${URL}"`)).toBe(URL);
    expect(normalizeConnectionString(`"DATABASE_URL=${URL}"`)).toBe(URL);
  });

  it("trims surrounding whitespace and newlines", () => {
    expect(normalizeConnectionString(`  ${URL}\n`)).toBe(URL);
  });

  it("preserves characters inside the string", () => {
    // The escaped @ in the password must survive untouched.
    expect(normalizeConnectionString(`"${URL}"`)).toContain("p%40ss");
  });

  it("returns undefined for missing or empty values", () => {
    expect(normalizeConnectionString(undefined)).toBeUndefined();
    expect(normalizeConnectionString("")).toBeUndefined();
    expect(normalizeConnectionString('   ""  ')).toBeUndefined();
  });
});

describe("connectionScheme", () => {
  it("returns the scheme without any credentials", () => {
    expect(connectionScheme(URL)).toBe("postgresql");
    expect(connectionScheme(URL)).not.toContain("p%40ss");
  });

  it("truncates a value that has no scheme separator", () => {
    expect(connectionScheme("nonsense-value-that-is-long")).toBe("nonsense-val");
  });
});

describe("readConnectionString", () => {
  const NAME = "TEST_DB_URL";
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    delete process.env[NAME];
  });

  it("normalises the value and stays quiet when it is valid", () => {
    process.env[NAME] = `"${URL}"`;
    expect(readConnectionString(NAME)).toBe(URL);
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns undefined when the variable is unset", () => {
    expect(readConnectionString(NAME)).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns without leaking credentials when the scheme is wrong", () => {
    process.env[NAME] = "mysql://user:hunter2@localhost:3306/db";
    readConnectionString(NAME);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0][0] as string;
    expect(message).toContain(NAME);
    expect(message).toContain("mysql");
    expect(message).not.toContain("hunter2");
  });
});

describe("inspectConnectionString", () => {
  const fault = (raw: string | undefined) => {
    const result = inspectConnectionString(raw);
    if (result.ok) throw new Error("expected a fault");
    return result.fault;
  };

  it("accepts a valid string and hands back the parsed URL", () => {
    const result = inspectConnectionString(URL);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url.hostname).toBe("aws-0-us-east-2.pooler.supabase.com");
      expect(result.url.port).toBe("6543");
    }
  });

  it("still accepts a value wrapped in quotes", () => {
    expect(inspectConnectionString(`"${URL}"`).ok).toBe(true);
  });

  it("separates missing from empty", () => {
    expect(fault(undefined)).toEqual({ kind: "missing" });
    expect(fault("")).toEqual({ kind: "empty" });
  });

  it("calls a value with no :// a fragment and reports its length", () => {
    expect(fault("1-us-east-2.pooler.supabase.com:6543/postgres")).toEqual({
      kind: "fragment",
      length: 45,
    });
  });

  it("names a genuinely wrong scheme", () => {
    const result = fault("mysql://user:pw@localhost:3306/db");
    expect(result).toMatchObject({ kind: "wrongScheme", scheme: "mysql" });
  });

  it.each([
    ["/", "%2F"],
    ["#", "%23"],
    ["?", "%3F"],
  ])("blames encoding, not the scheme, for a raw %s in the password", (char, encoded) => {
    const result = fault(
      `postgresql://user:pa${char}ss@host.example.com:5432/postgres`,
    );
    if (result.kind !== "unencoded") throw new Error(`got ${result.kind}`);
    expect(result.suspects).toContain(`${char} → ${encoded}`);
  });

  it("reports a non-numeric port as its own problem", () => {
    const result = fault("postgresql://user:pw@host.example.com:PORT/postgres");
    expect(result).toEqual({ kind: "badPort", port: "PORT" });
  });

  it("does not blame the query string's ? on the password", () => {
    // The ? in `?pgbouncer=true` is legitimate and must not trip the check.
    expect(inspectConnectionString(URL).ok).toBe(true);
  });

  it("accepts characters that look alarming but parse fine", () => {
    // A raw @ or space in the password does not break the parser; claiming
    // otherwise would send someone re-encoding a value that was already good.
    expect(inspectConnectionString("postgresql://u:pa@ss@h.com:5432/db").ok).toBe(
      true,
    );
    expect(inspectConnectionString("postgresql://u:pa ss@h.com:5432/db").ok).toBe(
      true,
    );
  });
});

describe("explainConnectionFault", () => {
  it("never claims the expected scheme was also what it found", () => {
    const message = explainConnectionFault(
      "DIRECT_URL",
      { kind: "unencoded", suspects: ["@ → %40"] },
      "session pooler",
    );
    expect(message).not.toMatch(/scheme "postgresql", expected "postgresql"/);
    expect(message).toContain("percent-encoded");
    expect(message).toContain("@ → %40");
  });

  it("names the variable in every case", () => {
    const faults = [
      { kind: "missing" as const },
      { kind: "empty" as const },
      { kind: "fragment" as const, length: 60 },
      { kind: "wrongScheme" as const, scheme: "psql", firstChar: undefined },
      { kind: "unencoded" as const, suspects: ["/ → %2F"] },
      { kind: "badPort" as const, port: "PORT" },
      { kind: "unparseable" as const },
    ];
    for (const f of faults) {
      expect(explainConnectionFault("DATABASE_URL", f, "pooler")).toContain(
        "DATABASE_URL",
      );
    }
  });
});
