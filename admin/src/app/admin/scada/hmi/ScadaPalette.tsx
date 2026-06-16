import React from 'react';
import { Card, Typography, List, Space } from 'antd';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { HmiElementType } from '@/store/useHmiStore';

const { Text } = Typography;

export const PALETTE_ITEMS: { type: HmiElementType; name: string; icon: string }[] = [
    { type: 'pump', name: 'Pump', icon: '⚙️' },
    { type: 'valve', name: 'Valve', icon: '🎛️' },
    { type: 'tank', name: 'Tank', icon: '🛢️' },
    { type: 'motor', name: 'Motor', icon: '🔄' },
    { type: 'pipe', name: 'Pipe', icon: '➖' },
    { type: 'sensor', name: 'Sensor', icon: '📡' },
    { type: 'indicator', name: 'Indicator', icon: '📟' },
    { type: 'label', name: 'Text Label', icon: '📝' },
];

export default function ScadaPalette() {
    const { themeColor } = usePreferencesStore();

    const onDragStart = (e: React.DragEvent, type: string) => {
        e.dataTransfer.setData('hmi-type', type);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', paddingRight: 8 }}>
            <List
                grid={{ gutter: 8, column: 2 }}
                dataSource={PALETTE_ITEMS}
                renderItem={(item) => (
                    <List.Item>
                        <Card
                            size="small"
                            hoverable
                            draggable
                            onDragStart={(e) => onDragStart(e, item.type)}
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
        </div>
    );
}
