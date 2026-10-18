"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { TamagotchiModel, EyeExpression } from '../helper/TamagotchiGlobal';
import { Tooltip } from 'antd';
import { useDeckStore, useDeckUi, startDeckPolling } from '../agentic-os/lib/deckStore';
import { daysBetween, ddmm, dowDdmm, isoWeek, relDays, ymd } from '../agentic-os/lib/deckTime';
import { GoalEditor, GoalReviewDialog } from '../agentic-os/apps/deck/DeckGoals';
import type { OsGoal } from '../agentic-os/lib/types';

const localTz = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
    } catch {
        return "Asia/Jakarta";
    }
};

// ─── Agentic OS Card Styles ──────────────────────────────────
const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

const cardStyle = (darkMode: boolean): React.CSSProperties => ({
    background: darkMode
        ? "rgba(11, 14, 19, 0.92)"
        : "rgba(255, 255, 255, 0.94)",
    backdropFilter: "blur(12px)",
    borderRadius: 0,
    padding: '7px 9px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
    border: darkMode
        ? "1px solid rgba(255, 255, 255, 0.12)"
        : "1px solid rgba(15, 23, 42, 0.12)",
    borderTop: "2px solid #fb923c",
    boxShadow: darkMode
        ? "0 12px 30px -10px rgba(0, 0, 0, 0.65)"
        : "0 8px 24px -8px rgba(15, 23, 42, 0.08)",
});

const hoverIn = (color: string, darkMode: boolean = false) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.boxShadow = darkMode
        ? `0 16px 32px -10px rgba(0, 0, 0, 0.85), 0 0 12px ${color}`
        : `0 12px 24px -8px ${color}`;
};
const hoverOut = (darkMode: boolean = false) => (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = darkMode
        ? '0 12px 30px -10px rgba(0, 0, 0, 0.65)'
        : '0 8px 24px -8px rgba(15, 23, 42, 0.08)';
};

// ─── Tamagotchi Game Types & Mechanics ───────────────────────

type Personality = 'rebellious' | 'cheerful' | 'studious' | 'athletic' | 'lazy';
type MoodTier = 'ecstatic' | 'happy' | 'content' | 'bored' | 'irritated' | 'angry' | 'depressed' | 'critical';
type ActionKey = 'feed' | 'play' | 'dance' | 'talk' | 'exercise' | 'work' | 'praise' | 'sleep' | 'pet';

interface CravingQuest {
    action: ActionKey;
    label: string;
    xpBonus: number;
    bondBonus: number;
}

interface EvolutionStage {
    rank: string;
    title: string;
    xpMult: number;
    drainMult: number;
    accent: string;
}

const getEvolutionStage = (level: number): EvolutionStage => {
    if (level >= 10) return { rank: 'IV', title: 'ARCH-IGNIS', xpMult: 1.5, drainMult: 0.8, accent: '#38bdf8' };
    if (level >= 6)  return { rank: 'III', title: 'ASH-WARDEN', xpMult: 1.25, drainMult: 0.9, accent: '#a855f7' };
    if (level >= 3)  return { rank: 'II', title: 'EMBER-PUFF', xpMult: 1.1, drainMult: 0.95, accent: '#fb923c' };
    return { rank: 'I', title: 'CINDER-MITE', xpMult: 1.0, drainMult: 1.0, accent: '#fb923c' };
};

const personalityModifiers: Record<Personality, {
    energyDrain: number;
    hungerDrain: number;
    happyDrain: number;
    fitnessDrain: number;
    intellectDrain: number;
    favAction: ActionKey;
    hatedAction: ActionKey;
}> = {
    rebellious: { energyDrain: 0.6, hungerDrain: 0.8, happyDrain: 1.0, fitnessDrain: 0.4, intellectDrain: 0.5, favAction: 'play', hatedAction: 'work' },
    cheerful:   { energyDrain: 0.8, hungerDrain: 0.7, happyDrain: 0.3, fitnessDrain: 0.5, intellectDrain: 0.4, favAction: 'dance', hatedAction: 'exercise' },
    studious:   { energyDrain: 0.7, hungerDrain: 0.5, happyDrain: 0.7, fitnessDrain: 0.6, intellectDrain: 0.2, favAction: 'work', hatedAction: 'play' },
    athletic:   { energyDrain: 0.5, hungerDrain: 0.9, happyDrain: 0.6, fitnessDrain: 0.2, intellectDrain: 0.7, favAction: 'exercise', hatedAction: 'work' },
    lazy:       { energyDrain: 0.3, hungerDrain: 0.4, happyDrain: 0.6, fitnessDrain: 0.9, intellectDrain: 0.8, favAction: 'sleep', hatedAction: 'exercise' },
};

const CRAVING_POOL: CravingQuest[] = [
    { action: 'feed', label: 'FEED FUEL', xpBonus: 30, bondBonus: 6 },
    { action: 'play', label: 'ORB GOLF', xpBonus: 35, bondBonus: 7 },
    { action: 'dance', label: 'SPIN DANCE', xpBonus: 35, bondBonus: 8 },
    { action: 'talk', label: 'SYNC CHAT', xpBonus: 25, bondBonus: 6 },
    { action: 'exercise', label: 'STRETCH DRILL', xpBonus: 40, bondBonus: 7 },
    { action: 'work', label: 'RUNE CONJURE', xpBonus: 45, bondBonus: 8 },
    { action: 'praise', label: 'SALUTE / PRAISE', xpBonus: 25, bondBonus: 9 },
    { action: 'pet', label: 'PET MASCOT', xpBonus: 30, bondBonus: 10 },
];

const randomEvents: { message: string; expression: EyeExpression; animation: string; duration: number; delta?: Partial<Record<'e' | 'hun' | 'h' | 'f' | 'i', number>> }[] = [
    { message: "Squashed a bug! +10 INT", expression: 'surprised', animation: 'pointing', duration: 3000, delta: { i: 10 } },
    { message: "Morning stretch! +6 FIT", expression: 'happy', animation: 'stretching', duration: 3200, delta: { f: 6 } },
    { message: "Feeling loved! +12 JOY", expression: 'love', animation: 'dancing', duration: 3800, delta: { h: 12 } },
    { message: "Static discharge! -6 NRG", expression: 'surprised', animation: 'salute', duration: 2500, delta: { e: -6 } },
    { message: "Happy clap! +8 JOY", expression: 'happy', animation: 'clapping', duration: 3000, delta: { h: 8 } },
    { message: "Arcane insight! +10 INT", expression: 'star', animation: 'working', duration: 3500, delta: { i: 10 } },
    { message: "Belly rumble... -8 FUE", expression: 'confused', animation: 'talking1', duration: 2500, delta: { hun: -8 } },
    { message: "Showing off visor!", expression: 'cool', animation: 'dancing2', duration: 3800, delta: { h: 6, f: 4 } },
];

// ─── Smooth Camera Framing Controller ────────────────────────
const CameraRig: React.FC<{ zoomClose: boolean; controlsRef: React.RefObject<any> }> = ({ zoomClose, controlsRef }) => {
    const { camera } = useThree();
    const targetCamPos = useMemo(() => new THREE.Vector3(), []);
    const targetLookAt = useMemo(() => new THREE.Vector3(), []);
    const transitionRef = useRef<number>(0.65);

    useEffect(() => {
        transitionRef.current = 0.65;
    }, [zoomClose]);

    useFrame((_, delta) => {
        if (transitionRef.current <= 0) return;
        transitionRef.current = Math.max(0, transitionRef.current - delta);

        const damp = Math.min(1, delta * 8.0);
        // Zoomed-in full-body default (z = 2.88) vs Close-up face portrait (z = 1.95)
        if (zoomClose) {
            targetCamPos.set(0, 0.20, 1.95);
            targetLookAt.set(0, 0.16, 0);
        } else {
            targetCamPos.set(0, 0.02, 2.88);
            targetLookAt.set(0, -0.02, 0);
        }

        camera.position.lerp(targetCamPos, damp);
        if (controlsRef.current) {
            controlsRef.current.target.lerp(targetLookAt, damp);
            controlsRef.current.update();
        }
    });

    return null;
};

// ─── Ultra-Compact HUD Vital Pill (Inside Canvas Top Overlay) ───
const MicroVitalChip = ({
    code,
    value,
    color,
}: {
    code: string;
    value: number;
    color: string;
}) => {
    const pct = Math.round(Math.max(0, Math.min(100, value)));
    const barColor = pct > 50 ? color : pct > 22 ? '#f59e0b' : '#ef4444';
    const isLow = pct <= 22;

    return (
        <div
            style={{
                flex: 1,
                minWidth: 0,
                background: 'rgba(255, 255, 255, 0.86)',
                backdropFilter: 'blur(4px)',
                border: `1px solid ${isLow ? 'rgba(239, 68, 68, 0.55)' : 'rgba(15, 23, 42, 0.12)'}`,
                padding: '1px 3px 2px',
                fontFamily: MONO_FONT,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', lineHeight: 1.1 }}>
                <span style={{ fontSize: 7, fontWeight: 800, color: '#475569' }}>{code}</span>
                <span
                    style={{
                        fontSize: 7.5,
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: isLow ? '#dc2626' : '#0f172a',
                    }}
                >
                    {pct}
                </span>
            </div>
            <div style={{ width: '100%', height: 2, background: 'rgba(15, 23, 42, 0.10)', marginTop: 1 }}>
                <div
                    style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: barColor,
                        transition: 'width 0.3s ease-out',
                    }}
                />
            </div>
        </div>
    );
};

// ─── Single-Row Compact Tactical Icon Tile ───────────────────
const CompactActionTile = ({
    onClick,
    icon,
    label,
    color,
    darkMode,
    tooltip,
    isFav,
    isQuest,
    isActive,
}: {
    onClick: () => void;
    icon: string;
    label: string;
    color: string;
    darkMode: boolean;
    tooltip: string;
    isFav?: boolean;
    isQuest?: boolean;
    isActive?: boolean;
}) => (
    <Tooltip
        title={
            <span style={{ fontFamily: MONO_FONT, fontSize: 10 }}>
                <strong style={{ color }}>{label}</strong> · {tooltip}
            </span>
        }
        placement="top"
    >
        <button
            type="button"
            aria-label={label}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 24,
                width: '100%',
                padding: 0,
                borderRadius: 0,
                fontFamily: MONO_FONT,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                background: isActive
                    ? 'rgba(251, 146, 60, 0.22)'
                    : isQuest
                      ? 'rgba(56, 189, 248, 0.16)'
                      : darkMode
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(15, 23, 42, 0.03)',
                border: isActive
                    ? '1px solid rgba(251, 146, 60, 0.85)'
                    : isQuest
                      ? '1px solid rgba(56, 189, 248, 0.85)'
                      : darkMode
                        ? '1px solid rgba(255, 255, 255, 0.10)'
                        : '1px solid rgba(15, 23, 42, 0.10)',
                borderBottom: `2px solid ${isActive ? '#fb923c' : isQuest ? '#38bdf8' : color}`,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = `${color}24`;
                e.currentTarget.style.borderColor = color;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive
                    ? 'rgba(251, 146, 60, 0.22)'
                    : isQuest
                      ? 'rgba(56, 189, 248, 0.16)'
                      : darkMode
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = isActive
                    ? 'rgba(251, 146, 60, 0.85)'
                    : isQuest
                      ? 'rgba(56, 189, 248, 0.85)'
                      : darkMode
                        ? '1px solid rgba(255, 255, 255, 0.10)'
                        : '1px solid rgba(15, 23, 42, 0.10)';
                e.currentTarget.style.borderBottom = `2px solid ${isActive ? '#fb923c' : isQuest ? '#38bdf8' : color}`;
            }}
        >
            <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>
            {isFav && (
                <span
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 1,
                        fontSize: 6.5,
                        color: '#fb923c',
                        lineHeight: 1,
                    }}
                >
                    ★
                </span>
            )}
            {isQuest && (
                <span
                    style={{
                        position: 'absolute',
                        top: 1,
                        left: 1,
                        width: 4,
                        height: 4,
                        background: '#38bdf8',
                    }}
                />
            )}
        </button>
    </Tooltip>
);

// ─── Main Component ──────────────────────────────────────────

const STORAGE_KEY = 'ns.admin.cinderPuff.v2';

export const ModuleIllustrationCards: React.FC<{ collapsed?: boolean; darkMode?: boolean }> = ({
    collapsed = false,
    darkMode = false,
}) => {
    // Core Vitals (0-100)
    const [energy, setEnergy] = useState(82);
    const [hunger, setHunger] = useState(80);
    const [happiness, setHappiness] = useState(78);
    const [fitness, setFitness] = useState(65);
    const [intellect, setIntellect] = useState(68);

    // Progression & Meta Stats
    const [level, setLevel] = useState(1);
    const [xp, setXp] = useState(0);
    const [personality, setPersonality] = useState<Personality>('cheerful');
    const [bond, setBond] = useState(25);
    const [age, setAge] = useState(0);
    const [combo, setCombo] = useState(1);

    // AI & Viewport State
    const [botState, setBotState] = useState<string>('idle');
    const [activeActionKey, setActiveActionKey] = useState<ActionKey | null>(null);
    const [eyeExpression, setEyeExpression] = useState<EyeExpression>('normal');
    const [lastInteraction, setLastInteraction] = useState(Date.now());
    const [isSleeping, setIsSleeping] = useState(false);
    const [statusMessage, setStatusMessage] = useState('NOMINAL');
    const [actionLocked, setActionLocked] = useState(false);
    const [eventLog, setEventLog] = useState<string[]>(['Cinder-Puff synced.']);
    const [floatingToast, setFloatingToast] = useState<string | null>(null);
    const [activeCraving, setActiveCraving] = useState<CravingQuest>(() => CRAVING_POOL[2]);
    const [zoomClose, setZoomClose] = useState(false);

    const [consecutiveSame, setConsecutiveSame] = useState(0);
    const [lastActionType, setLastActionType] = useState<ActionKey | ''>('');
    const controlsRef = useRef<any>(null);
    const hydratedRef = useRef(false);

    // Hydrate from localStorage on mount (with safe floor so it never loads into a 0-fuel deadlock)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (typeof saved.energy === 'number') setEnergy(Math.max(25, saved.energy));
                if (typeof saved.hunger === 'number') setHunger(Math.max(25, saved.hunger));
                if (typeof saved.happiness === 'number') setHappiness(Math.max(25, saved.happiness));
                if (typeof saved.fitness === 'number') setFitness(Math.max(20, saved.fitness));
                if (typeof saved.intellect === 'number') setIntellect(Math.max(20, saved.intellect));
                if (typeof saved.level === 'number') setLevel(saved.level);
                if (typeof saved.xp === 'number') setXp(saved.xp);
                if (typeof saved.bond === 'number') setBond(Math.max(10, saved.bond));
                if (saved.personality) setPersonality(saved.personality);
            }
        } catch {
            // ignore storage errors
        }
        hydratedRef.current = true;
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (!hydratedRef.current) return;
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    energy,
                    hunger,
                    happiness,
                    fitness,
                    intellect,
                    level,
                    xp,
                    bond,
                    personality,
                })
            );
        } catch {
            // ignore storage errors
        }
    }, [energy, hunger, happiness, fitness, intellect, level, xp, bond, personality]);

    const addLog = useCallback((msg: string) => {
        setEventLog((prev) => [msg, ...prev].slice(0, 5));
    }, []);

    const triggerToast = useCallback((text: string) => {
        setFloatingToast(text);
        setTimeout(() => {
            setFloatingToast((cur) => (cur === text ? null : cur));
        }, 2000);
    }, []);

    const isHarmonyOverclock =
        energy >= 65 && hunger >= 65 && happiness >= 65 && fitness >= 65 && intellect >= 65;

    const evoStage = getEvolutionStage(level);

    const getMoodTier = useCallback((): MoodTier => {
        if (energy <= 5) return 'critical';
        if (hunger < 18 || happiness < 18) return 'angry';
        const avg = (energy + hunger + happiness + fitness + intellect) / 5;
        if (avg > 82) return 'ecstatic';
        if (avg > 68) return 'happy';
        if (avg > 52) return 'content';
        if (avg > 38) return 'bored';
        if (avg > 24) return 'irritated';
        return 'depressed';
    }, [energy, hunger, happiness, fitness, intellect]);

    const gainXp = useCallback(
        (baseAmount: number) => {
            const harmonyMult = isHarmonyOverclock ? 2.0 : 1.0;
            const comboMult = 1 + (combo - 1) * 0.15;
            const finalAmount = Math.round(baseAmount * evoStage.xpMult * harmonyMult * comboMult);

            setXp((prev) => {
                let nextXp = prev + finalAmount;
                let nextLvl = level;
                let xpNeeded = nextLvl * 50;
                while (nextXp >= xpNeeded) {
                    nextXp -= xpNeeded;
                    nextLvl += 1;
                    xpNeeded = nextLvl * 50;
                }
                if (nextLvl > level) {
                    setLevel(nextLvl);
                    addLog(`LEVEL UP -> LV.${nextLvl}!`);
                    triggerToast(`🎉 LV.${nextLvl}!`);
                }
                return nextXp;
            });
            return finalAmount;
        },
        [level, isHarmonyOverclock, combo, evoStage.xpMult, addLog, triggerToast]
    );

    // Dynamic Personality Evolution
    useEffect(() => {
        if (age > 0 && age % 45 === 0) {
            if (intellect > fitness + 10 && intellect > 65) setPersonality('studious');
            else if (fitness > intellect + 10 && fitness > 65) setPersonality('athletic');
            else if (happiness > 82) setPersonality('cheerful');
            else if (energy < 28) setPersonality('lazy');
            else if (bond < 25) setPersonality('rebellious');
        }
    }, [age, intellect, fitness, happiness, energy, bond]);

    // Urgent Craving Quest prioritization
    useEffect(() => {
        if (hunger < 30 && activeCraving.action !== 'feed') {
            setActiveCraving({ action: 'feed', label: 'FEED FUEL', xpBonus: 40, bondBonus: 8 });
            return;
        }
        if (energy < 22 && !isSleeping && activeCraving.action !== 'sleep') {
            setActiveCraving({ action: 'sleep', label: 'REST MODE', xpBonus: 35, bondBonus: 6 });
            return;
        }
    }, [hunger, energy, isSleeping, activeCraving.action]);

    // 1-Second Autonomous Game Loop
    useEffect(() => {
        const mods = personalityModifiers[personality];
        const drainScale = evoStage.drainMult;

        const tick = setInterval(() => {
            const now = Date.now();
            setAge((a) => a + 1);

            if (!isSleeping) {
                setEnergy((e) => Math.max(0, e - mods.energyDrain * 0.20 * drainScale));
                setHunger((h) => Math.max(0, h - mods.hungerDrain * 0.20 * drainScale));
                setHappiness((h) => Math.max(0, h - mods.happyDrain * 0.18 * drainScale));
                setFitness((f) => Math.max(0, f - mods.fitnessDrain * 0.14 * drainScale));
                setIntellect((i) => Math.max(0, i - mods.intellectDrain * 0.14 * drainScale));
            } else {
                setEnergy((e) => {
                    const next = Math.min(100, e + 4.0);
                    if (next >= 98) {
                        setIsSleeping(false);
                        setBotState('stretching');
                        setEyeExpression('happy');
                        addLog('Fully recharged!');
                        setTimeout(() => setBotState('idle'), 2500);
                    }
                    return next;
                });
            }

            if (isHarmonyOverclock) {
                setBond((b) => Math.min(100, b + 0.15));
            } else if (now - lastInteraction > 25000) {
                setBond((b) => Math.max(0, b - 0.15));
                setCombo(1);
            }

            // Spontaneous Random Events
            if (!isSleeping && botState === 'idle' && !actionLocked && Math.random() < 0.028) {
                const evt = randomEvents[Math.floor(Math.random() * randomEvents.length)];
                setBotState(evt.animation);
                setEyeExpression(evt.expression);
                addLog(evt.message);

                if (evt.delta?.e) setEnergy((v) => Math.max(0, Math.min(100, v + evt.delta!.e!)));
                if (evt.delta?.hun) setHunger((v) => Math.max(0, Math.min(100, v + evt.delta!.hun!)));
                if (evt.delta?.h) setHappiness((v) => Math.max(0, Math.min(100, v + evt.delta!.h!)));
                if (evt.delta?.f) setFitness((v) => Math.max(0, Math.min(100, v + evt.delta!.f!)));
                if (evt.delta?.i) setIntellect((v) => Math.max(0, Math.min(100, v + evt.delta!.i!)));

                setActionLocked(true);
                setTimeout(() => {
                    setBotState('idle');
                    setActionLocked(false);
                }, evt.duration);
                return;
            }

            // Autonomous Idle Behaviors
            if (!isSleeping && botState === 'idle' && !actionLocked && now - lastInteraction > 11000) {
                const roll = Math.random();
                let idleAnim = '';
                let idleExpr: EyeExpression = 'normal';
                let idleMsg = '';

                if (hunger < 22) {
                    idleAnim = 'refusing';
                    idleExpr = 'angry';
                    idleMsg = 'Hungry! Click FEED.';
                } else if (energy < 12) {
                    idleAnim = 'sleeping';
                    idleExpr = 'sleepy';
                    idleMsg = 'Resting to recharge...';
                    setIsSleeping(true);
                } else if (roll < 0.18) {
                    idleAnim = 'waving';
                    idleExpr = 'happy';
                    idleMsg = 'Waves at operator!';
                } else if (roll < 0.32 && personality === 'studious') {
                    idleAnim = 'working';
                    idleExpr = 'money';
                    idleMsg = 'Practicing runes...';
                    setIntellect((i) => Math.min(100, i + 2));
                } else if (roll < 0.45 && personality === 'athletic') {
                    idleAnim = 'stretching';
                    idleExpr = 'star';
                    idleMsg = 'Limbering up!';
                    setFitness((f) => Math.min(100, f + 2));
                } else if (roll < 0.60 && personality === 'cheerful') {
                    idleAnim = 'dancing';
                    idleExpr = 'love';
                    idleMsg = 'Happy little hop!';
                } else if (roll < 0.72 && personality === 'rebellious') {
                    idleAnim = 'pointing';
                    idleExpr = 'cool';
                    idleMsg = 'Ready for action!';
                } else if (roll < 0.85 && happiness > 75) {
                    idleAnim = 'clapping';
                    idleExpr = 'star';
                    idleMsg = 'Sparking with joy!';
                } else {
                    idleAnim = 'salute';
                    idleExpr = 'normal';
                    idleMsg = 'Standing by!';
                }

                if (idleAnim) {
                    const goingToSleep = idleAnim === 'sleeping';
                    setBotState(idleAnim);
                    setEyeExpression(idleExpr);
                    addLog(idleMsg);
                    setActionLocked(true);
                    setTimeout(() => {
                        if (!goingToSleep) setBotState('idle');
                        setActionLocked(false);
                    }, 3400);
                    setLastInteraction(now);
                }
            }
        }, 1000);

        return () => clearInterval(tick);
    }, [
        isSleeping,
        lastInteraction,
        botState,
        actionLocked,
        personality,
        hunger,
        energy,
        happiness,
        isHarmonyOverclock,
        evoStage.drainMult,
        addLog,
    ]);

    // Sync Mood Tier -> Passive Eye Expression & Status Badge (Only auto-sleep when ENERGY <= 5!)
    useEffect(() => {
        if (actionLocked) return;

        if (isSleeping) {
            setEyeExpression('sleepy');
            setStatusMessage('SLEEPING');
            return;
        }

        const mood = getMoodTier();
        const moodMap: Record<MoodTier, { expr: EyeExpression; msg: string }> = {
            ecstatic:  { expr: isHarmonyOverclock ? 'star' : 'love', msg: isHarmonyOverclock ? '2X SYNC' : 'ECSTATIC' },
            happy:     { expr: 'happy', msg: 'HAPPY' },
            content:   { expr: 'normal', msg: 'NOMINAL' },
            bored:     { expr: 'confused', msg: 'BORED' },
            irritated: { expr: 'angry', msg: 'IRRITATED' },
            angry:     { expr: 'angry', msg: hunger < 20 ? 'HUNGRY!' : 'UPSET' },
            depressed: { expr: 'sad', msg: 'SAD' },
            critical:  { expr: 'dead', msg: 'LOW NRG' },
        };

        const { expr, msg } = moodMap[mood];
        if (botState === 'idle') setEyeExpression(expr);
        setStatusMessage(msg);

        if (energy <= 5 && !isSleeping) {
            setBotState('sleeping');
            setIsSleeping(true);
            addLog('Low NRG! Auto-recharging...');
        }
    }, [energy, happiness, hunger, fitness, intellect, isSleeping, botState, actionLocked, isHarmonyOverclock, getMoodTier, addLog]);

    const rotateCraving = useCallback((completedAction: ActionKey) => {
        const candidates = CRAVING_POOL.filter((c) => c.action !== completedAction);
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        setActiveCraving(next);
    }, []);

    // Direct 3D Mascot Click -> Petting Mechanic
    const handlePetMascot = useCallback(() => {
        setLastInteraction(Date.now());
        if (actionLocked) return;

        if (isSleeping) {
            setIsSleeping(false);
            setBotState('surprised');
            setEyeExpression('surprised');
            addLog('Woke up from head pat!');
            triggerToast('☀️ AWAKE!');
            setActionLocked(true);
            setTimeout(() => {
                setBotState('idle');
                setActionLocked(false);
            }, 2000);
            return;
        }

        const petAnims = ['waving', 'clapping', 'dancing', 'salute'];
        const petExprs: EyeExpression[] = ['love', 'happy', 'star'];
        const chosenAnim = petAnims[Math.floor(Math.random() * petAnims.length)];
        const chosenExpr = petExprs[Math.floor(Math.random() * petExprs.length)];

        setHappiness((h) => Math.min(100, h + 8));
        setBond((b) => Math.min(100, b + 3));

        let xpBase = 10;
        if (activeCraving.action === 'pet') {
            xpBase += activeCraving.xpBonus;
            setBond((b) => Math.min(100, b + activeCraving.bondBonus));
            setCombo((c) => Math.min(5, c + 1));
            const earned = gainXp(xpBase);
            addLog(`Quest complete! +${earned} XP`);
            triggerToast(`⚡ +${earned} XP`);
            rotateCraving('pet');
        } else {
            const earned = gainXp(xpBase);
            addLog('Purrs from head pat!');
            triggerToast(`♥ +${earned} XP`);
        }

        setBotState(chosenAnim);
        setEyeExpression(chosenExpr);
        setActionLocked(true);
        setTimeout(() => {
            setBotState('idle');
            setActionLocked(false);
        }, 2500);
    }, [actionLocked, isSleeping, activeCraving, gainXp, addLog, triggerToast, rotateCraving]);

    // Core Action Executor (Automatically wakes mascot if sleeping!)
    const performAction = (
        actionType: ActionKey,
        actionName: string,
        expression: EyeExpression,
        duration: number,
        baseCost: { e?: number; h?: number; hun?: number; f?: number; i?: number },
        baseGain: { e?: number; h?: number; hun?: number; f?: number; i?: number },
        xpReward: number,
        logMsg: string
    ) => {
        setLastInteraction(Date.now());
        if (actionLocked) return;

        if (isSleeping) {
            setIsSleeping(false);
        }

        // Check Energy / Fuel cost (Feed never requires fuel/energy)
        if ((baseCost.e && energy < baseCost.e + 2) || (baseCost.hun && hunger < baseCost.hun + 2)) {
            setBotState('refusing');
            setEyeExpression(energy < 18 ? 'sleepy' : 'angry');
            addLog(energy < 18 ? 'Too tired! Click SLEEP.' : 'Hungry! Click FEED.');
            triggerToast(energy < 18 ? '⚠️ NEED SLEEP' : '⚠️ NEED FEED');
            setActionLocked(true);
            setTimeout(() => {
                setBotState('idle');
                setActionLocked(false);
            }, 2000);
            return;
        }

        const nextConsecutive = actionType === lastActionType ? consecutiveSame + 1 : 1;
        setConsecutiveSame(nextConsecutive);
        setLastActionType(actionType);

        if (nextConsecutive >= 4 && activeCraving.action !== actionType) {
            setBotState('refusing');
            setEyeExpression('confused');
            addLog('Wants variety! Mix actions.');
            triggerToast('🔄 MIX ACTIONS');
            setCombo(1);
            setActionLocked(true);
            setTimeout(() => {
                setBotState('idle');
                setActionLocked(false);
            }, 2000);
            return;
        }

        const mods = personalityModifiers[personality];
        let gainMult = 1.0;
        let xpBonus = 0;
        let bondDelta = 2;

        const fulfilledQuest = activeCraving.action === actionType;
        if (fulfilledQuest) {
            xpBonus += activeCraving.xpBonus;
            bondDelta += activeCraving.bondBonus;
            gainMult += 0.35;
            rotateCraving(actionType);
        }

        const isFav = mods.favAction === actionType;
        const isHated = mods.hatedAction === actionType;
        if (isFav) {
            gainMult *= 1.45;
            xpBonus += 12;
            bondDelta += 2;
        } else if (isHated && !fulfilledQuest) {
            gainMult *= 0.65;
            bondDelta = -1;
        }

        const nextCombo = actionType !== lastActionType || fulfilledQuest ? Math.min(5, combo + 1) : combo;
        setCombo(nextCombo);

        setEnergy((v) => Math.max(0, Math.min(100, v - (baseCost.e || 0) + (baseGain.e || 0) * gainMult)));
        setHunger((v) => Math.max(0, Math.min(100, v - (baseCost.hun || 0) + (baseGain.hun || 0) * gainMult)));
        setHappiness((v) => Math.max(0, Math.min(100, v - (baseCost.h || 0) + (baseGain.h || 0) * gainMult)));
        setFitness((v) => Math.max(0, Math.min(100, v - (baseCost.f || 0) + (baseGain.f || 0) * gainMult)));
        setIntellect((v) => Math.max(0, Math.min(100, v - (baseCost.i || 0) + (baseGain.i || 0) * gainMult)));

        setBond((b) => Math.max(0, Math.min(100, b + bondDelta)));
        const earnedXp = gainXp(xpReward + xpBonus);

        if (fulfilledQuest) {
            triggerToast(`⚡ +${earnedXp} XP · ${nextCombo}x`);
            addLog(`Quest done! +${earnedXp} XP`);
        } else if (isFav) {
            triggerToast(`★ +${earnedXp} XP · ${nextCombo}x`);
            addLog(`${logMsg} (★Fav)`);
        } else {
            triggerToast(`+${earnedXp} XP · ${nextCombo}x`);
            addLog(logMsg);
        }

        setActiveActionKey(actionType);
        setBotState(actionName);
        setEyeExpression(expression);
        setActionLocked(true);
        setTimeout(() => {
            setBotState('idle');
            setActiveActionKey(null);
            setActionLocked(false);
        }, duration);
    };

    const cmdFeed = () =>
        performAction('feed', 'clapping', hunger > 85 ? 'happy' : 'love', 2800, {}, { hun: 36, h: 10, e: 8 }, 12, 'Fed glowing ember snack!');
    const cmdPlay = () =>
        performAction('play', 'golfing', 'star', 3400, { e: 10, hun: 8 }, { h: 28, f: 6 }, 16, 'Batted cyan ember orb!');
    const cmdDance = () => {
        const nextDance = combo % 2 === 0 ? 'dancing2' : 'dancing';
        performAction(
            'dance',
            nextDance,
            nextDance === 'dancing2' ? 'cool' : 'star',
            3400,
            { e: 10, hun: 6 },
            { h: 24, f: 10 },
            15,
            nextDance === 'dancing2' ? '360° spin dance!' : 'Mid-air leap dance!'
        );
    };
    const cmdTalk = () => {
        const talkVariants = ['talking', 'talking1', 'talking2'];
        const chosen = talkVariants[age % talkVariants.length];
        performAction('talk', chosen, 'happy', 3000, { e: 4 }, { h: 14, i: 8 }, 10, 'Chatted in cinder chirps!');
    };
    const cmdExercise = () =>
        performAction('exercise', 'stretching', 'surprised', 3400, { e: 14, hun: 8 }, { f: 26, h: 6 }, 20, 'Feline arch stretch drill!');
    const cmdWork = () =>
        performAction('work', 'working', 'money', 3400, { e: 12, hun: 6 }, { i: 26, h: 4 }, 24, 'Conjured arcane rune circle!');
    const cmdPraise = () => {
        const praiseAnims = ['salute', 'waving', 'pointing'];
        const chosen = praiseAnims[combo % praiseAnims.length];
        performAction('praise', chosen, 'love', 2600, {}, { h: 18 }, 10, chosen === 'salute' ? 'Crisp brow salute!' : 'Happy paw wave!');
    };
    const cmdSleep = () => {
        setLastInteraction(Date.now());
        if (actionLocked) return;
        if (isSleeping) {
            setIsSleeping(false);
            setBotState('stretching');
            setEyeExpression('happy');
            addLog('Woke up refreshed!');
            triggerToast('☀️ AWAKE');
            gainXp(8);
            setActionLocked(true);
            setTimeout(() => {
                setBotState('idle');
                setActionLocked(false);
            }, 2000);
        } else {
            setIsSleeping(true);
            setBotState('sleeping');
            setEyeExpression('sleepy');
            if (activeCraving.action === 'sleep') {
                const earned = gainXp(15 + activeCraving.xpBonus);
                triggerToast(`⚡ +${earned} XP`);
                rotateCraving('sleep');
            } else {
                triggerToast('💤 RESTING');
            }
            addLog('Sleeping (+4 NRG/s)...');
        }
    };

    const executeCraving = () => {
        switch (activeCraving.action) {
            case 'feed': return cmdFeed();
            case 'play': return cmdPlay();
            case 'dance': return cmdDance();
            case 'talk': return cmdTalk();
            case 'exercise': return cmdExercise();
            case 'work': return cmdWork();
            case 'praise': return cmdPraise();
            case 'sleep': return cmdSleep();
            case 'pet': return handlePetMascot();
        }
    };

    // Agentic OS Overview store for Gate Review
    const deck = useDeckStore(useShallow((s) => ({ goals: s.goals ?? [] })));
    const goalId = useDeckUi((s) => s.goalId);
    const patchDeckUi = useDeckUi((s) => s.patch);
    const [editingGoal, setEditingGoal] = useState<string | null>(null);
    const [reviewingGoal, setReviewingGoal] = useState<string | null>(null);

    useEffect(() => {
        useDeckUi.getState().hydrate();
        const stop = startDeckPolling(30000);
        return () => stop();
    }, []);

    const tz = useMemo(localTz, []);
    const today = ymd(new Date(), tz);
    const safeGoals = Array.isArray(deck.goals) ? deck.goals : [];
    const activeGoals = useMemo(
        () =>
            safeGoals
                .filter((g) => !g.archivedAt && (g.status === 'active' || g.status === 'at_risk'))
                .sort((a, b) => (a.gateOn ?? '').localeCompare(b.gateOn ?? '')),
        [safeGoals]
    );
    const goal: OsGoal | undefined =
        safeGoals.find((g) => g.id === goalId) ?? activeGoals[0] ?? safeGoals[0];

    if (collapsed) return null;

    const xpNeeded = level * 50;
    const xpPct = Math.min(100, Math.round((xp / xpNeeded) * 100));
    const favAction = personalityModifiers[personality].favAction;
    const mood = getMoodTier();
    const statusDotColor =
        mood === 'critical' || mood === 'angry'
            ? '#ef4444'
            : isHarmonyOverclock
              ? '#38bdf8'
              : isSleeping
                ? '#60a5fa'
                : '#22c55e';

    const year = Number(today.slice(0, 4));
    const wkOf = (s: string) =>
        Number(s.slice(0, 4)) < year ? 0 : Number(s.slice(0, 4)) > year ? 54 : isoWeek(s);
    const thisWk = isoWeek(today);
    const ws = goal ? wkOf(goal.startsOn) : 0;
    const wg = goal ? wkOf(goal.gateOn) : 0;

    return (
        <div style={{ padding: '6px 10px 10px', display: 'flex', flexDirection: 'column', gap: 8, fontFamily: MONO_FONT }}>
            {/* ─── 1. GATE REVIEW CARD (from Agentic OS Overview) ─── */}
            <div
                className="module-illustration-card"
                style={{
                    ...cardStyle(darkMode),
                    cursor: 'default',
                    borderTop: '2px solid #fb923c',
                    padding: '8px 10px',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: darkMode ? '#cbd5e1' : '#334155',
                        }}
                    >
                        Gate review
                    </span>
                    <div style={{ display: 'flex', gap: 8, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {goal && (
                            <button
                                type="button"
                                onClick={() => setReviewingGoal(goal.id)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    fontFamily: MONO_FONT,
                                    fontSize: 9,
                                    textTransform: 'uppercase',
                                    color: darkMode ? '#94a3b8' : '#64748b',
                                }}
                            >
                                review
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setEditingGoal(goal ? goal.id : 'new')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontFamily: MONO_FONT,
                                fontSize: 9,
                                textTransform: 'uppercase',
                                color: '#fb923c',
                            }}
                        >
                            {goal ? 'edit' : '+ goal'}
                        </button>
                    </div>
                </div>

                {goal ? (
                    <>
                        <div
                            style={{
                                marginBottom: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                color: darkMode ? '#f1f5f9' : '#0f172a',
                            }}
                        >
                            {dowDdmm(goal.gateOn)} · {relDays(daysBetween(today, goal.gateOn))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {[0, 1, 2, 3].map((q) => (
                                <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <span style={{ width: 18, fontSize: 8.5, color: '#64748b' }}>Q{q + 1}</span>
                                    {Array.from({ length: 13 }, (_, c) => {
                                        const wk = q * 13 + c + 1;
                                        const state =
                                            wk === thisWk
                                                ? 'now'
                                                : wk === wg
                                                  ? 'gate'
                                                  : wk < thisWk
                                                    ? 'past'
                                                    : wk >= ws && wk <= wg
                                                      ? 'window'
                                                      : 'future';
                                        return (
                                            <span
                                                key={c}
                                                title={`Week ${wk}`}
                                                style={{
                                                    height: 6,
                                                    flex: 1,
                                                    background:
                                                        state === 'now'
                                                            ? '#ef4444'
                                                            : state === 'past'
                                                              ? '#64748b'
                                                              : state === 'window'
                                                                ? darkMode
                                                                    ? '#cbd5e1'
                                                                    : '#334155'
                                                                : 'transparent',
                                                    border:
                                                        state === 'gate'
                                                            ? '1px solid #fb923c'
                                                            : state === 'future'
                                                              ? '1px solid rgba(148,163,184,0.35)'
                                                              : 'none',
                                                    opacity: state === 'past' ? 0.7 : 1,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                            <div style={{ paddingTop: 3, fontSize: 8.5, lineHeight: 1.4, color: '#64748b' }}>
                                <span style={{ color: '#f87171' }}>■</span> this week ·{' '}
                                <span style={{ color: darkMode ? '#cbd5e1' : '#334155' }}>■</span> {goal.windowDays}d{' '}
                                {ddmm(goal.startsOn)}–{ddmm(goal.gateOn)} ·{' '}
                                <span style={{ color: '#fb923c' }}>□</span> review {ddmm(goal.gateOn)}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>
                        No goal yet. Add one to track a 90-day gate.
                    </div>
                )}
            </div>

            {/* ─── 2. TALLER AGENTIC OS COMPANION MODULE (220px 3D viewport) ─── */}
            <div
                style={{
                    ...cardStyle(darkMode),
                    padding: 0,
                    cursor: 'default',
                    borderTop: `2px solid ${isHarmonyOverclock ? '#38bdf8' : '#fb923c'}`,
                    fontFamily: MONO_FONT,
                }}
            >
                {/* 1. Single-Line Micro Header + 2px XP Bar (25px height) */}
                <Tooltip title={`Type: ${personality.toUpperCase()} (★Fav: ${favAction.toUpperCase()}) · XP: ${xp}/${xpNeeded}`}>
                    <div
                        style={{
                            padding: '4px 6px 0',
                            borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
                            background: darkMode ? 'rgba(255,255,255,0.015)' : 'rgba(15,23,42,0.015)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                <span
                                    style={{
                                        width: 5,
                                        height: 5,
                                        background: statusDotColor,
                                        boxShadow: `0 0 5px ${statusDotColor}`,
                                        flexShrink: 0,
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: 9.5,
                                        fontWeight: 800,
                                        letterSpacing: '0.06em',
                                        color: darkMode ? '#f1f5f9' : '#0f172a',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {evoStage.title}
                                </span>
                                <span
                                    style={{
                                        fontSize: 8,
                                        fontWeight: 800,
                                        padding: '0 3px',
                                        background: 'rgba(251, 146, 60, 0.16)',
                                        border: '1px solid rgba(251, 146, 60, 0.45)',
                                        color: '#fb923c',
                                        lineHeight: '13px',
                                    }}
                                >
                                    L{level}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                {combo > 1 && (
                                    <span
                                        style={{
                                            fontSize: 8,
                                            fontWeight: 800,
                                            color: '#fb923c',
                                        }}
                                    >
                                        {combo}x
                                    </span>
                                )}
                                <span
                                    style={{
                                        fontSize: 8.5,
                                        fontWeight: 800,
                                        color: '#ec4899',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    ♥{Math.round(bond)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setZoomClose((z) => !z);
                                    }}
                                    style={{
                                        background: zoomClose
                                            ? 'rgba(56, 189, 248, 0.18)'
                                            : darkMode
                                              ? 'rgba(255,255,255,0.05)'
                                              : 'rgba(15,23,42,0.05)',
                                        border: `1px solid ${
                                            zoomClose
                                                ? 'rgba(56, 189, 248, 0.6)'
                                                : darkMode
                                                  ? 'rgba(255,255,255,0.12)'
                                                  : 'rgba(15,23,42,0.12)'
                                        }`,
                                        color: zoomClose ? '#38bdf8' : darkMode ? '#cbd5e1' : '#475569',
                                        fontSize: 7.5,
                                        fontWeight: 700,
                                        fontFamily: MONO_FONT,
                                        padding: '0 3px',
                                        lineHeight: '13px',
                                        cursor: 'pointer',
                                        borderRadius: 0,
                                    }}
                                >
                                    {zoomClose ? '1.5X' : '1.0X'}
                                </button>
                            </div>
                        </div>

                        {/* Thin 2px XP Bar */}
                        <div
                            style={{
                                width: '100%',
                                height: 2,
                                background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    width: `${xpPct}%`,
                                    height: '100%',
                                    background: isHarmonyOverclock
                                        ? 'linear-gradient(90deg, #38bdf8, #a855f7)'
                                        : 'linear-gradient(90deg, #fb923c, #f59e0b)',
                                    transition: 'width 0.3s ease-out',
                                }}
                            />
                        </div>
                    </div>
                </Tooltip>

                {/* 2. Taller 220px 3D Viewport with Integrated Micro-Vitals & Status Overlay */}
                <div
                    style={{
                        width: '100%',
                        height: 220,
                        background: '#ffffff',
                        position: 'relative',
                        overflow: 'hidden',
                        borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
                    }}
                >
                    <Canvas
                        shadows
                        dpr={[1, 2]}
                        camera={{ position: [0, 0.02, 2.88], fov: 32 }}
                        style={{ background: '#ffffff' }}
                    >
                        <color attach="background" args={['#ffffff']} />
                        <CameraRig zoomClose={zoomClose} controlsRef={controlsRef} />

                        <ambientLight intensity={0.96} />
                        <directionalLight
                            castShadow
                            position={[3.2, 5.5, 4.5]}
                            intensity={1.45}
                            shadow-mapSize-width={1024}
                            shadow-mapSize-height={1024}
                            shadow-camera-near={0.5}
                            shadow-camera-far={15}
                            shadow-camera-left={-2.2}
                            shadow-camera-right={2.2}
                            shadow-camera-top={2.2}
                            shadow-camera-bottom={-2.2}
                            shadow-bias={-0.0005}
                        />
                        <directionalLight position={[-3.5, 2.5, 3.0]} intensity={0.55} color="#eef8ff" />
                        <directionalLight position={[0, 3.0, -4.5]} intensity={1.65} color="#00f0ff" />

                        <group position={[0, -0.04, 0]} scale={1.0}>
                            <TamagotchiModel
                                state={botState}
                                eyeExpression={eyeExpression}
                                darkMode={false}
                                onPet={handlePetMascot}
                            />
                        </group>

                        <OrbitControls
                            ref={controlsRef}
                            enableZoom={true}
                            enablePan={false}
                            minDistance={1.6}
                            maxDistance={4.8}
                            target={[0, -0.02, 0]}
                        />
                    </Canvas>

                    {/* Top Overlay: 5 Compact Micro-Vitals + Quest / Toast Row */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            right: 4,
                            zIndex: 20,
                            pointerEvents: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                        }}
                    >
                        <div style={{ display: 'flex', gap: 2 }}>
                            <MicroVitalChip code="NRG" value={energy} color="#38bdf8" />
                            <MicroVitalChip code="FUE" value={hunger} color="#eab308" />
                            <MicroVitalChip code="JOY" value={happiness} color="#10b981" />
                            <MicroVitalChip code="FIT" value={fitness} color="#fb923c" />
                            <MicroVitalChip code="INT" value={intellect} color="#a855f7" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    executeCraving();
                                }}
                                title="Click to fulfill active quest for bonus XP & Bond"
                                style={{
                                    pointerEvents: 'auto',
                                    background: 'rgba(15, 23, 42, 0.82)',
                                    border: '1px solid rgba(56, 189, 248, 0.65)',
                                    borderLeft: '2px solid #38bdf8',
                                    color: '#f8fafc',
                                    fontFamily: MONO_FONT,
                                    fontSize: 7.5,
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    padding: '1px 5px',
                                    cursor: 'pointer',
                                    borderRadius: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                }}
                            >
                                <span style={{ color: '#38bdf8' }}>⚡</span>
                                <span>{activeCraving.label}</span>
                            </button>

                            {floatingToast && (
                                <span
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.88)',
                                        border: '1px solid rgba(251, 146, 60, 0.75)',
                                        color: '#fb923c',
                                        fontFamily: MONO_FONT,
                                        fontSize: 7.5,
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                    }}
                                >
                                    {floatingToast}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Bottom Compact HUD Strip inside 3D Viewport */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '2px 5px',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(241,245,249,0.92) 45%)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            pointerEvents: 'none',
                            zIndex: 15,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 7.5,
                                fontWeight: 800,
                                letterSpacing: '0.06em',
                                color: '#0f172a',
                                background: 'rgba(15, 23, 42, 0.07)',
                                borderLeft: `2px solid ${statusDotColor}`,
                                padding: '0px 4px',
                            }}
                        >
                            {statusMessage}
                        </span>
                        <span
                            style={{
                                fontSize: 7.5,
                                fontWeight: 700,
                                color: '#334155',
                                maxWidth: 130,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            &gt; {eventLog[0]}
                        </span>
                    </div>
                </div>

                {/* 3. Single-Row 8-Tile Tactical Command Bar (30px height, zero overflow) */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                        gap: 2,
                        padding: '3px 4px',
                        background: darkMode ? 'rgba(11, 14, 19, 0.95)' : 'rgba(248, 250, 252, 0.95)',
                    }}
                >
                    <CompactActionTile
                        onClick={cmdFeed}
                        icon="🔋"
                        label="FEED"
                        color="#eab308"
                        darkMode={darkMode}
                        isFav={favAction === 'feed'}
                        isQuest={activeCraving.action === 'feed'}
                        isActive={activeActionKey === 'feed'}
                        tooltip="+36 FUE, +10 JOY, +8 NRG"
                    />
                    <CompactActionTile
                        onClick={cmdPlay}
                        icon="🎯"
                        label="PLAY"
                        color="#10b981"
                        darkMode={darkMode}
                        isFav={favAction === 'play'}
                        isQuest={activeCraving.action === 'play'}
                        isActive={activeActionKey === 'play'}
                        tooltip="+28 JOY, +6 FIT (-10 NRG)"
                    />
                    <CompactActionTile
                        onClick={cmdDance}
                        icon="💃"
                        label="DANCE"
                        color="#ec4899"
                        darkMode={darkMode}
                        isFav={favAction === 'dance'}
                        isQuest={activeCraving.action === 'dance'}
                        isActive={activeActionKey === 'dance'}
                        tooltip="+24 JOY, +10 FIT (-10 NRG)"
                    />
                    <CompactActionTile
                        onClick={cmdTalk}
                        icon="💬"
                        label="TALK"
                        color="#06b6d4"
                        darkMode={darkMode}
                        isFav={favAction === 'talk'}
                        isQuest={activeCraving.action === 'talk'}
                        isActive={activeActionKey === 'talk'}
                        tooltip="+14 JOY, +8 INT (-4 NRG)"
                    />
                    <CompactActionTile
                        onClick={cmdExercise}
                        icon="🏋️"
                        label="TRAIN"
                        color="#fb923c"
                        darkMode={darkMode}
                        isFav={favAction === 'exercise'}
                        isQuest={activeCraving.action === 'exercise'}
                        isActive={activeActionKey === 'exercise'}
                        tooltip="+26 FIT, +6 JOY (-14 NRG)"
                    />
                    <CompactActionTile
                        onClick={cmdWork}
                        icon="🔮"
                        label="WORK"
                        color="#a855f7"
                        darkMode={darkMode}
                        isFav={favAction === 'work'}
                        isQuest={activeCraving.action === 'work'}
                        isActive={activeActionKey === 'work'}
                        tooltip="+26 INT (-12 NRG)"
                    />
                    <CompactActionTile
                        onClick={cmdPraise}
                        icon="🫡"
                        label="PRAISE"
                        color="#14b8a6"
                        darkMode={darkMode}
                        isFav={favAction === 'praise'}
                        isQuest={activeCraving.action === 'praise'}
                        isActive={activeActionKey === 'praise'}
                        tooltip="+18 JOY, +Bond"
                    />
                    <CompactActionTile
                        onClick={cmdSleep}
                        icon={isSleeping ? '☀️' : '💤'}
                        label={isSleeping ? 'WAKE' : 'SLEEP'}
                        color="#38bdf8"
                        darkMode={darkMode}
                        isFav={favAction === 'sleep'}
                        isQuest={activeCraving.action === 'sleep'}
                        isActive={isSleeping}
                        tooltip={isSleeping ? 'Wake Up' : 'Recharge (+4 NRG/s)'}
                    />
                </div>
            </div>

            {typeof document !== 'undefined' &&
                editingGoal &&
                createPortal(
                    <div className="fixed inset-0 z-[2500] font-mono">
                        <GoalEditor
                            goal={editingGoal === 'new' ? null : safeGoals.find((g) => g.id === editingGoal) ?? null}
                            onClose={() => setEditingGoal(null)}
                            onSaved={(g) => patchDeckUi({ goalId: g.id })}
                        />
                    </div>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                reviewingGoal &&
                safeGoals.find((g) => g.id === reviewingGoal) &&
                createPortal(
                    <div className="fixed inset-0 z-[2500] font-mono">
                        <GoalReviewDialog
                            goal={safeGoals.find((g) => g.id === reviewingGoal)!}
                            onClose={() => setReviewingGoal(null)}
                        />
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default ModuleIllustrationCards;

