"use client";

import React, { useState } from "react";
import { ModalForm, DrawerForm, ProFormText, ProFormTextArea, ProFormSelect } from "@ant-design/pro-components";
import { Button, message, Space } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic Modal Form
const BasicModalFormDemo = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>Open Modal Form</Button>
            <ModalForm
                title="Create New Item"
                open={open}
                onOpenChange={setOpen}
                onFinish={async () => {
                    message.success("Created!");
                    return true;
                }}
            >
                <ProFormText name="name" label="Name" placeholder="Enter name" rules={[{ required: true }]} />
                <ProFormTextArea name="description" label="Description" placeholder="Enter description" />
            </ModalForm>
        </>
    );
};

// Demo 2: Basic Drawer Form
const BasicDrawerFormDemo = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>Open Drawer Form</Button>
            <DrawerForm
                title="Edit Item"
                open={open}
                onOpenChange={setOpen}
                onFinish={async () => {
                    message.success("Saved!");
                    return true;
                }}
            >
                <ProFormText name="title" label="Title" placeholder="Enter title" />
                <ProFormSelect
                    name="status"
                    label="Status"
                    options={[
                        { label: "Active", value: "active" },
                        { label: "Inactive", value: "inactive" },
                    ]}
                />
            </DrawerForm>
        </>
    );
};

// Demo 3: Custom Modal Width
const CustomWidthModalDemo = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Wide Modal Form</Button>
            <ModalForm
                title="Wide Modal"
                open={open}
                onOpenChange={setOpen}
                width={800}
                onFinish={async () => {
                    message.success("Done!");
                    return true;
                }}
            >
                <ProFormText name="field1" label="Field 1" />
                <ProFormText name="field2" label="Field 2" />
                <ProFormTextArea name="content" label="Content" />
            </ModalForm>
        </>
    );
};

// Demo 4: Drawer with Placement
const DrawerPlacementDemo = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Right Drawer</Button>
            <DrawerForm
                title="Right Side Drawer"
                open={open}
                onOpenChange={setOpen}
                drawerProps={{ placement: "right", width: 400 }}
                onFinish={async () => {
                    message.success("Saved!");
                    return true;
                }}
            >
                <ProFormText name="name" label="Name" />
                <ProFormText name="email" label="Email" />
            </DrawerForm>
        </>
    );
};

// Demo 5: Trigger Button Inside
const TriggerButtonDemo = () => (
    <Space>
        <ModalForm
            title="Quick Add"
            trigger={<Button type="primary">Add Item (Modal)</Button>}
            onFinish={async () => {
                message.success("Added!");
                return true;
            }}
        >
            <ProFormText name="item" label="Item Name" />
        </ModalForm>

        <DrawerForm
            title="Quick Edit"
            trigger={<Button>Edit Item (Drawer)</Button>}
            onFinish={async () => {
                message.success("Edited!");
                return true;
            }}
        >
            <ProFormText name="item" label="Item Name" />
        </DrawerForm>
    </Space>
);

export const modalDrawerFormData: AntdComponentData = {
    id: "pro-modal-drawer-form",
    name: "ModalForm / DrawerForm",
    description: "ModalForm and DrawerForm are form components that open in a modal dialog or drawer panel, perfect for create/edit operations.",
    whenToUse: "Use ModalForm for quick forms that don't need much space. Use DrawerForm for longer forms or when you want to keep context visible.",
    docUrl: "https://procomponents.ant.design/en-US/components/modal-form",
    demos: [
        {
            id: "modal-basic",
            title: "Basic Modal Form",
            description: "Form in a modal dialog",
            demo: <BasicModalFormDemo />,
            code: `<ModalForm
  title="Create Item"
  open={open}
  onOpenChange={setOpen}
  onFinish={async () => { message.success("Done!"); return true; }}
>
  <ProFormText name="name" label="Name" />
</ModalForm>`,
        },
        {
            id: "drawer-basic",
            title: "Basic Drawer Form",
            description: "Form in a side drawer",
            demo: <BasicDrawerFormDemo />,
            code: `<DrawerForm
  title="Edit Item"
  open={open}
  onOpenChange={setOpen}
  onFinish={async () => { message.success("Saved!"); return true; }}
>
  <ProFormText name="title" label="Title" />
</DrawerForm>`,
        },
        {
            id: "modal-width",
            title: "Custom Modal Width",
            description: "Wider modal for more fields",
            demo: <CustomWidthModalDemo />,
            code: `<ModalForm title="Wide Modal" width={800}>
  ...
</ModalForm>`,
        },
        {
            id: "drawer-placement",
            title: "Drawer Placement",
            description: "Drawer from right side",
            demo: <DrawerPlacementDemo />,
            code: `<DrawerForm
  drawerProps={{ placement: "right", width: 400 }}
>
  ...
</DrawerForm>`,
        },
        {
            id: "trigger",
            title: "With Trigger Button",
            description: "Built-in trigger buttons",
            demo: <TriggerButtonDemo />,
            code: `<ModalForm
  trigger={<Button type="primary">Add</Button>}
  onFinish={async () => { ... }}
>
  <ProFormText name="item" label="Item" />
</ModalForm>`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode", description: "Modal/Drawer title" },
        { name: "trigger", type: "ReactNode", description: "Trigger element" },
        { name: "open", type: "boolean", description: "Controlled open state" },
        { name: "onOpenChange", type: "(open: boolean) => void", description: "Open state change callback" },
        { name: "onFinish", type: "(values) => Promise<boolean>", description: "Submit callback" },
        { name: "width", type: "number", description: "Modal/Drawer width" },
        { name: "modalProps", type: "ModalProps", description: "Ant Design Modal props" },
        { name: "drawerProps", type: "DrawerProps", description: "Ant Design Drawer props" },
    ],
};
