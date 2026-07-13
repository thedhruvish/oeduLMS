import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Trophy, Layers, Award, Infinity as InfinityIcon , Users2, Smartphone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cardVariants, containerVariants } from "@/config/motion-animation";

// Icon mapping based on position
const iconMap = [Trophy, Layers, Award, InfinityIcon, Users2, Smartphone];

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30 dark:bg-muted/10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:40px_40px]" />

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
            {siteConfig.features.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-foreground">
            {siteConfig.features.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {siteConfig.features.description}
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {siteConfig.features.items.map((feature, idx) => {
            const Icon = iconMap[idx] || Trophy;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -6, scale: 1.01 }}
                className="group rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm p-6 transition-shadow hover:shadow-xl cursor-default"
              >
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-muted mb-5 transition-transform group-hover:scale-110">
                  <Icon className="size-6 text-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
