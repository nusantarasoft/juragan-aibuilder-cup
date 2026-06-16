import React from 'react';
import { Card, Typography, List, Tabs } from 'antd';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { HmiElementType } from '@/store/useHmiStore';

const { Text } = Typography;

export const PALETTE_ITEMS_2D: { type: HmiElementType; name: string; icon: string }[] = [
    { type: 'pump', name: 'Pump', icon: '⚙️' },
    { type: 'valve', name: 'Valve', icon: '🎛️' },
    { type: 'tank', name: 'Tank', icon: '🛢️' },
    { type: 'motor', name: 'Motor', icon: '🔄' },
    { type: 'pipe', name: 'Pipe', icon: '➖' },
    { type: 'sensor', name: 'Sensor', icon: '📡' },
    { type: 'indicator', name: 'Indicator', icon: '📟' },
    { type: 'label', name: 'Text Label', icon: '📝' },
];

export const PALETTE_ITEMS_3D: { type: string; name: string; icon: string }[] = [
    { type: 'chiller', name: 'Chiller', icon: '❄️' },
    { type: 'pump', name: 'Water Pump', icon: '🌊' },
    { type: 'cooling_tower', name: 'Cooling Tower', icon: '🏭' },
    { type: 'valve', name: 'Control Valve', icon: '🎛️' },
    { type: 'pipe', name: '3D Pipe', icon: '➖' },
    { type: 'robot', name: 'Robotic Arm', icon: '🦾' },
];

export default function ScadaPalette() {
    const { themeColor } = usePreferencesStore();

    const onDragStart2D = (e: React.DragEvent, type: string) => {
        e.dataTransfer.setData('hmi-type', type);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const onDragStart3D = (e: React.DragEvent, type: string) => {
        e.dataTransfer.setData('scada-3d-type', type);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const renderList = (items: any[], dragHandler: (e: React.DragEvent, type: string) => void) => (
        <List
            grid={{ gutter: 8, column: 2 }}
            dataSource={items}
            renderItem={(item) => (
                <List.Item>
                    <Card
                        size="small"
                        hoverable
                        draggable
                        onDragStart={(e) => dragHandler(e, item.type)}
                        style={{ 
                            textAlign: 'center', 
                            cursor: 'grab', 
                            background: 'rgba(255,255,255,0.05)',
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}
                        bodyStyle={{ padding: '12px 8px' }}
                    >
                        <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                        <Text style={{ fontSize: 11 }}>{item.name}</Text>
                    </Card>
                </List.Item>
            )}
        />
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Tabs 
                defaultActiveKey="2d"
                items={[
                    {
                        key: '2d',
                        label: '2D Elements',
                        children: <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>{renderList(PALETTE_ITEMS_2D, onDragStart2D)}</div>
                    },
                    {
                        key: '3d',
                        label: '3D Models',
                        children: <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>{renderList(PALETTE_ITEMS_3D, onDragStart3D)}</div>
                    }
                ]}
            />
        </div>
    );
}
