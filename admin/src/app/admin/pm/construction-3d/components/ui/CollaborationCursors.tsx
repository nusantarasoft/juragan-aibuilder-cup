import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, Tooltip } from 'antd';
import { usePreferencesStore } from '@/store/usePreferencesStore';

// Mock data for other users online
const MOCK_USERS = [
  { id: 'u1', name: 'Ahmad R.', color: '#ef4444', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad' },
  { id: 'u2', name: 'Budi S.', color: '#3b82f6', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi' },
  { id: 'u3', name: 'Sarah W.', color: '#10b981', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
];

export function CollaborationCursors() {
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number }>>({});
  const { themeColor } = usePreferencesStore();

  useEffect(() => {
    // Simulate real-time cursor movements
    const interval = setInterval(() => {
      const newCursors = { ...cursors };
      MOCK_USERS.forEach((user) => {
        // Randomly move cursors slightly around the screen
        if (!newCursors[user.id]) {
          newCursors[user.id] = {
            x: window.innerWidth * 0.2 + Math.random() * window.innerWidth * 0.6,
            y: window.innerHeight * 0.2 + Math.random() * window.innerHeight * 0.6,
          };
        } else {
          newCursors[user.id] = {
            x: Math.max(0, Math.min(window.innerWidth - 20, newCursors[user.id].x + (Math.random() - 0.5) * 50)),
            y: Math.max(0, Math.min(window.innerHeight - 20, newCursors[user.id].y + (Math.random() - 0.5) * 50)),
          };
        }
      });
      setCursors(newCursors);
    }, 1500);

    return () => clearInterval(interval);
  }, [cursors]);

  return (
    <>
      {/* Cursors Overlay */}
      <AnimatePresence>
        {Object.entries(cursors).map(([id, pos]) => {
          const user = MOCK_USERS.find(u => u.id === id);
          if (!user) return null;
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: pos.x, y: pos.y }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.65376 21.2573L2.25376 3.25732L21.2538 12.2573L13.2538 14.2573L11.2538 22.2573L5.65376 21.2573Z" fill={user.color} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{
                background: user.color,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {user.name}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Avatars Top Right Container - will be placed absolute in the layout */}
      <div style={{
        position: 'absolute',
        top: 24,
        right: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 1000,
        background: 'rgba(20,20,30,0.6)',
        backdropFilter: 'blur(10px)',
        padding: '4px 8px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginRight: 8 }}>3 Online</span>
        <Avatar.Group size="small" maxCount={3}>
          {MOCK_USERS.map(u => (
            <Tooltip title={`${u.name} (Online)`} key={u.id}>
              <Avatar src={u.avatar} style={{ border: `2px solid ${u.color}` }} />
            </Tooltip>
          ))}
        </Avatar.Group>
      </div>
    </>
  );
}
