"use client";

import React from "react";
import { ProForm, ProFormText, ProFormSelect, ProFormDigit, ProFormDatePicker, ProFormTimePicker, ProFormTextArea, ProFormSwitch, ProFormCheckbox, ProFormRadio, ProFormSlider, ProFormRate, ProFormMoney, ProFormCaptcha, ProFormColorPicker, ProFormDateRangePicker } from "@ant-design/pro-components";
import { message } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Text Fields
const TextFieldsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")} submitter={false}>
        <ProFormText name="username" label="Username" placeholder="Enter username" />
        <ProFormText.Password name="password" label="Password" placeholder="Enter password" />
        <ProFormTextArea name="bio" label="Bio" placeholder="Tell us about yourself" />
    </ProForm>
);

// Demo 2: Number Fields
const NumberFieldsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")} submitter={false}>
        <ProFormDigit name="age" label="Age" min={1} max={120} />
        <ProFormMoney name="price" label="Price" locale="en-US" />
        <ProFormSlider name="rating" label="Rating" min={0} max={100} />
        <ProFormRate name="stars" label="Stars" />
    </ProForm>
);

// Demo 3: Selection Fields
const SelectionFieldsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")} submitter={false}>
        <ProFormSelect
            name="country"
            label="Country"
            options={[
                { label: "USA", value: "us" },
                { label: "UK", value: "uk" },
                { label: "Japan", value: "jp" },
            ]}
        />
        <ProFormRadio.Group
            name="gender"
            label="Gender"
            options={[
                { label: "Male", value: "male" },
                { label: "Female", value: "female" },
            ]}
        />
        <ProFormCheckbox.Group
            name="interests"
            label="Interests"
            options={["Sports", "Music", "Reading"]}
        />
    </ProForm>
);

// Demo 4: Date/Time Fields
const DateTimeFieldsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")} submitter={false}>
        <ProFormDatePicker name="birthday" label="Birthday" />
        <ProFormTimePicker name="meetingTime" label="Meeting Time" />
        <ProFormDateRangePicker name="vacation" label="Vacation Period" />
    </ProForm>
);

// Demo 5: Toggle Fields
const ToggleFieldsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")} submitter={false}>
        <ProFormSwitch name="notifications" label="Enable Notifications" />
        <ProFormCheckbox name="terms" label="I agree to the terms and conditions" />
    </ProForm>
);

// Demo 6: Upload Fields - Using simple display to avoid type issues
const UploadFieldsDemo = () => (
    <div className="p-4">
        <div className="mb-4">
            <span className="block text-sm font-medium mb-2">Avatar</span>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
                Click to upload file (max 1)
            </div>
        </div>
        <div>
            <span className="block text-sm font-medium mb-2">Attachments</span>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                Drag files here to upload (max 5)
            </div>
        </div>
    </div>
);

// Demo 7: Special Fields
const SpecialFieldsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")} submitter={false}>
        <ProFormCaptcha
            name="captcha"
            label="Verification Code"
            phoneName="phone"
            onGetCaptcha={async () => { message.success("Code sent!"); }}
        />
    </ProForm>
);

// Demo 8: Field Validation
const ValidationFieldsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")}>
        <ProFormText
            name="email"
            label="Email"
            rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Invalid email format" },
            ]}
        />
        <ProFormDigit
            name="quantity"
            label="Quantity"
            rules={[{ required: true }]}
            min={1}
            max={100}
        />
    </ProForm>
);

export const proFormFieldsData: AntdComponentData = {
    id: "pro-form-fields",
    name: "ProForm Fields",
    description: "ProForm provides a rich set of form field components including text, number, date, select, upload, and more - all with built-in validation support.",
    whenToUse: "Use ProForm field components when building forms. They integrate seamlessly with ProForm for automatic data binding and validation.",
    docUrl: "https://procomponents.ant.design/en-US/components/form",
    demos: [
        {
            id: "text",
            title: "Text Fields",
            description: "Text, Password, and TextArea inputs",
            demo: <TextFieldsDemo />,
            code: `<ProFormText name="username" label="Username" />
<ProFormText.Password name="password" label="Password" />
<ProFormTextArea name="bio" label="Bio" />`,
        },
        {
            id: "number",
            title: "Number Fields",
            description: "Digit, Money, Slider, and Rate inputs",
            demo: <NumberFieldsDemo />,
            code: `<ProFormDigit name="age" label="Age" min={1} max={120} />
<ProFormMoney name="price" label="Price" />
<ProFormSlider name="rating" label="Rating" />
<ProFormRate name="stars" label="Stars" />`,
        },
        {
            id: "selection",
            title: "Selection Fields",
            description: "Select, Radio, and Checkbox inputs",
            demo: <SelectionFieldsDemo />,
            code: `<ProFormSelect name="country" label="Country" options={[...]} />
<ProFormRadio.Group name="gender" label="Gender" options={[...]} />
<ProFormCheckbox.Group name="interests" label="Interests" options={[...]} />`,
        },
        {
            id: "datetime",
            title: "Date/Time Fields",
            description: "Date picker, Time picker, Date range",
            demo: <DateTimeFieldsDemo />,
            code: `<ProFormDatePicker name="birthday" label="Birthday" />
<ProFormTimePicker name="meetingTime" label="Meeting Time" />
<ProFormDateRangePicker name="vacation" label="Vacation" />`,
        },
        {
            id: "toggle",
            title: "Toggle Fields",
            description: "Switch and Checkbox toggles",
            demo: <ToggleFieldsDemo />,
            code: `<ProFormSwitch name="notifications" label="Enable Notifications" />
<ProFormCheckbox name="terms" label="I agree to terms" />`,
        },
        {
            id: "upload",
            title: "Upload Fields",
            description: "Button and Dragger upload",
            demo: <UploadFieldsDemo />,
            code: `<ProFormUploadButton name="avatar" label="Avatar" max={1} />
<ProFormUploadDragger name="files" label="Attachments" max={5} />`,
        },
        {
            id: "special",
            title: "Special Fields",
            description: "Captcha and other special inputs",
            demo: <SpecialFieldsDemo />,
            code: `<ProFormCaptcha
  name="captcha"
  label="Verification Code"
  onGetCaptcha={async () => sendCode()}
/>`,
        },
        {
            id: "validation",
            title: "Field Validation",
            description: "Fields with validation rules",
            demo: <ValidationFieldsDemo />,
            code: `<ProFormText
  name="email"
  label="Email"
  rules={[{ required: true }, { type: "email" }]}
/>`,
        },
    ],
    apiProps: [
        { name: "name", type: "string", description: "Field name for form data", required: true },
        { name: "label", type: "ReactNode", description: "Field label" },
        { name: "placeholder", type: "string", description: "Placeholder text" },
        { name: "rules", type: "Rule[]", description: "Validation rules array" },
        { name: "disabled", type: "boolean", description: "Disable the field" },
        { name: "readonly", type: "boolean", description: "Read-only mode" },
        { name: "initialValue", type: "any", description: "Initial field value" },
        { name: "tooltip", type: "string", description: "Tooltip text" },
    ],
};
