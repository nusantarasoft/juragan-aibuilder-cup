"use client";

import React, { useState } from "react";
import { StepsForm, ProFormText, ProFormSelect, ProFormTextArea, ProFormDigit } from "@ant-design/pro-components";
import { message, Result } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic Steps Form
const BasicStepsFormDemo = () => (
    <StepsForm
        onFinish={async () => {
            message.success("Form submitted!");
            return true;
        }}
    >
        <StepsForm.StepForm name="step1" title="Step 1">
            <ProFormText name="name" label="Name" placeholder="Enter name" rules={[{ required: true }]} />
        </StepsForm.StepForm>
        <StepsForm.StepForm name="step2" title="Step 2">
            <ProFormText name="email" label="Email" placeholder="Enter email" />
        </StepsForm.StepForm>
        <StepsForm.StepForm name="step3" title="Step 3">
            <ProFormTextArea name="notes" label="Notes" placeholder="Any additional notes" />
        </StepsForm.StepForm>
    </StepsForm>
);

// Demo 2: Vertical Steps
const VerticalStepsFormDemo = () => (
    <StepsForm
        stepsProps={{ direction: "vertical" }}
        onFinish={async () => {
            message.success("Completed!");
            return true;
        }}
    >
        <StepsForm.StepForm name="info" title="Basic Info">
            <ProFormText name="username" label="Username" />
        </StepsForm.StepForm>
        <StepsForm.StepForm name="details" title="Details">
            <ProFormText name="phone" label="Phone" />
        </StepsForm.StepForm>
    </StepsForm>
);

// Demo 3: With Icons
const IconStepsFormDemo = () => (
    <StepsForm
        stepsProps={{
            items: [
                { title: "Account", icon: "👤" },
                { title: "Settings", icon: "⚙️" },
                { title: "Complete", icon: "✅" },
            ],
        }}
        onFinish={async () => {
            message.success("Done!");
            return true;
        }}
    >
        <StepsForm.StepForm name="account" title="Account">
            <ProFormText name="user" label="Username" />
        </StepsForm.StepForm>
        <StepsForm.StepForm name="settings" title="Settings">
            <ProFormSelect name="theme" label="Theme" options={[{ label: "Light", value: "light" }, { label: "Dark", value: "dark" }]} />
        </StepsForm.StepForm>
        <StepsForm.StepForm name="complete" title="Complete">
            <Result status="success" title="Setup Complete!" />
        </StepsForm.StepForm>
    </StepsForm>
);

// Demo 4: With Validation
const ValidationStepsFormDemo = () => (
    <StepsForm
        onFinish={async () => {
            message.success("Validated and submitted!");
            return true;
        }}
    >
        <StepsForm.StepForm name="required" title="Required Fields">
            <ProFormText name="reqField" label="Required Field" rules={[{ required: true, message: "This field is required" }]} />
            <ProFormDigit name="age" label="Age" min={1} max={120} rules={[{ required: true }]} />
        </StepsForm.StepForm>
        <StepsForm.StepForm name="optional" title="Optional Fields">
            <ProFormText name="nickname" label="Nickname" />
        </StepsForm.StepForm>
    </StepsForm>
);

export const stepsFormData: AntdComponentData = {
    id: "pro-steps-form",
    name: "StepsForm",
    description: "StepsForm is a multi-step form wizard that guides users through a process with step indicators and validation per step.",
    whenToUse: "Use StepsForm for complex forms that benefit from being broken into logical steps, such as registration, checkout, or setup wizards.",
    docUrl: "https://procomponents.ant.design/en-US/components/steps-form",
    demos: [
        {
            id: "basic",
            title: "Basic Steps Form",
            description: "Simple multi-step form",
            demo: <BasicStepsFormDemo />,
            code: `<StepsForm onFinish={async () => { message.success("Done!"); return true; }}>
  <StepsForm.StepForm name="step1" title="Step 1">
    <ProFormText name="name" label="Name" />
  </StepsForm.StepForm>
  <StepsForm.StepForm name="step2" title="Step 2">
    <ProFormText name="email" label="Email" />
  </StepsForm.StepForm>
</StepsForm>`,
        },
        {
            id: "vertical",
            title: "Vertical Steps",
            description: "Steps displayed vertically",
            demo: <VerticalStepsFormDemo />,
            code: `<StepsForm stepsProps={{ direction: "vertical" }}>
  <StepsForm.StepForm name="info" title="Info">...</StepsForm.StepForm>
  <StepsForm.StepForm name="details" title="Details">...</StepsForm.StepForm>
</StepsForm>`,
        },
        {
            id: "icons",
            title: "With Icons",
            description: "Steps with custom icons",
            demo: <IconStepsFormDemo />,
            code: `<StepsForm
  stepsProps={{
    items: [
      { title: "Account", icon: "👤" },
      { title: "Settings", icon: "⚙️" },
    ]
  }}
>
  ...
</StepsForm>`,
        },
        {
            id: "validation",
            title: "With Validation",
            description: "Form with validation rules",
            demo: <ValidationStepsFormDemo />,
            code: `<StepsForm.StepForm name="required" title="Required">
  <ProFormText
    name="field"
    label="Required Field"
    rules={[{ required: true, message: "Required!" }]}
  />
</StepsForm.StepForm>`,
        },
    ],
    apiProps: [
        { name: "onFinish", type: "(values) => Promise<boolean>", description: "Submit callback" },
        { name: "stepsProps", type: "StepsProps", description: "Ant Design Steps props" },
        { name: "current", type: "number", description: "Controlled current step" },
        { name: "onCurrentChange", type: "(current: number) => void", description: "Step change callback" },
        { name: "formMapRef", type: "MutableRefObject<Map>", description: "Form instances map ref" },
    ],
};
