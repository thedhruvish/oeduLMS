import { motion } from "motion/react";
import { Award, Code2, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@oedulms/ui/components/button";
import { siteConfig } from "@/config/site";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const valueIcons = [Code2, Users, Award, ShieldCheck];

export function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 border-b border-border/60">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center"
          >
            <motion.div variants={itemVariants} className="mb-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-foreground">
                {siteConfig.about.badge}
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-6"
            >
              {siteConfig.about.title}
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-muted-foreground text-lg max-w-2xl leading-relaxed mb-8"
            >
              {siteConfig.about.description}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 border-b border-border/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {siteConfig.about.stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                className="text-center"
              >
                <h3 className="text-3xl font-extrabold text-foreground mb-1">{stat.value}</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-20 bg-muted/20 dark:bg-muted/5 border-b border-border/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
              {siteConfig.about.pillars.title}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {siteConfig.about.pillars.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {siteConfig.about.pillars.items.map((v, idx) => {
              const Icon = valueIcons[idx] || Code2;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="flex gap-4 p-5 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm"
                >
                  <div className="size-10 rounded-xl bg-foreground/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base mb-1">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
              {siteConfig.about.team.title}
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {siteConfig.about.team.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {siteConfig.about.team.items.map((t, idx) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.5 }}
                className="group rounded-2xl border border-border/50 bg-card p-5 hover:shadow-lg transition flex flex-col text-center"
              >
                {/* Monochrome Avatar Circle */}
                <div className="size-16 rounded-full bg-zinc-100 dark:bg-zinc-800 text-foreground border border-border font-bold text-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition duration-300">
                  {t.initials}
                </div>
                <h3 className="font-semibold text-foreground text-sm leading-tight mb-1">
                  {t.name}
                </h3>
                <p className="text-xs text-muted-foreground font-medium mb-3">{t.role}</p>
                <p className="text-xs text-muted-foreground leading-relaxed flex-grow">{t.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-12 bg-zinc-950 text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 max-w-5xl lg:mx-auto overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative z-10 px-6 py-12 text-center flex flex-col items-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">
            {siteConfig.about.cta.title}
          </h2>
          <p className="text-white/60 text-sm max-w-md mb-8 leading-relaxed">
            {siteConfig.about.cta.description}
          </p>
          <Link to={siteConfig.about.cta.buttonTo}>
            <Button className="bg-white text-zinc-950 hover:bg-zinc-100 font-semibold gap-2">
              {siteConfig.about.cta.buttonLabel}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
