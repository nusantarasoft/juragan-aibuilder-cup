"use client";

import React from "react";
import { List, Avatar, Typography, Button, Skeleton } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text, Title } = Typography;

const data = [
    { title: "Item 1", description: "Ant Design, a design language" },
    { title: "Item 2", description: "We supply a series of design principles" },
    { title: "Item 3", description: "Practical and comprehensive guidelines" },
    { title: "Item 4", description: "Help designers and developers create great experiences" },
];

// Demo 1: Basic List
const BasicListDemo = () => (
    <List
        bordered
        dataSource={data}
        renderItem={(item) => <List.Item>{item.title}</List.Item>}
    />
);

// Demo 2: With Avatar
const AvatarListDemo = () => (
    <List
        itemLayout="horizontal"
        dataSource={data.slice(0, 3)}
        renderItem={(item, index) => (
            <List.Item>
                <List.Item.Meta
                    avatar={<Avatar src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${index}`} />}
                    title={<a href="#">{item.title}</a>}
                    description={item.description}
                />
            </List.Item>
        )}
    />
);

// Demo 3: Sizes
const SizesListDemo = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <List size="small" bordered dataSource={["Small 1", "Small 2"]} renderItem={(item) => <List.Item>{item}</List.Item>} />
        <List size="large" bordered dataSource={["Large 1", "Large 2"]} renderItem={(item) => <List.Item>{item}</List.Item>} />
    </div>
);

// Demo 4: With Actions
const ActionsListDemo = () => (
    <List
        dataSource={data.slice(0, 2)}
        renderItem={(item) => (
            <List.Item
                actions={[<a key="edit">edit</a>, <a key="more">more</a>]}
            >
                <List.Item.Meta
                    avatar={<Avatar>U</Avatar>}
                    title={item.title}
                    description={item.description}
                />
            </List.Item>
        )}
    />
);

// Demo 5: Vertical Layout
const VerticalListDemo = () => (
    <List
        itemLayout="vertical"
        dataSource={data.slice(0, 2)}
        renderItem={(item) => (
            <List.Item
                actions={[<span key="star">⭐ 156</span>, <span key="like">👍 156</span>]}
                extra={<div style={{ width: 100, height: 60, background: "#f0f0f0", borderRadius: 4 }} />}
            >
                <List.Item.Meta
                    avatar={<Avatar>U</Avatar>}
                    title={item.title}
                    description={item.description}
                />
                Additional content here...
            </List.Item>
        )}
    />
);

// Demo 6: Grid Layout
const GridListDemo = () => (
    <List
        grid={{ gutter: 16, column: 4 }}
        dataSource={data}
        renderItem={(item) => (
            <List.Item>
                <div style={{ background: "#f0f0f0", padding: 24, borderRadius: 8, textAlign: "center" }}>
                    {item.title}
                </div>
            </List.Item>
        )}
    />
);

// Demo 7: With Header/Footer
const HeaderFooterListDemo = () => (
    <List
        header={<div>Header</div>}
        footer={<div>Footer</div>}
        bordered
        dataSource={["Item 1", "Item 2", "Item 3"]}
        renderItem={(item) => <List.Item>{item}</List.Item>}
    />
);

export const listData: AntdComponentData = {
    id: "antd-list",
    name: "List",
    description: "List is a basic layout component for displaying collections. Supports various layouts, avatars, actions, and grid arrangements.",
    whenToUse: "Use List for displaying arrays of data such as comments, products, articles, or any repeated content.",
    docUrl: "https://ant.design/components/list",
    demos: [
        {
            id: "basic",
            title: "Basic List",
            description: "Simple bordered list",
            demo: <BasicListDemo />,
            code: `<List
  bordered
  dataSource={data}
  renderItem={(item) => <List.Item>{item}</List.Item>}
/>`,
        },
        {
            id: "avatar",
            title: "With Avatar",
            description: "List items with avatars",
            demo: <AvatarListDemo />,
            code: `<List.Item.Meta
  avatar={<Avatar src="..." />}
  title={<a>{item.title}</a>}
  description={item.description}
/>`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Small and large",
            demo: <SizesListDemo />,
            code: `<List size="small" dataSource={data} />
<List size="large" dataSource={data} />`,
        },
        {
            id: "actions",
            title: "With Actions",
            description: "Action links",
            demo: <ActionsListDemo />,
            code: `<List.Item actions={[<a>edit</a>, <a>more</a>]}>
  ...
</List.Item>`,
        },
        {
            id: "vertical",
            title: "Vertical Layout",
            description: "Content stacked",
            demo: <VerticalListDemo />,
            code: `<List itemLayout="vertical" extra={<img />}>
  ...
</List>`,
        },
        {
            id: "grid",
            title: "Grid Layout",
            description: "Grid arrangement",
            demo: <GridListDemo />,
            code: `<List
  grid={{ gutter: 16, column: 4 }}
  dataSource={data}
/>`,
        },
        {
            id: "header",
            title: "Header & Footer",
            description: "With header/footer",
            demo: <HeaderFooterListDemo />,
            code: `<List header={<div>Header</div>} footer={<div>Footer</div>}>
  ...
</List>`,
        },
    ],
    apiProps: [
        { name: "dataSource", type: "any[]", description: "Data array" },
        { name: "renderItem", type: "(item, index) => ReactNode", description: "Item renderer" },
        { name: "itemLayout", type: "'horizontal' | 'vertical'", description: "Item layout", default: "horizontal" },
        { name: "size", type: "'default' | 'large' | 'small'", description: "List size" },
        { name: "bordered", type: "boolean", description: "Show border" },
        { name: "grid", type: "{ column, gutter, xs, sm, md, lg, xl }", description: "Grid config" },
        { name: "header", type: "ReactNode", description: "List header" },
        { name: "footer", type: "ReactNode", description: "List footer" },
        { name: "loading", type: "boolean", description: "Loading state" },
        { name: "pagination", type: "false | PaginationConfig", description: "Pagination config" },
    ],
};
