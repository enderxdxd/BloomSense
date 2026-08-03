/**
 * Regression cover for the P1013 deploy failure: a connection string pasted
 * into a host dashboard straight out of .env.local, quotes and all.
 */
import {
  connectionScheme,
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
