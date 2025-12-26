"use client";

import React from "react";
import { Result, Button, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Success Result
const SuccessResultDemo = () => (
    <Result
        status="success"
        title="Successfully Purchased!"
        subTitle="Order number: 2017182818828182881"
        extra={[
            <Button type="primary" key="console">Go Console</Button>,
            <Button key="buy">Buy Again</Button>,
        ]}
    />
);

// Demo 2: Info Result
const InfoResultDemo = () => (
    <Result
        title="Your operation has been executed"
        extra={<Button type="primary">Go Home</Button>}
    />
);

// Demo 3: Warning Result
const WarningResultDemo = () => (
    <Result
        status="warning"
        title="There are some problems with your operation."
        extra={<Button type="primary">Go Console</Button>}
    />
);

// Demo 4: 403 Error
const Error403Demo = () => (
    <Result
        status="403"
        title="403"
        subTitle="Sorry, you are not authorized to access this page."
        extra={<Button type="primary">Back Home</Button>}
    />
);

// Demo 5: 404 Error
const Error404Demo = () => (
    <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={<Button type="primary">Back Home</Button>}
    />
);

// Demo 6: 500 Error
const Error500Demo = () => (
    <Result
        status="500"
        title="500"
        subTitle="Sorry, something went wrong."
        extra={<Button type="primary">Back Home</Button>}
    />
);

// Demo 7: Error Result
const ErrorResultDemo = () => (
    <Result
        status="error"
        title="Submission Failed"
        subTitle="Please check and modify the following information before resubmitting."
        extra={[
            <Button type="primary" key="console">Go Console</Button>,
            <Button key="buy">Try Again</Button>,
        ]}
    />
);

export const resultData: AntdComponentData = {
    id: "antd-result",
    name: "Result",
    description: "Result displays the result of an operation with an icon, title, and optional actions. Commonly used for completion or error pages.",
    whenToUse: "Use Result for success pages, error states, empty states, or any operation outcome feedback.",
    docUrl: "https://ant.design/components/result",
    demos: [
        {
            id: "success",
            title: "Success",
            description: "Operation succeeded",
            demo: <SuccessResultDemo />,
            code: `<Result
  status="success"
  title="Successfully Purchased!"
  extra={<Button>Go Console</Button>}
/>`,
        },
        {
            id: "info",
            title: "Info",
            description: "Neutral outcome",
            demo: <InfoResultDemo />,
            code: `<Result
  title="Your operation has been executed"
/>`,
        },
        {
            id: "warning",
            title: "Warning",
            description: "Potential issues",
            demo: <WarningResultDemo />,
            code: `<Result status="warning" title="Some problems" />`,
        },
        {
            id: "403",
            title: "403 Error",
            description: "Not authorized",
            demo: <Error403Demo />,
            code: `<Result status="403" title="403" />`,
        },
        {
            id: "404",
            title: "404 Error",
            description: "Page not found",
            demo: <Error404Demo />,
            code: `<Result status="404" title="404" />`,
        },
        {
            id: "500",
            title: "500 Error",
            description: "Server error",
            demo: <Error500Demo />,
            code: `<Result status="500" title="500" />`,
        },
        {
            id: "error",
            title: "Error",
            description: "Operation failed",
            demo: <ErrorResultDemo />,
            code: `<Result
  status="error"
  title="Submission Failed"
/>`,
        },
    ],
    apiProps: [
        { name: "status", type: "'success' | 'error' | 'info' | 'warning' | '404' | '403' | '500'", description: "Result type" },
        { name: "title", type: "ReactNode", description: "Result title" },
        { name: "subTitle", type: "ReactNode", description: "Sub title" },
        { name: "icon", type: "ReactNode", description: "Custom icon" },
        { name: "extra", type: "ReactNode", description: "Action buttons" },
    ],
};
