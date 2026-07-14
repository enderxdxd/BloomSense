"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-bloom-rose/40 px-4 py-1.5 text-xs font-medium text-bloom-rose transition hover:bg-bloom-cream"
    >
      Sign out
    </button>
  );
}
