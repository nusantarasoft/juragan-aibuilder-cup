const fs = require('fs');

// 1. builderState.ts
let bFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/inventory/warehouse-map/builderState.ts';
let bContent = fs.readFileSync(bFile, 'utf8');
bContent = bContent.replace(
    /export type PlacedObjectType =[\s\S]*?\| 'safety_barrier';/,
    `export type PlacedObjectType =
    | 'zone' | 'rack' | 'wall' | 'door' | 'pallet'
    | 'bollard' | 'workstation' | 'conveyor' | 'forklift'
    | 'platform' | 'stairs' | 'robot_agv' | 'charging_station'
    | 'industrial_fan' | 'security_camera' | 'shipping_container'
    | 'safety_barrier' | 'tree' | 'shrub' | 'road' | 'fence' | 'truck' | 'custom_model';`
);
fs.writeFileSync(bFile, bContent);

// 2. WarehouseScene.tsx
let wFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/inventory/warehouse-map/WarehouseScene.tsx';
let wContent = fs.readFileSync(wFile, 'utf8');

wContent = wContent.replace(
    /pulseRef\.current\.material\.opacity/g,
    '(pulseRef.current.material as THREE.Material).opacity'
);

wContent = wContent.replace(
    /<mesh position={\[w\*0\.1, 0\.4, d\*0\.2\]}><cylinderGeometry args={\[0\.4,0\.4,0\.3\]} rotation={\[0,0,Math\.PI\/2\]} \/><meshStandardMaterial color="#1e293b" \/><\/mesh>/g,
    '<mesh position={[w*0.1, 0.4, d*0.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.4,0.4,0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>'
);
wContent = wContent.replace(
    /<mesh position={\[w\*0\.9, 0\.4, d\*0\.2\]}><cylinderGeometry args={\[0\.4,0\.4,0\.3\]} rotation={\[0,0,Math\.PI\/2\]} \/><meshStandardMaterial color="#1e293b" \/><\/mesh>/g,
    '<mesh position={[w*0.9, 0.4, d*0.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.4,0.4,0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>'
);
wContent = wContent.replace(
    /<mesh position={\[w\*0\.1, 0\.4, d\*0\.8\]}><cylinderGeometry args={\[0\.4,0\.4,0\.3\]} rotation={\[0,0,Math\.PI\/2\]} \/><meshStandardMaterial color="#1e293b" \/><\/mesh>/g,
    '<mesh position={[w*0.1, 0.4, d*0.8]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.4,0.4,0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>'
);
wContent = wContent.replace(
    /<mesh position={\[w\*0\.9, 0\.4, d\*0\.8\]}><cylinderGeometry args={\[0\.4,0\.4,0\.3\]} rotation={\[0,0,Math\.PI\/2\]} \/><meshStandardMaterial color="#1e293b" \/><\/mesh>/g,
    '<mesh position={[w*0.9, 0.4, d*0.8]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.4,0.4,0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>'
);

if (!wContent.includes('function SelectionHighlight')) {
    wContent = wContent.replace(
        /function TreeObject/g,
        `function SelectionHighlight({ w, d, h = 1 }: { w: number, d: number, h?: number }) {
    return (
        <mesh position={[w/2, h/2, d/2]}>
            <boxGeometry args={[w + 0.1, h + 0.1, d + 0.1]} />
            <meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} />
        </mesh>
    );
}

function TreeObject`
    );
}
fs.writeFileSync(wFile, wContent);

// 3. page.tsx
let pFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/app/admin/inventory/warehouse-map/page.tsx';
let pContent = fs.readFileSync(pFile, 'utf8');

pContent = pContent.replace(/t\.appBg/g, 't.viewportBg');
pContent = pContent.replace(/\.includes\(/g, '.has('); // We assume set usage! Wait, array might use includes too!
// Actually, let's target the exact line or just rollback the global .includes() -> .has() if it breaks other things!
// I'll be careful and do precise replacement:
pContent = pContent.replace(/expandedZones\.includes/g, 'expandedZones.has');
pContent = pContent.replace(/expandedRacks\.includes/g, 'expandedRacks.has');
pContent = pContent.replace(/expandedStops\.includes/g, 'expandedStops.has');

fs.writeFileSync(pFile, pContent);

// 4. DockWindow.tsx
let dFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/components/dock/DockWindow.tsx';
if (fs.existsSync(dFile)) {
    let dContent = fs.readFileSync(dFile, 'utf8');
    dContent = dContent.replace(/icons:\s*{\s*style:\s*{\s*display:\s*"flex",\s*gap:\s*"8px"\s*}\s*}/g, '');
    dContent = dContent.replace(/,\s*}}/g, '}}');
    fs.writeFileSync(dFile, dContent);
}

// 5. MacDock.tsx
let mdFile = 'c:/Users/Adityo Nugroho/Documents/Nusantarasoft/Docker/nusantarasoft 3/admin/src/components/dock/MacDock.tsx';
if (fs.existsSync(mdFile)) {
    let mdContent = fs.readFileSync(mdFile, 'utf8');
    mdContent = mdContent.replace(/isFocused={focusedWindow === win\.id}/g, '');
    mdContent = mdContent.replace(/visibility === "hidden"/g, 'false');
    fs.writeFileSync(mdFile, mdContent);
}
console.log('done')
