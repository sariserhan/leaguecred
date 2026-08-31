"use client";

import { useSyncExternalStore } from "react";
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle({
  variant = "button",
  className,
}: {
  variant?: "button" | "dropdown";
  className?: string;
}) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (!isMounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-9 text-muted-foreground", className)}
        aria-label="Toggle theme"
        disabled
      >
        <SunIcon className="size-4 opacity-50" />
      </Button>
    );
  }

  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-9 text-muted-foreground hover:text-foreground", className)}
              aria-label={`Theme: currently ${theme}`}
            />
          }
        >
          {resolvedTheme === "dark" ? (
            <MoonIcon className="size-4 text-primary" />
          ) : (
            <SunIcon className="size-4" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          <DropdownMenuItem
            onClick={() => setTheme("light")}
            className={cn("flex items-center gap-2 font-medium", theme === "light" && "text-primary font-bold")}
          >
            <SunIcon className="size-4" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("dark")}
            className={cn("flex items-center gap-2 font-medium", theme === "dark" && "text-primary font-bold")}
          >
            <MoonIcon className="size-4" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("system")}
            className={cn("flex items-center gap-2 font-medium", theme === "system" && "text-primary font-bold")}
          >
            <LaptopIcon className="size-4" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "relative size-9 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      <SunIcon
        className={cn(
          "size-4.5 transition-all duration-200",
          resolvedTheme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )}
      />
      <MoonIcon
        className={cn(
          "absolute size-4.5 text-primary transition-all duration-200",
          resolvedTheme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
