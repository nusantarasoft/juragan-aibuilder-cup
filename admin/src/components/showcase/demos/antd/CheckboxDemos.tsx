"use client";

import React, { useState } from "react";
import { Checkbox, Space, Divider } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Group } = Checkbox;

// Demo 1: Basic Checkbox
const BasicCheckboxDemo = () => (
    <Checkbox>Checkbox</Checkbox>
);

// Demo 2: Controlled Checkbox
const ControlledCheckboxDemo = () => {
    const [checked, setChecked] = useState(true);
    return (
        <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
            {checked ? "Checked" : "Unchecked"}
        </Checkbox>
    );
};

// Demo 3: Disabled
const DisabledCheckboxDemo = () => (
    <Space>
        <Checkbox disabled>Disabled</Checkbox>
        <Checkbox disabled checked>Disabled Checked</Checkbox>
    </Space>
);

// Demo 4: Checkbox Group
const GroupCheckboxDemo = () => (
    <Group options={["Apple", "Pear", "Orange"]} defaultValue={["Apple"]} />
);

// Demo 5: Checkbox Group with Options Object
const OptionsGroupDemo = () => (
    <Group
        options={[
            { label: "Apple", value: "apple" },
            { label: "Pear", value: "pear" },
            { label: "Orange", value: "orange", disabled: true },
        ]}
        defaultValue={["apple"]}
    />
);

// Demo 6: Check All
const CheckAllDemo = () => {
    const plainOptions = ["Apple", "Pear", "Orange"];
    const [checkedList, setCheckedList] = useState<string[]>(["Apple", "Orange"]);
    const checkAll = plainOptions.length === checkedList.length;
    const indeterminate = checkedList.length > 0 && checkedList.length < plainOptions.length;

    return (
        <>
            <Checkbox
                indeterminate={indeterminate}
                onChange={(e) => setCheckedList(e.target.checked ? plainOptions : [])}
                checked={checkAll}
            >
                Check all
            </Checkbox>
            <Divider />
            <Group
                options={plainOptions}
                value={checkedList}
                onChange={(list) => setCheckedList(list as string[])}
            />
        </>
    );
};

// Demo 7: Vertical Group
const VerticalGroupDemo = () => (
    <Group style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Checkbox value="A">Option A</Checkbox>
        <Checkbox value="B">Option B</Checkbox>
        <Checkbox value="C">Option C</Checkbox>
    </Group>
);

export const checkboxData: AntdComponentData = {
    id: "antd-checkbox",
    name: "Checkbox",
    description: "Checkbox allows users to select one or more items from a set. Supports groups, indeterminate state, and disabled options.",
    whenToUse: "Use Checkbox when users need to select multiple options from a list, such as preferences or toggles.",
    docUrl: "https://ant.design/components/checkbox",
    demos: [
        {
            id: "basic",
            title: "Basic Checkbox",
            description: "Simple checkbox",
            demo: <BasicCheckboxDemo />,
            code: `<Checkbox>Checkbox</Checkbox>`,
        },
        {
            id: "controlled",
            title: "Controlled",
            description: "Controlled checkbox state",
            demo: <ControlledCheckboxDemo />,
            code: `<Checkbox
  checked={checked}
  onChange={(e) => setChecked(e.target.checked)}
>
  Label
</Checkbox>`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive checkboxes",
            demo: <DisabledCheckboxDemo />,
            code: `<Checkbox disabled>Disabled</Checkbox>
<Checkbox disabled checked>Disabled Checked</Checkbox>`,
        },
        {
            id: "group",
            title: "Checkbox Group",
            description: "Group of checkboxes",
            demo: <GroupCheckboxDemo />,
            code: `<Checkbox.Group
  options={["Apple", "Pear", "Orange"]}
  defaultValue={["Apple"]}
/>`,
        },
        {
            id: "options",
            title: "Options Object",
            description: "Object-based options",
            demo: <OptionsGroupDemo />,
            code: `<Checkbox.Group options={[
  { label: "Apple", value: "apple" },
  { label: "Orange", value: "orange", disabled: true },
]} />`,
        },
        {
            id: "checkall",
            title: "Check All",
            description: "Select/deselect all",
            demo: <CheckAllDemo />,
            code: `<Checkbox
  indeterminate={indeterminate}
  onChange={onCheckAllChange}
  checked={checkAll}
>
  Check all
</Checkbox>`,
        },
        {
            id: "vertical",
            title: "Vertical Layout",
            description: "Stacked checkboxes",
            demo: <VerticalGroupDemo />,
            code: `<Checkbox.Group style={{ flexDirection: "column" }}>
  <Checkbox value="A">Option A</Checkbox>
  <Checkbox value="B">Option B</Checkbox>
</Checkbox.Group>`,
        },
    ],
    apiProps: [
        { name: "checked", type: "boolean", description: "Checked state" },
        { name: "defaultChecked", type: "boolean", description: "Initial checked" },
        { name: "disabled", type: "boolean", description: "Disable checkbox" },
        { name: "indeterminate", type: "boolean", description: "Indeterminate state" },
        { name: "onChange", type: "(e) => void", description: "Change callback" },
        { name: "Group.options", type: "Option[]", description: "Group options" },
        { name: "Group.value", type: "string[]", description: "Selected values" },
        { name: "Group.onChange", type: "(checkedValues) => void", description: "Group change" },
    ],
};
