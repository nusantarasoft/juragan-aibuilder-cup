import React, { useState, useRef } from 'react';
import { useDcimStore } from '@/store/useDcimStore';

export function FloorPlanCanvas({ onRackClick }: { onRackClick?: (id: string) => void }) {
    const { racks, cracs, pdus, selectedRackId, viewMode, editMode, updateRackPosition, updateCracPosition, updatePduPosition, snapToGrid } = useDcimStore();
    
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

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

    const getPointerCoords = (e: React.PointerEvent) => {
        if (!svgRef.current) return { x: 0, z: 0 };
        const CTM = svgRef.current.getScreenCTM();
        if (!CTM) return { x: 0, z: 0 };
        
        const svgX = (e.clientX - CTM.e) / CTM.a;
        const svgY = (e.clientY - CTM.f) / CTM.d;

        let rawX = (svgX - offsetX) / scale;
        let rawZ = (svgY - offsetY) / scale;

        if (snapToGrid) {
            rawX = Math.round(rawX * 2) / 2;
            rawZ = Math.round(rawZ * 2) / 2;
        }

        return { x: rawX, z: rawZ };
    };

    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        if (!editMode) {
            onRackClick?.(id);
            return;
        }
        e.stopPropagation();
        setDraggingId(id);
        onRackClick?.(id);
        (e.target as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!editMode || !draggingId) return;
        const { x, z } = getPointerCoords(e);
        if (draggingId.startsWith('CRAC-')) {
            updateCracPosition(draggingId, x, z);
        } else if (draggingId.startsWith('PDU-')) {
            updatePduPosition(draggingId, x, z);
        } else {
            updateRackPosition(draggingId, x, z);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (draggingId) {
            setDraggingId(null);
            (e.target as Element).releasePointerCapture(e.pointerId);
        }
    };

    return (
        <svg 
            ref={svgRef}
            width="100%" 
            height="100%" 
            viewBox="0 0 800 600" 
            style={{ background: '#f0f2f5', borderRadius: 8, cursor: draggingId ? 'grabbing' : (editMode ? 'crosshair' : 'default') }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* Grid Pattern */}
            <defs>
                <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
                    <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#e8e8e8" strokeWidth="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Room Boundary */}
            <rect x="100" y="50" width="600" height="500" fill="none" stroke="#d9d9d9" strokeWidth="4" rx="8" />
            <text x="120" y="80" fill="#bfbfbf" fontSize="16" fontWeight="bold">Main Data Hall</text>

            {/* Render Racks from Store */}
            {racks.map(rack => {
                const isHorizontal = rack.rotationY === Math.PI / 2 || rack.rotationY === -Math.PI / 2;
                
                const rw = isHorizontal ? 1.2 : 0.8;
                const rh = isHorizontal ? 0.8 : 1.2;
                
                const width = rw * scale;
                const height = rh * scale;
                
                const cx = offsetX + (rack.x * scale);
                const cy = offsetY + (rack.z * scale);

                return (
                    <g 
                        key={rack.id} 
                        transform={`translate(${cx - width/2}, ${cy - height/2})`} 
                        onPointerDown={(e) => handlePointerDown(e, rack.id)}
                        style={{ cursor: editMode ? 'grab' : 'pointer' }}
                    >
                        <rect 
                            width={width} 
                            height={height} 
                            fill={getRackColor(rack)} 
                            rx="2"
                            stroke={selectedRackId === rack.id ? '#096dd9' : '#000'}
                            strokeWidth={selectedRackId === rack.id ? 2 : 1}
                        />
                        <text x={width/2} y={height/2 + 3} fill="white" fontSize="8" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                            {rack.name}
                        </text>
                    </g>
                );
            })}

            {/* Render CRAC Units */}
            {cracs.map(crac => {
                const isHorizontal = crac.rotationY === Math.PI / 2 || crac.rotationY === -Math.PI / 2;
                const width = (isHorizontal ? 2 : 1.5) * scale;
                const height = (isHorizontal ? 1.5 : 2) * scale;
                const cx = offsetX + (crac.x * scale);
                const cy = offsetY + (crac.z * scale);
                
                return (
                    <g 
                        key={crac.id} 
                        transform={`translate(${cx - width/2}, ${cy - height/2})`}
                        onPointerDown={(e) => handlePointerDown(e, crac.id)}
                        style={{ cursor: editMode ? 'grab' : 'pointer' }}
                    >
                        <rect width={width} height={height} fill="#434343" rx="4" stroke={selectedRackId === crac.id ? '#096dd9' : '#000'} strokeWidth={selectedRackId === crac.id ? 2 : 1} />
                        <text x={width/2} y={height/2 + 3} fill="#fff" fontSize="10" textAnchor="middle" style={{ pointerEvents: 'none' }}>CRAC</text>
                    </g>
                );
            })}

            {/* Render PDUs */}
            {pdus.map(pdu => {
                const isHorizontal = pdu.rotationY === Math.PI / 2 || pdu.rotationY === -Math.PI / 2;
                const width = (isHorizontal ? 1 : 1) * scale;
                const height = (isHorizontal ? 1 : 1) * scale;
                const cx = offsetX + (pdu.x * scale);
                const cy = offsetY + (pdu.z * scale);
                
                return (
                    <g 
                        key={pdu.id} 
                        transform={`translate(${cx - width/2}, ${cy - height/2})`}
                        onPointerDown={(e) => handlePointerDown(e, pdu.id)}
                        style={{ cursor: editMode ? 'grab' : 'pointer' }}
                    >
                        <rect width={width} height={height} fill="#87d068" rx="4" stroke={selectedRackId === pdu.id ? '#096dd9' : '#000'} strokeWidth={selectedRackId === pdu.id ? 2 : 1} />
                        <text x={width/2} y={height/2 + 3} fill="#fff" fontSize="8" textAnchor="middle" style={{ pointerEvents: 'none' }}>PDU</text>
                    </g>
                );
            })}
        </svg>
    );
}
