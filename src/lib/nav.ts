/**
 * Which links the site header shows, and which one is the current page.
 *
 * Kept out of the component so it can be tested as plain functions: the
 * rules here decide whether a signed-out visitor is offered a link that
 * only dead-ends at the login screen, which is easy to regress by eye.
 */

export type NavVisibility = "always" | "session" | "elevated";

export interface NavLink {
  href: string;
  label: string;
  visibility: NavVisibility;
  /** Pages that belong to this link beyond its own href subtree. */
  owns?: (pathname: string) => boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/quiz", label: "Quiz", visibility: "always" },
  {
    href: "/catalog",
    label: "Catalog",
    visibility: "always",
    // Product pages live outside /catalog but are reached through it.
    owns: (pathname) => pathname.startsWith("/product/"),
  },
  { href: "/orders", label: "Orders", visibility: "session" },
  { href: "/admin", label: "Studio", visibility: "elevated" },
];

const ELEVATED_ROLES = ["FLORIST", "ADMIN"];

export function isElevated(role: string | undefined | null): boolean {
  return role != null && ELEVATED_ROLES.includes(role);
}

export function isActiveLink(link: NavLink, pathname: string): boolean {
  if (pathname === link.href || pathname.startsWith(`${link.href}/`)) {
    return true;
  }
  return link.owns?.(pathname) ?? false;
}

export interface NavAudience {
  authenticated: boolean;
  role?: string | null;
}

export function visibleNavLinks(audience: NavAudience): NavLink[] {
  return NAV_LINKS.filter((link) => {
    switch (link.visibility) {
      case "session":
        return audience.authenticated;
      case "elevated":
        return audience.authenticated && isElevated(audience.role);
      default:
        return true;
    }
  });
}
