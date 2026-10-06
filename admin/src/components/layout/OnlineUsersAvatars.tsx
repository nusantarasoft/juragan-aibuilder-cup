"use client";

import React from "react";
import { Avatar, Badge, Tooltip } from "antd";

export interface OnlineUser {
    id: string;
    name: string;
    avatarUrl?: string;
    color?: string;
}

interface OnlineUsersAvatarsProps {
    users?: OnlineUser[];
    collapsed?: boolean;
    darkMode?: boolean;
}

// Placeholder data until a real presence source (e.g. Supabase Realtime presence) is wired in.
const SAMPLE_ONLINE_USERS: OnlineUser[] = [
    { id: "u1", name: "Sarah J.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
    { id: "u2", name: "Budi Santoso", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Budi" },
    { id: "u3", name: "Rina Wijaya", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rina" },
    { id: "u4", name: "Agus Pratama", color: "#f56a00" },
    { id: "u5", name: "Dewi Lestari", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dewi" },
    { id: "u6", name: "Kevin Tan", color: "#1677ff" },
    { id: "u7", name: "Maya Putri", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya" },
    { id: "u8", name: "Fajar Nugraha", color: "#87d068" },
    { id: "u9", name: "Lina Halim", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lina" },
    { id: "u10", name: "Yoga Saputra", color: "#7c3aed" },
    { id: "u11", name: "Citra Ayu", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Citra" },
    { id: "u12", name: "Hendra K.", color: "#eb2f96" },
];

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

// Shared with the outer sider footer actions row (CMSLayoutImpl) so both rows
// share the same height and sit on the same baseline at the bottom of the screen.
export const SIDER_FOOTER_ROW_HEIGHT = 48;

const OnlineUsersAvatars: React.FC<OnlineUsersAvatarsProps> = ({
    users = SAMPLE_ONLINE_USERS,
    collapsed = false,
    darkMode = false,
}) => {
    if (users.length === 0) return null;

    // Inner sider is 240px expanded / 80px collapsed. Show as many avatars as fit,
    // then let Avatar.Group collapse the rest into a "+N" bubble with a popover.
    const maxVisible = collapsed ? 1 : 4;
    const size = collapsed ? 28 : 30;
    const ringColor = darkMode ? "#141414" : "#ffffff"; // matches inner sider background
    const onlineGreen = "#22c55e";

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                height: SIDER_FOOTER_ROW_HEIGHT,
                padding: collapsed ? "0 4px" : "0 24px 0 16px",
                boxSizing: "border-box",
                width: "100%",
            }}
        >
            <Tooltip title={`${users.length} online`} placement={collapsed ? "right" : "top"}>
                <Badge
                    count={users.length}
                    overflowCount={99}
                    color={onlineGreen}
                    offset={[2, 2]}
                    style={{ boxShadow: `0 0 0 2px ${ringColor}`, fontWeight: 600 }}
                >
                    <Avatar.Group
                        size={size}
                        max={{
                            count: maxVisible,
                            style: {
                                color: "var(--theme-color, #7c3aed)",
                                backgroundColor: darkMode ? "rgba(124,58,237,0.25)" : "#ede9fe",
                                cursor: "pointer",
                                fontSize: 12,
                            },
                            popover: {
                                trigger: "click",
                                placement: collapsed ? "right" : "top",
                                rootClassName: "online-users-popover",
                            },
                        }}
                    >
                        {users.map((user) => (
                            <Badge
                                key={user.id}
                                dot
                                color={onlineGreen}
                                offset={[-3, size - 4]}
                                style={{ width: 8, height: 8, boxShadow: `0 0 0 2px ${ringColor}` }}
                            >
                                <Tooltip title={user.name} placement="top">
                                    <Avatar
                                        src={user.avatarUrl}
                                        style={{
                                            backgroundColor: user.avatarUrl ? (darkMode ? "#2a2a3e" : "#f1f5f9") : user.color,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {initials(user.name)}
                                    </Avatar>
                                </Tooltip>
                            </Badge>
                        ))}
                    </Avatar.Group>
                </Badge>
            </Tooltip>

            {/* Avatars inside the "+N" popover are Badge-wrapped, so antd's
                `.ant-avatar + .ant-avatar` spacing no longer applies; restore it. */}
            <style jsx global>{`
                .online-users-popover .ant-badge + .ant-badge {
                    margin-inline-start: 6px;
                }
            `}</style>
        </div>
    );
};

export default OnlineUsersAvatars;
