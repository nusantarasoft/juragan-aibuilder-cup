"use client";

import React from "react";
import { Splitter, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

const panelStyle: React.CSSProperties = {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f0f0",
};

// Demo 1: Basic Splitter
const BasicSplitterDemo = () => (
    <Splitter style={{ height: 150, border: "1px solid #d9d9d9" }}>
        <Splitter.Panel defaultSize="40%">
            <div style={panelStyle}>Panel 1</div>
        </Splitter.Panel>
        <Splitter.Panel>
            <div style={panelStyle}>Panel 2</div>
        </Splitter.Panel>
    </Splitter>
);

// Demo 2: Vertical Splitter
const VerticalSplitterDemo = () => (
    <Splitter layout="vertical" style={{ height: 200, border: "1px solid #d9d9d9" }}>
        <Splitter.Panel defaultSize="30%">
            <div style={panelStyle}>Top Panel</div>
        </Splitter.Panel>
        <Splitter.Panel>
            <div style={panelStyle}>Bottom Panel</div>
        </Splitter.Panel>
    </Splitter>
);

// Demo 3: Multiple Panels
const MultipleSplitterDemo = () => (
    <Splitter style={{ height: 150, border: "1px solid #d9d9d9" }}>
        <Splitter.Panel defaultSize="25%">
            <div style={panelStyle}>Panel 1</div>
        </Splitter.Panel>
        <Splitter.Panel defaultSize="50%">
            <div style={panelStyle}>Panel 2</div>
        </Splitter.Panel>
        <Splitter.Panel>
            <div style={panelStyle}>Panel 3</div>
        </Splitter.Panel>
    </Splitter>
);

// Demo 4: Min/Max Size
const MinMaxSplitterDemo = () => (
    <Splitter style={{ height: 150, border: "1px solid #d9d9d9" }}>
        <Splitter.Panel min="20%" max="70%">
            <div style={panelStyle}>Min 20% / Max 70%</div>
        </Splitter.Panel>
        <Splitter.Panel>
            <div style={panelStyle}>Flexible</div>
        </Splitter.Panel>
    </Splitter>
);

// Demo 5: Collapsible
const CollapsibleSplitterDemo = () => (
    <Splitter style={{ height: 150, border: "1px solid #d9d9d9" }}>
        <Splitter.Panel collapsible defaultSize="40%">
            <div style={panelStyle}>Collapsible Panel</div>
        </Splitter.Panel>
        <Splitter.Panel>
            <div style={panelStyle}>Main Content</div>
        </Splitter.Panel>
    </Splitter>
);

// Demo 6: Nested Splitter
const NestedSplitterDemo = () => (
    <Splitter style={{ height: 200, border: "1px solid #d9d9d9" }}>
        <Splitter.Panel defaultSize="30%">
            <div style={panelStyle}>Left</div>
        </Splitter.Panel>
        <Splitter.Panel>
            <Splitter layout="vertical">
                <Splitter.Panel>
                    <div style={panelStyle}>Top Right</div>
                </Splitter.Panel>
                <Splitter.Panel>
                    <div style={panelStyle}>Bottom Right</div>
                </Splitter.Panel>
            </Splitter>
        </Splitter.Panel>
    </Splitter>
);

export const splitterData: AntdComponentData = {
    id: "antd-splitter",
    name: "Splitter",
    description: "Splitter divides the layout into resizable panels that users can drag to adjust sizes. Supports horizontal and vertical layouts.",
    whenToUse: "Use Splitter when you need resizable panels like IDE layouts, side-by-side editors, or adjustable content areas.",
    docUrl: "https://ant.design/components/splitter",
    demos: [
        {
            id: "basic",
            title: "Basic Splitter",
            description: "Two horizontal panels",
            demo: <BasicSplitterDemo />,
            code: `<Splitter>
  <Splitter.Panel defaultSize="40%">Panel 1</Splitter.Panel>
  <Splitter.Panel>Panel 2</Splitter.Panel>
</Splitter>`,
        },
        {
            id: "vertical",
            title: "Vertical Splitter",
            description: "Top and bottom panels",
            demo: <VerticalSplitterDemo />,
            code: `<Splitter layout="vertical">
  <Splitter.Panel>Top</Splitter.Panel>
  <Splitter.Panel>Bottom</Splitter.Panel>
</Splitter>`,
        },
        {
            id: "multiple",
            title: "Multiple Panels",
            description: "Three or more panels",
            demo: <MultipleSplitterDemo />,
            code: `<Splitter>
  <Splitter.Panel>Panel 1</Splitter.Panel>
  <Splitter.Panel>Panel 2</Splitter.Panel>
  <Splitter.Panel>Panel 3</Splitter.Panel>
</Splitter>`,
        },
        {
            id: "minmax",
            title: "Min/Max Size",
            description: "Size constraints",
            demo: <MinMaxSplitterDemo />,
            code: `<Splitter.Panel min="20%" max="70%">
  Constrained Panel
</Splitter.Panel>`,
        },
        {
            id: "collapsible",
            title: "Collapsible Panel",
            description: "Panel can be collapsed",
            demo: <CollapsibleSplitterDemo />,
            code: `<Splitter.Panel collapsible>
  Collapsible
</Splitter.Panel>`,
        },
        {
            id: "nested",
            title: "Nested Splitter",
            description: "Splitters inside splitters",
            demo: <NestedSplitterDemo />,
            code: `<Splitter>
  <Splitter.Panel>Left</Splitter.Panel>
  <Splitter.Panel>
    <Splitter layout="vertical">
      <Splitter.Panel>Top</Splitter.Panel>
      <Splitter.Panel>Bottom</Splitter.Panel>
    </Splitter>
  </Splitter.Panel>
</Splitter>`,
        },
    ],
    apiProps: [
        { name: "layout", type: "'horizontal' | 'vertical'", description: "Split direction", default: "horizontal" },
        { name: "Panel.defaultSize", type: "string | number", description: "Initial panel size" },
        { name: "Panel.size", type: "string | number", description: "Controlled size" },
        { name: "Panel.min", type: "string | number", description: "Minimum size" },
        { name: "Panel.max", type: "string | number", description: "Maximum size" },
        { name: "Panel.collapsible", type: "boolean", description: "Enable collapse" },
        { name: "onResize", type: "(sizes) => void", description: "Resize callback" },
    ],
};
