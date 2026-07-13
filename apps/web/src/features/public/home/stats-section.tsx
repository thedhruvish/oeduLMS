import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { siteConfig } from "@/config/site";

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-20 relative">
      {/* Divider line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-foreground/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {siteConfig.stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="group relative rounded-2xl border border-border/60 bg-card p-6 text-center overflow-hidden cursor-default transition-shadow hover:shadow-lg"
            >
              {/* Card background on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-muted/40 rounded-2xl" />

              <motion.p
                className="relative text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
              >
                {stat.value}
              </motion.p>
              <p className="relative text-sm font-medium text-muted-foreground">{stat.label}</p>

              {/* Bottom accent */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ delay: i * 0.1 + 0.4, duration: 0.5 }}
                className="absolute bottom-0 left-0 right-0 h-0.5 origin-left bg-foreground/15"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
