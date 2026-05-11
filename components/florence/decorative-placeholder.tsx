"use client";

import { motion } from "motion/react";
import { SVGProps, ComponentType } from "react";

type DecorativePlaceholderProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  className?: string;
  delay?: number;
};

export function DecorativePlaceholder({
  Icon,
  label,
  className,
  delay = 0,
}: DecorativePlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-ink opacity-20 ${className}`}
    >
      <motion.div
        className="w-full h-full flex items-center justify-center"
        initial={{
          opacity: 0,
          y: 18,
          scale: 0.985,
          filter: "blur(8px)",
        }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{
          duration: 1.1,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <Icon
          strokeWidth={0.75}
          className="w-full h-full mb-2"
          aria-label={label}
        />
      </motion.div>
    </div>
  );
}
