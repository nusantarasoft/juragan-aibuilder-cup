"use client";

import React, { useState } from "react";
import { AutoComplete, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const options = [
    { value: "React" },
    { value: "Vue" },
    { value: "Angular" },
    { value: "Svelte" },
    { value: "Next.js" },
];

// Demo 1: Basic AutoComplete
const BasicAutoCompleteDemo = () => (
    <AutoComplete options={options} style={{ width: 200 }} placeholder="Type to search" />
);

// Demo 2: With Custom Filter
const FilterAutoCompleteDemo = () => (
    <AutoComplete
        options={options}
        style={{ width: 200 }}
        filterOption={(inputValue, option) =>
            option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
        }
        placeholder="Filter options"
    />
);

// Demo 3: With Search Value
const SearchAutoCompleteDemo = () => {
    const [searchOptions, setSearchOptions] = useState<{ value: string }[]>([]);

    const handleSearch = (value: string) => {
        setSearchOptions(
            value ? [{ value }, { value: value + value }, { value: value + value + value }] : []
        );
    };

    return (
        <AutoComplete
            options={searchOptions}
            style={{ width: 200 }}
            onSearch={handleSearch}
            placeholder="Type anything"
        />
    );
};

// Demo 4: Borderless
const BorderlessAutoCompleteDemo = () => (
    <AutoComplete
        options={options}
        style={{ width: 200 }}
        variant="borderless"
        placeholder="Borderless"
    />
);

// Demo 5: Disabled
const DisabledAutoCompleteDemo = () => (
    <Space>
        <AutoComplete options={options} style={{ width: 150 }} disabled placeholder="Disabled" />
        <AutoComplete options={options} style={{ width: 150 }} placeholder="Enabled" />
    </Space>
);

// Demo 6: Status
const StatusAutoCompleteDemo = () => (
    <Space orientation="vertical">
        <AutoComplete options={options} style={{ width: 200 }} status="error" placeholder="Error" />
        <AutoComplete options={options} style={{ width: 200 }} status="warning" placeholder="Warning" />
    </Space>
);

// Demo 7: Custom Dropdown
const CustomAutoCompleteDemo = () => (
    <AutoComplete
        style={{ width: 250 }}
        options={[
            {
                value: "react",
                label: (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>React</span>
                        <span style={{ color: "#999" }}>10,000 results</span>
                    </div>
                ),
            },
            {
                value: "vue",
                label: (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Vue</span>
                        <span style={{ color: "#999" }}>5,000 results</span>
                    </div>
                ),
            },
        ]}
        placeholder="Custom dropdown"
    />
);

export const autoCompleteData: AntdComponentData = {
    id: "antd-autocomplete",
    name: "AutoComplete",
    description: "AutoComplete provides suggestions as users type. It's an Input with filterable dropdown options.",
    whenToUse: "Use AutoComplete when you need an Input with dynamic suggestions, such as search boxes or tag inputs.",
    docUrl: "https://ant.design/components/auto-complete",
    demos: [
        {
            id: "basic",
            title: "Basic AutoComplete",
            description: "Simple autocomplete input",
            demo: <BasicAutoCompleteDemo />,
            code: `<AutoComplete
  options={[{ value: "React" }, { value: "Vue" }]}
  placeholder="Type to search"
/>`,
        },
        {
            id: "filter",
            title: "Custom Filter",
            description: "Custom filtering logic",
            demo: <FilterAutoCompleteDemo />,
            code: `<AutoComplete
  filterOption={(input, option) =>
    option.value.toUpperCase().includes(input.toUpperCase())
  }
  options={options}
/>`,
        },
        {
            id: "search",
            title: "Dynamic Options",
            description: "Generate options on search",
            demo: <SearchAutoCompleteDemo />,
            code: `<AutoComplete
  onSearch={(value) => setOptions([{ value }, ...])}
  options={searchOptions}
/>`,
        },
        {
            id: "borderless",
            title: "Borderless",
            description: "Without border",
            demo: <BorderlessAutoCompleteDemo />,
            code: `<AutoComplete variant="borderless" options={options} />`,
        },
        {
            id: "disabled",
            title: "Disabled State",
            description: "Non-interactive autocomplete",
            demo: <DisabledAutoCompleteDemo />,
            code: `<AutoComplete disabled options={options} />`,
        },
        {
            id: "status",
            title: "Validation Status",
            description: "Error and warning states",
            demo: <StatusAutoCompleteDemo />,
            code: `<AutoComplete status="error" options={options} />
<AutoComplete status="warning" options={options} />`,
        },
        {
            id: "custom",
            title: "Custom Dropdown",
            description: "Custom option rendering",
            demo: <CustomAutoCompleteDemo />,
            code: `{
  value: "react",
  label: <><span>React</span><span>10k results</span></>
}`,
        },
    ],
    apiProps: [
        { name: "options", type: "{ value, label }[]", description: "Options for dropdown" },
        { name: "value", type: "string", description: "Controlled value" },
        { name: "defaultValue", type: "string", description: "Initial value" },
        { name: "onSearch", type: "(value) => void", description: "Search callback" },
        { name: "onSelect", type: "(value, option) => void", description: "Select callback" },
        { name: "filterOption", type: "(input, option) => boolean", description: "Filter function" },
        { name: "disabled", type: "boolean", description: "Disable input" },
        { name: "status", type: "'error' | 'warning'", description: "Validation status" },
    ],
};
