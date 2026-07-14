import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { authOptions } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
] as const;

const ELEVATED_ROLES = ["FLORIST", "ADMIN"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role check in the layout as well — middleware is the first
  // gate, never the only one.
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");
  if (!ELEVATED_ROLES.includes(session.user.role)) redirect("/");

  return (
    <div className="flex min-h-screen bg-bloom-cream">
      <aside className="hidden w-56 shrink-0 border-r border-bloom-gold/20 bg-white sm:block">
        <div className="px-5 py-6">
          <p className="font-serif text-lg font-semibold text-bloom-primary">
            BloomSense
          </p>
          <p className="text-[10px] uppercase tracking-[0.24em] text-bloom-sage">
            Studio
          </p>
        </div>
        <nav aria-label="Admin" className="space-y-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-3 py-2.5 text-sm text-bloom-primary/85 transition hover:bg-bloom-cream hover:text-bloom-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-bloom-gold/20 bg-white px-5 py-3.5">
          <nav aria-label="Admin mobile" className="flex gap-2 sm:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs text-bloom-primary underline-offset-2 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="hidden text-xs text-bloom-rose sm:block">
            Signed in as{" "}
            <span className="font-medium text-bloom-primary">
              {session.user.email}
            </span>{" "}
            · {session.user.role.toLowerCase()}
          </p>
          <SignOutButton />
        </header>
        <main className="flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
