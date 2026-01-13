"use client"

import { useCallback, useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  /** Current dark mode state (controlled) */
  isDark: boolean
  /** Callback when theme should change */
  onThemeChange: (isDark: boolean) => void
  /** Animation duration in ms */
  duration?: number
  /** Size of the icon */
  size?: number
}

export const AnimatedThemeToggler = ({
  className,
  isDark,
  onThemeChange,
  duration = 700,
  size = 18,
  ...props
}: AnimatedThemeTogglerProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return

    // Capture coordinates before state update/transition to ensure we have valid ref
    const { top, left, width, height } = buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    )

    const newTheme = !isDark

    // Check if View Transitions API is supported
    if (typeof document.startViewTransition === "function") {
      try {
        await document.startViewTransition(() => {
          flushSync(() => {
            onThemeChange(newTheme)
          })
        }).ready



        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        )
      } catch (e) {
        // If animation fails, still toggle theme
        onThemeChange(newTheme)
      }
    } else {
      // Fallback for browsers that don't support View Transitions
      onThemeChange(newTheme)
    }
  }, [isDark, duration, onThemeChange])

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 transition-colors",
        "hover:bg-black/5 dark:hover:bg-white/10",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      {...props}
    >
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  )
}
