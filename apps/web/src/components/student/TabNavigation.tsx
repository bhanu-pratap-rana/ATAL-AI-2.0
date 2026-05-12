"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * ATAL AI TabNavigation Component - Jyoti Theme
 *
 * STRICT RULES:
 * - Active tab: PRIMARY background with white text
 * - Inactive tab: surface background with text-secondary
 */

interface Tab {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean;
}

interface TabNavigationProps {
  readonly tabs: Tab[];
  readonly activeTab: string;
  readonly onTabChange: (tabId: string) => void;
  readonly disabled?: boolean;
  readonly size?: "sm" | "default" | "lg";
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  disabled = false,
  size = "default",
}: TabNavigationProps) {
  const sizeClasses = {
    sm: "py-1.5 px-3 text-xs",
    default: "py-2 px-4 text-sm",
    lg: "py-3 px-5 text-base",
  };

  return (
    <div
      className="flex gap-2 p-1 bg-slate-50 rounded-xl"
      role="tablist"
      aria-label="Navigation tabs"
    >
      {tabs.map((tab) => (
        <Button
          type="button"
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-disabled={disabled || tab.disabled}
          variant="ghost"
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          className={cn(
            "flex-1 h-auto rounded-lg font-medium",
            sizeClasses[size],
            activeTab === tab.id
              ? "bg-gradient-primary text-white shadow-sm hover:bg-gradient-primary hover:text-white"
              : "bg-transparent text-slate-500 hover:bg-white hover:text-slate-800",
          )}
          disabled={disabled || tab.disabled}
        >
          {tab.icon && (
            <span className="mr-1.5" aria-hidden="true">
              {tab.icon}
            </span>
          )}
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
