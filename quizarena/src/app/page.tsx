import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero, HowItWorks, Audiences, Features, ExampleGame, Stats, Pricing, Faq, FinalCta } from "@/components/landing/sections";

export default function LandingPage() {
  return (
    <>
      <AppHeader />
      <main id="main">
        <Hero />
        <HowItWorks />
        <Audiences />
        <Features />
        <ExampleGame />
        <Stats />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
