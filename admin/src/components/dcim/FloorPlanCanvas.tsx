import React from 'react';
import { useDcimStore } from '@/store/useDcimStore';

export function FloorPlanCanvas({ onRackClick }: { onRackClick?: (id: string) => void }) {
    const { racks, selectedRackId, viewMode } = useDcimStore();

    // Mapping 3D coordinates to 2D SVG canvas (scale x20 for visibility)
    const scale = 20;
    const offsetX = 400; // Center X
    const offsetY = 300; // Center Y

    const getRackColor = (rack: any) => {
        if (selectedRackId === rack.id) return '#1890ff';
        if (viewMode === 'Thermal') {
            return rack.temp > 29 ? '#f5222d' : rack.temp > 25 ? '#faad14' : '#52c41a';
        }
        if (viewMode === 'Power') {
            return rack.power > 7 ? '#722ed1' : rack.power > 4 ? '#108ee9' : '#87d068';
        }
        return rack.status === 'critical' ? '#f5222d' : rack.status === 'warning' ? '#faad14' : '#1f1f1f';
    };

    return (
        <svg width="100%" height="100%" viewBox="0 0 800 600" style={{ background: '#f0f2f5', borderRadius: 8 }}>
            {/* Grid Pattern */}
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e8e8e8" strokeWidth="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Room Boundary */}
            <rect x="100" y="50" width="600" height="500" fill="none" stroke="#d9d9d9" strokeWidth="4" rx="8" />
            <text x="120" y="80" fill="#bfbfbf" fontSize="16" fontWeight="bold">Main Data Hall</text>

            {/* Render Racks from Store */}
            {racks.map(rack => {
                const cx = offsetX + (rack.x * scale);
                const cy = offsetY + (rack.z * scale);
                const width = 0.8 * scale;
                const height = 1.2 * scale;

                return (
                    <g 
                        key={rack.id} 
                        transform={`translate(${cx - width/2}, ${cy - height/2})`} 
                        onClick={() => onRackClick?.(rack.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <rect 
                            width={width} 
                            height={height} 
                            fill={getRackColor(rack)} 
                            rx="2"
                            stroke={selectedRackId === rack.id ? '#096dd9' : '#000'}
                            strokeWidth={selectedRackId === rack.id ? 2 : 1}
                        />
                        {/* Rack label if zoomed in enough, but keeping simple for now */}
                        <text x={width/2} y={height/2 + 3} fill="white" fontSize="8" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                            {rack.name}
                        </text>
                    </g>
                );
            })}

            {/* CRAC Units */}
            <g transform={`translate(${offsetX - 8*scale - 15}, ${offsetY - 2*scale - 20})`}>
                <rect width="30" height="40" fill="#434343" rx="4" />
                <text x="15" y="25" fill="#fff" fontSize="10" textAnchor="middle">CRAC</text>
            </g>
            <g transform={`translate(${offsetX + 8*scale - 15}, ${offsetY - 2*scale - 20})`}>
                <rect width="30" height="40" fill="#434343" rx="4" />
                <text x="15" y="25" fill="#fff" fontSize="10" textAnchor="middle">CRAC</text>
            </g>
        </svg>
    );
}
