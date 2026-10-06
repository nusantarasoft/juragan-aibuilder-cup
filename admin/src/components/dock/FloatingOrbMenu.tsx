import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EditOutlined, StarOutlined, MailOutlined, BellOutlined, WarningFilled, PlusOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { Tooltip, Badge } from 'antd';
import { BorderBeam } from '@/components/ui/border-beam';
import { getVOTheme } from '../layout/voTheme';

const FloatingOrbMenu = ({ darkMode = false }: { darkMode?: boolean }) => {
    const vo = getVOTheme(darkMode);
    const [isOpen, setIsOpen] = useState(false); // Default closed
    const [isHovered, setIsHovered] = useState(false);

    const [activeChild, setActiveChild] = useState<string | null>(null); // Track clicked child

    // Orbital configuration
    const radius = 135; 

    const childrenList = [
        { 
            id: 'bell1', icon: <BellOutlined />, badge: '1', badgeColor: '#d97706', baseAngle: 135,
            subChildren: [
                { id: 'sub-bell1-1', icon: <BellOutlined />, angle: 90 },
                { id: 'sub-bell1-2', icon: <BellOutlined />, angle: 135 },
                { id: 'sub-bell1-3', icon: <BellOutlined />, angle: 180 }
            ]
        },
        { 
            id: 'mail', icon: <MailOutlined />, baseAngle: 180,
            subChildren: [
                { id: 'sub-mail-1', icon: <MailOutlined />, angle: 135 },
                { id: 'sub-mail-2', icon: <MailOutlined />, angle: 180 },
                { id: 'sub-mail-3', icon: <MailOutlined />, angle: 225 }
            ]
        },
        { 
            id: 'star', icon: <StarOutlined />, baseAngle: 225,
            subChildren: [
                { id: 'sub-star-1', icon: <StarOutlined />, angle: 180 },
                { id: 'sub-star-2', icon: <StarOutlined />, angle: 225 },
                { id: 'sub-star-3', icon: <StarOutlined />, angle: 270 }
            ]
        },
        { 
            id: 'edit', icon: <EditOutlined />, baseAngle: 270,
            subChildren: [
                { id: 'sub-edit-1', icon: <EditOutlined />, angle: 225 },
                { id: 'sub-edit-2', icon: <EditOutlined />, angle: 270 },
                { id: 'sub-edit-3', icon: <EditOutlined />, angle: 315 }
            ]
        },
        { 
            id: 'bell2', icon: <BellOutlined />, badge: '3', badgeColor: '#9f1239', baseAngle: 315,
            subChildren: [
                { id: 'sub-bell2-1', icon: <BellOutlined />, angle: 270 },
                { id: 'sub-bell2-2', icon: <BellOutlined />, angle: 315 },
                { id: 'sub-bell2-3', icon: <BellOutlined />, angle: 360 }
            ]
        },
    ];

    const childBtnStyle = {
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: vo.glass,
        boxShadow: vo.shadow,
        cursor: 'pointer',
        color: vo.text, 
        fontSize: '1rem',
        transition: 'transform 0.2s ease',
        border: `1px solid ${vo.border}`,
        backdropFilter: vo.blur
    };

    return (
        <div 
            style={{
                position: 'fixed',
                bottom: 55,
                right: 65, 
                zIndex: 9999,
                width: 100,
                height: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* Orbital Track (SVG Arc) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.svg
                        key="orbital-track"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        style={{
                            position: 'absolute',
                            width: 280,
                            height: 280,
                            pointerEvents: 'none',
                            zIndex: 0,
                            top: -90, 
                            left: -90,
                        }}
                        viewBox="0 0 280 280"
                    >
                        {/* Orbital Track Segments */}
                        {[
                            [120, 127],
                            [143, 172],
                            [188, 217],
                            [233, 262],
                            [278, 307],
                            [323, 330]
                        ].map(([startAngle, endAngle], i) => {
                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = (endAngle * Math.PI) / 180;
                            const startX = 140 + 65 * Math.cos(startRad);
                            const startY = 140 + 65 * Math.sin(startRad);
                            const endX = 140 + 65 * Math.cos(endRad);
                            const endY = 140 + 65 * Math.sin(endRad);
                            return (
                                <path 
                                    key={`arc-${i}`}
                                    d={`M ${startX} ${startY} A 65 65 0 0 1 ${endX} ${endY}`} 
                                    fill="none" 
                                    stroke="rgba(107, 114, 128, 0.6)" 
                                    strokeWidth="3" 
                                    strokeLinecap="round"
                                />
                            );
                        })}
                        {/* Main Dots */}
                        {childrenList.map((child, index) => {
                            const angleRad = (child.baseAngle * Math.PI) / 180;
                            const cx = 140 + Math.cos(angleRad) * 65;
                            const cy = 140 + Math.sin(angleRad) * 65;
                            const colors = ['#7e22ce', '#92400e', '#6b7280', '#0f766e', '#3b82f6'];
                            return <circle key={`dot-${child.id}`} cx={cx} cy={cy} r="4" fill={colors[index]} />;
                        })}
                    </motion.svg>
                )}
            </AnimatePresence>

            {/* Child Buttons & Sub-Orbits */}
            {childrenList.map((child, index) => {
                const angleRad = (child.baseAngle * Math.PI) / 180;
                const childRadius = 100;
                const x = Math.cos(angleRad) * childRadius;
                const y = Math.sin(angleRad) * childRadius;
                const isActive = activeChild === child.id;

                return (
                    <AnimatePresence key={child.id}>
                        {isOpen && (
                            <motion.div
                                key={`child-${child.id}`}
                                initial={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
                                animate={{ x, y, opacity: 1, scale: 1 }}
                                exit={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.05 }}
                                style={{ position: 'absolute', zIndex: isActive ? 10 : 1 }}
                            >
                                <div
                                    style={childBtnStyle}
                                    onClick={() => setActiveChild(isActive ? null : child.id)}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {child.icon}
                                    {child.badge && (
                                        <div style={{
                                            position: 'absolute',
                                            top: -4,
                                            right: -4,
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: child.badgeColor,
                                            border: `2px solid ${vo.ring}`,
                                            color: 'white',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }}>
                                            {child.badge}
                                        </div>
                                    )}
                                </div>

                                {/* Sub-Orbital Track & Dots */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.svg
                                            key={`sub-track-${child.id}`}
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0 }}
                                            style={{
                                                position: 'absolute',
                                                width: 120,
                                                height: 120,
                                                pointerEvents: 'none',
                                                top: -42, 
                                                left: -42,
                                                zIndex: -1
                                            }}
                                            viewBox="0 0 120 120"
                                        >
                                            {child.subChildren?.map((sub, i, arr) => {
                                                const angleRad = (sub.angle * Math.PI) / 180;
                                                const dotCx = 60 + Math.cos(angleRad) * 28;
                                                const dotCy = 60 + Math.sin(angleRad) * 28;
                                                
                                                const arcs = [];
                                                const gap = 12; // degrees gap around the dot
                                                
                                                if (i === 0) {
                                                    const startRad = ((sub.angle - 35) * Math.PI) / 180;
                                                    const endRad = ((sub.angle - gap) * Math.PI) / 180;
                                                    arcs.push({ startRad, endRad });
                                                }
                                                
                                                if (i < arr.length - 1) {
                                                    const startRad = ((sub.angle + gap) * Math.PI) / 180;
                                                    const endRad = ((arr[i+1].angle - gap) * Math.PI) / 180;
                                                    arcs.push({ startRad, endRad });
                                                } else {
                                                    const startRad = ((sub.angle + gap) * Math.PI) / 180;
                                                    const endRad = ((sub.angle + 35) * Math.PI) / 180;
                                                    arcs.push({ startRad, endRad });
                                                }

                                                return (
                                                    <g key={`sub-group-${sub.id}`}>
                                                        <circle cx={dotCx} cy={dotCy} r="3" fill="rgba(22, 119, 255, 0.8)" />
                                                        {arcs.map((arc, aIdx) => {
                                                            const startX = 60 + 28 * Math.cos(arc.startRad);
                                                            const startY = 60 + 28 * Math.sin(arc.startRad);
                                                            const endX = 60 + 28 * Math.cos(arc.endRad);
                                                            const endY = 60 + 28 * Math.sin(arc.endRad);
                                                            return (
                                                                <path 
                                                                    key={`sub-arc-${i}-${aIdx}`}
                                                                    d={`M ${startX} ${startY} A 28 28 0 0 1 ${endX} ${endY}`} 
                                                                    fill="none" 
                                                                    stroke="rgba(22, 119, 255, 0.4)" 
                                                                    strokeWidth="2.5" 
                                                                    strokeLinecap="round"
                                                                />
                                                            );
                                                        })}
                                                    </g>
                                                );
                                            })}
                                        </motion.svg>
                                    )}
                                </AnimatePresence>

                                {/* Sub-Orbital Buttons */}
                                <AnimatePresence>
                                    {isActive && child.subChildren?.map((sub, i) => {
                                        const subAngleRad = (sub.angle * Math.PI) / 180;
                                        const subRadius = 55;
                                        // Offset by 18 (center of parent btn) and -14 (half of 28px sub-btn)
                                        const subX = 18 + Math.cos(subAngleRad) * subRadius - 14;
                                        const subY = 18 + Math.sin(subAngleRad) * subRadius - 14;

                                        return (
                                            <motion.div
                                                key={`sub-${sub.id}`}
                                                initial={{ x: 18 - 14, y: 18 - 14, opacity: 0, scale: 0 }}
                                                animate={{ x: subX, y: subY, opacity: 1, scale: 1 }}
                                                exit={{ x: 18 - 14, y: 18 - 14, opacity: 0, scale: 0 }}
                                                transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.05 }}
                                                style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
                                            >
                                                <div
                                                    style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: vo.glass,
                                                        boxShadow: vo.shadow,
                                                        cursor: 'pointer',
                                                        color: vo.text, 
                                                        fontSize: '0.8rem',
                                                        border: `1px solid ${vo.borderStrong}`,
                                                        backdropFilter: vo.blur,
                                                        transition: 'transform 0.2s ease',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    {sub.icon}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                );
            })}

            {/* Main Orb Button (+) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="main-orb"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                            scale: 1, 
                            opacity: 1, 
                            y: [0, -4, 0]
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ 
                            scale: { type: "spring", stiffness: 260, damping: 20 },
                            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                        }}
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            width: 75, 
                            height: 75,
                            flexShrink: 0,
                            borderRadius: '50%',
                            background: vo.accentGradient,
                            boxShadow: vo.accentGlow,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <BorderBeam size={75} duration={4} colorFrom="#ffffff" colorTo="transparent" borderWidth={2.5} />
                        <PlusOutlined style={{ fontSize: '2.4rem', color: '#ffffff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />

                        {/* Orange Warning Badge */}
                        <div style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            <WarningFilled style={{ color: '#e11d48', fontSize: '1rem' }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Separate Hamburger Menu Orb (Bottom Right) */}
            <motion.div
                onClick={() => setIsOpen(!isOpen)}
                animate={{ 
                    y: [0, -3, 0], 
                    rotate: isOpen ? 90 : 0
                }}
                transition={{ 
                    y: { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 },
                    rotate: { type: "spring", stiffness: 300, damping: 20 }
                }}
                style={{
                    position: 'absolute',
                    bottom: -35,
                    right: -40,
                    zIndex: 3, 
                    width: 55, 
                    height: 55,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    background: vo.accentGradient,
                    boxShadow: vo.accentGlow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <BorderBeam size={55} duration={4} colorFrom="#ffffff" colorTo="transparent" borderWidth={2.5} />
                {isOpen ? 
                    <CloseOutlined style={{ fontSize: '1.5rem', color: '#ffffff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} /> :
                    <MenuOutlined style={{ fontSize: '1.5rem', color: '#ffffff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                }
            </motion.div>
        </div>
    );
};

export default FloatingOrbMenu;
