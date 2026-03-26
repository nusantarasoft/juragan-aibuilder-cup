'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Space, message, Tabs, Progress, Drawer } from 'antd';
import { PlusOutlined, ReloadOutlined, ScheduleOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, DollarOutlined, SearchOutlined, SendOutlined, LoginOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { inventoryService, BookingSchedule, BookingOccurrence, Booking, BookingPassenger, BookingStatsType } from '@/lib/inventoryService';

const STATUS_COLORS: Record<string, string> = {
    active: 'green', suspended: 'orange', cancelled: 'red',
    scheduled: 'blue', boarding: 'cyan', departed: 'geekblue', completed: 'green',
    pending: 'gold', confirmed: 'blue', checked_in: 'green', no_show: 'red',
};

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

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, o, b, st] = await Promise.all([
                inventoryService.getSchedules(),
                inventoryService.getOccurrences(),
                inventoryService.getBookings(),
                inventoryService.getBookingStats(),
            ]);
            setSchedules(s); setOccurrences(o); setBookings(b); setStats(st);
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
        { title: 'Capacity', render: (_: any, r: BookingOccurrence) => (
            <Space direction="vertical" size={0} style={{ width: 120 }}>
                <span>{r.bookedCount || 0}/{r.totalCapacity || 0} booked</span>
                <Progress percent={Math.round(((r.bookedCount || 0) / (r.totalCapacity || 1)) * 100)} size="small"
                    strokeColor={(r.bookedCount || 0) / (r.totalCapacity || 1) > 0.8 ? '#f5222d' : '#1890ff'} />
            </Space>
        )},
        { title: 'Check‑ins', render: (_: any, r: BookingOccurrence) => `${r.checkedInCount || 0}/${r.bookedCount || 0}` },
        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
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

    return (
        <CMSLayout>
            <div style={{ padding: '0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                    <h1 style={{ margin: 0, background: 'linear-gradient(135deg, #7c3aed, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28, fontWeight: 700 }}>
                        Bookings & Ticketing
                    </h1>
                    <span style={{ color: '#888' }}>Schedule management, passenger bookings, and check-in tracking</span>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
                    {kpis.map((k, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ color: k.color, fontSize: 16 }}>{k.icon}</span>
                                <span style={{ color: '#999', fontSize: 12 }}>{k.label}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{typeof k.value === 'number' ? k.value : k.value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Search + Refresh */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Input prefix={<SearchOutlined />} placeholder="Search schedules, bookings..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 320 }} allowClear />
                    <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
                </div>

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
            </div>
        </CMSLayout>
    );
}
