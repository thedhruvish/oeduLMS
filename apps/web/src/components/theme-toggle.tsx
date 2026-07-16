import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@oedulms/ui/components/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@oedulms/ui/lib/utils";

interface ThemeToggleProps {
  /** Extra classes applied to the wrapping element */
  className?: string;
  /** Icon size class, defaults to size-4 */
  iconSize?: string;
  /** Button size class, defaults to size-8 */
  buttonSize?: string;
  /**
   * When false (default) shows icon + label text side-by-side (good for sidebars/menus).
   * When true shows icon only (original compact mode).
   */
  iconOnly?: boolean;
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
  iconOnly = true,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a placeholder of the same size during SSR/hydration
  if (!mounted) {
    return <div className={iconOnly ? buttonSize : "h-8 w-28"} />;
  }

  const isDark = theme === "dark";

  const icon = (
    <AnimatePresence mode="wait" initial={false}>
      {isDark ? (
        <motion.span
          key="sun"
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center"
        >
          <Sun className={cn(iconSize, "text-amber-400")} />
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
          <Moon className={cn(iconSize, "text-indigo-500")} />
        </motion.span>
      )}
    </AnimatePresence>
  );

  if (iconOnly) {
    return (
      <motion.div whileTap={{ scale: 0.85 }} className={className}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={cn(buttonSize, "rounded-lg")}
        >
          {icon}
        </Button>
      </motion.div>
    );
  }

  // Expanded: icon + label
  return (
    <motion.div whileTap={{ scale: 0.98 }} className={cn("w-full", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="w-full justify-start gap-2 rounded-lg px-2"
      >
        {icon}
        <span className="text-sm font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      </Button>
    </motion.div>
  );
}
