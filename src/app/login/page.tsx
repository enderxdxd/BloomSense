"use client";

import { motion } from "framer-motion";
import { Flower2, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-md rounded-2xl border border-bloom-gold/30 bg-white/70 p-8 shadow-sm backdrop-blur"
    >
      <div className="mb-8 text-center">
        <Flower2 className="mx-auto h-8 w-8 text-bloom-sage" aria-hidden />
        <h1 className="mt-3 font-serif text-3xl font-semibold text-bloom-primary">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-bloom-rose">
          Sign in to your BloomSense account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-bloom-gold/40 bg-white px-3.5 py-2.5 text-sm text-bloom-primary outline-none transition focus:border-bloom-sage focus:ring-2 focus:ring-bloom-sage/30"
          />
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
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-bloom-rose">
        No account yet?{" "}
        <Link
          href="/register"
          className="font-medium text-bloom-sage underline-offset-2 hover:underline"
        >
          Create one
        </Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bloom-cream px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
