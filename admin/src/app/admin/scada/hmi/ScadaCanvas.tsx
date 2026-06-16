import React, { useRef, useState } from 'react';
import { useHmiStore, HmiElementType } from '@/store/useHmiStore';
import { theme } from 'antd';

export default function ScadaCanvas() {
    const svgRef = useRef<SVGSVGElement>(null);
    const { elements, selectedIds, selectElement, updateElement, addElement, clearSelection, isEditMode } = useHmiStore();
    const { token } = theme.useToken();
    const isDark = token.colorBgContainer === '#141414' || token.colorBgBase?.includes('14');

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    
    // Pan & Zoom state
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    
    // Resize state
    const [resizingId, setResizingId] = useState<string | null>(null);

    const getMouseCoords = (e: React.MouseEvent | React.DragEvent) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        return {
            x: (mouseX - pan.x) / scale,
            y: (mouseY - pan.y) / scale
        };
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!isEditMode) return;
        const zoomIntensity = 0.1;
        const newScale = e.deltaY < 0 ? scale * (1 + zoomIntensity) : scale / (1 + zoomIntensity);
        
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const dx = (mouseX - pan.x) * (newScale / scale - 1);
        const dy = (mouseY - pan.y) * (newScale / scale - 1);
        
        setPan({ x: pan.x - dx, y: pan.y - dy });
        setScale(Math.max(0.1, Math.min(newScale, 5))); // clamp scale
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('hmi-type') as HmiElementType;
        if (!type || !svgRef.current) return;

        const { x, y } = getMouseCoords(e);

        // Default dimensions based on type
        let width = 60, height = 60;
        if (type === 'pipe') { width = 150; height = 8; }
        if (type === 'indicator') { width = 90; height = 30; }
        if (type === 'tank') { width = 80; height = 120; }

        addElement({
            type,
            x: x - width / 2,
            y: y - height / 2,
            width,
            height,
            rotation: 0,
            properties: { color: type === 'pump' ? '#52c41a' : '#1890ff', label: type.toUpperCase() }
        });
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        if (!isEditMode) return;
        e.stopPropagation();
        selectElement(id, e.shiftKey);
        setDraggingId(id);
        
        const el = elements.find(el => el.id === id);
        if (el) {
            const { x, y } = getMouseCoords(e);
            setDragOffset({ x: x - el.x, y: y - el.y });
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || e.button === 2) { // Middle or right click to pan
            setIsPanning(true);
        } else if (isEditMode) {
            clearSelection();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan({ x: pan.x + e.movementX, y: pan.y + e.movementY });
            return;
        }

        if (!isEditMode || !svgRef.current) return;
        
        const { x, y } = getMouseCoords(e);

        if (resizingId) {
            const el = elements.find(el => el.id === resizingId);
            if (el) {
                const newW = Math.max(10, Math.round((x - el.x) / 10) * 10);
                const newH = Math.max(10, Math.round((y - el.y) / 10) * 10);
                updateElement(resizingId, { width: newW, height: newH });
            }
            return;
        }

        if (draggingId) {
            updateElement(draggingId, {
                x: Math.round((x - dragOffset.x) / 10) * 10, // Snap to 10px grid
                y: Math.round((y - dragOffset.y) / 10) * 10
            });
        }
    };

    const handleMouseUp = () => {
        setDraggingId(null);
        setResizingId(null);
        setIsPanning(false);
    };

    return (
        <div 
            style={{ 
                width: '100%', height: '100%', 
                background: isDark ? '#111' : '#e6f7ff', 
                borderRadius: 8, overflow: 'hidden',
                position: 'relative'
            }}
        >
            <svg 
                ref={svgRef}
                width="100%" height="100%" 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: isPanning ? 'grabbing' : (isEditMode ? 'crosshair' : 'default') }}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Global Transform Group */}
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                    
                    {/* Grid Pattern */}
                    {isEditMode && (
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke={isDark ? '#333' : '#bae0ff'} strokeWidth="0.5"/>
                            </pattern>
                            <pattern id="grid-large" width="50" height="50" patternUnits="userSpaceOnUse">
                                <rect width="50" height="50" fill="url(#grid)" />
                                <path d="M 50 0 L 0 0 0 50" fill="none" stroke={isDark ? '#444' : '#91caff'} strokeWidth="1"/>
                            </pattern>
                        </defs>
                    )}
                    {/* Infinite Grid Background */}
                    {isEditMode && <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid-large)" pointerEvents="none" />}

                    {/* Render Elements */}
                {elements.sort((a,b) => a.zIndex - b.zIndex).map(el => {
                    const isSelected = selectedIds.includes(el.id);
                    
                    return (
                        <g 
                            key={el.id} 
                            transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation} ${el.width/2} ${el.height/2})`}
                            onMouseDown={(e) => handleMouseDown(e, el.id)}
                            style={{ cursor: isEditMode ? 'grab' : 'pointer' }}
                        >
                            {/* Selection Outline & Resize Handle */}
                            {isSelected && (
                                <g>
                                    <rect x="-4" y="-4" width={el.width+8} height={el.height+8} fill="none" stroke="#faad14" strokeWidth="2" strokeDasharray="4 2" pointerEvents="none" />
                                    <rect 
                                        x={el.width} y={el.height} width={8} height={8} fill="#faad14" 
                                        style={{ cursor: 'nwse-resize' }}
                                        onMouseDown={(e) => { e.stopPropagation(); setResizingId(el.id); }}
                                    />
                                </g>
                            )}

                            {/* Render logic by type */}
                            {el.type === 'pipe' && (
                                <rect width={el.width} height={el.height} fill={el.properties.color || '#ccc'} />
                            )}
                            
                            {el.type === 'tank' && (
                                <g>
                                    <rect width={el.width} height={el.height} fill={isDark ? '#333' : '#fff'} stroke={el.properties.color || '#1890ff'} strokeWidth="3" rx="8" />
                                    {el.properties.fillLevel && (
                                        <rect x="3" y={el.height - (el.height * el.properties.fillLevel / 100) + 3} width={el.width-6} height={(el.height * el.properties.fillLevel / 100) - 6} fill={el.properties.color || '#1890ff'} opacity="0.5" rx="5" />
                                    )}
                                    <text x={el.width/2} y={el.height/2} fill={isDark ? '#fff' : '#000'} textAnchor="middle" fontWeight="bold">{el.properties.label}</text>
                                </g>
                            )}

                            {el.type === 'pump' && (
                                <g>
                                    <circle cx={el.width/2} cy={el.height/2} r={Math.min(el.width, el.height)/2} fill={isDark ? '#333' : '#fff'} stroke={el.properties.color || '#52c41a'} strokeWidth="3" />
                                    <text x={el.width/2} y={el.height/2} fill={isDark ? '#fff' : '#000'} textAnchor="middle" fontWeight="bold">{el.properties.label}</text>
                                </g>
                            )}

                            {el.type === 'indicator' && (
                                <g>
                                    <rect width={el.width} height={el.height} fill="rgba(0,0,0,0.8)" rx="4" />
                                    <text x={el.width/2} y={el.height/2 + 5} fill={el.properties.color || '#fff'} textAnchor="middle" fontSize="14" fontWeight="bold">
                                        {el.properties.defaultVal} {el.properties.unit}
                                    </text>
                                </g>
                            )}
                            
                            {/* Fallback for unhandled types */}
                            {['valve', 'motor', 'sensor', 'label', 'gauge', 'chart', 'shape'].includes(el.type) && (
                                <g>
                                    <rect width={el.width} height={el.height} fill={isDark ? '#444' : '#eee'} stroke="#999" />
                                    <text x={el.width/2} y={el.height/2} fill={isDark ? '#fff' : '#000'} textAnchor="middle" fontSize="10">{el.type}</text>
                                </g>
                            )}
                        </g>
                    );
                })}
                </g>
            </svg>
        </div>
    );
}
