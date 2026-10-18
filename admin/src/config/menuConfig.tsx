import React from "react";
import {
    ExperimentOutlined,
    MessageOutlined,
    NodeIndexOutlined,
    PictureOutlined,
    RobotOutlined,
    SettingOutlined,
    ShopOutlined,
} from "@ant-design/icons";

// CMS Menu Configuration — AI Studio submenu only (Agentic OS & Virtual Office accessed via top bar / launcher)
const menuConfig = {
    route: {
        path: "/admin",
        routes: [
            {
                path: "/admin/ai-studio",
                key: "/admin/ai-studio-menu",
                name: "AI Studio",
                icon: <RobotOutlined />,
                routes: [
                    {
                        path: "/admin/ai-studio",
                        name: "Studio",
                        icon: <RobotOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/partner",
                        name: "Partner",
                        icon: <ShopOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/riset-knowledge",
                        name: "Knowledge Research",
                        icon: <ExperimentOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/konten-marketing",
                        name: "Marketing Content",
                        icon: <PictureOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/percakapan-wa",
                        name: "WA Conversations",
                        icon: <MessageOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/ai-gateway",
                        name: "WhatsApp Gateway",
                        icon: <NodeIndexOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/settings",
                        name: "Settings & Models",
                        icon: <SettingOutlined />,
                        isLeaf: true,
                    },
                ],
            },
        ],
    },
    location: {
        pathname: "/admin/ai-studio",
    },
};

export default menuConfig;

