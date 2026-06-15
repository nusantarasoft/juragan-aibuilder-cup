const fs = require('fs');
let c = fs.readFileSync('src/app/admin/pm/construction-3d/Construction3D.tsx', 'utf8');

c = c.replace(/type SceneConfig, /g, '');
c = c.replace(/, type SceneConfig/g, '');
c = c.replace(/type SceneConfig /g, '');

c = c.replace(/interface ConstructionPhase \{[\s\S]*?\n\}/g, '');

if (!c.includes('import { ConstructionPhase, SceneConfig }')) {
  c = c.replace('import { PlacedObject', 'import { ConstructionPhase, SceneConfig } from "./components/3d/shared";\nimport { PlacedObject');
}

fs.writeFileSync('src/app/admin/pm/construction-3d/Construction3D.tsx', c);
console.log('Fixed Construction3D.tsx types');
