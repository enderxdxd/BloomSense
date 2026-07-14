"use client";

import { motion } from "framer-motion";
import { Flower2, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

export default function RegisterPage() {
  const reducedMotion = useReducedMotion();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Registration failed. Please try again.");
        setSubmitting(false);
        return;
      }

      // Auto sign-in after successful registration.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setSubmitting(false);

      if (result?.error) {
        router.push("/login");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bloom-cream px-4">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.35 }}
        className="w-full max-w-md rounded-2xl border border-bloom-gold/30 bg-white/70 p-8 shadow-sm backdrop-blur"
      >
        <div className="mb-8 text-center">
          <Flower2 className="mx-auto h-8 w-8 text-bloom-sage" aria-hidden />
          <h1 className="mt-3 font-serif text-3xl font-semibold text-bloom-primary">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-bloom-rose">
            Save your floral profile and order history
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-bloom-primary"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-bloom-gold/40 bg-white px-3.5 py-2.5 text-sm text-bloom-primary outline-none transition focus:border-bloom-sage focus:ring-2 focus:ring-bloom-sage/30"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-bloom-primary"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-bloom-gold/40 bg-white px-3.5 py-2.5 text-sm text-bloom-primary outline-none transition focus:border-bloom-sage focus:ring-2 focus:ring-bloom-sage/30"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-bloom-primary"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={100}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-bloom-gold/40 bg-white px-3.5 py-2.5 text-sm text-bloom-primary outline-none transition focus:border-bloom-sage focus:ring-2 focus:ring-bloom-sage/30"
            />
            <p className="mt-1.5 text-xs text-bloom-rose/80">
              At least 8 characters.
            </p>
          </div>

          {error !== "" && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-bloom-primary px-4 py-2.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-bloom-rose">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-bloom-sage underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
