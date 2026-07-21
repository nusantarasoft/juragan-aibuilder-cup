const fs = require('fs');

function extractProp(content, startIndex) {
    if (startIndex === -1) return null;
    let braceCount = 0;
    let startVal = -1;
    let endVal = -1;
    
    // Find the first {
    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            if (startVal === -1) startVal = i;
        } else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0 && startVal !== -1) {
                endVal = i;
                break;
            }
        }
    }
    
    if (startVal !== -1 && endVal !== -1) {
        return {
            start: startVal,
            end: endVal,
            content: content.substring(startVal + 1, endVal)
        };
    }
    return null;
}

let content = fs.readFileSync('src/app/admin/inventory/warehouse-map/page.tsx', 'utf8');

const cadStart = content.indexOf('<CADLayout');
if (cadStart === -1) {
    console.log("CADLayout not found");
    process.exit(0);
}

const headerPropIdx = content.indexOf('header={', cadStart);
const leftPanelPropIdx = content.indexOf('leftPanel={', cadStart);
const rightPanelPropIdx = content.indexOf('rightPanel={', cadStart);

const headerData = extractProp(content, headerPropIdx);
const leftData = extractProp(content, leftPanelPropIdx);
const rightData = extractProp(content, rightPanelPropIdx);

// The CADLayout closing tag
const cadPropsEnd = content.indexOf('>', rightData.end);
const cadClosing = content.indexOf('</CADLayout>', cadPropsEnd);

const canvasContent = content.substring(cadPropsEnd + 1, cadClosing);

const statCardInjection = `
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                        <StatCard title="Total Capacity" value={objects.filter(o => o.type === 'rack').reduce((acc, curr) => acc + ((curr.rackLevels || 3) * (curr.width || 1) * (curr.depth || 1)), 0) * 10} suffix=" items" icon={<AppstoreOutlined />} gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" />
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <StatCard title="Storage Zones" value={objects.filter(o => o.type === 'zone').length} icon={<BlockOutlined />} gradient="linear-gradient(135deg, #22c55e 0%, #15803d 100%)" />
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <StatCard title="Equipment" value={objects.filter(o => o.type === 'equipment').length} icon={<ThunderboltOutlined />} gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" />
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <StatCard title="Total Objects" value={objects.length} icon={<DatabaseOutlined />} gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" />
                    </motion.div>
                </Col>
            </Row>
`;

const replacement = `
            ${statCardInjection}
            <div style={{ position: 'relative', height: 'calc(100vh - 280px)', width: '100%', overflow: 'hidden', borderRadius: 16, border: \`1px solid \${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}\` }}>
                {/* CANVAS IN BACKGROUND */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    ${canvasContent}
                </div>

                {/* OVERLAYS */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
                    {/* Header Overlay */}
                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
                        <GlassPanel style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 24px', borderRadius: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                            ${headerData.content}
                        </GlassPanel>
                    </motion.div>

                    {/* Left Panel Overlay */}
                    <AnimatePresence>
                        {buildMode && (
                            <motion.div initial={{ x: -340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -340, opacity: 0 }} style={{ position: 'absolute', top: 80, left: 16, bottom: 16, width: 340, pointerEvents: 'auto' }}>
                                <GlassPanel style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                    ${leftData.content}
                                </GlassPanel>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Right Panel Overlay */}
                    <AnimatePresence>
                        {selectedId || (buildMode && activeTool === 'place_object') ? (
                            <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} style={{ position: 'absolute', top: 80, right: 16, bottom: 16, width: 340, pointerEvents: 'auto' }}>
                                <GlassPanel style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                    ${rightData.content}
                                </GlassPanel>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
`;

const newContent = content.substring(0, cadStart) + replacement + content.substring(cadClosing + 12);
fs.writeFileSync('src/app/admin/inventory/warehouse-map/page.tsx', newContent);
console.log('Successfully replaced CADLayout with immersive GlassPanel overlays!');
