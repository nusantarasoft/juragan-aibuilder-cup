"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
    code: string;
    language?: string;
    filename?: string;
    showLineNumbers?: boolean;
    className?: string;
}

export const CodeBlock = ({
    code,
    language = "javascript",
    filename,
    showLineNumbers = true,
    className,
}: CodeBlockProps) => {
    const lines = code.split("\n");

    return (
        <div
            className={cn(
                "rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950",
                className
            )}
        >
            {/* Header */}
            {filename && (
                <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
                    <span className="text-sm text-neutral-400">{filename}</span>
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                </div>
            )}

            {/* Code content */}
            <div className="overflow-x-auto">
                <pre className="p-4">
                    <code className={`language-${language}`}>
                        {lines.map((line, idx) => (
                            <div key={idx} className="flex">
                                {showLineNumbers && (
                                    <span className="inline-block w-8 text-neutral-600 text-right mr-4 select-none text-sm">
                                        {idx + 1}
                                    </span>
                                )}
                                <span className="text-neutral-300 text-sm">{line || " "}</span>
                            </div>
                        ))}
                    </code>
                </pre>
            </div>
        </div>
    );
};

export const CodeBlockWithCopy = ({
    code,
    language,
    filename,
    showLineNumbers = true,
    className,
}: CodeBlockProps) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn("relative group", className)}>
            <CodeBlock
                code={code}
                language={language}
                filename={filename}
                showLineNumbers={showLineNumbers}
            />
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-2 py-1 text-xs text-neutral-400 bg-neutral-800 rounded hover:bg-neutral-700 transition-colors opacity-0 group-hover:opacity-100"
            >
                {copied ? "Copied!" : "Copy"}
            </button>
        </div>
    );
};
