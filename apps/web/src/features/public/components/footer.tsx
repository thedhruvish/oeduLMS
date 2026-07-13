import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Code2, Globe, AtSign, GitBranch, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";

const footerLinks = {
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Courses: [
    { label: "Python", href: "/courses" },
    { label: "JavaScript", href: "/courses" },
    { label: "TypeScript", href: "/courses" },
    { label: "Rust", href: "/courses" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "Community", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Newsletter", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

const socialLinks = [
  { icon: GitBranch, href: siteConfig.links.github, label: "GitHub" },
  { icon: AtSign, href: siteConfig.links.twitter, label: "Twitter" },
  { icon: Globe, href: siteConfig.links.linkedin, label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-background">
      {/* Subtle gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -bottom-32 -left-32 size-64 rounded-full bg-foreground/5 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 size-96 rounded-full bg-foreground/[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="col-span-2"
          >
            <Link to="/" className="flex items-center gap-2.5 mb-4 w-fit">
              <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
                <Code2 className="size-5" />
              </div>
              <span className="text-xl font-bold text-foreground">{siteConfig.name}</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
              {siteConfig.footer.description}
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
                >
                  <Icon className="size-4" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links], colIdx) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (colIdx + 1) * 0.07 }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowRight className="size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/60 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">{siteConfig.footer.copyright}</p>
          <p className="text-xs text-muted-foreground">Built with ❤️ for developers worldwide</p>
        </div>
      </div>
    </footer>
  );
}
