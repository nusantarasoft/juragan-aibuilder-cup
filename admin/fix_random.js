const fs = require('fs');

// ai-studio/agent-builder/page.tsx
const agentBuilderFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/ai-studio/agent-builder/page.tsx';
if (fs.existsSync(agentBuilderFile)) {
    let content = fs.readFileSync(agentBuilderFile, 'utf8');
    content = content.replace(/justifyContent="space-between"/g, '');
    fs.writeFileSync(agentBuilderFile, content);
}

// ai-studio/ai-gateway/page.tsx
const gatewayFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/ai-studio/ai-gateway/page.tsx';
if (fs.existsSync(gatewayFile)) {
    let content = fs.readFileSync(gatewayFile, 'utf8');
    content = content.replace(/activeNotebook\.title/g, '(activeNotebook as any).title');
    fs.writeFileSync(gatewayFile, content);
}

// bim/BimViewerModal.tsx
const bimFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/bim/BimViewerModal.tsx';
if (fs.existsSync(bimFile)) {
    let content = fs.readFileSync(bimFile, 'utf8');
    content = content.replace(/primitive object={gltf\.scene}/g, 'primitive object={(gltf as any).scene || gltf}');
    fs.writeFileSync(bimFile, content);
}

// bim/studio/page.tsx
const bimStudioFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/bim/studio/page.tsx';
if (fs.existsSync(bimStudioFile)) {
    let content = fs.readFileSync(bimStudioFile, 'utf8');
    content = content.replace(/<TransformControls\s+object={selectedMesh}/g, '<TransformControls object={selectedMesh as any}');
    fs.writeFileSync(bimStudioFile, content);
}

// bms/Bms3dView.tsx
const bmsFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/bms/Bms3dView.tsx';
if (fs.existsSync(bmsFile)) {
    let content = fs.readFileSync(bmsFile, 'utf8');
    content = content.replace(/<cylinderGeometry args={\[10, 10, 20, 32\]} rotation={\[Math\.PI \/ 2, 0, 0\]} \/>/g, '<cylinderGeometry args={[10, 10, 20, 32]} />');
    fs.writeFileSync(bmsFile, content);
}
console.log('done fixing random ts errors');
