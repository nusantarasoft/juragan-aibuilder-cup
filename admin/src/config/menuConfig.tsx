import React from "react";
import {
    ExperimentOutlined,
    MessageOutlined,
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
                        path: "/admin/ai-studio/knowledge-research",
                        name: "Knowledge Research",
                        icon: <ExperimentOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/showcase",
                        name: "Showcase",
                        icon: <PictureOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/messages",
                        name: "Messages",
                        icon: <MessageOutlined />,
                        isLeaf: true,
                    },
                    {
                        path: "/admin/ai-studio/settings",
                        name: "Settings",
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
