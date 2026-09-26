const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/admin/dcim/3d-view/Dcim3dView.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace wrapper start
const oldWrapper = \<div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 180px)', minHeight: 600, borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
                
                {/* Visualizer Canvas */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>\;

const newWrapper = \<div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: 'calc(100vh - 180px)', minHeight: 600, borderRadius: 8, overflow: 'hidden', border: \\\1px solid \\\\\\, background: isDark ? '#000' : '#f0f0f0' }}>
                
                {/* Top Ribbon */}
                <div style={{ background: isDark ? '#141414' : '#fff', borderBottom: \\\1px solid \\\\\\ }}>
                    <Tabs 
                        defaultActiveKey="2" 
                        size="small"
                        style={{ marginBottom: -16, padding: '0 16px' }}
                        items={[
                            { key: '1', label: 'Data Center' },
                            { key: '2', label: 'Asset Management' },
                            { key: '3', label: 'Power' },
                            { key: '4', label: 'Cooling' },
                            { key: '5', label: 'Monitoring' },
                            { key: '6', label: 'Automation' },
                            { key: '7', label: 'Tools' },
                        ]} 
                    />
                    <div style={{ padding: '8px 16px', display: 'flex', gap: 24, alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', borderRight: \\\1px solid \\\\\\, paddingRight: 24 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => useDcimStore.getState().addRack({ id: \\\RACK-NEW-\\\\\\, name: \\\New Rack\\\, x: 0, z: 0, totalU: 42, usedU: 0, temp: 24, power: 0, status: 'normal', servers: [] })}>
                                <AppstoreOutlined style={{ fontSize: 24, color: antToken.colorPrimary }} />
                                <span style={{ fontSize: 11, marginTop: 4 }}>Add Rack</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => useDcimStore.getState().addCrac({ id: \\\CRAC-NEW-\\\\\\, name: \\\New CRAC\\\, x: 0, z: 0, status: 'normal' })}>
                                <AppstoreOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                                <span style={{ fontSize: 11, marginTop: 4 }}>Place CRAC</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => useDcimStore.getState().addPdu({ id: \\\PDU-NEW-\\\\\\, name: \\\New PDU\\\, x: 0, z: 0, power: 0, status: 'normal' })}>
                                <AppstoreOutlined style={{ fontSize: 24, color: '#faad14' }} />
                                <span style={{ fontSize: 11, marginTop: 4 }}>Power Dist</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#888', alignSelf: 'flex-end', marginLeft: -8 }}>Assets</div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', borderRight: \\\1px solid \\\\\\, paddingRight: 24 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => {
                                const store = useDcimStore.getState();
                                store.setMeasureMode(!store.measureMode);
                                if (!store.measureMode) message.info('Measurement tool activated.');
                            }}>
                                <SlidersOutlined style={{ fontSize: 24, color: measureMode ? antToken.colorPrimary : 'inherit' }} />
                                <span style={{ fontSize: 11, marginTop: 4 }}>Measure</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => setLocationModalVisible(true)}>
                                <EnvironmentOutlined style={{ fontSize: 24 }} />
                                <span style={{ fontSize: 11, marginTop: 4 }}>Location</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#888', alignSelf: 'flex-end', marginLeft: -8 }}>Tools</div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ fontSize: 11 }}>View Mode:</div>
                                <Segmented size="small" options={['Normal', 'Thermal', 'Power', 'Utilization', 'Network']} value={viewMode} onChange={(val) => setViewMode(val as any)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 16 }}>
                                <div style={{ fontSize: 11 }}>Build Mode:</div>
                                <Switch size="small" checked={editMode} onChange={setEditMode} />
                            </div>
                        </div>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
                            <Button size="small" icon={<UploadOutlined />} onClick={() => document.getElementById('import-file')?.click()}>Import</Button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    
                    {/* Left Sidebar (Project Explorer & Component Library) */}
                    <div style={{ width: 280, display: 'flex', flexDirection: 'column', borderRight: \\\1px solid \\\\\\, background: isDark ? '#141414' : '#fff' }}>
                        <div style={{ padding: '8px 16px', borderBottom: \\\1px solid \\\\\\, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                            Project Explorer
                            <SelectOutlined />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                            <Tree
                                showIcon
                                defaultExpandAll
                                treeData={[
                                    {
                                        title: 'Global Sites',
                                        key: '0-0',
                                        icon: <EnvironmentOutlined />,
                                        children: [
                                            {
                                                title: 'North America',
                                                key: '0-0-0',
                                                icon: <FolderOutlined />,
                                                children: [
                                                    {
                                                        title: 'Chicago Center',
                                                        key: '0-0-0-0',
                                                        icon: <HddOutlined />,
                                                        children: [
                                                            {
                                                                title: 'Floor 1',
                                                                key: '0-0-0-0-0',
                                                                children: [
                                                                    { title: 'Room A', key: '0-0-0-0-0-0', children: [{ title: 'Racks', key: 'racks' }, { title: 'Servers', key: 'servers' }] },
                                                                    { title: 'Room B', key: '0-0-0-0-0-1' },
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]}
                            />
                        </div>
                        
                        <div style={{ padding: '8px 16px', borderTop: \\\1px solid \\\\\\, borderBottom: \\\1px solid \\\\\\, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                            Component Library
                            <Space>
                                <SearchOutlined />
                                <SelectOutlined />
                            </Space>
                        </div>
                        <div style={{ height: 250, overflowY: 'auto', padding: 12 }}>
                            <Input prefix={<SearchOutlined />} placeholder="Search components..." size="small" style={{ marginBottom: 12 }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <div style={{ border: \\\1px solid \\\\\\, borderRadius: 4, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => useDcimStore.getState().addRack({ id: \\\RACK-NEW-\\\\\\, name: \\\New Rack\\\, x: 0, z: 0, totalU: 42, usedU: 0, temp: 24, power: 0, status: 'normal', servers: [] })}>
                                    <AppstoreOutlined style={{ fontSize: 24, color: antToken.colorPrimary }} />
                                    <span style={{ fontSize: 10, marginTop: 4, textAlign: 'center' }}>Rack A-12</span>
                                </div>
                                <div style={{ border: \\\1px solid \\\\\\, borderRadius: 4, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => useDcimStore.getState().addWorldObject({ id: \\\PILLAR-NEW-\\\\\\, type: 'pillar', x: 0, z: 0 })}>
                                    <ColumnHeightOutlined style={{ fontSize: 24 }} />
                                    <span style={{ fontSize: 10, marginTop: 4, textAlign: 'center' }}>Pillar</span>
                                </div>
                                <div style={{ border: \\\1px solid \\\\\\, borderRadius: 4, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => useDcimStore.getState().addWorldObject({ id: \\\CABLE-NEW-\\\\\\, type: 'cableTray', x: 0, z: 0 })}>
                                    <MenuOutlined style={{ fontSize: 24 }} />
                                    <span style={{ fontSize: 10, marginTop: 4, textAlign: 'center' }}>Cable Tray</span>
                                </div>
                                <div style={{ border: \\\1px solid \\\\\\, borderRadius: 4, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => useDcimStore.getState().addWorldObject({ id: \\\PIPE-NEW-\\\\\\, type: 'pipe', x: 0, z: 0, material: 'metal' })}>
                                    <ApiOutlined style={{ fontSize: 24 }} />
                                    <span style={{ fontSize: 10, marginTop: 4, textAlign: 'center' }}>Pipe</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Viewport Center */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        
                        {/* Status Bar Overlay */}
                        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 24, background: isDark ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.8)', padding: '6px 24px', borderRadius: 20, backdropFilter: 'blur(4px)', border: \\\1px solid \\\\\\ }}>
                            <div style={{ fontSize: 12 }}>Total Power: <strong style={{ color: '#52c41a' }}>1.5 MW</strong></div>
                            <div style={{ fontSize: 12 }}>Cooling Load: <strong style={{ color: '#52c41a' }}>65%</strong></div>
                            <div style={{ fontSize: 12 }}>PUE: <strong>1.12</strong></div>
                        </div>

                        {/* View Cube */}
                        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, width: 60, height: 60, border: \\\1px solid \\\\\\, borderRadius: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', background: isDark ? 'rgba(20,20,20,0.5)' : 'rgba(255,255,255,0.5)' }}>
                            <span style={{ fontSize: 10, fontWeight: 'bold', textAlign: 'center' }}>VIEW<br/>CUBE</span>
                        </div>

                        {/* Mini Tool Palette */}
                        {editMode && (
                            <div style={{ position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8, background: isDark ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.8)', padding: 8, borderRadius: 8, border: \\\1px solid \\\\\\ }}>
                                <Button type={!measureMode && transformMode === 'translate' ? "primary" : "text"} icon={<DragOutlined />} size="small" onClick={() => { setMeasureMode(false); setTransformMode('translate'); }} />
                                <Button type={!measureMode && transformMode === 'rotate' ? "primary" : "text"} icon={<SyncOutlined />} size="small" onClick={() => { setMeasureMode(false); setTransformMode('rotate'); }} />
                                <Button type={useDcimStore().snapToGrid ? "primary" : "text"} icon={<AppstoreOutlined />} size="small" onClick={() => useDcimStore.getState().setSnapToGrid(!useDcimStore().snapToGrid)} />
                            </div>
                        )}

                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>\;

content = content.replace(oldWrapper, newWrapper);

// We need to find where the old floating UI starts to delete everything up to Server Drawer.
// Let's find "2D Minimap Overlay".
const startMarker = \{/* 2D Minimap Overlay */}\;
const endMarker = \{/* Server Modal Drawer */}\; // Wait, I see \<Drawer title="Server Details"\ in the file? Let's check exactly what line it is.

// Instead of string replacement for the giant tail block, I'll use regex to remove everything between the end of Canvas and Server Drawer.
// Wait, the Canvas block ends with \</Suspense></div>\.
const canvasEndStr = \</Suspense>\\n                </div>\;
const idxCanvasEnd = content.indexOf(canvasEndStr);
if (idxCanvasEnd !== -1) {
    // The new suffix for the viewport center and right panel:
    const newSuffix = \</Suspense>
                        </div> {/* end of absolute canvas wrapper */}
                    </div> {/* end of Viewport Center */}

                    {/* Right Panel (Properties & Inspector) */}
                    <div style={{ width: 300, display: 'flex', flexDirection: 'column', borderLeft: \\\1px solid \\\\\\, background: isDark ? '#141414' : '#fff', overflowY: 'auto' }}>
                        <div style={{ padding: '8px 16px', borderBottom: \\\1px solid \\\\\\, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                            Properties & Inspector
                            <SelectOutlined />
                        </div>
                        
                        {selectedItem ? (
                            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{selectedItem.name || selectedItem.id}</div>
                                
                                <Descriptions column={1} size="small" bordered>
                                    <Descriptions.Item label="ID">{selectedItem.id}</Descriptions.Item>
                                    {selectedRack && <Descriptions.Item label="U-count">{selectedRack.totalU}</Descriptions.Item>}
                                    {selectedItem.status && <Descriptions.Item label="Status"><Badge status={selectedItem.status === 'critical' ? 'error' : 'success'} text={selectedItem.status?.toUpperCase()} /></Descriptions.Item>}
                                </Descriptions>

                                <Divider style={{ margin: '8px 0' }}>Dynamic Fields</Divider>
                                
                                <Descriptions column={1} size="small">
                                    {(selectedRack || selectedPdu) && <Descriptions.Item label="Power Usage">{selectedItem.power} kW</Descriptions.Item>}
                                    {selectedRack && <Descriptions.Item label="Temperature">{selectedRack.temp}°C</Descriptions.Item>}
                                    {selectedRack && <Descriptions.Item label="U-Space">{(selectedRack.totalU || 0) - (selectedRack.usedU || 0)} Available</Descriptions.Item>}
                                </Descriptions>

                                <Divider style={{ margin: '8px 0' }}>Monitoring Graphs</Divider>
                                
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Power</div>
                                <div style={{ height: 100, width: '100%', marginBottom: 16 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={[{time: '10:00', val: 5}, {time: '10:05', val: 7}, {time: '10:10', val: 6}, {time: '10:15', val: 8}, {time: '10:20', val: 8.2}]}>
                                            <Line type="monotone" dataKey="val" stroke="#52c41a" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Temp</div>
                                <div style={{ height: 100, width: '100%', marginBottom: 16 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={[{time: '10:00', val: 22}, {time: '10:05', val: 23}, {time: '10:10', val: 22.5}, {time: '10:15', val: 24}, {time: '10:20', val: 22}]}>
                                            <Line type="monotone" dataKey="val" stroke="#faad14" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                                Select an object in the 3D view to inspect its properties.
                            </div>
                        )}
                    </div>
                </div> {/* End of Main Content Area */}
            </div> {/* End of Full screen CAD container */}\;

    // Now, find the point to attach. 
    // We want to delete EVERYTHING after \</Suspense>\n                </div>\ up to the start of \<Drawer\\n                title="Geographic Location"\ EXCEPT we should keep the server details drawer if it exists.
    // Wait! Let's just find \<Drawer\ ...
    
    // There are 3 Drawers: Right Drawer for Rack Details, Server Modal Drawer, Geographic Location Drawer.
    // I want to delete the "Right Drawer for Rack Details" but keep Server Modal and Geographic Location.
    // Wait, the Right Drawer for Rack Details starts with \{/* Right Drawer for Rack Details */}\ and ends before \<Drawer title="Server Details"\ OR \<Drawer title="Geographic Location"\.

    const startOfTail = content.indexOf(\{/* 2D Minimap Overlay */}\, idxCanvasEnd);
    const endOfRightDrawer = content.indexOf(\<Drawer\, content.indexOf(\{/* Right Drawer for Rack Details */}\)); 
    // Actually, Right Drawer for Rack Details IS a Drawer tag! So it is the first <Drawer after 2D Minimap.
    const startOfServerDrawer = content.indexOf(\{/* Server Modal Drawer */}\, idxCanvasEnd) || content.indexOf(\<Drawer title="Geographic Location"\, idxCanvasEnd);
    // Let's just locate the next Drawer that is NOT the right rack drawer.
    let searchIdx = content.indexOf(\<Drawer\, idxCanvasEnd);
    
    // We can just use the literal text to slice.
    const sliceStart = startOfTail;
    
    // The "Right Drawer for Rack Details" is around line 454. 
    // Let's find the closing tag of that Drawer. 
    // It's \</Drawer>\. There are multiple \</Drawer>\.
    // Let's use regex to wipe out everything between 2D Minimap Overlay and the end of Right Drawer for Rack Details.
    
    // Instead of being fragile, I will replace the exact blocks using string slice.
    const cutStart = content.indexOf(\{/* 2D Minimap Overlay */}\);
    const serverModalIdx = content.indexOf(\<Drawer\\n                title="Server Details"\) > -1 ? content.indexOf(\<Drawer\\n                title="Server Details"\) : content.indexOf(\<Drawer\\n                title="Geographic Location"\);
    const geoModalIdx = content.indexOf(\<Drawer\\n                title="Geographic Location"\);
    
    // Wait, the "Right Drawer" is currently line 455: <Drawer title={ selectedRack ? ...
    // Its closing tag is </Drawer>.
    // Let's find the closing tag of Right Drawer. It's right before the Server Details or Geographic Location drawer.
    
    let nextDrawerIdx = content.indexOf(\<Drawer\, cutStart); 
    // This is the Right Drawer.
    let secondDrawerIdx = content.indexOf(\<Drawer\, nextDrawerIdx + 10);
    // This could be Server Details or Geo. Let's find the \</Drawer>\ before secondDrawerIdx.
    let endOfRightDrawerTag = content.lastIndexOf(\</Drawer>\, secondDrawerIdx);
    
    if (cutStart > -1 && endOfRightDrawerTag > -1) {
        content = content.substring(0, idxCanvasEnd) + newSuffix + '\\n\\n' + content.substring(endOfRightDrawerTag + 9);
    }
}

fs.writeFileSync(file, content, 'utf8');
