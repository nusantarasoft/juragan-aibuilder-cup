const fs = require('fs');

let content = fs.readFileSync('src/app/admin/inventory/warehouse-map/page.tsx', 'utf8');

// 1. Remove border radius and border from the main wrapper, increase height, and use negative margin to break out of CMSLayout padding.
const oldWrapperStart = `<div style={{ position: 'relative', height: 'calc(100vh - 280px)', width: '100%', overflow: 'hidden', borderRadius: 16, border: \`1px solid \${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}\` }}>`;
const newWrapperStart = `<div style={{ position: 'relative', height: 'calc(100vh - 184px)', overflow: 'hidden', margin: '0 -24px -24px -24px' }}>`;

content = content.replace(oldWrapperStart, newWrapperStart);

// 2. We need to fix the toolbar that's stuck inside the Left Panel.
// The left panel GlassPanel currently has overflow: 'hidden' which ruins the Minimap and toolbar layouts.
// Wait, actually, let's just make the GlassPanel NOT have overflow hidden so things can pop out!
content = content.replace(
    `overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'`,
    `boxShadow: '0 8px 32px rgba(0,0,0,0.5)'`
);
content = content.replace(
    `overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'`,
    `boxShadow: '0 8px 32px rgba(0,0,0,0.5)'`
);

// 3. And also let's make sure rightData.content (Right Panel Overlay) doesn't have overflow: hidden
content = content.replace(
    `overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'`,
    `boxShadow: '0 8px 32px rgba(0,0,0,0.5)'`
);

// 4. In the right panel, the activeTool placement overlaps. Let's find the minimap rendering.
// Minimap is rendered as <div style={{ position: 'absolute', bottom: 16, right: 16, ...
// Since we are now in a GlassPanel that is width 340, `right: 16` means it will be pinned to the right of the panel!
// But if we want it outside, we need to change its position!
content = content.replace(
    `<div style={{ position: 'absolute', bottom: 16, right: 16,`,
    `<div style={{ position: 'fixed', bottom: 32, right: 32,`
);

fs.writeFileSync('src/app/admin/inventory/warehouse-map/page.tsx', content);
console.log('Layout positioning updated');
