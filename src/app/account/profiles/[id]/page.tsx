import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { FloralProfileCard } from "@/components/FloralProfileCard";
import { ProductCard } from "@/components/shop/ProductCard";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FloralProfileSchema,
  type QuizInput,
  type RecommendedProduct,
} from "@/lib/schema";

export const metadata: Metadata = { title: "Saved profile — BloomSense" };
export const dynamic = "force-dynamic";

interface SavedProfilePageProps {
  params: { id: string };
}

export default async function SavedProfilePage({
  params,
}: SavedProfilePageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/account/profiles/${params.id}`);
  }

  const row = await prisma.floralProfile.findUnique({
    where: { id: params.id },
  });
  if (!row) notFound();
  // Ownership: someone else's saved profile 404s rather than leak existence.
  if (row.userId !== session.user.id) notFound();

  const payload = (row.data ?? {}) as {
    profile?: unknown;
    recommendations?: RecommendedProduct[];
    quiz?: QuizInput;
  };
  const parsed = FloralProfileSchema.safeParse(payload.profile);
  const profile = parsed.success ? parsed.data : null;
  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations
    : [];

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-bloom-rose">
          <Link href="/account" className="hover:text-bloom-primary">
            Account
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-bloom-primary">{row.title}</span>
        </nav>

        {profile ? (
          <>
            <FloralProfileCard
              profile={profile}
              heroImageUrl={null}
              heroImageStatus="error"
              sceneImageUrl={null}
              sceneImageStatus="error"
              occasion={(payload.quiz?.occasion ?? null) as QuizInput["occasion"] | null}
            />

            {row.moodBoardUrl && (
              <section className="mt-12">
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
                  Saved mood board
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.moodBoardUrl}
                  alt={`Mood board for ${row.title}`}
                  className="mt-4 w-full max-w-xl rounded-2xl shadow-[0_24px_60px_-24px_rgba(109,46,70,0.4)]"
                />
              </section>
            )}

            {recommendations.length > 0 && (
              <section className="mt-12">
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
                  Matched for you
                </p>
                <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {recommendations.map((rec) => (
                    <li key={rec.id}>
                      <ProductCard product={rec} matchReason={rec.reason} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-bloom-gold/30 bg-white p-10 shadow-sm">
            <h1 className="font-serif text-3xl font-semibold text-bloom-primary">
              {row.title}
            </h1>
            <p className="mt-3 text-sm text-bloom-rose">
              This profile was saved before full quiz payloads were stored.
              The essentials:
            </p>
            <dl className="mt-6 grid gap-4 text-sm text-bloom-primary sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-bloom-sage">
                  Occasion
                </dt>
                <dd className="mt-1 capitalize">{row.occasion}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-bloom-sage">
                  Arrangement
                </dt>
                <dd className="mt-1 capitalize">
                  {row.arrangement.replace(/-/g, " ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-bloom-sage">
                  Flowers
                </dt>
                <dd className="mt-1">{row.flowerTypes.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-bloom-sage">
                  Palette
                </dt>
                <dd className="mt-1">{row.palette.join(", ")}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}
