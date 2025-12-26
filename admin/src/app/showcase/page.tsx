"use client";

import React, { useState } from "react";
import { ShowcaseSidebar } from "@/components/showcase/ShowcaseSidebar";
import { ComponentContent } from "@/components/showcase/ComponentContent";

export default function ShowcasePage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-neutral-950">
            {/* Sidebar */}
            <ShowcaseSidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                selectedComponent={selectedComponent}
                onSelectComponent={setSelectedComponent}
            />

            {/* Main Content */}
            <main
                className={`min-h-screen transition-all duration-300 ${sidebarOpen ? "ml-80" : "ml-0"
                    }`}
            >
                <div className="pt-16">
                    <ComponentContent componentId={selectedComponent} />
                </div>
            </main>
        </div>
    );
}
