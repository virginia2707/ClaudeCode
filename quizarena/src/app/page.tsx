import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero, HowItWorks, Audiences, Features, ExampleGame, Stats, Pricing, Faq, FinalCta } from "@/components/landing/sections";

// Kept header-agnostic to user session (no cookies()/getCurrentUser() call)
// so this page can be fully statically generated and CDN-cached — it's the
// highest-traffic, most cacheable page in the app. A signed-in visitor still
// reaches their dashboard in one click via "Se connecter" → redirect.
export default function LandingPage() {
  return (
    <>
      <SiteHeader user={null} />
      <main id="main" tabIndex={-1}>
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
