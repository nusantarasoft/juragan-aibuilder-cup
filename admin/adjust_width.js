const fs = require('fs');
let content = fs.readFileSync('src/app/admin/inventory/warehouse-map/page.tsx', 'utf8');

// The Right Panel Overlay has hardcoded width: 340. We need to let it size automatically so the toolbar fits next to it.
const rightOverlaySearch = `<motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} style={{ position: 'absolute', top: 80, right: 16, bottom: 16, width: 340, pointerEvents: 'auto' }}>`;
const rightOverlayReplace = `<motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} style={{ position: 'absolute', top: 80, right: 16, bottom: 16, width: 'fit-content', pointerEvents: 'auto' }}>`;

content = content.replace(rightOverlaySearch, rightOverlayReplace);

// Let's also do the same for the Left Panel Overlay just in case
const leftOverlaySearch = `<motion.div initial={{ x: -340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -340, opacity: 0 }} style={{ position: 'absolute', top: 80, left: 16, bottom: 16, width: 340, pointerEvents: 'auto' }}>`;
const leftOverlayReplace = `<motion.div initial={{ x: -340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -340, opacity: 0 }} style={{ position: 'absolute', top: 80, left: 16, bottom: 16, width: 'fit-content', pointerEvents: 'auto' }}>`;

content = content.replace(leftOverlaySearch, leftOverlayReplace);

fs.writeFileSync('src/app/admin/inventory/warehouse-map/page.tsx', content);
console.log('Right panel overlay width adjusted to fit-content');
