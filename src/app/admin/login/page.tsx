"use client";

import { Flower2, Loader2, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function safeAdminCallback(value: string | null): string {
  return value?.startsWith("/admin") && !value.startsWith("/admin/login")
    ? value
    : "/admin";
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeAdminCallback(searchParams.get("callbackUrl"));
  const permissionError = searchParams.get("error") === "forbidden";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    permissionError
      ? "Sua sessão atual não tem acesso administrativo. Entre novamente com uma conta autorizada."
      : "",
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setSubmitting(false);
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-bloom-gold/30 bg-white/90 p-7 shadow-xl shadow-bloom-primary/5 backdrop-blur sm:p-9">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bloom-cream text-bloom-sage">
          <Flower2 className="h-7 w-7" aria-hidden />
        </span>
        <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-bloom-sage">
          BloomSense Studio
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-bloom-primary">
          Acesso administrativo
        </h1>
        <p className="mt-2 text-sm leading-6 text-bloom-rose">
          Entre com uma conta de administrador ou florista.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div>
          <label
            htmlFor="admin-email"
            className="mb-1.5 block text-sm font-medium text-bloom-primary"
          >
            E-mail
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-bloom-gold/40 bg-white px-4 py-3 text-sm text-bloom-primary outline-none transition placeholder:text-bloom-rose/50 focus:border-bloom-sage focus:ring-2 focus:ring-bloom-sage/20"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="mb-1.5 block text-sm font-medium text-bloom-primary"
          >
            Senha
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-bloom-gold/40 bg-white px-4 py-3 text-sm text-bloom-primary outline-none transition placeholder:text-bloom-rose/50 focus:border-bloom-sage focus:ring-2 focus:ring-bloom-sage/20"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-bloom-primary px-4 py-3 text-sm font-semibold text-bloom-cream transition hover:bg-bloom-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden />
          )}
          {submitting ? "Entrando..." : "Entrar no painel"}
        </button>
      </form>

      <Link
        href="/"
        className="mt-6 block text-center text-sm text-bloom-sage underline-offset-4 hover:underline"
      >
        Voltar para a loja
      </Link>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bloom-cream px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(180, 140, 145, 0.18), transparent 32%), radial-gradient(circle at 85% 80%, rgba(73, 111, 80, 0.14), transparent 34%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full">
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
