"use client";

import React, { useState } from "react";
import { Modal, Button, Space, Input, Form, message, Result } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Modal
const BasicModalDemo = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>Open Modal</Button>
            <Modal
                title="Basic Modal"
                open={open}
                onOk={() => setOpen(false)}
                onCancel={() => setOpen(false)}
            >
                <p>Some contents...</p>
                <p>Some contents...</p>
            </Modal>
        </>
    );
};

// Demo 2: Confirm Dialog
const ConfirmModalDemo = () => {
    const showConfirm = () => {
        Modal.confirm({
            title: "Do you want to delete this item?",
            content: "This action cannot be undone.",
            onOk() {
                message.success("Deleted!");
            },
        });
    };

    return <Button onClick={showConfirm}>Confirm Dialog</Button>;
};

// Demo 3: Info/Success/Warning/Error
const InfoModalsDemo = () => (
    <Space wrap>
        <Button onClick={() => Modal.info({ title: "Info", content: "This is an info message." })}>Info</Button>
        <Button onClick={() => Modal.success({ title: "Success", content: "Operation successful!" })}>Success</Button>
        <Button onClick={() => Modal.warning({ title: "Warning", content: "Please be careful!" })}>Warning</Button>
        <Button onClick={() => Modal.error({ title: "Error", content: "Something went wrong!" })}>Error</Button>
    </Space>
);

// Demo 4: Custom Footer
const CustomFooterModalDemo = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Custom Footer</Button>
            <Modal
                title="Custom Footer"
                open={open}
                onCancel={() => setOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setOpen(false)}>Cancel</Button>,
                    <Button key="draft">Save Draft</Button>,
                    <Button key="submit" type="primary" onClick={() => { setOpen(false); message.success("Saved!"); }}>Submit</Button>,
                ]}
            >
                <p>Modal with custom footer buttons</p>
            </Modal>
        </>
    );
};

// Demo 5: Modal with Form
const FormModalDemo = () => {
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>Form Modal</Button>
            <Modal
                title="Create Item"
                open={open}
                onOk={() => {
                    form.validateFields().then(values => {
                        message.success("Created: " + values.name);
                        setOpen(false);
                        form.resetFields();
                    });
                }}
                onCancel={() => setOpen(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

// Demo 6: Loading Modal
const LoadingModalDemo = () => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Loading Modal</Button>
            <Modal
                title="Submitting..."
                open={open}
                confirmLoading={loading}
                onOk={() => {
                    setLoading(true);
                    setTimeout(() => {
                        setLoading(false);
                        setOpen(false);
                    }, 2000);
                }}
                onCancel={() => setOpen(false)}
            >
                <p>Click OK to simulate loading</p>
            </Modal>
        </>
    );
};

// Demo 7: Centered Modal
const CenteredModalDemo = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Centered Modal</Button>
            <Modal
                title="Centered"
                open={open}
                centered
                onOk={() => setOpen(false)}
                onCancel={() => setOpen(false)}
            >
                <p>This modal is vertically centered</p>
            </Modal>
        </>
    );
};

export const modalData: AntdComponentData = {
    id: "antd-modal",
    name: "Modal",
    description: "Modal displays content in a floating layer that blocks interaction with the background. Used for dialogs, confirmations, and forms.",
    whenToUse: "Use Modal for important information that requires user attention or action. Includes confirm dialogs, info popups, and form modals.",
    docUrl: "https://ant.design/components/modal",
    demos: [
        {
            id: "basic",
            title: "Basic Modal",
            description: "Simple dialog with OK/Cancel",
            demo: <BasicModalDemo />,
            code: `<Modal
  title="Title"
  open={open}
  onOk={() => setOpen(false)}
  onCancel={() => setOpen(false)}
>
  Content here
</Modal>`,
        },
        {
            id: "confirm",
            title: "Confirm Dialog",
            description: "Confirmation before action",
            demo: <ConfirmModalDemo />,
            code: `Modal.confirm({
  title: "Delete this item?",
  content: "Cannot be undone",
  onOk() { deleteItem(); },
});`,
        },
        {
            id: "info",
            title: "Info/Success/Warning/Error",
            description: "Static method dialogs",
            demo: <InfoModalsDemo />,
            code: `Modal.info({ title: "Info", content: "..." });
Modal.success({ title: "Success", content: "..." });
Modal.warning({ title: "Warning", content: "..." });
Modal.error({ title: "Error", content: "..." });`,
        },
        {
            id: "footer",
            title: "Custom Footer",
            description: "Custom footer buttons",
            demo: <CustomFooterModalDemo />,
            code: `<Modal
  footer={[
    <Button key="cancel">Cancel</Button>,
    <Button key="submit" type="primary">Submit</Button>
  ]}
>
  Content
</Modal>`,
        },
        {
            id: "form",
            title: "Modal with Form",
            description: "Form inside modal",
            demo: <FormModalDemo />,
            code: `<Modal
  title="Create"
  onOk={() => form.validateFields().then(submit)}
>
  <Form form={form}>
    <Form.Item name="name"><Input /></Form.Item>
  </Form>
</Modal>`,
        },
        {
            id: "loading",
            title: "Loading State",
            description: "Modal with loading OK button",
            demo: <LoadingModalDemo />,
            code: `<Modal confirmLoading={loading} onOk={handleSubmit}>
  Content
</Modal>`,
        },
        {
            id: "centered",
            title: "Centered Modal",
            description: "Vertically centered",
            demo: <CenteredModalDemo />,
            code: `<Modal centered title="Centered">Content</Modal>`,
        },
    ],
    apiProps: [
        { name: "open", type: "boolean", description: "Whether modal is visible" },
        { name: "title", type: "ReactNode", description: "Modal title" },
        { name: "onOk", type: "() => void", description: "OK button callback" },
        { name: "onCancel", type: "() => void", description: "Cancel/close callback" },
        { name: "footer", type: "ReactNode", description: "Custom footer" },
        { name: "confirmLoading", type: "boolean", description: "OK button loading" },
        { name: "centered", type: "boolean", description: "Center vertically" },
        { name: "width", type: "number | string", description: "Modal width" },
        { name: "closable", type: "boolean", description: "Show close button" },
        { name: "maskClosable", type: "boolean", description: "Close on mask click" },
    ],
};
