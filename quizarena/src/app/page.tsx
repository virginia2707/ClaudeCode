import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero, HowItWorks, Audiences, Features, ExampleGame, Stats, Pricing, Faq, FinalCta } from "@/components/landing/sections";

export default function LandingPage() {
  return (
    <>
      <SiteHeader user={null} />
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
