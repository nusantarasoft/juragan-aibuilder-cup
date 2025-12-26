"use client";

import React from "react";
import { Form, Input, Button, Select, Checkbox, Radio, DatePicker, InputNumber, Switch, message } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Form
const BasicFormDemo = () => (
    <Form layout="vertical" onFinish={(values) => message.success("Submitted!")} style={{ maxWidth: 400 }}>
        <Form.Item label="Username" name="username" rules={[{ required: true }]}>
            <Input placeholder="Enter username" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password placeholder="Enter password" />
        </Form.Item>
        <Form.Item>
            <Button type="primary" htmlType="submit">Submit</Button>
        </Form.Item>
    </Form>
);

// Demo 2: Horizontal Layout
const HorizontalFormDemo = () => (
    <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 14 }} style={{ maxWidth: 500 }}>
        <Form.Item label="Name" name="name">
            <Input placeholder="Name" />
        </Form.Item>
        <Form.Item label="Email" name="email">
            <Input placeholder="Email" />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6 }}>
            <Button type="primary" htmlType="submit">Submit</Button>
        </Form.Item>
    </Form>
);

// Demo 3: Inline Form
const InlineFormDemo = () => (
    <Form layout="inline" onFinish={(v) => message.success("Search!")}>
        <Form.Item name="keyword">
            <Input placeholder="Search..." />
        </Form.Item>
        <Form.Item name="category">
            <Select placeholder="Category" style={{ width: 120 }} options={[{ value: "all", label: "All" }]} />
        </Form.Item>
        <Form.Item>
            <Button type="primary" htmlType="submit">Search</Button>
        </Form.Item>
    </Form>
);

// Demo 4: Validation Rules
const ValidationFormDemo = () => (
    <Form layout="vertical" style={{ maxWidth: 400 }}>
        <Form.Item
            label="Email"
            name="email"
            rules={[
                { required: true, message: "Email required" },
                { type: "email", message: "Invalid email" },
            ]}
        >
            <Input placeholder="email@example.com" />
        </Form.Item>
        <Form.Item
            label="Age"
            name="age"
            rules={[
                { required: true },
                { type: "number", min: 18, max: 99, message: "Must be 18-99" },
            ]}
        >
            <InputNumber style={{ width: "100%" }} placeholder="Age" />
        </Form.Item>
        <Form.Item>
            <Button type="primary" htmlType="submit">Submit</Button>
        </Form.Item>
    </Form>
);

// Demo 5: Various Controls
const ControlsFormDemo = () => (
    <Form layout="vertical" style={{ maxWidth: 400 }}>
        <Form.Item label="Select" name="select">
            <Select options={[{ value: "1", label: "Option 1" }, { value: "2", label: "Option 2" }]} />
        </Form.Item>
        <Form.Item label="Date" name="date">
            <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Enable" name="enable" valuePropName="checked">
            <Switch />
        </Form.Item>
        <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Remember me</Checkbox>
        </Form.Item>
        <Form.Item label="Gender" name="gender">
            <Radio.Group>
                <Radio value="male">Male</Radio>
                <Radio value="female">Female</Radio>
            </Radio.Group>
        </Form.Item>
    </Form>
);

// Demo 6: Form with Initial Values
const InitialValuesFormDemo = () => (
    <Form
        layout="vertical"
        initialValues={{ username: "john_doe", role: "admin" }}
        style={{ maxWidth: 400 }}
    >
        <Form.Item label="Username" name="username">
            <Input />
        </Form.Item>
        <Form.Item label="Role" name="role">
            <Select options={[{ value: "admin", label: "Admin" }, { value: "user", label: "User" }]} />
        </Form.Item>
    </Form>
);

// Demo 7: Disabled Form
const DisabledFormDemo = () => (
    <Form layout="vertical" disabled style={{ maxWidth: 400 }}>
        <Form.Item label="Name" name="name">
            <Input defaultValue="John Doe" />
        </Form.Item>
        <Form.Item label="Status" name="status">
            <Select defaultValue="active" options={[{ value: "active", label: "Active" }]} />
        </Form.Item>
    </Form>
);

export const formData: AntdComponentData = {
    id: "antd-form",
    name: "Form",
    description: "Form handles data entry and validation. Supports various layouts, field types, and validation rules.",
    whenToUse: "Use Form for data collection with validation. Supports horizontal, vertical, and inline layouts with various input controls.",
    docUrl: "https://ant.design/components/form",
    demos: [
        {
            id: "basic",
            title: "Basic Form",
            description: "Vertical layout with validation",
            demo: <BasicFormDemo />,
            code: `<Form layout="vertical" onFinish={handleSubmit}>
  <Form.Item label="Username" name="username" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  <Button type="primary" htmlType="submit">Submit</Button>
</Form>`,
        },
        {
            id: "horizontal",
            title: "Horizontal Layout",
            description: "Labels beside inputs",
            demo: <HorizontalFormDemo />,
            code: `<Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 14 }}>
  <Form.Item label="Name" name="name"><Input /></Form.Item>
</Form>`,
        },
        {
            id: "inline",
            title: "Inline Layout",
            description: "All fields in one row",
            demo: <InlineFormDemo />,
            code: `<Form layout="inline">
  <Form.Item name="keyword"><Input /></Form.Item>
  <Form.Item><Button type="primary">Search</Button></Form.Item>
</Form>`,
        },
        {
            id: "validation",
            title: "Validation Rules",
            description: "Required and type validation",
            demo: <ValidationFormDemo />,
            code: `<Form.Item
  label="Email"
  name="email"
  rules={[
    { required: true, message: "Required" },
    { type: "email", message: "Invalid email" }
  ]}
>
  <Input />
</Form.Item>`,
        },
        {
            id: "controls",
            title: "Various Controls",
            description: "Different input types",
            demo: <ControlsFormDemo />,
            code: `<Form.Item label="Select" name="select"><Select options={[...]} /></Form.Item>
<Form.Item label="Date" name="date"><DatePicker /></Form.Item>
<Form.Item name="enable" valuePropName="checked"><Switch /></Form.Item>`,
        },
        {
            id: "initial",
            title: "Initial Values",
            description: "Pre-filled form data",
            demo: <InitialValuesFormDemo />,
            code: `<Form initialValues={{ username: "john", role: "admin" }}>
  <Form.Item name="username"><Input /></Form.Item>
</Form>`,
        },
        {
            id: "disabled",
            title: "Disabled Form",
            description: "All fields disabled",
            demo: <DisabledFormDemo />,
            code: `<Form disabled>
  <Form.Item name="name"><Input /></Form.Item>
</Form>`,
        },
    ],
    apiProps: [
        { name: "layout", type: "'horizontal' | 'vertical' | 'inline'", description: "Form layout", default: "horizontal" },
        { name: "onFinish", type: "(values) => void", description: "Submit success callback" },
        { name: "onFinishFailed", type: "(errorInfo) => void", description: "Submit failure callback" },
        { name: "initialValues", type: "object", description: "Initial field values" },
        { name: "disabled", type: "boolean", description: "Disable all fields" },
        { name: "labelCol", type: "{ span }", description: "Label column config" },
        { name: "wrapperCol", type: "{ span }", description: "Input column config" },
        { name: "form", type: "FormInstance", description: "Form instance" },
    ],
};
