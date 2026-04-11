'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Space, message, Tabs, Progress, Drawer, Row, Col, Card, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, ScheduleOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, DollarOutlined, SearchOutlined, SendOutlined, LoginOutlined, CloseCircleOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { inventoryService, BookingSchedule, BookingOccurrence, Booking, BookingPassenger, BookingStatsType, InvItem } from '@/lib/inventoryService';
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
    active: 'green', suspended: 'orange', cancelled: 'red',
    scheduled: 'blue', boarding: 'cyan', departed: 'geekblue', completed: 'green',
    pending: 'gold', confirmed: 'blue', checked_in: 'green', no_show: 'red',
};

const BOOKING_FIELDS: FieldDef[] = [
    { name: 'bookingCode', label: 'Booking Code', required: true },
    { name: 'scheduleId', label: 'Schedule / Route', required: true },
    { name: 'occurrenceId', label: 'Departure' },
    { name: 'class', label: 'Class', required: true },
    { name: 'passengerCount', label: 'Passengers', type: 'number', required: true },
    { name: 'customerName', label: 'Customer Name', required: true },
    { name: 'customerEmail', label: 'Customer Email' },
    { name: 'customerPhone', label: 'Customer Phone' },
    { name: 'totalAmount', label: 'Total Amount', type: 'number' },
    { name: 'paidAmount', label: 'Paid Amount', type: 'number' },
    { name: 'notes', label: 'Notes' },
];

export default function BookingsPage() {
    const [schedules, setSchedules] = useState<BookingSchedule[]>([]);
    const [occurrences, setOccurrences] = useState<BookingOccurrence[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<BookingStatsType | null>(null);
    const [passengers, setPassengers] = useState<BookingPassenger[]>([]);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('schedules');
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<InvItem[]>([]);

    // New Booking modal
    const [bookingModalOpen, setBookingModalOpen] = useState(false);
    const [bookingForm] = Form.useForm();
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | undefined>();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, o, b, st, it] = await Promise.all([
                inventoryService.getSchedules(),
                inventoryService.getOccurrences(),
                inventoryService.getBookings(),
                inventoryService.getBookingStats(),
                inventoryService.getItems(),
            ]);
            setSchedules(s); setOccurrences(o); setBookings(b); setStats(st); setItems(it);
        } catch (e: any) { message.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const loadPassengers = async (booking: Booking) => {
        const p = await inventoryService.getPassengers(booking.id);
        setPassengers(p);
        setSelectedBooking(booking);
    };

    const handleStatusChange = async (id: string, status: string, type: 'booking' | 'occurrence') => {
        try {
            if (type === 'booking') await inventoryService.updateBookingStatus(id, status);
            else await inventoryService.updateOccurrenceStatus(id, status);
            message.success('Status updated');
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const handleCreateBooking = async (values: any) => {
        await inventoryService.createBooking('default', values);
        message.success('Booking created');
        setBookingModalOpen(false);
        bookingForm.resetFields();
        setSelectedScheduleId(undefined);
        load();
    };

    const handleBatchCreateBooking = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try { await inventoryService.createBooking('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.bookingCode || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        load();
        return { success, failed, errors };
    };

    const recalcTotal = () => {
        const cls = bookingForm.getFieldValue('class') || 'economy';
        const pax = bookingForm.getFieldValue('passengerCount') || 1;
        const sid = bookingForm.getFieldValue('scheduleId');
        const sched = schedules.find(s => s.id === sid);
        if (!sched) return;
        const price = cls === 'vip' ? (sched.priceVip || 0) : cls === 'business' ? (sched.priceBusiness || 0) : (sched.priceEconomy || 0);
        bookingForm.setFieldsValue({ totalAmount: price * pax });
    };

    const fmt = (v: number) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

    const kpis = [
        { label: 'Total Schedules', value: stats?.totalSchedules || 0, icon: <ScheduleOutlined />, color: '#7c3aed' },
        { label: 'Upcoming Departures', value: stats?.upcomingDepartures || 0, icon: <ClockCircleOutlined />, color: '#2563eb' },
        { label: 'Total Bookings', value: stats?.totalBookings || 0, icon: <TeamOutlined />, color: '#0891b2' },
        { label: 'Confirmed', value: stats?.confirmedBookings || 0, icon: <CheckCircleOutlined />, color: '#16a34a' },
        { label: 'Checked In', value: stats?.checkedInBookings || 0, icon: <LoginOutlined />, color: '#059669' },
        { label: 'Total Revenue', value: fmt(stats?.totalRevenue || 0), icon: <DollarOutlined />, color: '#dc2626' },
    ];

    const scheduleColumns = [
        { title: 'Code', dataIndex: 'scheduleCode', render: (v: string) => <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> },
        { title: 'Route / Event', dataIndex: 'routeName', ellipsis: true },
        { title: 'Origin', dataIndex: 'origin', ellipsis: true },
        { title: 'Destination', dataIndex: 'destination', ellipsis: true, render: (v: string) => v || '—' },
        { title: 'Time', render: (_: any, r: BookingSchedule) => `${r.departureTime || '—'} → ${r.arrivalTime || '—'}` },
        { title: 'Vessel', dataIndex: 'vehicleName', render: (v: string) => v || '—' },
        { title: 'Capacity', dataIndex: 'capacity', render: (v: number) => <strong>{v}</strong> },
        { title: 'Product', dataIndex: 'itemId', width: 160, ellipsis: true, render: (v: string) => {
            if (!v) return <Tag color="default">—</Tag>;
            const item = items.find(i => i.id === v);
            return <Tag color="purple" style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>🎫 {item?.name || 'Linked'}</Tag>;
        }},
        { title: 'Economy', dataIndex: 'priceEconomy', render: fmt },
        { title: 'Business', dataIndex: 'priceBusiness', render: fmt },
        { title: 'VIP', dataIndex: 'priceVip', render: (v: number) => v ? fmt(v) : '—' },
        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
    ];

    const occurrenceColumns = [
        { title: 'Route', render: (_: any, r: BookingOccurrence) => {
            const s = schedules.find(s => s.id === r.scheduleId);
            return <span style={{ fontWeight: 500 }}>{s?.routeName || '—'}</span>;
        }},
        { title: 'Date', dataIndex: 'departureDate', render: (v: string) => new Date(v).toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
        { title: 'Time', dataIndex: 'departureTime', render: (v: string) => v || '—' },
        { title: 'Capacity', render: (_: any, r: BookingOccurrence) => {
            const isFull = (r.bookedCount || 0) >= (r.totalCapacity || 1);
            return (
                <Space direction="vertical" size={0} style={{ width: 120 }}>
                    <span>{r.bookedCount || 0}/{r.totalCapacity || 0} booked</span>
                    {isFull
                        ? <Tag color="red" style={{ fontWeight: 700, margin: '4px 0' }}>🚫 SOLD OUT</Tag>
                        : <Progress percent={Math.round(((r.bookedCount || 0) / (r.totalCapacity || 1)) * 100)} size="small"
                            strokeColor={(r.bookedCount || 0) / (r.totalCapacity || 1) > 0.8 ? '#f5222d' : '#1890ff'} />
                    }
                </Space>
            );
        }},
        { title: 'Check‑ins', render: (_: any, r: BookingOccurrence) => `${r.checkedInCount || 0}/${r.bookedCount || 0}` },
        { title: 'Status', dataIndex: 'status', render: (v: string, r: BookingOccurrence) => {
            const isFull = (r.bookedCount || 0) >= (r.totalCapacity || 1);
            return (
                <Space>
                    <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>
                    {isFull && v === 'scheduled' && <Tag color="volcano">FULL</Tag>}
                </Space>
            );
        }},
        { title: 'Actions', render: (_: any, r: BookingOccurrence) => {
            const next: Record<string, string[]> = { scheduled: ['boarding'], boarding: ['departed'], departed: ['completed'], completed: [] };
            return (
                <Space>
                    {(next[r.status || ''] || []).map(s => (
                        <Button key={s} size="small" type="primary" onClick={() => handleStatusChange(r.id, s, 'occurrence')}>
                            {s === 'boarding' ? 'Board' : s === 'departed' ? 'Depart' : 'Complete'}
                        </Button>
                    ))}
                </Space>
            );
        }},
    ];

    const bookingColumns = [
        { title: 'Code', dataIndex: 'bookingCode', render: (v: string) => <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> },
        { title: 'Customer', dataIndex: 'customerName' },
        { title: 'Route', render: (_: any, r: Booking) => {
            const s = schedules.find(s => s.id === r.scheduleId);
            return s?.routeName || '—';
        }},
        { title: 'Date', render: (_: any, r: Booking) => {
            const o = occurrences.find(o => o.id === r.occurrenceId);
            return o ? new Date(o.departureDate).toLocaleDateString('id-ID') : '—';
        }},
        { title: 'Pax', dataIndex: 'passengerCount', render: (v: number) => <strong>{v}</strong> },
        { title: 'Class', dataIndex: 'class', render: (v: string) => <Tag color={v === 'vip' ? 'gold' : v === 'business' ? 'blue' : 'default'}>{v?.toUpperCase()}</Tag> },
        { title: 'Amount', dataIndex: 'totalAmount', render: fmt },
        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v?.replace('_', ' ')}</Tag> },
        { title: 'Actions', render: (_: any, r: Booking) => {
            const next: Record<string, string[]> = { pending: ['confirmed', 'cancelled'], confirmed: ['checked_in', 'cancelled'], checked_in: ['completed', 'no_show'], completed: [], cancelled: [], no_show: [] };
            return (
                <Space>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => loadPassengers(r)}>Passengers</Button>
                    {(next[r.status || ''] || []).map(s => (
                        <Button key={s} size="small" type={s === 'cancelled' || s === 'no_show' ? 'default' : 'primary'} danger={s === 'cancelled' || s === 'no_show'}
                            onClick={() => handleStatusChange(r.id, s, 'booking')}>
                            {s === 'confirmed' ? 'Confirm' : s === 'checked_in' ? 'Check In' : s === 'completed' ? 'Complete' : s === 'cancelled' ? 'Cancel' : 'No Show'}
                        </Button>
                    ))}
                </Space>
            );
        }},
    ];

    const filteredSchedules = schedules.filter(s => !search || s.routeName.toLowerCase().includes(search.toLowerCase()) || s.scheduleCode.toLowerCase().includes(search.toLowerCase()));
    const filteredBookings = bookings.filter(b => !search || (b.customerName || '').toLowerCase().includes(search.toLowerCase()) || b.bookingCode.toLowerCase().includes(search.toLowerCase()));

    const filteredOccurrences = selectedScheduleId
        ? occurrences.filter(o => o.scheduleId === selectedScheduleId && o.status !== 'completed')
        : [];

    const bookingSteps = [
        {
            title: "Route & Schedule",
            icon: <ScheduleOutlined />,
            fields: ["bookingCode", "scheduleId", "occurrenceId", "class", "passengerCount"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={10}>
                            <Form.Item name="bookingCode" label="Booking Code" rules={[{ required: true }]}>
                                <Input placeholder="BKG-2026-XXX" />
                            </Form.Item>
                        </Col>
                        <Col span={14}>
                            <Form.Item name="scheduleId" label="Schedule / Route" rules={[{ required: true, message: 'Select a schedule' }]}>
                                <Select placeholder="Select route" showSearch
                                    filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                                    onChange={(v) => { setSelectedScheduleId(v); bookingForm.setFieldsValue({ occurrenceId: undefined }); recalcTotal(); }}
                                    options={schedules.filter(s => s.status === 'active').map(s => ({
                                        value: s.id, label: `${s.scheduleCode} — ${s.routeName} (${s.origin} → ${s.destination || '—'})`
                                    }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={14}>
                            <Form.Item name="occurrenceId" label="Departure">
                                <Select placeholder={selectedScheduleId ? 'Select departure' : 'Select a schedule first'} disabled={!selectedScheduleId}
                                    options={filteredOccurrences.map(o => ({
                                        value: o.id,
                                        label: `${new Date(o.departureDate).toLocaleDateString('id-ID')} ${o.departureTime || ''} — ${o.bookedCount || 0}/${o.totalCapacity || 0} booked`
                                    }))} />
                            </Form.Item>
                        </Col>
                        <Col span={5}>
                            <Form.Item name="class" label="Class" rules={[{ required: true }]} initialValue="economy">
                                <Select onChange={() => recalcTotal()} options={[
                                    { value: 'economy', label: 'Economy' }, { value: 'business', label: 'Business' }, { value: 'vip', label: 'VIP' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={5}>
                            <Form.Item name="passengerCount" label="Passengers" rules={[{ required: true }]} initialValue={1}>
                                <InputNumber min={1} max={50} style={{ width: '100%' }} onChange={() => recalcTotal()} />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
        {
            title: "Customer & Payment",
            icon: <UserOutlined />,
            fields: ["customerName", "customerEmail", "customerPhone", "totalAmount", "paidAmount", "notes"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}>
                                <Input placeholder="Full name" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="customerEmail" label="Email">
                                <Input placeholder="email@example.com" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="customerPhone" label="Phone">
                                <Input placeholder="+62..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="totalAmount" label="Total Amount">
                                <InputNumber min={0} style={{ width: '100%' }} prefix="Rp" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="paidAmount" label="Paid Amount">
                                <InputNumber min={0} style={{ width: '100%' }} prefix="Rp" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Booking notes..." />
                    </Form.Item>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#7c3aed", "#2563eb", "#3b82f6", "#00ffff", "#8b5cf6"]}>Bookings & Ticketing</AuroraText>}
            subTitle={<DecryptedText text="Schedule management, passenger bookings, and check-in tracking" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
                    {kpis.map((k, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.5)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ color: k.color, fontSize: 16 }}>{k.icon}</span>
                                <span style={{ color: '#999', fontSize: 12 }}>{k.label}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{typeof k.value === 'number' ? k.value : k.value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Search + Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Input prefix={<SearchOutlined />} placeholder="Search schedules, bookings..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 320 }} allowClear />
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
                        <Button type="primary" icon={<PlusOutlined />}
                            onClick={() => { bookingForm.resetFields(); setSelectedScheduleId(undefined); setBookingModalOpen(true); setTab('bookings'); }}
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', border: 'none', borderRadius: 8 }}>
                            New Booking
                        </Button>
                    </Space>
                </div>

                <Card size="small" style={{ flex: 1, borderRadius: 12, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)' }}>
                    {/* Tabs */}
                    <Tabs activeKey={tab} onChange={setTab} items={[
                        { key: 'schedules', label: `🗓️ Schedules (${schedules.length})`, children: (
                            <Table dataSource={filteredSchedules} columns={scheduleColumns} rowKey="id" size="middle" loading={loading}
                                pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} />
                        )},
                        { key: 'departures', label: `🚢 Departures (${occurrences.length})`, children: (
                            <Table dataSource={occurrences} columns={occurrenceColumns} rowKey="id" size="middle" loading={loading}
                                pagination={{ pageSize: 10 }} scroll={{ x: 900 }} />
                        )},
                        { key: 'bookings', label: `🎫 Bookings (${bookings.length})`, children: (
                            <Table dataSource={filteredBookings} columns={bookingColumns} rowKey="id" size="middle" loading={loading}
                                pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
                        )},
                    ]} />
                </Card>

                {/* Passenger Drawer */}
                <Drawer title={`Passengers — ${selectedBooking?.bookingCode}`} open={!!selectedBooking} onClose={() => setSelectedBooking(null)} width={520}>
                    {selectedBooking && (
                        <div>
                            <div style={{ marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
                                <p style={{ margin: 0 }}><strong>Customer:</strong> {selectedBooking.customerName}</p>
                                <p style={{ margin: 0 }}><strong>Class:</strong> <Tag color={selectedBooking.class === 'vip' ? 'gold' : selectedBooking.class === 'business' ? 'blue' : 'default'}>{selectedBooking.class?.toUpperCase()}</Tag></p>
                                <p style={{ margin: 0 }}><strong>Amount:</strong> {fmt(selectedBooking.totalAmount || 0)}</p>
                            </div>
                            <Table dataSource={passengers} rowKey="id" size="small" pagination={false}
                                columns={[
                                    { title: '#', render: (_: any, __: any, i: number) => i + 1, width: 40 },
                                    { title: 'Name', dataIndex: 'name' },
                                    { title: 'ID Number', dataIndex: 'idNumber', render: (v: string) => v ? <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Tag> : '—' },
                                    { title: 'Nationality', dataIndex: 'nationality', render: (v: string) => v || '—' },
                                    { title: 'Class', dataIndex: 'class', render: (v: string) => <Tag>{v?.toUpperCase()}</Tag> },
                                    { title: 'Notes', dataIndex: 'notes', render: (v: string) => v || '—' },
                                ]}
                            />
                        </div>
                    )}
                </Drawer>

                {/* ─── Booking SteppedFormModal ──────────────────────── */}
                <SteppedFormModal
                    open={bookingModalOpen}
                    onCancel={() => { setBookingModalOpen(false); bookingForm.resetFields(); setSelectedScheduleId(undefined); }}
                    onSubmit={handleCreateBooking}
                    form={bookingForm}
                    title="New Booking"
                    entityName="booking"
                    steps={bookingSteps}
                    fields={BOOKING_FIELDS}
                    width={650}
                    loading={false}
                    onBatchCreate={handleBatchCreateBooking}
                    gradient={["#7c3aed", "#2563eb"]}
                />
            </div>
        </CMSLayout>
    );
}
