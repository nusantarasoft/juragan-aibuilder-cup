"use client";

import React, { useState } from "react";
import { ProForm, ProFormText, ProFormSelect, ProFormDatePicker, ProFormTextArea, ProFormDigit, ProFormSwitch, ProFormCheckbox, ProFormRadio, StepsForm, ModalForm, DrawerForm, ProFormList, ProFormGroup } from "@ant-design/pro-components";
import { Button, Space, message } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic Form
const BasicFormDemo = () => (
    <ProForm
        onFinish={async (values) => {
            message.success("Form submitted!");
            console.log(values);
        }}
        submitter={{
            searchConfig: { submitText: "Submit", resetText: "Reset" },
        }}
    >
        <ProFormText name="name" label="Name" placeholder="Enter name" rules={[{ required: true }]} />
        <ProFormText.Password name="password" label="Password" placeholder="Enter password" />
        <ProFormSelect
            name="role"
            label="Role"
            options={[
                { label: "Admin", value: "admin" },
                { label: "User", value: "user" },
                { label: "Guest", value: "guest" },
            ]}
        />
    </ProForm>
);

// Demo 2: Login Form
const LoginFormDemo = () => (
    <ProForm
        onFinish={async (values) => {
            message.success("Login successful!");
        }}
        submitter={{
            searchConfig: { submitText: "Login" },
            resetButtonProps: { style: { display: "none" } },
        }}
    >
        <ProFormText
            name="username"
            label="Username"
            placeholder="admin"
            rules={[{ required: true, message: "Please enter username" }]}
        />
        <ProFormText.Password
            name="password"
            label="Password"
            placeholder="password"
            rules={[{ required: true, message: "Please enter password" }]}
        />
        <ProFormCheckbox name="remember">Remember me</ProFormCheckbox>
    </ProForm>
);

// Demo 3: Query Filter Form
const QueryFilterDemo = () => (
    <ProForm
        layout="horizontal"
        onFinish={async (values) => {
            message.success("Search submitted!");
        }}
        submitter={{
            searchConfig: { submitText: "Search", resetText: "Clear" },
        }}
    >
        <ProForm.Group>
            <ProFormText name="keyword" label="Keyword" />
            <ProFormSelect
                name="status"
                label="Status"
                options={[
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                ]}
            />
            <ProFormDatePicker name="date" label="Date" />
        </ProForm.Group>
    </ProForm>
);

// Demo 4: Steps Form
const StepsFormDemo = () => (
    <StepsForm
        onFinish={async (values) => {
            message.success("All steps completed!");
        }}
    >
        <StepsForm.StepForm name="step1" title="Step 1: Basic Info">
            <ProFormText name="name" label="Name" rules={[{ required: true }]} />
            <ProFormText name="email" label="Email" rules={[{ required: true, type: "email" }]} />
        </StepsForm.StepForm>
        <StepsForm.StepForm name="step2" title="Step 2: Details">
            <ProFormTextArea name="description" label="Description" />
            <ProFormSelect
                name="category"
                label="Category"
                options={[
                    { label: "Technology", value: "tech" },
                    { label: "Business", value: "business" },
                ]}
            />
        </StepsForm.StepForm>
        <StepsForm.StepForm name="step3" title="Step 3: Confirm">
            <ProFormCheckbox name="agree" rules={[{ required: true }]}>
                I agree to the terms
            </ProFormCheckbox>
        </StepsForm.StepForm>
    </StepsForm>
);

// Demo 5: Modal Form
const ModalFormDemo = () => (
    <ModalForm
        title="Create New Item"
        trigger={<Button type="primary">Open Modal Form</Button>}
        onFinish={async (values) => {
            message.success("Created successfully!");
            return true;
        }}
    >
        <ProFormText name="title" label="Title" rules={[{ required: true }]} />
        <ProFormTextArea name="content" label="Content" />
    </ModalForm>
);

// Demo 6: Drawer Form
const DrawerFormDemo = () => (
    <DrawerForm
        title="Edit Settings"
        trigger={<Button>Open Drawer Form</Button>}
        onFinish={async (values) => {
            message.success("Settings saved!");
            return true;
        }}
    >
        <ProFormText name="siteName" label="Site Name" />
        <ProFormSwitch name="notifications" label="Enable Notifications" />
        <ProFormDigit name="maxItems" label="Max Items" min={1} max={100} />
    </DrawerForm>
);

// Demo 7: Form with Validation
const ValidationFormDemo = () => (
    <ProForm
        onFinish={async (values) => {
            message.success("Validation passed!");
        }}
    >
        <ProFormText
            name="email"
            label="Email"
            rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Invalid email format" },
            ]}
        />
        <ProFormText
            name="phone"
            label="Phone"
            rules={[
                { required: true },
                { pattern: /^\d{10,}$/, message: "Must be at least 10 digits" },
            ]}
        />
        <ProFormDigit name="age" label="Age" min={1} max={120} rules={[{ required: true }]} />
    </ProForm>
);

// Demo 8: Dynamic Form List
const FormListDemo = () => (
    <ProForm onFinish={async (values) => message.success("Submitted!")}>
        <ProFormText name="projectName" label="Project Name" />
        <ProFormList
            name="items"
            label="Items"
            creatorButtonProps={{ creatorButtonText: "Add Item" }}
            initialValue={[{ name: "Item 1" }]}
        >
            <ProFormGroup>
                <ProFormText name="name" label="Name" />
                <ProFormDigit name="quantity" label="Quantity" />
            </ProFormGroup>
        </ProFormList>
    </ProForm>
);

export const proFormData: AntdComponentData = {
    id: "pro-form",
    name: "ProForm",
    description: "ProForm is a form component with built-in data binding, validation, and various form layouts. It simplifies form development with smart defaults.",
    whenToUse: "Use ProForm when building data entry forms with validation, multi-step wizards, modal/drawer forms, or dynamic form lists. It's ideal for admin panels and data management.",
    docUrl: "https://procomponents.ant.design/en-US/components/form",
    demos: [
        {
            id: "basic",
            title: "Basic Form",
            description: "Simple form with text, password, and select fields",
            demo: <BasicFormDemo />,
            code: `<ProForm onFinish={async (values) => console.log(values)}>
  <ProFormText name="name" label="Name" rules={[{ required: true }]} />
  <ProFormText.Password name="password" label="Password" />
  <ProFormSelect name="role" label="Role" options={[{ label: "Admin", value: "admin" }]} />
</ProForm>`,
        },
        {
            id: "login",
            title: "Login Form",
            description: "Login form with remember me checkbox",
            demo: <LoginFormDemo />,
            code: `<ProForm submitter={{ searchConfig: { submitText: "Login" } }}>
  <ProFormText name="username" label="Username" rules={[{ required: true }]} />
  <ProFormText.Password name="password" label="Password" />
  <ProFormCheckbox name="remember">Remember me</ProFormCheckbox>
</ProForm>`,
        },
        {
            id: "query",
            title: "Query Filter",
            description: "Horizontal form for search filters",
            demo: <QueryFilterDemo />,
            code: `<ProForm layout="horizontal">
  <ProForm.Group>
    <ProFormText name="keyword" label="Keyword" />
    <ProFormSelect name="status" label="Status" options={[...]} />
    <ProFormDatePicker name="date" label="Date" />
  </ProForm.Group>
</ProForm>`,
        },
        {
            id: "steps",
            title: "Steps Form",
            description: "Multi-step wizard form",
            demo: <StepsFormDemo />,
            code: `<StepsForm onFinish={async (values) => console.log(values)}>
  <StepsForm.StepForm name="step1" title="Step 1">
    <ProFormText name="name" label="Name" />
  </StepsForm.StepForm>
  <StepsForm.StepForm name="step2" title="Step 2">
    <ProFormTextArea name="description" label="Description" />
  </StepsForm.StepForm>
</StepsForm>`,
        },
        {
            id: "modal",
            title: "Modal Form",
            description: "Form inside a modal dialog",
            demo: <ModalFormDemo />,
            code: `<ModalForm
  title="Create New Item"
  trigger={<Button type="primary">Open Modal</Button>}
  onFinish={async (values) => { return true; }}
>
  <ProFormText name="title" label="Title" />
</ModalForm>`,
        },
        {
            id: "drawer",
            title: "Drawer Form",
            description: "Form inside a drawer",
            demo: <DrawerFormDemo />,
            code: `<DrawerForm
  title="Edit Settings"
  trigger={<Button>Open Drawer</Button>}
  onFinish={async (values) => { return true; }}
>
  <ProFormText name="siteName" label="Site Name" />
  <ProFormSwitch name="notifications" label="Enable Notifications" />
</DrawerForm>`,
        },
        {
            id: "validation",
            title: "Form Validation",
            description: "Form with various validation rules",
            demo: <ValidationFormDemo />,
            code: `<ProForm>
  <ProFormText name="email" label="Email" rules={[
    { required: true },
    { type: "email", message: "Invalid email" }
  ]} />
  <ProFormDigit name="age" label="Age" min={1} max={120} />
</ProForm>`,
        },
        {
            id: "list",
            title: "Dynamic Form List",
            description: "Form with dynamic add/remove items",
            demo: <FormListDemo />,
            code: `<ProFormList name="items" creatorButtonProps={{ creatorButtonText: "Add" }}>
  <ProFormGroup>
    <ProFormText name="name" label="Name" />
    <ProFormDigit name="quantity" label="Quantity" />
  </ProFormGroup>
</ProFormList>`,
        },
    ],
    apiProps: [
        { name: "onFinish", type: "(values) => Promise<boolean>", description: "Submit callback", required: true },
        { name: "initialValues", type: "object", description: "Initial form values" },
        { name: "layout", type: "'horizontal' | 'vertical' | 'inline'", description: "Form layout", default: "vertical" },
        { name: "submitter", type: "SubmitterConfig | false", description: "Submit button configuration" },
        { name: "formRef", type: "React.Ref<FormInstance>", description: "Form instance ref" },
        { name: "request", type: "(params) => Promise<object>", description: "Function to fetch initial values" },
        { name: "params", type: "object", description: "Additional params for request" },
        { name: "syncToUrl", type: "boolean", description: "Sync form values to URL" },
    ],
};
