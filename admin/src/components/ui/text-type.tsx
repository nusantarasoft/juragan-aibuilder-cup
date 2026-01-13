'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

interface TextTypeProps {
    text?: string | string[];
    className?: string;
    speed?: number;
    typingSpeed?: number;
    pauseDuration?: number;
    delay?: number;
    showCursor?: boolean;
    cursorCharacter?: string;
}

export function TextType({
    text = '',
    className,
    speed = 75,
    typingSpeed = 75,
    pauseDuration = 1500,
    delay = 0,
    showCursor = true
}: TextTypeProps) {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    const texts = Array.isArray(text) ? text : [text];
    const actualSpeed = typingSpeed || speed;

    const typeText = useCallback(() => {
        const currentText = texts[currentIndex];
        let charIndex = 0;

        const interval = setInterval(() => {
            if (charIndex < currentText.length) {
                setDisplayText(currentText.substring(0, charIndex + 1));
                charIndex++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    setCurrentIndex((prev) => (prev + 1) % texts.length);
                    setDisplayText('');
                }, pauseDuration);
            }
        }, actualSpeed);

        return () => clearInterval(interval);
    }, [currentIndex, texts, actualSpeed, pauseDuration]);

    useEffect(() => {
        const timeout = setTimeout(typeText, delay);
        return () => clearTimeout(timeout);
    }, [typeText, delay]);

    return (
        <motion.span
            className={cn('inline-block', className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {displayText}
            {showCursor && <span className="animate-pulse">|</span>}
        </motion.span>
    );
}

export default TextType;
