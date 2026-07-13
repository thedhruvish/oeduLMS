import { HeroSection } from "./hero-section";
import { StatsSection } from "./stats-section";
import { FeaturesSection } from "./features-section";
import { CoursesSection } from "./courses-section";
import { TestimonialsSection } from "./testimonials-section";
import { CtaSection } from "./cta-section";

export function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CoursesSection />
      <TestimonialsSection />
      <CtaSection />
    </>
  );
}
