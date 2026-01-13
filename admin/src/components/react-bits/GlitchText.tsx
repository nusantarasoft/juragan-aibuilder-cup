// GlitchText - Fixed version with inline CSS keyframes
// No Tailwind configuration needed - animations work out of the box
"use client";

import { FC, useId } from 'react';

interface GlitchTextProps {
  children: string;
  speed?: number;
  enableShadows?: boolean;
  enableOnHover?: boolean;
  className?: string;
  color?: string;
  glitchColor1?: string;
  glitchColor2?: string;
}

const GlitchText: FC<GlitchTextProps> = ({
  children,
  speed = 0.5,
  enableShadows = true,
  enableOnHover = false,
  className = '',
  color = 'inherit',
  glitchColor1 = '#9333ea',
  glitchColor2 = '#8b5cf6',
}) => {
  const id = useId().replace(/:/g, '');
  const afterDuration = speed * 3;
  const beforeDuration = speed * 2;

  // Inject keyframes and component styles
  const glitchStyles = `
    @keyframes glitch-${id} {
      0% { clip-path: inset(20% 0 50% 0); }
      5% { clip-path: inset(10% 0 60% 0); }
      10% { clip-path: inset(15% 0 55% 0); }
      15% { clip-path: inset(25% 0 35% 0); }
      20% { clip-path: inset(30% 0 40% 0); }
      25% { clip-path: inset(40% 0 20% 0); }
      30% { clip-path: inset(10% 0 60% 0); }
      35% { clip-path: inset(15% 0 55% 0); }
      40% { clip-path: inset(25% 0 35% 0); }
      45% { clip-path: inset(30% 0 40% 0); }
      50% { clip-path: inset(20% 0 50% 0); }
      55% { clip-path: inset(10% 0 60% 0); }
      60% { clip-path: inset(15% 0 55% 0); }
      65% { clip-path: inset(25% 0 35% 0); }
      70% { clip-path: inset(30% 0 40% 0); }
      75% { clip-path: inset(40% 0 20% 0); }
      80% { clip-path: inset(20% 0 50% 0); }
      85% { clip-path: inset(10% 0 60% 0); }
      90% { clip-path: inset(15% 0 55% 0); }
      95% { clip-path: inset(25% 0 35% 0); }
      100% { clip-path: inset(30% 0 40% 0); }
    }

    .glitch-text-${id} {
      position: relative;
      display: inline-block;
      font-weight: 900;
      cursor: pointer;
      user-select: none;
      color: ${color};
    }

    .glitch-text-${id}::before,
    .glitch-text-${id}::after {
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
    }

    .glitch-text-${id}::before {
      left: 2px;
      text-shadow: ${enableShadows ? `-2px 0 ${glitchColor1}` : 'none'};
      animation: glitch-${id} ${beforeDuration}s infinite linear alternate-reverse;
    }

    .glitch-text-${id}::after {
      left: -2px;
      text-shadow: ${enableShadows ? `2px 0 ${glitchColor2}` : 'none'};
      animation: glitch-${id} ${afterDuration}s infinite linear alternate-reverse;
    }

    ${enableOnHover ? `
      .glitch-text-${id}::before,
      .glitch-text-${id}::after {
        opacity: 0;
        animation: none;
      }
      .glitch-text-${id}:hover::before,
      .glitch-text-${id}:hover::after {
        opacity: 1;
        animation: glitch-${id} ${beforeDuration}s infinite linear alternate-reverse;
      }
    ` : ''}
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: glitchStyles }} />
      <span
        className={`glitch-text-${id} ${className}`}
        data-text={children}
      >
        {children}
      </span>
    </>
  );
};

export default GlitchText;
