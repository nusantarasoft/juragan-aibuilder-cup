"use client";

import React from "react";
import { Empty, Button, Typography, ConfigProvider } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Empty
const BasicEmptyDemo = () => (
    <Empty />
);

// Demo 2: Simple Image
const SimpleEmptyDemo = () => (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
);

// Demo 3: With Description
const DescriptionEmptyDemo = () => (
    <Empty description="No Data Available" />
);

// Demo 4: Custom Description
const CustomDescriptionEmptyDemo = () => (
    <Empty
        description={
            <Typography.Text>
                Customize <a href="#">Description</a>
            </Typography.Text>
        }
    />
);

// Demo 5: No Description
const NoDescriptionEmptyDemo = () => (
    <Empty description={false} />
);

// Demo 6: With Action
const ActionEmptyDemo = () => (
    <Empty description="No items yet">
        <Button type="primary">Create Now</Button>
    </Empty>
);

// Demo 7: Custom Image
const CustomImageEmptyDemo = () => (
    <Empty
        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
        imageStyle={{ height: 60 }}
        description="Custom Empty State"
    >
        <Button type="primary">Create Something</Button>
    </Empty>
);

// Demo 8: Small Size
const SmallEmptyDemo = () => (
    <div style={{ padding: 20, background: "#fafafa", borderRadius: 8 }}>
        <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No results"
            style={{ margin: 0 }}
        />
    </div>
);

export const emptyData: AntdComponentData = {
    id: "antd-empty",
    name: "Empty",
    description: "Empty state placeholder for when data is unavailable. Provides visual feedback with customizable images, descriptions, and actions.",
    whenToUse: "Use Empty for empty tables, search results with no matches, or any state where content is unavailable.",
    docUrl: "https://ant.design/components/empty",
    demos: [
        {
            id: "basic",
            title: "Basic Empty",
            description: "Default empty state",
            demo: <BasicEmptyDemo />,
            code: `<Empty />`,
        },
        {
            id: "simple",
            title: "Simple Image",
            description: "Minimal illustration",
            demo: <SimpleEmptyDemo />,
            code: `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />`,
        },
        {
            id: "description",
            title: "With Description",
            description: "Custom text",
            demo: <DescriptionEmptyDemo />,
            code: `<Empty description="No Data Available" />`,
        },
        {
            id: "custom-desc",
            title: "Custom Description",
            description: "Rich text description",
            demo: <CustomDescriptionEmptyDemo />,
            code: `<Empty description={<Text>Custom <a>link</a></Text>} />`,
        },
        {
            id: "no-desc",
            title: "No Description",
            description: "Image only",
            demo: <NoDescriptionEmptyDemo />,
            code: `<Empty description={false} />`,
        },
        {
            id: "action",
            title: "With Action",
            description: "Include call-to-action",
            demo: <ActionEmptyDemo />,
            code: `<Empty description="No items">
  <Button type="primary">Create Now</Button>
</Empty>`,
        },
        {
            id: "custom",
            title: "Custom Image",
            description: "Custom illustration",
            demo: <CustomImageEmptyDemo />,
            code: `<Empty
  image="url/to/custom-image.svg"
  imageStyle={{ height: 60 }}
  description="Custom message"
/>`,
        },
        {
            id: "small",
            title: "Small Size",
            description: "Compact empty state",
            demo: <SmallEmptyDemo />,
            code: `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />`,
        },
    ],
    apiProps: [
        { name: "description", type: "ReactNode | false", description: "Description text", default: "No Data" },
        { name: "image", type: "ReactNode | string", description: "Custom image" },
        { name: "imageStyle", type: "CSSProperties", description: "Image styles" },
        { name: "children", type: "ReactNode", description: "Action buttons" },
        { name: "PRESENTED_IMAGE_DEFAULT", type: "ReactNode", description: "Default illustration (static)" },
        { name: "PRESENTED_IMAGE_SIMPLE", type: "ReactNode", description: "Simple illustration (static)" },
    ],
};
