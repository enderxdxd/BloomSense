import { LenisProvider } from "@/components/LenisProvider";
import { Hero } from "@/components/landing/Hero";
import { ScrollStory } from "@/components/landing/ScrollStory";

export default function LandingPage() {
  return (
    <>
      <LenisProvider />
      <main>
        <Hero />
        <ScrollStory />
      </main>
    </>
  );
}
