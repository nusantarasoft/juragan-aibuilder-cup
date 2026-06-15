"use client";

import React, { useEffect, useState } from "react";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

// Simulated ghost users for demonstration purposes
const MOCK_USERS = [
  { id: "usr_1", name: "Sarah J.", color: "#ef4444" },
  { id: "usr_2", name: "David M.", color: "#3b82f6" },
  { id: "usr_3", name: "Elena V.", color: "#10b981" },
];

export default function LiveCursors() {
  const { cursors, updateCursor, removeCursor } = useWebSocketStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // In a real implementation, we would emit our mouse coordinates to the socket.
    // Since the NestJS gateway isn't fully configured for cursor_move yet, we simulate
    // other users looking at the same page for the collaborative UX demonstration.
    
    const intervals: NodeJS.Timeout[] = [];
    const activeMocks = MOCK_USERS.slice(0, Math.floor(Math.random() * 3) + 1);

    activeMocks.forEach((mock) => {
      let currentX = window.innerWidth / 2;
      let currentY = window.innerHeight / 2;

      // Initial pop-in
      updateCursor({ ...mock, x: currentX, y: currentY });

      // Random movement generator
      const interval = setInterval(() => {
        // Move towards a random target, sometimes stopping
        if (Math.random() > 0.3) {
          currentX += (Math.random() - 0.5) * 400;
          currentY += (Math.random() - 0.5) * 400;
          
          // Constrain to screen
          currentX = Math.max(50, Math.min(window.innerWidth - 50, currentX));
          currentY = Math.max(50, Math.min(window.innerHeight - 50, currentY));

          updateCursor({ ...mock, x: currentX, y: currentY });
        }
      }, 1000 + Math.random() * 2000);

      intervals.push(interval);
    });

    return () => {
      intervals.forEach(clearInterval);
      activeMocks.forEach(m => removeCursor(m.id));
    };
  }, [pathname, updateCursor, removeCursor]);

  if (!mounted) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <AnimatePresence>
        {Object.values(cursors).map((cursor) => (
          <motion.div
            key={cursor.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, x: cursor.x, y: cursor.y }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 200, 
              mass: 0.5 
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'none',
            }}
          >
            {/* SVG Cursor matching Figma style */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}
            >
              <path
                d="M5.65376 21.0069C5.23351 21.3651 4.58334 21.0264 4.62121 20.4727L5.80373 3.16704C5.83617 2.69225 6.42533 2.45524 6.77977 2.77443L21.3855 15.9262C21.7825 16.2836 21.5794 16.9458 21.0416 17.0494L14.4172 18.3243C14.1952 18.3671 13.9922 18.4904 13.8443 18.672L5.65376 21.0069Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <div
              style={{
                backgroundColor: cursor.color,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                borderTopLeftRadius: '0px',
                fontSize: '12px',
                fontWeight: 600,
                marginTop: '2px',
                marginLeft: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
                width: 'fit-content'
              }}
            >
              {cursor.name}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
