import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { useTheme } from "@/components/theme-provider";

interface ThemeToggleProps {
  /** Extra classes applied to the wrapping motion div */
  className?: string;
  /** Icon size class, defaults to size-4 */
  iconSize?: string;
  /** Button size class, defaults to size-8 */
  buttonSize?: string;
}

/**
 * Reusable one-click dark/light mode toggle.
 * Clicking once toggles the theme — no dropdown.
 * Safe to use in any header, sidebar, or settings panel.
 */
export function ThemeToggle({
  className = "",
  iconSize = "size-4",
  buttonSize = "size-8",
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a placeholder of the same size during SSR/hydration
  if (!mounted) {
    return <div className={buttonSize} />;
  }

  return (
    <motion.div whileTap={{ scale: 0.85 }} className={className}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className={`${buttonSize} rounded-lg`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === "dark" ? (
            <motion.span
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Sun className={iconSize} />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <Moon className={iconSize} />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}
