import React from 'react';
import { Html } from '@react-three/drei';
import { HeatMapOutlined, DashboardOutlined } from '@ant-design/icons';

export function SensorMarker({ position, type, value }: { position: [number, number, number], type: 'temp' | 'power', value: string }) {
    return (
        <Html position={position} center>
            <div style={{
                background: 'rgba(255,255,255,0.9)', 
                color: '#000', 
                padding: '4px 8px', 
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                pointerEvents: 'none',
                transform: 'translateY(-10px)'
            }}>
                {type === 'temp' ? <HeatMapOutlined style={{color: '#faad14'}} /> : <DashboardOutlined style={{color: '#1890ff'}} />}
                {value}
            </div>
        </Html>
    );
}
