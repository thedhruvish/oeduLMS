import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Paintbrush, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useTheme, useUpdateTheme, COLOR_VARIABLES, THEME_PRESETS } from "@/api/theme";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@oedulms/ui/components/card";
import { Input } from "@oedulms/ui/components/input";
import { Button } from "@oedulms/ui/components/button";
import { ScrollArea } from "@oedulms/ui/components/scroll-area";

export const Route = createFileRoute("/admin/theme")({
  component: AdminThemeComponent,
});

const isHex = (val: string) => /^#[0-9A-F]{6}$/i.test(val);

interface ColorInputRowProps {
  variableKey: string;
  label: string;
  value: string;
  isHex: boolean;
  defaultColorPickerFallback: string;
  onChange: (key: string, value: string) => void;
}

// Memoized row component to prevent 34 other rows from re-rendering when one row changes
const ColorInputRow = React.memo(function ColorInputRow({
  variableKey,
  label,
  value,
  isHex,
  defaultColorPickerFallback,
  onChange,
}: ColorInputRowProps) {
  const [localVal, setLocalVal] = React.useState(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleChange = (newVal: string) => {
    setLocalVal(newVal);
    onChange(variableKey, newVal);
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/20 pb-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold text-foreground">{label}</span>
        <code className="text-[10px] text-muted-foreground">{variableKey}</code>
      </div>
      <div className="flex items-center gap-2 max-w-[200px] w-full">
        <div className="relative size-8 shrink-0 rounded-md border overflow-hidden">
          <input
            type="color"
            value={isHex ? localVal : defaultColorPickerFallback}
            onChange={(e) => handleChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer scale-150"
          />
        </div>
        <Input
          value={localVal}
          onChange={(e) => handleChange(e.target.value)}
          className="h-8 text-xs font-mono"
          placeholder="oklch(1 0 0)"
        />
      </div>
    </div>
  );
});

function AdminThemeComponent() {
  const { data: themeData, isLoading } = useTheme();
  const updateThemeMutation = useUpdateTheme();

  const [lightTheme, setLightTheme] = React.useState<Record<string, string>>({});
  const [darkTheme, setDarkTheme] = React.useState<Record<string, string>>({});
  const [themeName, setThemeName] = React.useState("Dynamic Theme");

  React.useEffect(() => {
    if (themeData) {
      setLightTheme(themeData.lightTheme);
      setDarkTheme(themeData.darkTheme);
      setThemeName(themeData.name || "Dynamic Theme");
    }
  }, [themeData]);

  const updateRuntimeStyle = (light: Record<string, string>, dark: Record<string, string>) => {
    const isDark = document.documentElement.classList.contains("dark");
    const activeThemeColors = isDark ? dark : light;
    for (const [key, val] of Object.entries(activeThemeColors)) {
      document.documentElement.style.setProperty(key, val);
    }
  };

  // Sync state modifications to the document style properties in real-time with a light debounce
  // to avoid layout thrashing during continuous dragging in color pickers
  React.useEffect(() => {
    if (Object.keys(lightTheme).length > 0 && Object.keys(darkTheme).length > 0) {
      const timer = setTimeout(() => {
        updateRuntimeStyle(lightTheme, darkTheme);
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [lightTheme, darkTheme]);

  // Memoized handlers to maintain constant reference for children inputs
  const handleLightColorChange = React.useCallback((key: string, value: string) => {
    setLightTheme((prev) => {
      if (prev[key] === value) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
  }, []);

  const handleDarkColorChange = React.useCallback((key: string, value: string) => {
    setDarkTheme((prev) => {
      if (prev[key] === value) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
  }, []);

  const handleSave = async () => {
    try {
      await updateThemeMutation.mutateAsync({
        name: themeName,
        lightTheme,
        darkTheme,
      });
      toast.success("Theme updated successfully!");
    } catch {
      toast.error("Failed to save theme settings.");
    }
  };

  const handleResetToDefaults = () => {
    if (themeData) {
      setLightTheme(themeData.lightTheme);
      setDarkTheme(themeData.darkTheme);
      setThemeName(themeData.name);
      toast.info("Form reset to current database values.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse w-full">
        <div className="h-8 w-48 bg-muted/40 rounded" />
        <div className="h-96 w-full bg-muted/40 rounded-2xl" />
      </div>
    );
  }

  return (
    <ScrollArea className="w-full h-full pr-4 pb-12">
      <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Appearance & Theme</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customize runtime CSS custom properties for your LMS theme. Changes are previewed in
              real-time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
              <RefreshCw className="size-4 mr-2" />
              Reset Form
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateThemeMutation.isPending}>
              {updateThemeMutation.isPending && <Loader2 className="animate-spin mr-2 size-4" />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* TOP CONTROL PANEL (Theme name + presets) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="flex flex-col gap-1.5 max-w-sm w-full">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Theme Name
            </label>
            <Input
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="e.g. My Custom Theme"
              className="h-9 text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 md:max-w-xl">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Quick Presets
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {THEME_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLightTheme(preset.lightTheme);
                    setDarkTheme(preset.darkTheme);
                    setThemeName(preset.name);
                    toast.success(`Loaded "${preset.name}" preset colors!`);
                  }}
                  className="h-9 text-xs font-medium"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* LIVE PREVIEW COMPONENT */}
        <Card className="border border-border/50 shadow-sm bg-card">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <CardTitle className="text-base font-bold">Theme Preview</CardTitle>
            </div>
            <CardDescription className="text-xs pt-0.5">
              Real-time visualization of selected properties applied to standard LMS widgets.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Core UI Elements Container */}
            <div
              className="flex flex-col gap-3 p-4 rounded-lg border transition-colors duration-200"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                borderColor: "var(--border)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                UI Elements Preview
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  className="h-8 px-3 text-xs font-semibold rounded transition-colors duration-150 cursor-pointer"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  Primary Action
                </button>
                <button
                  className="h-8 px-3 text-xs font-semibold rounded transition-colors duration-150 cursor-pointer"
                  style={{
                    backgroundColor: "var(--secondary)",
                    color: "var(--secondary-foreground)",
                  }}
                >
                  Secondary
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="h-8 px-3 text-xs font-semibold rounded border transition-colors duration-150 cursor-pointer"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--accent-foreground)",
                    borderColor: "var(--border)",
                  }}
                >
                  Accent Outlined
                </button>
                <button
                  className="h-8 px-3 text-xs font-semibold rounded transition-colors duration-150 cursor-pointer"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "oklch(0.985 0 0)",
                  }}
                >
                  Destructive
                </button>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                Muted text showing how read/body elements appear against core background.
              </p>
              <div className="h-px w-full my-1" style={{ backgroundColor: "var(--border)" }} />
              <div
                className="p-3 rounded text-xs border"
                style={{
                  backgroundColor: "var(--card)",
                  color: "var(--card-foreground)",
                  borderColor: "var(--border)",
                }}
              >
                Sample Dashboard Card
              </div>
            </div>

            {/* Video Player Container */}
            <div
              className="flex flex-col gap-3 p-4 rounded-lg border transition-colors duration-200"
              style={{
                backgroundColor: "var(--color-dv-bg)",
                color: "var(--color-dv-text)",
                borderColor: "var(--border)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-dv-text-muted)" }}
              >
                Video Player Preview
              </span>
              <div
                className="aspect-video rounded-md flex flex-col justify-between p-3 border relative overflow-hidden"
                style={{
                  backgroundColor: "var(--color-dv-surface)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="size-10 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-150 shadow-md"
                    style={{
                      backgroundColor: "var(--color-dv-primary)",
                      color: "#ffffff",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-dv-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-dv-primary)";
                    }}
                  >
                    <span className="ml-0.5 text-sm">▶</span>
                  </div>
                </div>
                <div
                  className="flex justify-between w-full text-[9px] mt-auto"
                  style={{ color: "var(--color-dv-text-muted)" }}
                >
                  <span>02:15 / 15:40</span>
                  <span>1080p Full HD</span>
                </div>
              </div>
              <p className="text-[10px]" style={{ color: "var(--color-dv-text-muted)" }}>
                Validates the player interface controls, background frame, and action color.
              </p>
            </div>

            {/* Sidebar Container */}
            <div
              className="flex flex-col gap-3 p-4 rounded-lg border transition-colors duration-200"
              style={{
                backgroundColor: "var(--sidebar)",
                color: "var(--sidebar-foreground)",
                borderColor: "var(--sidebar-border)",
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                Sidebar Navigation Preview
              </span>
              <div className="flex flex-col gap-1.5">
                <div
                  className="flex items-center gap-2 p-2 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--sidebar-primary)",
                    color: "var(--sidebar-primary-foreground)",
                  }}
                >
                  <span>📚</span> Active Course Page
                </div>
                <div
                  className="flex items-center gap-2 p-2 rounded text-xs transition-colors duration-150 cursor-pointer"
                  style={{
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--sidebar-accent)";
                    e.currentTarget.style.color = "var(--sidebar-accent-foreground)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "inherit";
                  }}
                >
                  <span>⚙️</span> Settings Link
                </div>
                <div
                  className="flex items-center gap-2 p-2 rounded text-xs transition-colors duration-150 cursor-pointer"
                  style={{
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--sidebar-accent)";
                    e.currentTarget.style.color = "var(--sidebar-accent-foreground)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "inherit";
                  }}
                >
                  <span>💬</span> Social Feed Link
                </div>
              </div>
              <div
                className="h-px w-full my-1"
                style={{ backgroundColor: "var(--sidebar-border)" }}
              />
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                Simulates sidebar outline borders, accents, and rings.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LIGHT MODE CARD */}
          <Card className="border border-border/50 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Paintbrush className="size-5 text-primary" />
                <CardTitle className="text-base font-bold">Light Mode Theme</CardTitle>
              </div>
              <CardDescription className="text-xs pt-1">
                Configure CSS custom properties applied in light mode.
              </CardDescription>
            </CardHeader>
            <CardContent className="-pt-3">
              <ScrollArea className="h-[480px] pr-4">
                <div className="flex flex-col gap-4">
                  {COLOR_VARIABLES.map(({ key, label }) => {
                    const val = lightTheme[key] || "";
                    const isValHex = isHex(val);
                    return (
                      <ColorInputRow
                        key={key}
                        variableKey={key}
                        label={label}
                        value={val}
                        isHex={isValHex}
                        defaultColorPickerFallback="#3b82f6"
                        onChange={handleLightColorChange}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* DARK MODE CARD */}
          <Card className="border border-border/50 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Paintbrush className="size-5 text-primary" />
                <CardTitle className="text-base font-bold">Dark Mode Theme</CardTitle>
              </div>
              <CardDescription className="text-xs pt-1">
                Configure CSS custom properties applied in dark mode.
              </CardDescription>
            </CardHeader>
            <CardContent className="-pt-3">
              <ScrollArea className="h-[480px] pr-4">
                <div className="flex flex-col gap-4">
                  {COLOR_VARIABLES.map(({ key, label }) => {
                    const val = darkTheme[key] || "";
                    const isValHex = isHex(val);
                    return (
                      <ColorInputRow
                        key={key}
                        variableKey={key}
                        label={label}
                        value={val}
                        isHex={isValHex}
                        defaultColorPickerFallback="#1e293b"
                        onChange={handleDarkColorChange}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
