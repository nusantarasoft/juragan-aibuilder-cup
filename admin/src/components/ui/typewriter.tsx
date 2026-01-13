'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TypewriterProps {
    words: string | string[];
    className?: string;
}

export function TextGenerateEffect({ words, className }: TypewriterProps) {
    const wordsArray = Array.isArray(words) ? words : [words];
    const [currentWord, setCurrentWord] = useState(0);
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        const word = wordsArray[currentWord];
        let index = 0;
        const interval = setInterval(() => {
            if (index < word.length) {
                setDisplayText(word.substring(0, index + 1));
                index++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    setCurrentWord((prev) => (prev + 1) % wordsArray.length);
                    setDisplayText('');
                }, 2000);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [currentWord, wordsArray]);

    return (
        <motion.span
            className={cn('inline-block', className)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {displayText}
            <span className="animate-pulse">|</span>
        </motion.span>
    );
}

export default TextGenerateEffect;
