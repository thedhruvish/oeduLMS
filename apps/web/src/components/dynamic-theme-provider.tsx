import * as React from "react";
import { useTheme } from "@/api/theme";

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: themeData } = useTheme();

  React.useEffect(() => {
    if (!themeData) return;

    const applyTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const activeThemeColors = isDark ? themeData.darkTheme : themeData.lightTheme;

      // Apply theme properties directly to the main root html tag
      for (const [key, val] of Object.entries(activeThemeColors)) {
        document.documentElement.style.setProperty(key, val);
      }
    };

    // Initial application
    applyTheme();

    // Observe changes to the 'class' attribute of the html element to detect light/dark toggle
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          applyTheme();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, [themeData]);

  return <>{children}</>;
}
