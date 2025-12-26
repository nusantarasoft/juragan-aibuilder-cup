"use client";

import React from "react";
import { ProForm, ProFormList, ProFormText, ProFormDigit, ProFormSelect, ProFormGroup } from "@ant-design/pro-components";
import { message, Button, Space } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic Form List
const BasicFormListDemo = () => (
    <ProForm onFinish={async (values) => { console.log(values); message.success("Submitted!"); }}>
        <ProFormList
            name="users"
            label="Users"
            initialValue={[{ name: "John" }]}
            creatorButtonProps={{ creatorButtonText: "Add User" }}
        >
            <ProFormText name="name" placeholder="Name" />
        </ProFormList>
    </ProForm>
);

// Demo 2: Multiple Fields Per Row
const MultiFieldDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")}>
        <ProFormList
            name="items"
            label="Order Items"
            creatorButtonProps={{ creatorButtonText: "Add Item" }}
        >
            <ProFormGroup>
                <ProFormText name="product" label="Product" width="md" />
                <ProFormDigit name="quantity" label="Qty" width="xs" />
                <ProFormDigit name="price" label="Price" width="sm" />
            </ProFormGroup>
        </ProFormList>
    </ProForm>
);

// Demo 3: With Copy and Delete Actions
const ActionsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")}>
        <ProFormList
            name="contacts"
            label="Contacts"
            copyIconProps={{ tooltipText: "Copy this contact" }}
            deleteIconProps={{ tooltipText: "Delete this contact" }}
            creatorButtonProps={{ creatorButtonText: "Add Contact" }}
        >
            <ProFormGroup>
                <ProFormText name="name" placeholder="Name" />
                <ProFormText name="email" placeholder="Email" />
            </ProFormGroup>
        </ProFormList>
    </ProForm>
);

// Demo 4: Nested Form List
const NestedFormListDemo = () => (
    <ProForm onFinish={async (values) => { console.log(values); message.success("Submitted!"); }}>
        <ProFormList name="departments" label="Departments">
            <ProFormText name="deptName" label="Department Name" />
            <ProFormList name="employees" label="Employees">
                <ProFormText name="empName" placeholder="Employee Name" />
            </ProFormList>
        </ProFormList>
    </ProForm>
);

// Demo 5: With Initial Values
const InitialValuesDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")}>
        <ProFormList
            name="skills"
            label="Skills"
            initialValue={[
                { skill: "React", level: "Expert" },
                { skill: "TypeScript", level: "Advanced" },
            ]}
        >
            <ProFormGroup>
                <ProFormText name="skill" placeholder="Skill" />
                <ProFormSelect
                    name="level"
                    placeholder="Level"
                    options={[
                        { label: "Beginner", value: "Beginner" },
                        { label: "Intermediate", value: "Intermediate" },
                        { label: "Advanced", value: "Advanced" },
                        { label: "Expert", value: "Expert" },
                    ]}
                />
            </ProFormGroup>
        </ProFormList>
    </ProForm>
);

// Demo 6: Max Items Limit
const MaxItemsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")}>
        <ProFormList
            name="topThree"
            label="Top 3 Favorites (max 3)"
            max={3}
            creatorButtonProps={{ creatorButtonText: "Add Favorite" }}
        >
            <ProFormText name="item" placeholder="Enter favorite" />
        </ProFormList>
    </ProForm>
);

// Demo 7: Position Control
const PositionDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")}>
        <ProFormList
            name="tasks"
            label="Tasks"
            creatorButtonProps={{
                creatorButtonText: "Add Task",
                position: "top",
            }}
        >
            <ProFormText name="task" placeholder="Task description" />
        </ProFormList>
    </ProForm>
);

// Demo 8: Custom Actions
const CustomActionsDemo = () => (
    <ProForm onFinish={async () => message.success("Submitted!")}>
        <ProFormList
            name="addresses"
            label="Addresses"
            actionRender={(field, action, defaultActionDom) => defaultActionDom}
        >
            <ProFormGroup>
                <ProFormText name="street" placeholder="Street" />
                <ProFormText name="city" placeholder="City" />
            </ProFormGroup>
        </ProFormList>
    </ProForm>
);

export const proFormListData: AntdComponentData = {
    id: "pro-form-list",
    name: "ProFormList",
    description: "ProFormList enables dynamic form fields where users can add, remove, copy, and reorder items. Ideal for repeatable form sections.",
    whenToUse: "Use ProFormList when you need to collect an array of items, such as multiple phone numbers, addresses, order items, or any repeating data structure.",
    docUrl: "https://procomponents.ant.design/en-US/components/form#proformlist",
    demos: [
        {
            id: "basic",
            title: "Basic Form List",
            description: "Simple list with add button",
            demo: <BasicFormListDemo />,
            code: `<ProFormList name="users" label="Users" creatorButtonProps={{ creatorButtonText: "Add" }}>
  <ProFormText name="name" placeholder="Name" />
</ProFormList>`,
        },
        {
            id: "multi",
            title: "Multiple Fields",
            description: "Multiple fields per row",
            demo: <MultiFieldDemo />,
            code: `<ProFormList name="items" label="Items">
  <ProFormGroup>
    <ProFormText name="product" label="Product" />
    <ProFormDigit name="quantity" label="Qty" />
  </ProFormGroup>
</ProFormList>`,
        },
        {
            id: "actions",
            title: "Copy & Delete",
            description: "With copy and delete actions",
            demo: <ActionsDemo />,
            code: `<ProFormList
  name="contacts"
  copyIconProps={{ tooltipText: "Copy" }}
  deleteIconProps={{ tooltipText: "Delete" }}
>
  ...
</ProFormList>`,
        },
        {
            id: "nested",
            title: "Nested Lists",
            description: "Form list inside form list",
            demo: <NestedFormListDemo />,
            code: `<ProFormList name="departments">
  <ProFormText name="deptName" />
  <ProFormList name="employees">
    <ProFormText name="empName" />
  </ProFormList>
</ProFormList>`,
        },
        {
            id: "initial",
            title: "Initial Values",
            description: "List with pre-filled data",
            demo: <InitialValuesDemo />,
            code: `<ProFormList
  name="skills"
  initialValue={[{ skill: "React", level: "Expert" }]}
>
  ...
</ProFormList>`,
        },
        {
            id: "max",
            title: "Max Items",
            description: "Limit the number of items",
            demo: <MaxItemsDemo />,
            code: `<ProFormList name="topThree" max={3}>
  <ProFormText name="item" />
</ProFormList>`,
        },
        {
            id: "position",
            title: "Button Position",
            description: "Add button at top",
            demo: <PositionDemo />,
            code: `<ProFormList
  creatorButtonProps={{ position: "top" }}
>
  ...
</ProFormList>`,
        },
        {
            id: "custom",
            title: "Custom Actions",
            description: "Customize action buttons",
            demo: <CustomActionsDemo />,
            code: `<ProFormList
  actionRender={(field, action, dom) => [dom.delete]}
>
  ...
</ProFormList>`,
        },
    ],
    apiProps: [
        { name: "name", type: "string", description: "Field name for form data", required: true },
        { name: "label", type: "ReactNode", description: "List label" },
        { name: "initialValue", type: "any[]", description: "Initial list items" },
        { name: "max", type: "number", description: "Maximum number of items" },
        { name: "min", type: "number", description: "Minimum number of items" },
        { name: "creatorButtonProps", type: "ButtonProps & { position, creatorButtonText }", description: "Add button config" },
        { name: "copyIconProps", type: "{ tooltipText }", description: "Copy icon config" },
        { name: "deleteIconProps", type: "{ tooltipText }", description: "Delete icon config" },
        { name: "actionRender", type: "(field, action, dom) => ReactNode[]", description: "Custom action renderer" },
    ],
};
