import React from 'react';
import { motion } from 'framer-motion';

import { HTMLMotionProps } from 'framer-motion';

interface GlassPanelProps extends Omit<HTMLMotionProps<"div">, "style" | "className"> {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  isDark?: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

export function GlassPanel({ children, style, className, isDark = true, intensity = 'medium', ...motionProps }: GlassPanelProps) {
  const getBlur = () => {
    switch (intensity) {
      case 'low': return 'blur(8px)';
      case 'high': return 'blur(24px)';
      default: return 'blur(16px)';
    }
  };

  const getBgColor = () => {
    if (isDark) {
      switch (intensity) {
        case 'low': return 'rgba(20, 20, 30, 0.4)';
        case 'high': return 'rgba(10, 10, 20, 0.8)';
        default: return 'rgba(15, 15, 25, 0.65)';
      }
    } else {
      switch (intensity) {
        case 'low': return 'rgba(255, 255, 255, 0.5)';
        case 'high': return 'rgba(240, 240, 250, 0.9)';
        default: return 'rgba(250, 250, 255, 0.75)';
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
      {...motionProps}
      className={className}
      style={{
        background: getBgColor(),
        backdropFilter: getBlur(),
        WebkitBackdropFilter: getBlur(),
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        boxShadow: `0 8px 32px ${isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.1)'}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
        borderRadius: '16px',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Subtle shine effect */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '40%',
        background: `linear-gradient(180deg, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.4)'} 0%, rgba(255,255,255,0) 100%)`,
        pointerEvents: 'none',
      }} />
      {children}
    </motion.div>
  );
}
