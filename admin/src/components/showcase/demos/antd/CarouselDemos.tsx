"use client";

import React from "react";
import { Carousel, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

const contentStyle: React.CSSProperties = {
    height: 120,
    color: "#fff",
    lineHeight: "120px",
    textAlign: "center",
    background: "#364d79",
    margin: 0,
};

// Demo 1: Basic Carousel
const BasicCarouselDemo = () => (
    <Carousel style={{ width: 300 }}>
        <div><h3 style={contentStyle}>Slide 1</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#4a6fa5" }}>Slide 2</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#5c7fb3" }}>Slide 3</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#6e8fc1" }}>Slide 4</h3></div>
    </Carousel>
);

// Demo 2: Autoplay
const AutoplayCarouselDemo = () => (
    <Carousel autoplay style={{ width: 300 }}>
        <div><h3 style={contentStyle}>Auto 1</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#4a6fa5" }}>Auto 2</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#5c7fb3" }}>Auto 3</h3></div>
    </Carousel>
);

// Demo 3: Fade Effect
const FadeCarouselDemo = () => (
    <Carousel effect="fade" style={{ width: 300 }}>
        <div><h3 style={contentStyle}>Fade 1</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#4a6fa5" }}>Fade 2</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#5c7fb3" }}>Fade 3</h3></div>
    </Carousel>
);

// Demo 4: Vertical
const VerticalCarouselDemo = () => (
    <Carousel dotPosition="left" style={{ width: 300 }}>
        <div><h3 style={contentStyle}>Vertical 1</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#4a6fa5" }}>Vertical 2</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#5c7fb3" }}>Vertical 3</h3></div>
    </Carousel>
);

// Demo 5: Dot Positions
const DotPositionsDemo = () => (
    <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
            <Text type="secondary">Bottom (default)</Text>
            <Carousel style={{ marginTop: 8 }}>
                <div><h3 style={{ ...contentStyle, height: 80, lineHeight: "80px" }}>1</h3></div>
                <div><h3 style={{ ...contentStyle, height: 80, lineHeight: "80px", background: "#4a6fa5" }}>2</h3></div>
            </Carousel>
        </div>
        <div style={{ flex: 1 }}>
            <Text type="secondary">Top</Text>
            <Carousel dotPosition="top" style={{ marginTop: 8 }}>
                <div><h3 style={{ ...contentStyle, height: 80, lineHeight: "80px" }}>1</h3></div>
                <div><h3 style={{ ...contentStyle, height: 80, lineHeight: "80px", background: "#4a6fa5" }}>2</h3></div>
            </Carousel>
        </div>
    </div>
);

// Demo 6: Custom Dots
const CustomDotsCarouselDemo = () => (
    <Carousel
        style={{ width: 300 }}
        customPaging={() => <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ccc" }} />}
    >
        <div><h3 style={contentStyle}>Custom 1</h3></div>
        <div><h3 style={{ ...contentStyle, background: "#4a6fa5" }}>Custom 2</h3></div>
    </Carousel>
);

export const carouselData: AntdComponentData = {
    id: "antd-carousel",
    name: "Carousel",
    description: "Carousel is a slideshow component for cycling through content (images, cards, etc). Supports autoplay, fade effects, and various dot positions.",
    whenToUse: "Use Carousel for image galleries, hero banners, testimonial sliders, or any sequential content display.",
    docUrl: "https://ant.design/components/carousel",
    demos: [
        {
            id: "basic",
            title: "Basic Carousel",
            description: "Simple slideshow",
            demo: <BasicCarouselDemo />,
            code: `<Carousel>
  <div><h3>Slide 1</h3></div>
  <div><h3>Slide 2</h3></div>
</Carousel>`,
        },
        {
            id: "autoplay",
            title: "Autoplay",
            description: "Auto-cycling slides",
            demo: <AutoplayCarouselDemo />,
            code: `<Carousel autoplay>
  <div><h3>Auto 1</h3></div>
  <div><h3>Auto 2</h3></div>
</Carousel>`,
        },
        {
            id: "fade",
            title: "Fade Effect",
            description: "Crossfade transition",
            demo: <FadeCarouselDemo />,
            code: `<Carousel effect="fade">
  <div>Fade 1</div>
  <div>Fade 2</div>
</Carousel>`,
        },
        {
            id: "vertical",
            title: "Vertical",
            description: "Vertical sliding",
            demo: <VerticalCarouselDemo />,
            code: `<Carousel dotPosition="left">
  <div>Vertical 1</div>
  <div>Vertical 2</div>
</Carousel>`,
        },
        {
            id: "positions",
            title: "Dot Positions",
            description: "Bottom and top dots",
            demo: <DotPositionsDemo />,
            code: `<Carousel dotPosition="top">...</Carousel>
<Carousel dotPosition="bottom">...</Carousel>`,
        },
        {
            id: "custom",
            title: "Custom Dots",
            description: "Custom dot rendering",
            demo: <CustomDotsCarouselDemo />,
            code: `<Carousel
  customPaging={() => <div className="dot" />}
>...</Carousel>`,
        },
    ],
    apiProps: [
        { name: "autoplay", type: "boolean", description: "Auto-cycle slides" },
        { name: "autoplaySpeed", type: "number", description: "Autoplay interval (ms)", default: "3000" },
        { name: "effect", type: "'scrollx' | 'fade'", description: "Transition effect", default: "scrollx" },
        { name: "dotPosition", type: "'top' | 'bottom' | 'left' | 'right'", description: "Dot position", default: "bottom" },
        { name: "dots", type: "boolean | { className }", description: "Show dots", default: "true" },
        { name: "infinite", type: "boolean", description: "Infinite loop", default: "true" },
        { name: "speed", type: "number", description: "Transition speed (ms)", default: "500" },
        { name: "afterChange", type: "(current) => void", description: "After slide callback" },
        { name: "beforeChange", type: "(from, to) => void", description: "Before slide callback" },
    ],
};
