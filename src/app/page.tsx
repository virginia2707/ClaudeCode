import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Audiences, ExampleGame, FAQ, Features, FinalCTA, HowItWorks, Pricing, Stats, Why } from "@/components/landing/sections";

export default function HomePage() {
  return (
    <>
      <LandingNav />
      <main id="contenu" className="flex-1">
        <Hero />
        <HowItWorks />
        <Why />
        <Audiences />
        <Features />
        <ExampleGame />
        <Stats />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </>
  );
}
