import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Code2, ChevronRight } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/config/site";

export function Navbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    setIsMobileOpen(false);
  }, [currentPath]);

  const isActive = (to: string) => {
    if (to === "/") return currentPath === "/" || currentPath === "/home";
    return currentPath.startsWith(to);
  };

  return (
    <>
      {/* Floating pill navbar */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-3 left-0 right-0 z-50 flex justify-center px-3 sm:px-6"
      >
        <div className="w-full max-w-5xl rounded-2xl border border-border/60 bg-background/75 backdrop-blur-xl shadow-lg shadow-foreground/5 transition-shadow duration-300">
          <div className="flex h-14 items-center justify-between px-4 sm:px-5">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <motion.div
                whileHover={{ rotate: 12, scale: 1.08 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background shadow-sm"
              >
                <Code2 className="size-4" />
              </motion.div>
              <motion.span
                className="text-base font-bold tracking-tight text-foreground"
                whileHover={{ scale: 1.02 }}
              >
                {siteConfig.nav.logo}
              </motion.span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {siteConfig.nav.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={[
                    "relative px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 rounded-lg",
                    isActive(link.to)
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {isActive(link.to) && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-lg bg-foreground/[0.08]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Desktop right actions */}
            <div className="hidden md:flex items-center gap-1.5">
              <ThemeToggle />
              <div className="w-px h-4 bg-border mx-1" />
              <Link to={siteConfig.nav.login.to}>
                <Button variant="ghost" size="sm" className="text-sm h-8 px-3">
                  {siteConfig.nav.login.label}
                </Button>
              </Link>
              <Link to={siteConfig.nav.register.to}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="sm"
                    className="bg-foreground text-background hover:bg-foreground/90 h-8 px-3 text-sm gap-1"
                  >
                    {siteConfig.nav.register.label}
                    <ChevronRight className="size-3.5" />
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Mobile right */}
            <div className="flex md:hidden items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                onClick={() => setIsMobileOpen((v) => !v)}
                aria-label="Toggle navigation menu"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isMobileOpen ? (
                    <motion.span
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <X className="size-4" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Menu className="size-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-3 top-20 z-50 w-64 rounded-2xl border border-border/60 bg-background/90 backdrop-blur-xl shadow-2xl md:hidden flex flex-col overflow-hidden"
            >
              {/* Drawer nav */}
              <nav className="p-3 flex flex-col gap-1">
                {siteConfig.nav.links.map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ x: 16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                  >
                    <Link
                      to={link.to}
                      className={[
                        "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        isActive(link.to)
                          ? "bg-foreground/[0.08] text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Drawer footer */}
              <div className="p-3 border-t border-border/60 flex flex-col gap-2">
                <Link to={siteConfig.nav.login.to}>
                  <Button variant="outline" className="w-full h-9 text-sm">
                    {siteConfig.nav.login.label}
                  </Button>
                </Link>
                <Link to={siteConfig.nav.register.to}>
                  <Button className="w-full h-9 text-sm bg-foreground text-background hover:bg-foreground/90">
                    {siteConfig.nav.register.label} Free
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
