import {
  NAV_LINKS,
  isActiveLink,
  isElevated,
  visibleNavLinks,
} from "@/lib/nav";

const labels = (audience: Parameters<typeof visibleNavLinks>[0]) =>
  visibleNavLinks(audience).map((link) => link.label);

describe("visibleNavLinks", () => {
  it("offers a signed-out visitor only the public destinations", () => {
    // Orders and Studio would both bounce straight to a login screen.
    expect(labels({ authenticated: false })).toEqual(["Quiz", "Catalog"]);
  });

  it("adds Orders once signed in", () => {
    expect(labels({ authenticated: true, role: "CUSTOMER" })).toEqual([
      "Quiz",
      "Catalog",
      "Orders",
    ]);
  });

  it("adds Studio for florists and admins", () => {
    expect(labels({ authenticated: true, role: "FLORIST" })).toContain("Studio");
    expect(labels({ authenticated: true, role: "ADMIN" })).toContain("Studio");
  });

  it("never shows Studio to a customer", () => {
    expect(labels({ authenticated: true, role: "CUSTOMER" })).not.toContain(
      "Studio",
    );
  });

  it("ignores a role claimed without a session", () => {
    expect(labels({ authenticated: false, role: "ADMIN" })).not.toContain(
      "Studio",
    );
  });

  it("tolerates a missing role", () => {
    expect(labels({ authenticated: true })).toEqual([
      "Quiz",
      "Catalog",
      "Orders",
    ]);
  });
});

describe("isElevated", () => {
  it.each([
    ["FLORIST", true],
    ["ADMIN", true],
    ["CUSTOMER", false],
    ["", false],
  ])("%s -> %s", (role, expected) => {
    expect(isElevated(role)).toBe(expected);
  });

  it("treats null and undefined as not elevated", () => {
    expect(isElevated(null)).toBe(false);
    expect(isElevated(undefined)).toBe(false);
  });
});

describe("isActiveLink", () => {
  const link = (href: string) =>
    NAV_LINKS.find((l) => l.href === href) as (typeof NAV_LINKS)[number];

  it("matches its own page", () => {
    expect(isActiveLink(link("/quiz"), "/quiz")).toBe(true);
  });

  it("matches pages nested under it", () => {
    expect(isActiveLink(link("/orders"), "/orders/abc/confirmation")).toBe(true);
    expect(isActiveLink(link("/admin"), "/admin/inventory")).toBe(true);
  });

  it("lights Catalog up on a product page", () => {
    expect(isActiveLink(link("/catalog"), "/product/rose-bouquet")).toBe(true);
  });

  it("does not match an unrelated page", () => {
    expect(isActiveLink(link("/quiz"), "/catalog")).toBe(false);
    expect(isActiveLink(link("/orders"), "/account")).toBe(false);
  });

  it("does not match a path that merely shares a prefix", () => {
    // /ordersomething is not inside /orders.
    expect(isActiveLink(link("/orders"), "/ordersomething")).toBe(false);
  });
});
