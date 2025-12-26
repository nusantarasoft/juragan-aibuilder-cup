"use client";

import React, { useState } from "react";
import { Drawer, Button, Space, Radio } from "antd";
import type { DrawerProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Drawer
const BasicDrawerDemo = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>Open Drawer</Button>
            <Drawer title="Basic Drawer" open={open} onClose={() => setOpen(false)}>
                <p>Some contents...</p>
                <p>Some contents...</p>
            </Drawer>
        </>
    );
};

// Demo 2: Placements
const PlacementDrawerDemo = () => {
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState<DrawerProps["placement"]>("right");
    return (
        <>
            <Space>
                <Radio.Group value={placement} onChange={(e) => setPlacement(e.target.value)}>
                    <Radio value="top">Top</Radio>
                    <Radio value="right">Right</Radio>
                    <Radio value="bottom">Bottom</Radio>
                    <Radio value="left">Left</Radio>
                </Radio.Group>
                <Button type="primary" onClick={() => setOpen(true)}>Open</Button>
            </Space>
            <Drawer title="Drawer" placement={placement} open={open} onClose={() => setOpen(false)}>
                <p>Content here...</p>
            </Drawer>
        </>
    );
};

// Demo 3: Custom Size
const SizeDrawerDemo = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>Large Drawer</Button>
            <Drawer title="Large Drawer" size="large" open={open} onClose={() => setOpen(false)}>
                <p>Large size drawer content</p>
            </Drawer>
        </>
    );
};

// Demo 4: With Footer
const FooterDrawerDemo = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>With Footer</Button>
            <Drawer
                title="Edit Profile"
                open={open}
                onClose={() => setOpen(false)}
                footer={
                    <Space>
                        <Button onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="primary" onClick={() => setOpen(false)}>Submit</Button>
                    </Space>
                }
            >
                <p>Form content here...</p>
            </Drawer>
        </>
    );
};

// Demo 5: Extra Header
const ExtraDrawerDemo = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>With Extra</Button>
            <Drawer
                title="Drawer with Extra"
                open={open}
                onClose={() => setOpen(false)}
                extra={<Button type="primary">Action</Button>}
            >
                <p>Drawer with extra header content</p>
            </Drawer>
        </>
    );
};

// Demo 6: No Mask
const NoMaskDrawerDemo = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button onClick={() => setOpen(true)}>No Mask</Button>
            <Drawer title="No Mask" mask={false} open={open} onClose={() => setOpen(false)}>
                <p>Drawer without background mask</p>
            </Drawer>
        </>
    );
};

export const drawerData: AntdComponentData = {
    id: "antd-drawer",
    name: "Drawer",
    description: "Drawer is a panel that slides in from the edge of the screen. Supports different placements, sizes, and footer actions.",
    whenToUse: "Use Drawer for forms, filters, or details that need to overlay the main content temporarily.",
    docUrl: "https://ant.design/components/drawer",
    demos: [
        {
            id: "basic",
            title: "Basic Drawer",
            description: "Simple slide-in panel",
            demo: <BasicDrawerDemo />,
            code: `<Drawer title="Basic" open={open} onClose={close}>
  <p>Content</p>
</Drawer>`,
        },
        {
            id: "placement",
            title: "Placements",
            description: "Four directions",
            demo: <PlacementDrawerDemo />,
            code: `<Drawer placement="top" />
<Drawer placement="right" />
<Drawer placement="bottom" />
<Drawer placement="left" />`,
        },
        {
            id: "size",
            title: "Custom Size",
            description: "Large drawer",
            demo: <SizeDrawerDemo />,
            code: `<Drawer size="large" />`,
        },
        {
            id: "footer",
            title: "With Footer",
            description: "Action buttons",
            demo: <FooterDrawerDemo />,
            code: `<Drawer
  footer={<Space><Button>Cancel</Button><Button type="primary">OK</Button></Space>}
/>`,
        },
        {
            id: "extra",
            title: "Extra Header",
            description: "Header actions",
            demo: <ExtraDrawerDemo />,
            code: `<Drawer extra={<Button>Action</Button>} />`,
        },
        {
            id: "nomask",
            title: "No Mask",
            description: "Without backdrop",
            demo: <NoMaskDrawerDemo />,
            code: `<Drawer mask={false} />`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode", description: "Drawer title" },
        { name: "open", type: "boolean", description: "Visibility" },
        { name: "placement", type: "'top' | 'right' | 'bottom' | 'left'", description: "Position", default: "right" },
        { name: "size", type: "'default' | 'large'", description: "Drawer size", default: "default" },
        { name: "width", type: "number | string", description: "Width (left/right)", default: "378" },
        { name: "height", type: "number | string", description: "Height (top/bottom)", default: "378" },
        { name: "mask", type: "boolean", description: "Show mask", default: "true" },
        { name: "closable", type: "boolean", description: "Show close button", default: "true" },
        { name: "footer", type: "ReactNode", description: "Footer content" },
        { name: "extra", type: "ReactNode", description: "Extra header content" },
        { name: "onClose", type: "(e) => void", description: "Close callback" },
    ],
};
