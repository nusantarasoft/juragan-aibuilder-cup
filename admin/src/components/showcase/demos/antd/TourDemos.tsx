"use client";

import React, { useRef, useState } from "react";
import { Tour, Button, Space, Typography } from "antd";
import type { TourProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Tour (visual mockup)
const BasicTourDemo = () => {
    const ref1 = useRef(null);
    const [open, setOpen] = useState(false);

    const steps: TourProps["steps"] = [
        {
            title: "Upload File",
            description: "Put your files here.",
            target: () => ref1.current,
        },
    ];

    return (
        <>
            <Button ref={ref1} onClick={() => setOpen(true)}>Start Tour</Button>
            <Tour open={open} onClose={() => setOpen(false)} steps={steps} />
        </>
    );
};

// Demo 2: Multiple Steps (visual mockup)
const MultiStepTourDemo = () => {
    const ref1 = useRef(null);
    const ref2 = useRef(null);
    const ref3 = useRef(null);
    const [open, setOpen] = useState(false);

    const steps: TourProps["steps"] = [
        { title: "Step 1", description: "First step description", target: () => ref1.current },
        { title: "Step 2", description: "Second step description", target: () => ref2.current },
        { title: "Step 3", description: "Third step description", target: () => ref3.current },
    ];

    return (
        <>
            <Space>
                <Button ref={ref1}>Button 1</Button>
                <Button ref={ref2}>Button 2</Button>
                <Button ref={ref3}>Button 3</Button>
                <Button type="primary" onClick={() => setOpen(true)}>Start Tour</Button>
            </Space>
            <Tour open={open} onClose={() => setOpen(false)} steps={steps} />
        </>
    );
};

// Demo 3: Placement Options
const PlacementTourDemo = () => (
    <Space orientation="vertical">
        <Text type="secondary">Tour supports multiple placements:</Text>
        <Text code>top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight</Text>
    </Space>
);

// Demo 4: With Cover Image
const CoverTourDemo = () => (
    <Space orientation="vertical">
        <Text type="secondary">Tour steps can include cover images:</Text>
        <Text code>{`{ cover: <img src="..." /> }`}</Text>
    </Space>
);

// Demo 5: Mask Options
const MaskTourDemo = () => (
    <Space orientation="vertical">
        <Text type="secondary">Tour mask can be customized:</Text>
        <Text code>{`mask={{ style: { boxShadow: 'inset 0 0 15px #333' } }}`}</Text>
    </Space>
);

export const tourData: AntdComponentData = {
    id: "antd-tour",
    name: "Tour",
    description: "Tour provides a guided walkthrough of features with step-by-step highlights. Used for onboarding and feature discovery.",
    whenToUse: "Use Tour for user onboarding, new feature introductions, or guided tutorials.",
    docUrl: "https://ant.design/components/tour",
    demos: [
        {
            id: "basic",
            title: "Basic Tour",
            description: "Simple single-step tour",
            demo: <BasicTourDemo />,
            code: `<Tour
  open={open}
  onClose={() => setOpen(false)}
  steps={[
    { title: "Upload", description: "Put files here", target: ref }
  ]}
/>`,
        },
        {
            id: "multi",
            title: "Multiple Steps",
            description: "Sequential tour steps",
            demo: <MultiStepTourDemo />,
            code: `steps={[
  { title: "Step 1", target: ref1 },
  { title: "Step 2", target: ref2 },
  { title: "Step 3", target: ref3 },
]}`,
        },
        {
            id: "placement",
            title: "Placement Options",
            description: "Position configurations",
            demo: <PlacementTourDemo />,
            code: `{ title: "Step", placement: "bottom", target: ref }`,
        },
        {
            id: "cover",
            title: "Cover Image",
            description: "Steps with images",
            demo: <CoverTourDemo />,
            code: `{ title: "Feature", cover: <img src="feature.png" /> }`,
        },
        {
            id: "mask",
            title: "Mask Options",
            description: "Custom mask styling",
            demo: <MaskTourDemo />,
            code: `<Tour mask={{ style: { ... } }} />`,
        },
    ],
    apiProps: [
        { name: "steps", type: "TourStepProps[]", description: "Tour steps array" },
        { name: "open", type: "boolean", description: "Controlled visibility" },
        { name: "current", type: "number", description: "Current step index" },
        { name: "mask", type: "boolean | { style, color }", description: "Mask options", default: "true" },
        { name: "arrow", type: "boolean | { pointAtCenter }", description: "Arrow options" },
        { name: "placement", type: "Placement", description: "Default placement" },
        { name: "onClose", type: "() => void", description: "Close callback" },
        { name: "onChange", type: "(current) => void", description: "Step change callback" },
        { name: "step.target", type: "() => HTMLElement", description: "Target element" },
        { name: "step.cover", type: "ReactNode", description: "Cover image" },
    ],
};
