"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, ResponsiveContainer
} from "recharts";
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { TamagotchiModel, EyeExpression } from '../helper/TamagotchiGlobal';
import { Tooltip } from 'antd';

// ─── Real Data ───────────────────────────────────────────────
const dashboardData = [
    { name: 'Mon', tasks: 42, load: 65 },
    { name: 'Tue', tasks: 58, load: 72 },
    { name: 'Wed', tasks: 35, load: 58 },
    { name: 'Thu', tasks: 72, load: 80 },
    { name: 'Fri', tasks: 61, load: 68 },
    { name: 'Sat', tasks: 48, load: 45 },
    { name: 'Sun', tasks: 85, load: 78 },
];

const crmData = [
    { name: 'Jan', revenue: 180, target: 200, deals: 12 },
    { name: 'Feb', revenue: 220, target: 200, deals: 15 },
    { name: 'Mar', revenue: 195, target: 200, deals: 11 },
    { name: 'Apr', revenue: 280, target: 250, deals: 18 },
    { name: 'May', revenue: 310, target: 250, deals: 22 },
    { name: 'Jun', revenue: 340, target: 300, deals: 25 },
];

const DashboardRealChart = ({ darkMode }: { darkMode: boolean }) => (
    <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={dashboardData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
                <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                </linearGradient>
            </defs>
            <Area type="monotone" dataKey="tasks" stroke="#60a5fa" strokeWidth={2} fill="url(#taskGrad)" dot={false} />
            <Area type="monotone" dataKey="load" stroke="#fb923c" strokeWidth={2} fill="url(#loadGrad)" dot={false} />
        </AreaChart>
    </ResponsiveContainer>
);

const CRMRealChart = ({ darkMode }: { darkMode: boolean }) => (
    <ResponsiveContainer width="100%" height={60}>
        <LineChart data={crmData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: '#3b82f6' }} />
            <Line type="monotone" dataKey="target" stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={2} dot={{ r: 2, fill: '#10b981' }} />
        </LineChart>
    </ResponsiveContainer>
);

// ─── Styles ────────────────────────────────────────────
const cardStyle = (darkMode: boolean): React.CSSProperties => ({
    background: darkMode
        ? "rgba(11, 14, 19, 0.92)"
        : "rgba(255, 255, 255, 0.94)",
    backdropFilter: "blur(12px)",
    borderRadius: 0,
    padding: '10px',
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

// ─── Tamagotchi Game Types ─────────────────────────────

type Personality = 'rebellious' | 'cheerful' | 'studious' | 'athletic' | 'lazy';
type MoodTier = 'ecstatic' | 'happy' | 'content' | 'bored' | 'irritated' | 'angry' | 'depressed' | 'critical';

interface GameEvent {
    message: string;
    expression: EyeExpression;
    animation: string;
    duration: number;
}

const personalityModifiers: Record<Personality, { energyDrain: number; hungerDrain: number; happyDrain: number; fitnessDrain: number; intellectDrain: number; favAction: string; hatedAction: string }> = {
    rebellious: { energyDrain: 0.6, hungerDrain: 0.8, happyDrain: 1.0, fitnessDrain: 0.4, intellectDrain: 0.5, favAction: 'play', hatedAction: 'work' },
    cheerful:   { energyDrain: 0.9, hungerDrain: 0.7, happyDrain: 0.3, fitnessDrain: 0.5, intellectDrain: 0.4, favAction: 'talk', hatedAction: 'exercise' },
    studious:   { energyDrain: 0.7, hungerDrain: 0.5, happyDrain: 0.8, fitnessDrain: 0.6, intellectDrain: 0.2, favAction: 'work', hatedAction: 'play' },
    athletic:   { energyDrain: 0.5, hungerDrain: 1.0, happyDrain: 0.6, fitnessDrain: 0.2, intellectDrain: 0.7, favAction: 'exercise', hatedAction: 'work' },
    lazy:       { energyDrain: 0.3, hungerDrain: 0.4, happyDrain: 0.7, fitnessDrain: 1.0, intellectDrain: 0.8, favAction: 'sleep', hatedAction: 'exercise' },
};

const randomEvents: GameEvent[] = [
    { message: "Found a bug! 🐛 +10 INT", expression: 'surprised', animation: 'pointing', duration: 3000 },
    { message: "Tripped over a cable! -5 FIT", expression: 'confused', animation: 'stretching', duration: 3000 },
    { message: "Got a compliment! +15 JOY", expression: 'love', animation: 'dancing', duration: 4000 },
    { message: "Power surge! -10 NRG", expression: 'surprised', animation: 'salute', duration: 2500 },
    { message: "Remembers a joke! +5 JOY", expression: 'happy', animation: 'clapping', duration: 3000 },
    { message: "Feels creative! +8 INT", expression: 'star', animation: 'talking', duration: 3500 },
    { message: "Stomach growling... -10 FUE", expression: 'angry', animation: 'refusing', duration: 2500 },
    { message: "Does a victory dance!", expression: 'cool', animation: 'dancing2', duration: 4000 },
];

// ─── Control Panel Subcomponents ─────────────────────────────
const StatBar = ({ label, value, color, darkMode }: { label: string; value: number; color: string; darkMode: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ fontSize: 8, fontWeight: 900, color: darkMode ? '#cbd5e1' : '#475569', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ width: '100%', height: 3, background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ 
                width: `${value}%`, height: '100%', borderRadius: 2,
                background: value > 60 ? color : value > 30 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.3s ease-out'
            }} />
        </div>
    </div>
);

const ActionBtn = ({ onClick, icon, color, darkMode, tooltip }: { onClick: () => void; icon: string; color: string; darkMode: boolean; tooltip?: string }) => (
    <Tooltip title={tooltip} placement="right">
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }} 
            style={{ 
                background: darkMode ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(4px)',
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '50%', width: 20, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.1s', color: color,
                fontSize: 10,
                pointerEvents: 'auto'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = darkMode ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.6)';
            }}
        >
            {icon}
        </button>
    </Tooltip>
);


// ─── Components ────────────────────────────────────────────

export const ModuleIllustrationCards: React.FC<{ collapsed?: boolean; darkMode?: boolean; }> = ({ collapsed = false, darkMode = false }) => {
    // Core Stats (0-100)
    const [energy, setEnergy] = useState(80);
    const [hunger, setHunger] = useState(80);
    const [happiness, setHappiness] = useState(70);
    const [fitness, setFitness] = useState(40);
    const [intellect, setIntellect] = useState(40);
    
    // Meta Stats
    const [level, setLevel] = useState(1);
    const [xp, setXp] = useState(0);
    const [personality, setPersonality] = useState<Personality>('cheerful');
    const [bond, setBond] = useState(0); 
    const [age, setAge] = useState(0); 
    
    // UI State
    const [showControls, setShowControls] = useState(true);
    const [manualStudioMode, setManualStudioMode] = useState(false);

    // AI State
    const [botState, setBotState] = useState<string>('idle');
    const [eyeExpression, setEyeExpression] = useState<EyeExpression>('normal');
    const [lastInteraction, setLastInteraction] = useState(Date.now());
    const [isSleeping, setIsSleeping] = useState(false);
    const [statusMessage, setStatusMessage] = useState("System Online");
    const [actionLocked, setActionLocked] = useState(false); 
    const [eventLog, setEventLog] = useState<string[]>(["System initialized."]);
    
    const [consecutiveActions, setConsecutiveActions] = useState(0);
    const [lastActionType, setLastActionType] = useState('');

    const addLog = useCallback((msg: string) => {
        setEventLog(prev => [msg, ...prev].slice(0, 5));
    }, []);

    const getMoodTier = useCallback((): MoodTier => {
        const avg = (energy + hunger + happiness + fitness + intellect) / 5;
        if (avg > 85) return 'ecstatic';
        if (avg > 70) return 'happy';
        if (avg > 55) return 'content';
        if (avg > 40) return 'bored';
        if (avg > 25) return 'irritated';
        if (avg > 10) return 'angry';
        if (avg > 0) return 'depressed';
        return 'critical';
    }, [energy, hunger, happiness, fitness, intellect]);

    const gainXp = useCallback((amount: number) => {
        setXp(prev => {
            const newXp = prev + amount;
            const xpNeeded = level * 50;
            if (newXp >= xpNeeded) {
                setLevel(l => l + 1);
                addLog(`🎉 LEVEL UP! Now level ${level + 1}!`);
                return newXp - xpNeeded;
            }
            return newXp;
        });
    }, [level, addLog]);

    useEffect(() => {
        if (age > 0 && age % 60 === 0) { 
            if (intellect > fitness && intellect > happiness) setPersonality('studious');
            else if (fitness > intellect && fitness > happiness) setPersonality('athletic');
            else if (happiness > 80) setPersonality('cheerful');
            else if (energy < 30) setPersonality('lazy');
            else if (bond < 30) setPersonality('rebellious');
        }
    }, [age, intellect, fitness, happiness, energy, bond]);

    useEffect(() => {
        const mods = personalityModifiers[personality];
        const tick = setInterval(() => {
            const now = Date.now();
            setAge(a => a + 1);
            
            if (!isSleeping) {
                setEnergy(e => Math.max(62, e - mods.energyDrain * 0.15));
                setHunger(h => Math.max(62, h - mods.hungerDrain * 0.15));
                setHappiness(h => Math.max(65, h - mods.happyDrain * 0.15));
                setFitness(f => Math.max(50, f - mods.fitnessDrain * 0.10));
                setIntellect(i => Math.max(50, i - mods.intellectDrain * 0.10));
            } else {
                setEnergy(e => Math.min(100, e + 3));
                setHunger(h => Math.max(60, h - 0.1));
                if (intellect > 50) setIntellect(i => Math.min(100, i + 0.1));
            }

            if (now - lastInteraction > 20000) {
                setBond(b => Math.max(50, b - 0.2));
            }

            if (manualStudioMode) return;

            if (!isSleeping && botState === 'idle' && !actionLocked && Math.random() < 0.02) {
                const evt = randomEvents[Math.floor(Math.random() * randomEvents.length)];
                setBotState(evt.animation);
                setEyeExpression(evt.expression);
                addLog(evt.message);
                
                if (evt.message.includes('+10 INT')) setIntellect(i => Math.min(100, i + 10));
                if (evt.message.includes('-5 FIT')) setFitness(f => Math.max(50, f - 5));
                if (evt.message.includes('+15 JOY')) setHappiness(h => Math.min(100, h + 15));
                if (evt.message.includes('-10 NRG')) setEnergy(e => Math.max(60, e - 10));
                if (evt.message.includes('+5 JOY')) setHappiness(h => Math.min(100, h + 5));
                if (evt.message.includes('+8 INT')) setIntellect(i => Math.min(100, i + 8));
                if (evt.message.includes('-10 FUE')) setHunger(h => Math.max(60, h - 10));
                
                setActionLocked(true);
                setTimeout(() => { setBotState('idle'); setActionLocked(false); }, evt.duration);
                return;
            }

            if (!isSleeping && botState === 'idle' && !actionLocked && now - lastInteraction > 14000) {
                const roll = Math.random();
                let idleAnim = '';
                let idleExpr: EyeExpression = 'normal';
                let idleMsg = '';

                if (hunger < 20) {
                    idleAnim = 'refusing'; idleExpr = 'angry'; idleMsg = "I'm STARVING!";
                } else if (energy < 15) {
                    idleAnim = 'sleeping'; idleExpr = 'sleepy'; idleMsg = "Can barely... stay... awake...";
                    setIsSleeping(true); 
                } else if (roll < 0.20) {
                    idleAnim = 'waving'; idleExpr = 'normal'; idleMsg = "Hey! Pay attention to me!";
                } else if (roll < 0.32 && personality === 'studious') {
                    idleAnim = 'working'; idleExpr = 'cool'; idleMsg = "Studying on my own...";
                    setIntellect(i => Math.min(100, i + 2));
                } else if (roll < 0.44 && personality === 'athletic') {
                    idleAnim = 'stretching'; idleExpr = 'star'; idleMsg = "Doing some stretches!";
                    setFitness(f => Math.min(100, f + 2));
                } else if (roll < 0.58 && personality === 'cheerful') {
                    idleAnim = 'dancing'; idleExpr = 'happy'; idleMsg = "♪ Dancing by myself! ♪";
                } else if (roll < 0.68 && personality === 'rebellious') {
                    idleAnim = 'pointing'; idleExpr = 'angry'; idleMsg = "I do what I want!";
                } else if (roll < 0.78 && happiness > 80) {
                    idleAnim = 'clapping'; idleExpr = 'love'; idleMsg = "Life is great!";
                } else if (roll < 0.88) {
                    idleAnim = 'salute'; idleExpr = 'normal'; idleMsg = "At your service!";
                } else {
                    idleAnim = 'golfing'; idleExpr = 'star'; idleMsg = "Practicing my swing!";
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
                    }, 4000);
                    setLastInteraction(now);
                }
            }
        }, 1000);
        return () => clearInterval(tick);
    }, [isSleeping, lastInteraction, botState, actionLocked, manualStudioMode, personality, intellect, hunger, energy, happiness, addLog]);

    useEffect(() => {
        if (actionLocked || manualStudioMode) return; 
        
        if (isSleeping) {
            setEyeExpression('sleepy');
            setStatusMessage("💤 Sleeping...");
            return;
        }

        const mood = getMoodTier();
        const moodExpressions: Record<MoodTier, { expr: EyeExpression; msg: string }> = {
            ecstatic:  { expr: 'love', msg: `✨ Ecstatic! Bond: ${Math.round(bond)}%` },
            happy:     { expr: 'happy', msg: `😊 Happy! Lv.${level}` },
            content:   { expr: 'normal', msg: `🙂 Content. Lv.${level}` },
            bored:     { expr: 'confused', msg: "😐 Bored... do something!" },
            irritated: { expr: 'angry', msg: "😤 Getting irritated..." },
            angry:     { expr: 'angry', msg: "🔥 ANGRY! Fix my stats!" },
            depressed: { expr: 'sad', msg: "😢 Depressed..." },
            critical:  { expr: 'dead', msg: "💀 CRITICAL! HELP!" },
        };

        const { expr, msg } = moodExpressions[mood];
        if (botState === 'idle') setEyeExpression(expr);
        setStatusMessage(msg);

        if (mood === 'critical' && !isSleeping) {
            setBotState('sleeping');
            setIsSleeping(true);
            addLog("⚠️ System shutdown! Critical state!");
        }
    }, [energy, happiness, hunger, fitness, intellect, isSleeping, botState, actionLocked, manualStudioMode, bond, level, getMoodTier, addLog]);

    const handleInteraction = () => {
        setLastInteraction(Date.now());
        setBond(b => Math.min(100, b + 0.5)); 
    };

    const performAction = (
        actionType: string,
        actionName: string, 
        expression: EyeExpression, 
        duration: number,
        baseCost: { e?: number; h?: number; hun?: number; f?: number; i?: number },
        baseGain: { e?: number; h?: number; hun?: number; f?: number; i?: number },
        xpReward: number,
        logMsg: string,
    ) => {
        handleInteraction();
        if (actionLocked) return; 

        if (isSleeping) {
            setBotState('refusing');
            setEyeExpression('angry');
            addLog("😡 Don't wake me up!");
            setActionLocked(true);
            setTimeout(() => { setBotState('sleeping'); setActionLocked(false); }, 2000);
            return;
        }

        if ((baseCost.e && energy < baseCost.e + 5) || (baseCost.hun && hunger < baseCost.hun + 5)) {
            setBotState('refusing');
            setEyeExpression('angry');
            addLog("❌ Too exhausted for that!");
            setActionLocked(true);
            setTimeout(() => { setBotState('idle'); setActionLocked(false); }, 2500);
            return;
        }

        const mods = personalityModifiers[personality];
        let gainMultiplier = 1.0;
        let xpMultiplier = 1.0;
        if (mods.favAction === actionType) {
            gainMultiplier = 1.5; 
            xpMultiplier = 2.0;
            addLog(`💖 Loves to ${actionType}! Bonus!`);
        } else if (mods.hatedAction === actionType) {
            gainMultiplier = 0.5; 
            setBond(b => Math.max(0, b - 2)); 
            addLog(`😤 Hates to ${actionType}! Penalty!`);
        }

        let streakBonus = 0;
        if (actionType === lastActionType) {
            setConsecutiveActions(prev => prev + 1);
            if (consecutiveActions >= 2) {
                streakBonus = Math.min(consecutiveActions * 2, 15); 
                addLog(`🔥 ${consecutiveActions + 1}x streak! +${streakBonus} bonus!`);
            }
        } else {
            setConsecutiveActions(0);
        }
        setLastActionType(actionType);

        setEnergy(v => Math.max(0, v - (baseCost.e || 0)));
        setHappiness(v => Math.max(0, v - (baseCost.h || 0)));
        setHunger(v => Math.max(0, v - (baseCost.hun || 0)));
        setFitness(v => Math.max(0, v - (baseCost.f || 0)));
        setIntellect(v => Math.max(0, v - (baseCost.i || 0)));

        const mult = gainMultiplier;
        setEnergy(v => Math.min(100, v + ((baseGain.e || 0) * mult) + streakBonus * 0.3));
        setHappiness(v => Math.min(100, v + ((baseGain.h || 0) * mult) + streakBonus * 0.5));
        setHunger(v => Math.min(100, v + ((baseGain.hun || 0) * mult)));
        setFitness(v => Math.min(100, v + ((baseGain.f || 0) * mult)));
        setIntellect(v => Math.min(100, v + ((baseGain.i || 0) * mult)));

        setBond(b => Math.min(100, b + 2));
        gainXp(Math.round(xpReward * xpMultiplier));

        setManualStudioMode(false);
        setBotState(actionName);
        setEyeExpression(expression);
        addLog(logMsg);
        setActionLocked(true);
        setTimeout(() => { setBotState('idle'); setActionLocked(false); }, duration);
    };

    const cmdFeed = () => performAction('feed', 'clapping', 'money', 3000, {}, { hun: 35, h: 8 }, 10, "🔋 Nom nom! Fuel restored!");
    const cmdPlay = () => performAction('play', 'golfing', 'star', 4000, { e: 12, hun: 8 }, { h: 30 }, 15, "🎯 Batting the ember orb!");
    const cmdExercise = () => performAction('exercise', 'stretching', 'cool', 4000, { e: 20, hun: 12 }, { f: 25, h: 5 }, 20, "🏋️ Big cat stretch!");
    const cmdWork = () => performAction('work', 'working', 'confused', 4000, { e: 15, h: 8 }, { i: 20 }, 25, "🔮 Conjuring arcane runes...");
    const cmdTalk = () => performAction('talk', 'talking2', 'happy', 3500, { e: 5 }, { h: 12, i: 5 }, 8, "💬 Bubble chat!");
    const cmdDance = () => {
        const nextDance = lastActionType === 'dance' && consecutiveActions % 2 === 0 ? 'dancing2' : 'dancing';
        performAction('dance', nextDance, nextDance === 'dancing2' ? 'star' : 'love', 4000, { e: 10, hun: 5 }, { h: 25, f: 8 }, 12, nextDance === 'dancing2' ? "✨ Playful spin!" : "💃 Mid-air leap!");
    };
    const cmdPraise = () => performAction('praise', 'salute', 'star', 3000, {}, { h: 15 }, 5, "🫡 Salute! Bond strengthened!");
    
    const cmdSleep = () => {
        handleInteraction();
        setManualStudioMode(false);
        if (actionLocked) return;
        if (isSleeping) {
            setIsSleeping(false);
            setBotState('surprised');
            setEyeExpression('surprised');
            addLog("☀️ Good morning!");
            gainXp(5);
            setActionLocked(true);
            setTimeout(() => { setBotState('idle'); setActionLocked(false); }, 2000);
        } else {
            setIsSleeping(true);
            setBotState('sleeping');
            setEyeExpression('sleepy');
            addLog("💤 Going to sleep...");
        }
    };

    const studioAnimations: { id: string; label: string; defaultExpr: EyeExpression }[] = [
        { id: 'idle', label: 'Idle', defaultExpr: 'normal' },
        { id: 'dancing', label: 'Dance 1', defaultExpr: 'happy' },
        { id: 'dancing2', label: 'Dance 2', defaultExpr: 'star' },
        { id: 'sleeping', label: 'Sleep', defaultExpr: 'sleepy' },
        { id: 'surprised', label: 'Surprise', defaultExpr: 'surprised' },
        { id: 'waving', label: 'Wave', defaultExpr: 'normal' },
        { id: 'salute', label: 'Salute', defaultExpr: 'normal' },
        { id: 'refusing', label: 'Refuse', defaultExpr: 'angry' },
        { id: 'stretching', label: 'Stretch', defaultExpr: 'sleepy' },
        { id: 'golfing', label: 'Golf', defaultExpr: 'normal' },
        { id: 'pointing', label: 'Point', defaultExpr: 'angry' },
        { id: 'clapping', label: 'Clap', defaultExpr: 'happy' },
        { id: 'talking', label: 'Talk', defaultExpr: 'normal' },
        { id: 'working', label: 'Work', defaultExpr: 'happy' },
    ];

    const studioExpressions: { id: EyeExpression; label: string }[] = [
        { id: 'normal', label: 'Normal' },
        { id: 'happy', label: 'Happy' },
        { id: 'sleepy', label: 'Sleepy' },
        { id: 'angry', label: 'Angry' },
        { id: 'sad', label: 'Sad' },
        { id: 'surprised', label: 'Surprised' },
        { id: 'dead', label: 'Dead' },
        { id: 'love', label: 'Love' },
        { id: 'star', label: 'Star' },
        { id: 'money', label: 'Money' },
        { id: 'confused', label: 'Confused' },
        { id: 'cool', label: 'Cool' },
    ];

    const triggerStudioAnim = (animId: string, defaultExpr: EyeExpression) => {
        setManualStudioMode(true);
        setActionLocked(false);
        setIsSleeping(animId === 'sleeping');
        setBotState(animId);
        setEyeExpression(defaultExpr);
        setStatusMessage(`🎬 Anim: ${animId.toUpperCase()}`);
        addLog(`Studio anim -> ${animId}`);
    };

    const triggerStudioExpr = (exprId: EyeExpression) => {
        setManualStudioMode(true);
        setActionLocked(false);
        setEyeExpression(exprId);
        setStatusMessage(`👁️ Eye: ${exprId.toUpperCase()}`);
        addLog(`Studio eye -> ${exprId}`);
    };
    
    if (collapsed) return null;

    const xpNeeded = level * 50;
    const xpPct = Math.min(100, (xp / xpNeeded) * 100);

    return (
        <div style={{ padding: '8px 12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }} onClick={handleInteraction}>
            {/* Dashboard Card */}
            <div className="module-illustration-card" style={cardStyle(darkMode)} onMouseEnter={hoverIn('rgba(124, 58, 237, 0.15)', darkMode)} onMouseLeave={hoverOut(darkMode)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="card-title" style={{ fontSize: 13, fontWeight: 600, color: darkMode ? '#e2e8f0' : '#1a202c' }}>Dashboard</span>
                </div>
                <div style={{ width: '100%', height: 60 }}><DashboardRealChart darkMode={darkMode} /></div>
            </div>

            {/* CRM Card */}
            <div className="module-illustration-card" style={cardStyle(darkMode)} onMouseEnter={hoverIn('rgba(59, 130, 246, 0.15)', darkMode)} onMouseLeave={hoverOut(darkMode)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="card-title" style={{ fontSize: 13, fontWeight: 600, color: darkMode ? '#e2e8f0' : '#1a202c' }}>CRM</span>
                </div>
                <div style={{ width: '100%', height: 60 }}><CRMRealChart darkMode={darkMode} /></div>
            </div>

            {/* Cinder-Puff 60fps Studio System */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* 3D Studio Scene Viewport (#ffffff Pure White Studio Background) */}
                <div style={{
                    width: '100%',
                    height: 235,
                    background: '#ffffff',
                    borderRadius: 10,
                    border: darkMode ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(15, 23, 42, 0.12)',
                    boxShadow: darkMode ? '0 10px 25px -8px rgba(0, 0, 0, 0.6)' : '0 8px 20px -8px rgba(15, 23, 42, 0.08)',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <Canvas
                        shadows
                        dpr={[1, 2]}
                        camera={{ position: [0, 0.04, 4.25], fov: 34 }}
                        style={{ background: '#ffffff' }}
                    >
                        <color attach="background" args={['#ffffff']} />
                        {/* Balanced Studio Ambient Light */}
                        <ambientLight intensity={0.95} />
                        {/* Key Directional Light */}
                        <directionalLight
                            castShadow
                            position={[3.2, 5.5, 4.5]}
                            intensity={1.45}
                            shadow-mapSize-width={1024}
                            shadow-mapSize-height={1024}
                            shadow-camera-near={0.5}
                            shadow-camera-far={15}
                            shadow-camera-left={-2.5}
                            shadow-camera-right={2.5}
                            shadow-camera-top={2.5}
                            shadow-camera-bottom={-2.5}
                            shadow-bias={-0.0005}
                        />
                        {/* Soft Studio Fill Light */}
                        <directionalLight position={[-3.5, 2.5, 3.0]} intensity={0.55} color="#eef8ff" />
                        {/* Cyan Rim Light */}
                        <directionalLight position={[0, 3.0, -4.5]} intensity={1.65} color="#00f0ff" />

                        {/* Full-Body Cinder-Puff framed cleanly to the right of action buttons and below HUD */}
                        <group position={[0.10, -0.12, 0]} scale={1.0}>
                            <TamagotchiModel state={botState} eyeExpression={eyeExpression} darkMode={false} />
                        </group>

                        <OrbitControls
                            enableZoom={true}
                            enablePan={false}
                            minDistance={2.4}
                            maxDistance={6.8}
                            target={[0.10, -0.18, 0]}
                        />
                    </Canvas>

                    {/* Minimal Overlay Info (Top Left & Right) */}
                    <div style={{ position: 'absolute', top: 8, left: 10, right: 10, zIndex: 9999, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {/* Always-on Vitals Grid */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ width: 24 }}><StatBar label="NRG" value={energy} color="#3b82f6" darkMode={false} /></div>
                                <div style={{ width: 24 }}><StatBar label="FUE" value={hunger} color="#eab308" darkMode={false} /></div>
                                <div style={{ width: 24 }}><StatBar label="JOY" value={happiness} color="#10b981" darkMode={false} /></div>
                                <div style={{ width: 24 }}><StatBar label="FIT" value={fitness} color="#f97316" darkMode={false} /></div>
                                <div style={{ width: 24 }}><StatBar label="INT" value={intellect} color="#8b5cf6" darkMode={false} /></div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowControls(v => !v);
                                }}
                                style={{
                                    pointerEvents: 'auto',
                                    background: showControls ? '#0f172a' : 'rgba(15, 23, 42, 0.08)',
                                    color: showControls ? '#38bdf8' : '#334155',
                                    border: '1px solid rgba(15, 23, 42, 0.15)',
                                    borderRadius: 6,
                                    padding: '2px 6px',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                }}
                                title="Toggle 60fps Studio Inspector"
                            >
                                🎛️ STUDIO
                            </button>
                        </div>

                        <div>
                            {/* Row 1: Level (Left) & LOG. Label (Right) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                                    CINDER-PUFF <span style={{ color: '#d97706' }}>Lv.{level}</span>
                                </div>
                                <div style={{ fontSize: 8.5, fontWeight: 800, color: '#64748b', lineHeight: 1 }}>LOG.</div>
                            </div>
                            
                            {/* Row 2: Type/XP (Left) & Log Message (Right) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 3 }}>
                                <div>
                                    <div style={{ fontSize: 8.5, color: '#0284c7', fontWeight: 800 }}>
                                        {personality.toUpperCase()} TYPE
                                    </div>
                                    <div style={{ marginTop: 2, width: 72, height: 3.5, background: 'rgba(15,23,42,0.1)', borderRadius: 2 }}>
                                        <div style={{ width: `${xpPct}%`, height: '100%', background: '#f59e0b', borderRadius: 2 }} />
                                    </div>
                                </div>
                                <div style={{ 
                                    fontSize: 8.5, fontWeight: 600, color: '#334155', 
                                    textAlign: 'right', maxWidth: 92, wordWrap: 'break-word', lineHeight: 1.1
                                }}>
                                    &gt; {eventLog[0]}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Message (Bottom Right) */}
                    <div style={{ position: 'absolute', bottom: 8, right: 8, pointerEvents: 'none', zIndex: 9999, textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: '#334155', background: 'rgba(241,245,249,0.88)', border: '1px solid rgba(15,23,42,0.08)', padding: '2px 7px', borderRadius: 10, display: 'inline-block' }}>
                            {statusMessage}
                        </div>
                    </div>

                    {/* Floating Action Buttons (Left side) */}
                    <div style={{ position: 'absolute', top: 84, left: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5, zIndex: 9999, pointerEvents: 'none' }}>
                        <ActionBtn onClick={cmdFeed} icon="🔋" color="#eab308" darkMode={false} tooltip="Feed (Energy)" />
                        <ActionBtn onClick={cmdPlay} icon="🎯" color="#10b981" darkMode={false} tooltip="Play (Joy)" />
                        <ActionBtn onClick={cmdDance} icon="💃" color="#ec4899" darkMode={false} tooltip="Dance" />
                        <ActionBtn onClick={cmdTalk} icon="💬" color="#06b6d4" darkMode={false} tooltip="Talk" />
                        <ActionBtn onClick={cmdExercise} icon="🏋️" color="#f97316" darkMode={false} tooltip="Exercise (Fitness)" />
                        <ActionBtn onClick={cmdWork} icon="📚" color="#8b5cf6" darkMode={false} tooltip="Work (Intellect)" />
                        <ActionBtn onClick={cmdPraise} icon="🫡" color="#14b8a6" darkMode={false} tooltip="Praise" />
                        <ActionBtn onClick={cmdSleep} icon={isSleeping ? '☀️' : '💤'} color="#3b82f6" darkMode={false} tooltip={isSleeping ? 'Wake Up' : 'Sleep'} />
                    </div>
                </div>

                {/* Real-Time HTML/CSS Studio Overlay Panel for 60fps Procedural Animations & 12 EyeExpressions */}
                {showControls && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: darkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)',
                            border: darkMode ? '1px solid rgba(56, 189, 248, 0.22)' : '1px solid rgba(15, 23, 42, 0.12)',
                            borderRadius: 8,
                            padding: '7px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                        }}
                    >
                        {/* Procedural Animation State Triggers (14 States) */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                <span style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '0.4px', color: darkMode ? '#38bdf8' : '#0284c7' }}>
                                    60FPS PROCEDURAL ANIMATIONS
                                </span>
                                <span style={{ fontSize: 8, fontWeight: 700, color: darkMode ? '#94a3b8' : '#64748b' }}>
                                    {botState.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                                {studioAnimations.map((anim) => {
                                    const active = botState === anim.id || (anim.id === 'talking' && botState.startsWith('talking'));
                                    return (
                                        <button
                                            key={anim.id}
                                            onClick={() => triggerStudioAnim(anim.id, anim.defaultExpr)}
                                            style={{
                                                padding: '2.5px 3px',
                                                fontSize: 8.5,
                                                fontWeight: active ? 800 : 600,
                                                borderRadius: 4,
                                                cursor: 'pointer',
                                                border: active
                                                    ? '1px solid #00d2ff'
                                                    : darkMode
                                                        ? '1px solid rgba(255,255,255,0.1)'
                                                        : '1px solid rgba(15,23,42,0.1)',
                                                background: active
                                                    ? darkMode
                                                        ? 'rgba(0, 210, 255, 0.22)'
                                                        : 'rgba(2, 132, 199, 0.12)'
                                                    : darkMode
                                                        ? 'rgba(30, 41, 59, 0.7)'
                                                        : '#f8fafc',
                                                color: active
                                                    ? darkMode
                                                        ? '#38f2ff'
                                                        : '#0369a1'
                                                    : darkMode
                                                        ? '#cbd5e1'
                                                        : '#334155',
                                                textAlign: 'center',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                transition: 'all 0.12s ease',
                                            }}
                                        >
                                            {anim.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* EyeExpression State Machine Triggers (All 12 Expressions) */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                <span style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '0.4px', color: darkMode ? '#fbbf24' : '#d97706' }}>
                                    EYE EXPRESSIONS (12)
                                </span>
                                <span style={{ fontSize: 8, fontWeight: 700, color: darkMode ? '#94a3b8' : '#64748b' }}>
                                    {eyeExpression.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                                {studioExpressions.map((expr) => {
                                    const active = eyeExpression === expr.id;
                                    return (
                                        <button
                                            key={expr.id}
                                            onClick={() => triggerStudioExpr(expr.id)}
                                            style={{
                                                padding: '2.5px 3px',
                                                fontSize: 8.5,
                                                fontWeight: active ? 800 : 600,
                                                borderRadius: 4,
                                                cursor: 'pointer',
                                                border: active
                                                    ? '1px solid #f59e0b'
                                                    : darkMode
                                                        ? '1px solid rgba(255,255,255,0.1)'
                                                        : '1px solid rgba(15,23,42,0.1)',
                                                background: active
                                                    ? darkMode
                                                        ? 'rgba(245, 158, 11, 0.22)'
                                                        : 'rgba(245, 158, 11, 0.14)'
                                                    : darkMode
                                                        ? 'rgba(30, 41, 59, 0.7)'
                                                        : '#f8fafc',
                                                color: active
                                                    ? darkMode
                                                        ? '#fcd34d'
                                                        : '#b45309'
                                                    : darkMode
                                                        ? '#cbd5e1'
                                                        : '#334155',
                                                textAlign: 'center',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                transition: 'all 0.12s ease',
                                            }}
                                        >
                                            {expr.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModuleIllustrationCards;
