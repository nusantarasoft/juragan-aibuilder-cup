"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Select, Typography, Tag, Space } from "antd";
import { BankOutlined, UserOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const { Text } = Typography;

interface CrmAccount {
    id: string;
    name: string;
    type?: string;
    industry?: string;
    phone?: string;
    email?: string;
    status?: string;
}

interface CrmContact {
    id: string;
    individualFirstName?: string;
    individualLastName?: string;
    email?: string;
    phone?: string;
    accountId?: string;
    accountName?: string;
    title?: string;
    department?: string;
    status?: string;
}

interface CrmAccountPickerProps {
    value?: string;
    onChange?: (value: string | undefined) => void;
    onAccountSelect?: (account: CrmAccount | null) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    allowClear?: boolean;
    size?: "small" | "middle" | "large";
}

interface CrmContactPickerProps {
    value?: string;
    onChange?: (value: string | undefined) => void;
    onContactSelect?: (contact: CrmContact | null) => void;
    accountId?: string;
    placeholder?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    allowClear?: boolean;
    size?: "small" | "middle" | "large";
}

const TYPE_COLORS: Record<string, string> = {
    customer: "green",
    partner: "purple",
    vendor: "orange",
    prospect: "blue",
};

export function CrmAccountPicker({
    value,
    onChange,
    onAccountSelect,
    placeholder = "Search CRM accounts...",
    style,
    disabled = false,
    allowClear = true,
    size = "middle",
}: CrmAccountPickerProps) {
    const [accounts, setAccounts] = useState<CrmAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        loadAccounts();
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const data = await gql(
                `query($tenantId: String!) {
                    accounts(tenantId: $tenantId) {
                        id name type industry phone email status
                    }
                }`,
                { tenantId: DEFAULT_TENANT_ID }
            );
            if (mountedRef.current) setAccounts(data.accounts || []);
        } catch {
            if (mountedRef.current) setAccounts([]);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const options = useMemo(
        () =>
            accounts
                .filter((a) => a.status === "active")
                .map((account) => ({
                    value: account.id,
                    label: (
                        <div className="flex items-center justify-between w-full">
                            <Space size={4}>
                                <BankOutlined style={{ color: "#1677ff" }} />
                                <Text strong className="text-sm">
                                    {account.name}
                                </Text>
                            </Space>
                            <Space size={4}>
                                {account.type && (
                                    <Tag
                                        color={TYPE_COLORS[account.type] || "default"}
                                        className="rounded-full text-xs m-0"
                                    >
                                        {account.type}
                                    </Tag>
                                )}
                                {account.industry && (
                                    <Text type="secondary" className="text-xs">
                                        {account.industry}
                                    </Text>
                                )}
                            </Space>
                        </div>
                    ),
                    searchText: `${account.name} ${account.type || ""} ${account.industry || ""}`.toLowerCase(),
                    account,
                })),
        [accounts]
    );

    const handleChange = (selectedId: string | undefined) => {
        onChange?.(selectedId);
        if (selectedId) {
            const found = accounts.find((a) => a.id === selectedId) || null;
            onAccountSelect?.(found);
        } else {
            onAccountSelect?.(null);
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
            suffixIcon={<BankOutlined style={{ color: "#13c2c2" }} />}
            filterOption={(input, option) =>
                (option as any)?.searchText?.includes(input.toLowerCase()) ?? false
            }
            options={options}
            optionLabelProp="label"
            popupMatchSelectWidth={false}
            notFoundContent={loading ? "Loading accounts..." : "No accounts found"}
        />
    );
}

export function CrmContactPicker({
    value,
    onChange,
    onContactSelect,
    accountId,
    placeholder = "Search CRM contacts...",
    style,
    disabled = false,
    allowClear = true,
    size = "middle",
}: CrmContactPickerProps) {
    const [contacts, setContacts] = useState<CrmContact[]>([]);
    const [loading, setLoading] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        loadContacts();
        return () => {
            mountedRef.current = false;
        };
    }, [accountId]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const data = await gql(
                `query($tenantId: String!, $accountId: String) {
                    contacts(tenantId: $tenantId, accountId: $accountId) {
                        id individualFirstName individualLastName email phone accountId accountName title department status
                    }
                }`,
                { tenantId: DEFAULT_TENANT_ID, accountId: accountId || null }
            );
            if (mountedRef.current) setContacts(data.contacts || []);
        } catch {
            if (mountedRef.current) setContacts([]);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const options = useMemo(
        () =>
            contacts
                .filter((c) => c.status === "active")
                .map((contact) => {
                    const fullName = [contact.individualFirstName, contact.individualLastName].filter(Boolean).join(" ");
                    return {
                        value: contact.id,
                        label: (
                            <div className="flex items-center justify-between w-full">
                                <Space size={4}>
                                    <UserOutlined style={{ color: "#722ed1" }} />
                                    <Text strong className="text-sm">
                                        {fullName}
                                    </Text>
                                    {contact.title && (
                                        <Text type="secondary" className="text-xs">
                                            — {contact.title}
                                        </Text>
                                    )}
                                </Space>
                                <Space size={4}>
                                    {contact.accountName && (
                                        <Tag color="cyan" className="rounded-full text-xs m-0">
                                            {contact.accountName}
                                        </Tag>
                                    )}
                                    {contact.email && (
                                        <Text type="secondary" className="text-xs">
                                            {contact.email}
                                        </Text>
                                    )}
                                </Space>
                            </div>
                        ),
                        searchText: `${fullName} ${contact.email || ""} ${contact.accountName || ""} ${contact.title || ""}`.toLowerCase(),
                        contact,
                    };
                }),
        [contacts]
    );

    const handleChange = (selectedId: string | undefined) => {
        onChange?.(selectedId);
        if (selectedId) {
            const found = contacts.find((c) => c.id === selectedId) || null;
            onContactSelect?.(found);
        } else {
            onContactSelect?.(null);
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
            suffixIcon={<UserOutlined style={{ color: "#722ed1" }} />}
            filterOption={(input, option) =>
                (option as any)?.searchText?.includes(input.toLowerCase()) ?? false
            }
            options={options}
            optionLabelProp="label"
            popupMatchSelectWidth={false}
            notFoundContent={loading ? "Loading contacts..." : "No contacts found"}
        />
    );
}

export type { CrmAccount, CrmContact, CrmAccountPickerProps, CrmContactPickerProps };
