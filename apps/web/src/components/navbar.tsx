import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, MessageSquare, LayoutDashboard, Menu, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useNavbarScroll } from "@/hooks/use-navbar-scroll";
import { siteConfig } from "@/config/site";
import { UserProfileDropdown } from "@/components/profile-dropdown";
import { useAuth } from "@/api/auth";
import { Button } from "@oedulms/ui/components/button";

export function Navbar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { user } = useAuth();
  const { isVisible } = useNavbarScroll();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [currentPath]);

  const isStudentMode = currentPath.startsWith("/dash");

  const isActive = (to: string, exact = false) => {
    if (exact) return currentPath === to;
    if (to === "/") return currentPath === "/" || currentPath === "/home";
    return currentPath.startsWith(to);
  };

  const studentLinks = [
    { label: "Overview", to: "/dash", icon: LayoutDashboard, exact: true },
    { label: "Courses", to: "/dash/courses", icon: BookOpen },
    { label: "Social Feed", to: "/dash/feed", icon: MessageSquare },
  ];

  const publicLinks = siteConfig.nav.links;

  const links = isStudentMode ? studentLinks : publicLinks;

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-3 transition-all duration-300 ${
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        <header className="relative max-w-7xl mx-auto h-14 bg-background/80 backdrop-blur-md border border-border/60 shadow-md rounded-(--radius-4xl) px-6 flex items-center justify-between transition-colors">
          {/* Left side: Logo */}
          <Link
            to={isStudentMode ? "/dash" : "/"}
            className="flex items-center gap-2 font-bold text-lg hover:opacity-90 transition shrink-0"
          >
            <span className="bg-primary text-primary-foreground size-7 rounded-(--radius-md) flex items-center justify-center font-extrabold text-sm shadow">
              {siteConfig.name[0]}
            </span>
            <span className="hidden sm:inline">{siteConfig.name}</span>
          </Link>

          {/* Middle side: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={[
                  "relative px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 rounded-(--radius-lg)",
                  isActive(link.to, "exact" in link ? (link.exact as boolean) : false)
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {isActive(link.to, "exact" in link ? (link.exact as boolean) : false) && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-(--radius-lg) bg-foreground/[0.08]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {"icon" in link &&
                    React.createElement(link.icon as React.ComponentType<{ className?: string }>, {
                      className: "size-4",
                    })}
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Right side Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Student Mode always shows dropdown, Public Mode shows dropdown if user is logged in, else login buttons */}
            {isStudentMode || user ? (
              <UserProfileDropdown />
            ) : (
              <div className="hidden md:flex items-center gap-1.5">
                <div className="w-px h-4 bg-border mx-1" />
                <Link to={siteConfig.nav.login.to}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sm h-8 px-3 rounded-(--radius-lg)"
                  >
                    {siteConfig.nav.login.label}
                  </Button>
                </Link>
                <Link to={siteConfig.nav.register.to}>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      size="sm"
                      className="bg-foreground text-background hover:bg-foreground/90 h-8 px-3 text-sm gap-1 rounded-(--radius-lg)"
                    >
                      {siteConfig.nav.register.label}
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </motion.div>
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg md:hidden"
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
        </header>
      </div>

      {/* Mobile Drawer */}
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
              className="fixed right-3 top-20 z-50 w-64 rounded-(--radius-xl) border border-border/60 bg-background/90 backdrop-blur-xl shadow-2xl md:hidden flex flex-col overflow-hidden"
            >
              {/* Drawer nav */}
              <nav className="p-3 flex flex-col gap-1">
                {links.map((link, i) => (
                  <motion.div
                    key={link.to}
                    initial={{ x: 16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                  >
                    <Link
                      to={link.to}
                      className={[
                        "flex items-center px-3 py-2.5 rounded-(--radius-xl) text-sm font-medium transition-colors",
                        isActive(link.to, "exact" in link ? (link.exact as boolean) : false)
                          ? "bg-foreground/[0.08] text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      {"icon" in link &&
                        React.createElement(link.icon as React.ComponentType<{ className?: string }>, {
                          className: "size-4 mr-2 shrink-0",
                        })}
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Drawer footer */}
              <div className="p-3 border-t border-border/60 flex flex-col gap-2">
                {user ? (
                  <div className="flex justify-center py-2">
                    <UserProfileDropdown />
                  </div>
                ) : (
                  <>
                    <Link to={siteConfig.nav.login.to}>
                      <Button
                        variant="outline"
                        className="w-full h-9 text-sm rounded-(--radius-lg)"
                      >
                        {siteConfig.nav.login.label}
                      </Button>
                    </Link>
                    <Link to={siteConfig.nav.register.to}>
                      <Button className="w-full h-9 text-sm bg-foreground text-background hover:bg-foreground/90 rounded-(--radius-lg)">
                        {siteConfig.nav.register.label} Free
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
