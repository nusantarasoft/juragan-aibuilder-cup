"use client";

import React, { useState } from "react";

// Demo example interface
export interface DemoExample {
    id: string;
    title: string;
    description?: string;
    demo: React.ReactNode;
    code: string;
}

// Prop definition interface
export interface PropDefinition {
    name: string;
    type: string;
    description: string;
    required?: boolean;
    default?: string;
}

// Component data interface
export interface AntdComponentData {
    id: string;
    name: string;
    description: string;
    whenToUse?: string;
    demos: DemoExample[];
    apiProps?: PropDefinition[];
    docUrl?: string;
}

// Demo Card Component
function DemoCard({ demo }: { demo: DemoExample }) {
    const [showCode, setShowCode] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(demo.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
            {/* Demo Preview */}
            <div className="p-6 border-b border-neutral-200 min-h-[120px]">
                {demo.demo}
            </div>

            {/* Demo Title & Actions */}
            <div className="px-4 py-3 bg-neutral-50 flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium text-neutral-900">{demo.title}</h4>
                    {demo.description && (
                        <p className="text-xs text-neutral-500 mt-1">{demo.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={copyCode}
                        className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded"
                        title="Copy code"
                    >
                        {copied ? "✓" : "📋"}
                    </button>
                    <button
                        onClick={() => setShowCode(!showCode)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded"
                        title={showCode ? "Hide code" : "Show code"}
                    >
                        {showCode ? "▲" : "▼"}
                    </button>
                </div>
            </div>

            {/* Code Block */}
            {showCode && (
                <div className="bg-neutral-900 p-4 overflow-x-auto">
                    <pre className="text-sm text-neutral-300">
                        <code>{demo.code}</code>
                    </pre>
                </div>
            )}
        </div>
    );
}

// Main Ant Design Style Content Component
export function AntdStyleContent({ componentData }: { componentData: AntdComponentData }) {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-neutral-200 bg-white sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-neutral-900">
                                {componentData.name}
                            </h1>
                            <p className="text-neutral-500 mt-1">{componentData.description}</p>
                        </div>
                        {componentData.docUrl && (
                            <a
                                href={componentData.docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50"
                            >
                                Official Docs ↗
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* When to Use */}
                {componentData.whenToUse && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-neutral-900 mb-3">When To Use</h2>
                        <p className="text-neutral-600">{componentData.whenToUse}</p>
                    </div>
                )}

                {/* Examples Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-neutral-900 mb-4">Examples</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {componentData.demos.map((demo) => (
                            <DemoCard key={demo.id} demo={demo} />
                        ))}
                    </div>
                </div>

                {/* API Section */}
                {componentData.apiProps && componentData.apiProps.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-neutral-900 mb-4">API</h2>
                        <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-neutral-50 border-b border-neutral-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium text-neutral-700">Property</th>
                                        <th className="text-left px-4 py-3 font-medium text-neutral-700">Type</th>
                                        <th className="text-left px-4 py-3 font-medium text-neutral-700">Default</th>
                                        <th className="text-left px-4 py-3 font-medium text-neutral-700">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {componentData.apiProps.map((prop, idx) => (
                                        <tr key={prop.name} className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50"}>
                                            <td className="px-4 py-3">
                                                <code className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-xs">
                                                    {prop.name}
                                                </code>
                                                {prop.required && (
                                                    <span className="ml-1 text-red-500 text-xs">*</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <code className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-xs">
                                                    {prop.type}
                                                </code>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-500">
                                                {prop.default || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-700">
                                                {prop.description}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
