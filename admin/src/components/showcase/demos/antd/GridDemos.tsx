"use client";

import React from "react";
import { Row, Col, Divider } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const colStyle: React.CSSProperties = {
    background: "#0092ff",
    padding: "8px 0",
    textAlign: "center",
    color: "white",
    borderRadius: 4,
};

const colStyleAlt: React.CSSProperties = {
    ...colStyle,
    background: "#003eb3",
};

// Demo 1: Basic Grid
const BasicGridDemo = () => (
    <div>
        <Row>
            <Col span={24}><div style={colStyle}>col-24</div></Col>
        </Row>
        <Row style={{ marginTop: 8 }}>
            <Col span={12}><div style={colStyle}>col-12</div></Col>
            <Col span={12}><div style={colStyleAlt}>col-12</div></Col>
        </Row>
        <Row style={{ marginTop: 8 }}>
            <Col span={8}><div style={colStyle}>col-8</div></Col>
            <Col span={8}><div style={colStyleAlt}>col-8</div></Col>
            <Col span={8}><div style={colStyle}>col-8</div></Col>
        </Row>
    </div>
);

// Demo 2: Gutter
const GutterGridDemo = () => (
    <div>
        <Row gutter={16}>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
            <Col span={6}><div style={colStyle}>col-6</div></Col>
        </Row>
    </div>
);

// Demo 3: Offset
const OffsetGridDemo = () => (
    <div>
        <Row>
            <Col span={8}><div style={colStyle}>col-8</div></Col>
            <Col span={8} offset={8}><div style={colStyle}>col-8 offset-8</div></Col>
        </Row>
        <Row style={{ marginTop: 8 }}>
            <Col span={6} offset={6}><div style={colStyle}>col-6 offset-6</div></Col>
            <Col span={6} offset={6}><div style={colStyle}>col-6 offset-6</div></Col>
        </Row>
    </div>
);

// Demo 4: Push and Pull
const PushPullGridDemo = () => (
    <Row>
        <Col span={18} push={6}><div style={colStyle}>col-18 push-6</div></Col>
        <Col span={6} pull={18}><div style={colStyleAlt}>col-6 pull-18</div></Col>
    </Row>
);

// Demo 5: Justify
const JustifyGridDemo = () => (
    <div>
        <Row justify="start" style={{ background: "#f0f0f0", padding: 8 }}>
            <Col span={4}><div style={colStyle}>col-4</div></Col>
            <Col span={4}><div style={colStyle}>col-4</div></Col>
        </Row>
        <Row justify="center" style={{ background: "#f0f0f0", padding: 8, marginTop: 8 }}>
            <Col span={4}><div style={colStyle}>col-4</div></Col>
            <Col span={4}><div style={colStyle}>col-4</div></Col>
        </Row>
        <Row justify="end" style={{ background: "#f0f0f0", padding: 8, marginTop: 8 }}>
            <Col span={4}><div style={colStyle}>col-4</div></Col>
            <Col span={4}><div style={colStyle}>col-4</div></Col>
        </Row>
        <Row justify="space-between" style={{ background: "#f0f0f0", padding: 8, marginTop: 8 }}>
            <Col span={4}><div style={colStyle}>col-4</div></Col>
            <Col span={4}><div style={colStyle}>col-4</div></Col>
        </Row>
    </div>
);

// Demo 6: Responsive
const ResponsiveGridDemo = () => (
    <Row>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <div style={colStyle}>Responsive</div>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <div style={colStyleAlt}>Responsive</div>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <div style={colStyle}>Responsive</div>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
            <div style={colStyleAlt}>Responsive</div>
        </Col>
    </Row>
);

export const gridData: AntdComponentData = {
    id: "antd-grid",
    name: "Grid",
    description: "Grid uses the 24-column system with Row and Col components for responsive layouts with gutter, offset, and alignment options.",
    whenToUse: "Use Grid for complex page layouts. The 24-column system allows flexible responsive designs with rows and columns.",
    docUrl: "https://ant.design/components/grid",
    demos: [
        {
            id: "basic",
            title: "Basic Grid",
            description: "24-column system",
            demo: <BasicGridDemo />,
            code: `<Row>
  <Col span={12}>col-12</Col>
  <Col span={12}>col-12</Col>
</Row>`,
        },
        {
            id: "gutter",
            title: "Grid Gutter",
            description: "Spacing between columns",
            demo: <GutterGridDemo />,
            code: `<Row gutter={16}>
  <Col span={6}>col-6</Col>
  <Col span={6}>col-6</Col>
</Row>
<Row gutter={[16, 16]}>...</Row>`,
        },
        {
            id: "offset",
            title: "Column Offset",
            description: "Offset columns",
            demo: <OffsetGridDemo />,
            code: `<Col span={8}>col-8</Col>
<Col span={8} offset={8}>col-8 offset-8</Col>`,
        },
        {
            id: "push-pull",
            title: "Push and Pull",
            description: "Reorder columns",
            demo: <PushPullGridDemo />,
            code: `<Col span={18} push={6}>pushed</Col>
<Col span={6} pull={18}>pulled</Col>`,
        },
        {
            id: "justify",
            title: "Justify",
            description: "Horizontal alignment",
            demo: <JustifyGridDemo />,
            code: `<Row justify="start">...</Row>
<Row justify="center">...</Row>
<Row justify="end">...</Row>
<Row justify="space-between">...</Row>`,
        },
        {
            id: "responsive",
            title: "Responsive",
            description: "Breakpoint-based layout",
            demo: <ResponsiveGridDemo />,
            code: `<Col xs={24} sm={12} md={8} lg={6} xl={4}>
  Responsive column
</Col>`,
        },
    ],
    apiProps: [
        { name: "Row.gutter", type: "number | [number, number]", description: "Spacing between columns" },
        { name: "Row.justify", type: "'start' | 'center' | 'end' | 'space-between' | 'space-around'", description: "Horizontal alignment" },
        { name: "Row.align", type: "'top' | 'middle' | 'bottom'", description: "Vertical alignment" },
        { name: "Col.span", type: "number (1-24)", description: "Column width" },
        { name: "Col.offset", type: "number", description: "Column offset" },
        { name: "Col.push/pull", type: "number", description: "Column order" },
        { name: "Col.xs/sm/md/lg/xl", type: "number | object", description: "Responsive width" },
    ],
};
