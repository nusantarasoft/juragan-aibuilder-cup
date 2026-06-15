import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export interface GlassPanelProps extends HTMLMotionProps<"div"> {
  isDark: boolean;
  intensity?: "low" | "medium" | "high";
  children: React.ReactNode;
}

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ isDark, intensity = "medium", style, children, ...props }, ref) => {
    const getIntensityStyle = () => {
      switch (intensity) {
        case "low":
          return {
            background: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
            backdropFilter: "blur(4px)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
          };
        case "high":
          return {
            background: isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)",
            backdropFilter: "blur(16px)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
          };
        case "medium":
        default:
          return {
            background: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          };
      }
    };

    return (
      <motion.div
        ref={ref}
        style={{ ...getIntensityStyle(), ...style }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
