import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Play, Terminal, CheckCircle2 } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { siteConfig } from "@/config/site";

const codeLines = [
  {
    tokens: [
      { t: "keyword", v: "function" },
      { t: "fn", v: " greet" },
      { t: "punc", v: "(" },
      { t: "param", v: "name" },
      { t: "op", v: ": " },
      { t: "type", v: "string" },
      { t: "punc", v: ")" },
      { t: "op", v: " {" },
    ],
  },
  {
    tokens: [
      { t: "indent", v: "  " },
      { t: "keyword", v: "return" },
      { t: "str", v: " `Hello, ${name}!`" },
    ],
  },
  { tokens: [{ t: "punc", v: "}" }] },
  { tokens: [] },
  { tokens: [{ t: "comment", v: `// 🚀 ${siteConfig.name} — Learn by building` }] },
  {
    tokens: [
      { t: "fn", v: "greet" },
      { t: "punc", v: "(" },
      { t: "str", v: '"World"' },
      { t: "punc", v: ")" },
      { t: "op", v: " // Hello, World!" },
    ],
  },
];

const tokenColors: Record<string, string> = {
  keyword: "text-zinc-200",
  fn: "text-zinc-100",
  param: "text-zinc-300",
  type: "text-zinc-300",
  str: "text-zinc-400",
  punc: "text-zinc-500",
  op: "text-zinc-400",
  comment: "text-zinc-600 italic",
  indent: "",
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-24">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_60%,hsl(var(--background))_100%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20">
          {/* Left: Text content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
                {siteConfig.hero.badge}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-foreground"
            >
              {siteConfig.hero.titlePart1}
              <span className="relative">{siteConfig.hero.titlePart2}</span>
              <br />
              {siteConfig.hero.titlePart3}
              <span className="relative">
                {siteConfig.hero.titlePart4}
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                  className="absolute bottom-1 left-0 right-0 h-[3px] origin-left bg-foreground rounded-full"
                />
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg"
            >
              {siteConfig.hero.description}
            </motion.p>

            {/* Perks */}
            <motion.ul variants={itemVariants} className="flex flex-col gap-2 mb-10">
              {siteConfig.hero.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-foreground/50" />
                  {perk}
                </li>
              ))}
            </motion.ul>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              <Link to={siteConfig.hero.ctaPrimary.to}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="bg-foreground text-background hover:bg-foreground/90 shadow-lg h-12 px-6 text-sm gap-2"
                  >
                    {siteConfig.hero.ctaPrimary.label}
                    <ArrowRight className="size-4" />
                  </Button>
                </motion.div>
              </Link>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 text-sm gap-2 border-border/80"
                >
                  <Play className="size-4 fill-current" />
                  {siteConfig.hero.ctaSecondary.label}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right: Code card */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Subtle shadow glow */}
              <div className="absolute -inset-1 rounded-2xl bg-foreground/10 blur-xl" />

              {/* Code card */}
              <div className="relative rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden">
                {/* Terminal bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <span className="size-3 rounded-full bg-zinc-600" />
                    <span className="size-3 rounded-full bg-zinc-600" />
                    <span className="size-3 rounded-full bg-zinc-600" />
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-center">
                    <Terminal className="size-3 text-zinc-500" />
                    <span className="text-xs text-zinc-500 font-mono">main.ts</span>
                  </div>
                </div>

                {/* Code body */}
                <div className="p-6 font-mono text-sm leading-7">
                  {codeLines.map((line, lineIdx) => (
                    <motion.div
                      key={lineIdx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + lineIdx * 0.12, duration: 0.4 }}
                      className="flex flex-wrap"
                    >
                      {line.tokens.length === 0 ? (
                        <span className="h-7 block" />
                      ) : (
                        line.tokens.map((tok, tokIdx) => (
                          <span key={tokIdx} className={tokenColors[tok.t] ?? "text-zinc-300"}>
                            {tok.v}
                          </span>
                        ))
                      )}
                    </motion.div>
                  ))}
                  {/* Blinking cursor */}
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="inline-block w-2 h-4 bg-white/80 ml-0.5 rounded-sm"
                  />
                </div>

                {/* Bottom badges */}
                <div className="flex items-center gap-2 px-6 py-3 bg-zinc-900/60 border-t border-white/5">
                  {["TypeScript", "ES2024", "✓ No errors"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Floating achievement card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5, ease: "easeOut" }}
                className="absolute -bottom-6 -left-8 rounded-xl border border-border bg-background/90 backdrop-blur-sm px-4 py-3 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-foreground/10">
                    <CheckCircle2 className="size-5 text-foreground/70" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Course Completed</p>
                    <p className="text-xs text-muted-foreground">TypeScript Advanced</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating rating card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.5, ease: "easeOut" }}
                className="absolute -top-4 -right-6 rounded-xl border border-border bg-background/90 backdrop-blur-sm px-4 py-3 shadow-xl"
              >
                <p className="text-xs font-semibold text-foreground">★ 4.9 / 5.0</p>
                <p className="text-xs text-muted-foreground">12,000+ reviews</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
