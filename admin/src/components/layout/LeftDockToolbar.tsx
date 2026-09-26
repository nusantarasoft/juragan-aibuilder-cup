"use client";

import React from "react";
import { Tooltip } from "antd";
import {
    PlusOutlined,
    ClockCircleOutlined,
    SettingOutlined,
    StarOutlined,
    SnippetsOutlined,
    SearchOutlined,
    BellOutlined,
    AppstoreOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

interface ToolbarItem {
    key: string;
    icon: React.ReactNode;
    label: string;
    action?: () => void;
    path?: string;
    dividerAfter?: boolean;
}

interface Props {
    themeColor: string;
    darkMode: boolean;
    onAIStudio?: () => void;
}

export const LeftDockToolbar: React.FC<Props> = ({ themeColor, darkMode, onAIStudio }) => {
    const router = useRouter();

    const items: ToolbarItem[] = [
        {
            key: "add",
            icon: <PlusOutlined style={{ fontSize: 16 }} />,
            label: "Create New",
            path: "/admin/pages/builder",
            dividerAfter: true,
        },
        {
            key: "clock",
            icon: <ClockCircleOutlined style={{ fontSize: 15 }} />,
            label: "Recent",
        },
        {
            key: "search",
            icon: <SearchOutlined style={{ fontSize: 15 }} />,
            label: "Search",
        },
        {
            key: "star",
            icon: <StarOutlined style={{ fontSize: 15 }} />,
            label: "Favorites",
            dividerAfter: true,
        },
        {
            key: "apps",
            icon: <AppstoreOutlined style={{ fontSize: 15 }} />,
            label: "Modules",
        },
        {
            key: "snippets",
            icon: <SnippetsOutlined style={{ fontSize: 15 }} />,
            label: "Clipboard",
        },
        {
            key: "bell",
            icon: <BellOutlined style={{ fontSize: 15 }} />,
            label: "Notifications",
        },
        {
            key: "settings",
            icon: <SettingOutlined style={{ fontSize: 15 }} />,
            label: "Settings",
            path: "/admin/settings",
        },
    ];

    const bgColor = darkMode ? '#1a1a2e' : '#fafafe';
    const borderColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const iconColor = darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
    const hoverBg = darkMode ? `${themeColor}30` : `${themeColor}12`;
    const activeBg = darkMode ? `${themeColor}40` : `${themeColor}18`;

    return (
        <div
            className="left-dock-toolbar"
            style={{
                width: 46,
                minWidth: 46,
                height: '100%',
                background: bgColor,
                borderRight: `1px solid ${borderColor}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 12,
                paddingBottom: 12,
                gap: 2,
                overflowY: 'auto',
                overflowX: 'hidden',
                flexShrink: 0,
            }}
        >
            {items.map((item) => (
                <React.Fragment key={item.key}>
                    <Tooltip title={item.label} placement="right" mouseEnterDelay={0.3}>
                        <div
                            className="left-dock-item"
                            onClick={() => {
                                if (item.path) router.push(item.path);
                                if (item.action) item.action();
                            }}
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: iconColor,
                                transition: 'all 0.2s ease',
                                position: 'relative',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = hoverBg;
                                e.currentTarget.style.color = themeColor;
                                e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = iconColor;
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            {item.icon}
                        </div>
                    </Tooltip>
                    {item.dividerAfter && (
                        <div style={{
                            width: 20,
                            height: 1,
                            background: borderColor,
                            margin: '4px 0',
                        }} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default LeftDockToolbar;
