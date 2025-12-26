"use client";

import React from "react";
import { ConfigProvider, Button, Space, theme, Typography, Card } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text, Title } = Typography;

// Demo 1: Primary Color
const PrimaryColorDemo = () => (
    <ConfigProvider theme={{ token: { colorPrimary: "#00b96b" } }}>
        <Space>
            <Button type="primary">Green Primary</Button>
            <Button>Default</Button>
        </Space>
    </ConfigProvider>
);

// Demo 2: Dark Theme
const DarkThemeDemo = () => (
    <ConfigProvider
        theme={{
            algorithm: theme.darkAlgorithm,
        }}
    >
        <Card style={{ background: "#141414" }}>
            <Space orientation="vertical">
                <Button type="primary">Primary</Button>
                <Text style={{ color: "#fff" }}>Dark theme text</Text>
            </Space>
        </Card>
    </ConfigProvider>
);

// Demo 3: Compact Mode
const CompactDemo = () => (
    <ConfigProvider theme={{ algorithm: theme.compactAlgorithm }}>
        <Space>
            <Button type="primary">Compact Primary</Button>
            <Button>Compact Default</Button>
        </Space>
    </ConfigProvider>
);

// Demo 4: Component Size
const SizeDemo = () => (
    <Space orientation="vertical">
        <ConfigProvider componentSize="small">
            <Space>
                <Button type="primary">Small</Button>
                <Button>Small</Button>
            </Space>
        </ConfigProvider>
        <ConfigProvider componentSize="large">
            <Space>
                <Button type="primary">Large</Button>
                <Button>Large</Button>
            </Space>
        </ConfigProvider>
    </Space>
);

// Demo 5: Border Radius
const BorderRadiusDemo = () => (
    <Space>
        <ConfigProvider theme={{ token: { borderRadius: 0 } }}>
            <Button type="primary">Sharp</Button>
        </ConfigProvider>
        <ConfigProvider theme={{ token: { borderRadius: 16 } }}>
            <Button type="primary">Round</Button>
        </ConfigProvider>
    </Space>
);

// Demo 6: Custom Font
const FontDemo = () => (
    <ConfigProvider theme={{ token: { fontFamily: "Georgia, serif" } }}>
        <Space orientation="vertical">
            <Button type="primary">Serif Font</Button>
            <Text>This text uses a serif font family.</Text>
        </Space>
    </ConfigProvider>
);

// Demo 7: Component Tokens
const ComponentTokenDemo = () => (
    <ConfigProvider
        theme={{
            components: {
                Button: {
                    colorPrimary: "#ff4d4f",
                    algorithm: true,
                },
            },
        }}
    >
        <Button type="primary">Red Button Only</Button>
    </ConfigProvider>
);

export const configProviderData: AntdComponentData = {
    id: "antd-config-provider",
    name: "ConfigProvider",
    description: "ConfigProvider allows global configuration of themes, sizes, and component defaults. Supports design tokens and theme algorithms.",
    whenToUse: "Use ConfigProvider to customize themes, apply dark mode, set global sizes, or configure component defaults across your app.",
    docUrl: "https://ant.design/components/config-provider",
    demos: [
        {
            id: "primary",
            title: "Primary Color",
            description: "Custom primary color",
            demo: <PrimaryColorDemo />,
            code: `<ConfigProvider theme={{ token: { colorPrimary: "#00b96b" } }}>
  <Button type="primary">Green</Button>
</ConfigProvider>`,
        },
        {
            id: "dark",
            title: "Dark Theme",
            description: "Dark mode algorithm",
            demo: <DarkThemeDemo />,
            code: `<ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
  ...
</ConfigProvider>`,
        },
        {
            id: "compact",
            title: "Compact Mode",
            description: "Compact algorithm",
            demo: <CompactDemo />,
            code: `<ConfigProvider theme={{ algorithm: theme.compactAlgorithm }}>
  ...
</ConfigProvider>`,
        },
        {
            id: "size",
            title: "Component Size",
            description: "Global size config",
            demo: <SizeDemo />,
            code: `<ConfigProvider componentSize="small">
  <Button>Small</Button>
</ConfigProvider>`,
        },
        {
            id: "radius",
            title: "Border Radius",
            description: "Custom border radius",
            demo: <BorderRadiusDemo />,
            code: `<ConfigProvider theme={{ token: { borderRadius: 16 } }}>
  ...
</ConfigProvider>`,
        },
        {
            id: "font",
            title: "Custom Font",
            description: "Font family override",
            demo: <FontDemo />,
            code: `<ConfigProvider theme={{ token: { fontFamily: "Georgia" } }}>
  ...
</ConfigProvider>`,
        },
        {
            id: "component",
            title: "Component Tokens",
            description: "Per-component theming",
            demo: <ComponentTokenDemo />,
            code: `<ConfigProvider theme={{
  components: {
    Button: { colorPrimary: "#ff4d4f" }
  }
}}>
  ...
</ConfigProvider>`,
        },
    ],
    apiProps: [
        { name: "theme", type: "ThemeConfig", description: "Theme configuration" },
        { name: "theme.token", type: "AliasToken", description: "Global design tokens" },
        { name: "theme.algorithm", type: "ThemeAlgorithm | ThemeAlgorithm[]", description: "Theme algorithm" },
        { name: "theme.components", type: "ComponentsToken", description: "Component-level tokens" },
        { name: "componentSize", type: "'small' | 'middle' | 'large'", description: "Global component size" },
        { name: "locale", type: "Locale", description: "Locale configuration" },
        { name: "direction", type: "'ltr' | 'rtl'", description: "Text direction" },
        { name: "prefixCls", type: "string", description: "CSS class prefix", default: "ant" },
        { name: "getPopupContainer", type: "(node) => HTMLElement", description: "Popup container" },
    ],
};
