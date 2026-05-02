"use client";

import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

type AIToggleProps = {
  enabled: boolean;
  onToggle: () => void;
  compact?: boolean;
};

export function AIToggle({
  enabled,
  onToggle,
  compact = false,
}: AIToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
      className={`shrink-0 flex items-center border border-ink/15 rounded-sm text-ink/70 hover:text-ink hover:border-ink/30 transition-colors ${
        compact ? "gap-1.5 px-2 py-1" : "gap-2.5 px-3 py-2"
      }`}
    >
      <Sparkles
        className={compact ? "w-3 h-3" : "w-3.5 h-3.5"}
        strokeWidth={1.5}
      />
      <span
        className={`${
          compact ? "text-[8px]" : "text-[9px]"
        } tracking-[1.5px] uppercase font-medium`}
      >
        AI
      </span>
      <span
        className={`${
          compact ? "w-[38px] h-[22px]" : "w-[42px] h-[24px]"
        } rounded-full relative transition-colors border ${
          enabled
            ? "bg-ink-dark border-ink-dark"
            : "bg-border-main border-border-main"
        }`}
      >
        <motion.span
          className={`${
            compact ? "w-[18px] h-[18px]" : "w-[20px] h-[20px]"
          } rounded-full bg-settings absolute top-[1px] left-[1px] shadow-sm`}
          animate={{ x: enabled ? (compact ? 16 : 18) : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        />
      </span>
    </button>
  );
}
