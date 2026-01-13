'use client';
import { useCallback, useEffect, useRef } from 'react';

interface AutoResizeOptions {
    minHeight?: number;
    maxHeight?: number;
}

export function useAutoResizeTextarea(options: AutoResizeOptions = {}) {
    const { minHeight = 56, maxHeight = 200 } = options;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback((reset?: boolean) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        if (reset) {
            textarea.style.height = `${minHeight}px`;
            return;
        }

        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
    }, [minHeight, maxHeight]);

    useEffect(() => {
        adjustHeight();
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

export default useAutoResizeTextarea;
