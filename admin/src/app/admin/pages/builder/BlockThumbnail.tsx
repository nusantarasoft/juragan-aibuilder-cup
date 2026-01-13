"use client";

import React from "react";
import { Card } from "antd";

// Mini preview components for each block type
const BlockThumbnails: Record<string, React.FC> = {
    navigation: () => (
        <div className="w-full h-12 bg-slate-800 rounded flex items-center justify-between px-2">
            <div className="w-8 h-3 bg-white/80 rounded" />
            <div className="flex gap-1">
                <div className="w-4 h-2 bg-white/50 rounded" />
                <div className="w-4 h-2 bg-white/50 rounded" />
                <div className="w-4 h-2 bg-white/50 rounded" />
            </div>
        </div>
    ),
    hero: () => (
        <div className="w-full h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded flex flex-col items-center justify-center gap-1">
            <div className="w-16 h-2 bg-white/90 rounded" />
            <div className="w-12 h-1.5 bg-white/50 rounded" />
            <div className="w-8 h-3 bg-white rounded mt-1" />
        </div>
    ),
    footer: () => (
        <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
            <div className="w-20 h-2 bg-gray-400 dark:bg-gray-500 rounded" />
        </div>
    ),
    text: () => (
        <div className="w-full h-12 bg-white dark:bg-gray-800 border rounded p-1.5 flex flex-col gap-1">
            <div className="w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="w-3/4 h-1.5 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="w-1/2 h-1.5 bg-gray-300 dark:bg-gray-600 rounded" />
        </div>
    ),
    features: () => (
        <div className="w-full h-16 bg-white dark:bg-gray-800 rounded p-1 grid grid-cols-3 gap-0.5">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded flex flex-col items-center justify-center gap-0.5 p-0.5">
                    <div className="w-3 h-3 bg-blue-400 rounded-full" />
                    <div className="w-6 h-1 bg-gray-300 dark:bg-gray-600 rounded" />
                </div>
            ))}
        </div>
    ),
    testimonials: () => (
        <div className="w-full h-14 bg-gray-900 rounded flex items-center justify-center gap-1 p-1 overflow-hidden">
            {[1, 2].map(i => (
                <div key={i} className="bg-gray-800 rounded p-1 flex-shrink-0 w-12">
                    <div className="w-full h-2 bg-gray-600 rounded mb-0.5" />
                    <div className="w-6 h-1 bg-gray-500 rounded" />
                </div>
            ))}
        </div>
    ),
    pricing: () => (
        <div className="w-full h-16 bg-white dark:bg-gray-800 rounded p-1 grid grid-cols-2 gap-0.5">
            {[1, 2].map(i => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded p-1 flex flex-col items-center">
                    <div className="w-4 h-2 bg-blue-400 rounded" />
                    <div className="w-6 h-1 bg-gray-300 dark:bg-gray-600 rounded mt-0.5" />
                </div>
            ))}
        </div>
    ),
    gallery: () => (
        <div className="w-full h-14 bg-white dark:bg-gray-800 rounded p-1 grid grid-cols-3 gap-0.5">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-gradient-to-br from-pink-400 to-orange-400 rounded" />
            ))}
        </div>
    ),
    contact: () => (
        <div className="w-full h-14 bg-white dark:bg-gray-800 border rounded p-1 flex flex-col gap-0.5">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded" />
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded" />
            <div className="w-8 h-3 bg-blue-500 rounded self-end" />
        </div>
    ),
    dock: () => (
        <div className="w-full h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-end justify-center pb-1">
            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full" />
                ))}
            </div>
        </div>
    ),
    games: () => (
        <div className="w-full h-14 bg-gray-900 rounded flex items-center justify-center">
            <div className="text-xs">🎮</div>
        </div>
    ),
    chat: () => (
        <div className="w-full h-14 bg-white dark:bg-gray-800 border rounded p-1 flex flex-col justify-end gap-0.5">
            <div className="w-10 h-2 bg-blue-400 rounded self-end" />
            <div className="w-8 h-2 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
    ),
    counter: () => (
        <div className="w-full h-12 bg-white dark:bg-gray-800 rounded flex items-center justify-around p-1">
            {[1, 2].map(i => (
                <div key={i} className="flex flex-col items-center">
                    <div className="w-4 h-3 bg-blue-500 rounded text-[6px] text-white flex items-center justify-center font-bold">99</div>
                    <div className="w-6 h-1 bg-gray-300 dark:bg-gray-600 rounded mt-0.5" />
                </div>
            ))}
        </div>
    ),
    gridContainer: () => (
        <div className="w-full h-14 border-2 border-dashed border-gray-400 rounded p-1 grid grid-cols-2 gap-1">
            <div className="border border-dashed border-gray-300 rounded flex items-center justify-center text-[8px] text-gray-400">+</div>
            <div className="border border-dashed border-gray-300 rounded flex items-center justify-center text-[8px] text-gray-400">+</div>
        </div>
    ),
};

// Layout preview thumbnails based on layout name
const LayoutThumbnails: Record<string, React.FC> = {
    "2 Columns (50/50)": () => (
        <div className="w-full h-14 border-2 border-blue-400 rounded p-1 grid grid-cols-2 gap-1">
            <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded"></div>
            <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 rounded"></div>
        </div>
    ),
    "3 Columns": () => (
        <div className="w-full h-14 border-2 border-green-400 rounded p-1 grid grid-cols-3 gap-1">
            <div className="bg-green-100 dark:bg-green-900 border border-green-300 rounded"></div>
            <div className="bg-green-100 dark:bg-green-900 border border-green-300 rounded"></div>
            <div className="bg-green-100 dark:bg-green-900 border border-green-300 rounded"></div>
        </div>
    ),
    "4 Columns": () => (
        <div className="w-full h-14 border-2 border-purple-400 rounded p-1 grid grid-cols-4 gap-0.5">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-purple-100 dark:bg-purple-900 border border-purple-300 rounded"></div>
            ))}
        </div>
    ),
    "Sidebar Left": () => (
        <div className="w-full h-14 border-2 border-orange-400 rounded p-1 grid grid-cols-4 gap-1">
            <div className="bg-orange-200 dark:bg-orange-900 border border-orange-400 rounded col-span-1"></div>
            <div className="bg-orange-100 dark:bg-orange-800 border border-orange-300 rounded col-span-3"></div>
        </div>
    ),
    "Sidebar Right": () => (
        <div className="w-full h-14 border-2 border-teal-400 rounded p-1 grid grid-cols-4 gap-1">
            <div className="bg-teal-100 dark:bg-teal-800 border border-teal-300 rounded col-span-3"></div>
            <div className="bg-teal-200 dark:bg-teal-900 border border-teal-400 rounded col-span-1"></div>
        </div>
    ),
    "Hero + Cards": () => (
        <div className="w-full h-14 border-2 border-pink-400 rounded p-0.5 flex flex-col gap-0.5">
            <div className="bg-pink-200 dark:bg-pink-900 border border-pink-400 rounded flex-1"></div>
            <div className="grid grid-cols-3 gap-0.5 flex-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-pink-100 dark:bg-pink-800 border border-pink-300 rounded"></div>
                ))}
            </div>
        </div>
    ),
    "Content + Sidebar": () => (
        <div className="w-full h-14 border-2 border-indigo-400 rounded p-1 grid grid-cols-3 gap-1">
            <div className="bg-indigo-100 dark:bg-indigo-800 border border-indigo-300 rounded col-span-2"></div>
            <div className="bg-indigo-200 dark:bg-indigo-900 border border-indigo-400 rounded col-span-1"></div>
        </div>
    ),
    "2 Rows x 2 Cols": () => (
        <div className="w-full h-14 border-2 border-cyan-400 rounded p-0.5 grid grid-rows-2 gap-0.5">
            <div className="grid grid-cols-2 gap-0.5">
                <div className="bg-cyan-100 dark:bg-cyan-800 border border-cyan-300 rounded"></div>
                <div className="bg-cyan-100 dark:bg-cyan-800 border border-cyan-300 rounded"></div>
            </div>
            <div className="grid grid-cols-2 gap-0.5">
                <div className="bg-cyan-100 dark:bg-cyan-800 border border-cyan-300 rounded"></div>
                <div className="bg-cyan-100 dark:bg-cyan-800 border border-cyan-300 rounded"></div>
            </div>
        </div>
    ),
};

interface BlockThumbnailProps {
    type: string;
    name: string;
    icon: string;
    onClick: () => void;
}

export const BlockThumbnail: React.FC<BlockThumbnailProps> = ({ type, name, icon, onClick }) => {
    // Check for layout-specific thumbnail first (for grid layouts)
    const LayoutThumbnail = LayoutThumbnails[name];
    const ThumbnailComponent = LayoutThumbnail || BlockThumbnails[type];

    return (
        <Card
            size="small"
            hoverable
            onClick={onClick}
            className="cursor-pointer transition-all hover:shadow-md"
            styles={{ body: { padding: 8 } }}
        >
            <div className="flex flex-col gap-1.5">
                {ThumbnailComponent ? (
                    <ThumbnailComponent />
                ) : (
                    <div className="w-full h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-2xl">
                        {icon}
                    </div>
                )}
                <div className="text-xs text-center font-medium truncate">
                    {icon} {name}
                </div>
            </div>
        </Card>
    );
};

export default BlockThumbnail;
