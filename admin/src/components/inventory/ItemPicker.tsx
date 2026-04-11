"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Select, Typography, Tag, Space } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import { inventoryService } from "@/lib/inventoryService";

const { Text } = Typography;

interface MasterItem {
    id: string;
    name: string;
    sku: string;
    costPrice?: number;
    sellingPrice?: number;
    fulfillmentType?: string;
    uom?: string;
    status?: string;
}

interface ItemPickerProps {
    value?: string;
    onChange?: (value: string | undefined) => void;
    onItemSelect?: (item: MasterItem | null) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    allowClear?: boolean;
    size?: "small" | "middle" | "large";
}

const FULFILLMENT_COLORS: Record<string, string> = {
    physical: "blue",
    ticket: "purple",
    scheduled: "cyan",
    rental: "orange",
};

export default function ItemPicker({
    value,
    onChange,
    onItemSelect,
    placeholder = "Search items by name or SKU...",
    style,
    disabled = false,
    allowClear = true,
    size = "middle",
}: ItemPickerProps) {
    const [items, setItems] = useState<MasterItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getItems("default");
            setItems(
                data.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    sku: d.sku,
                    costPrice: d.costPrice,
                    sellingPrice: d.sellingPrice,
                    fulfillmentType: d.fulfillmentType,
                    uom: d.uom,
                    status: d.status,
                }))
            );
        } catch (err) {
            console.error("Failed to load master items:", err);
        } finally {
            setLoading(false);
        }
    };

    const options = useMemo(
        () =>
            items
                .filter((i) => i.status === "active")
                .map((item) => ({
                    value: item.id,
                    label: (
                        <div className="flex items-center justify-between w-full">
                            <Space size={4}>
                                <Text strong className="text-sm">
                                    {item.name}
                                </Text>
                                {item.sku && (
                                    <Text code className="text-xs">
                                        {item.sku}
                                    </Text>
                                )}
                            </Space>
                            <Space size={4}>
                                {item.fulfillmentType && (
                                    <Tag
                                        color={FULFILLMENT_COLORS[item.fulfillmentType] || "default"}
                                        className="rounded-full text-xs m-0"
                                    >
                                        {item.fulfillmentType}
                                    </Tag>
                                )}
                                {item.costPrice != null && (
                                    <Text type="secondary" className="text-xs">
                                        Rp {item.costPrice.toLocaleString()}
                                    </Text>
                                )}
                            </Space>
                        </div>
                    ),
                    searchText: `${item.name} ${item.sku || ""}`.toLowerCase(),
                    item,
                })),
        [items]
    );

    const handleChange = (selectedId: string | undefined) => {
        onChange?.(selectedId);
        if (selectedId) {
            const found = items.find((i) => i.id === selectedId) || null;
            onItemSelect?.(found);
        } else {
            onItemSelect?.(null);
        }
    };

    return (
        <Select
            showSearch
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            loading={loading}
            disabled={disabled}
            allowClear={allowClear}
            size={size}
            style={{ width: "100%", ...style }}
            suffixIcon={<ShoppingOutlined style={{ color: "#8b5cf6" }} />}
            filterOption={(input, option) =>
                (option as any)?.searchText?.includes(input.toLowerCase()) ?? false
            }
            options={options}
            optionLabelProp="label"
            popupMatchSelectWidth={false}
            notFoundContent={loading ? "Loading items..." : "No items found"}
        />
    );
}

export type { MasterItem, ItemPickerProps };
