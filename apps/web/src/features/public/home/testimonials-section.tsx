import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Star, Quote } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cardVariants, containerVariants } from "@/config/motion-animation";

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30 dark:bg-muted/10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground mb-4">
            {siteConfig.testimonials.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-foreground">
            {siteConfig.testimonials.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {siteConfig.testimonials.description}
          </p>
        </motion.div>

        {/* Testimonial cards */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {siteConfig.testimonials.items.map((t, i) => (
            <motion.div
              key={t.id}
              variants={cardVariants}
              whileHover={{ y: -6 }}
              className={[
                "relative rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm p-6 flex flex-col gap-5",
                "transition-shadow hover:shadow-xl",
                i === 1 ? "md:-mt-4 md:shadow-lg md:border-foreground/20" : "",
              ].join(" ")}
            >
              {/* Quote decoration */}
              <div className="absolute top-5 right-5 opacity-8">
                <Quote className="size-12 text-foreground" />
              </div>

              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, si) => (
                  <Star key={si} className="size-4 fill-foreground/50 text-foreground/50" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 italic">
              &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 border-t border-border/60 pt-5">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${t.avatarClass}`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
