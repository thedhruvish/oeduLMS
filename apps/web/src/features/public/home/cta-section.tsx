import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { siteConfig } from "@/config/site";

export function CtaSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Always-dark background */}
          <div className="absolute inset-0 bg-zinc-950" />

          {/* Subtle animated shine */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />

          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:40px_40px]" />

          {/* Subtle glow blobs (white/gray only) */}
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -right-20 size-72 rounded-full bg-white/5 blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-20 -left-20 size-80 rounded-full bg-white/[0.04] blur-3xl"
          />

          {/* Content */}
          <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 200 }}
              className="inline-flex size-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm mb-6 shadow-xl border border-white/10"
            >
              <Zap className="size-8 text-white" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4"
            >
              {siteConfig.cta.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg text-white/60 max-w-xl mx-auto mb-10"
            >
              {siteConfig.cta.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <Link to={siteConfig.cta.primary.to}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="h-12 px-8 bg-white text-zinc-900 hover:bg-zinc-100 font-semibold text-sm gap-2 shadow-2xl"
                  >
                    {siteConfig.cta.primary.label}
                    <ArrowRight className="size-4" />
                  </Button>
                </motion.div>
              </Link>
              <Link to={siteConfig.cta.secondary.to}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 px-8 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm text-sm"
                  >
                    {siteConfig.cta.secondary.label}
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="mt-8 text-sm text-white/40"
            >
              {siteConfig.cta.footerText}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
