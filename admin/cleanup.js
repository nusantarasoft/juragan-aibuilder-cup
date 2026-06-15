const fs = require('fs');
let content = fs.readFileSync('src/app/admin/pm/construction-3d/Construction3D.tsx', 'utf8');

const funcs = [
  'PlacedObject',
  'DraggableObject',
  'GlobalClippingPlane',
  'CostScheduleHeatmap',
  'InSceneGantt',
  'RfiMarker3D',
  'PulsingClashMarker',
  'ProgressLabel3D',
  'MeasurementRenderer'
];

funcs.forEach(fn => {
  const regex = new RegExp('function ' + fn + '[\\s\\S]*?(?=\\n// --- |\\nfunction |\\nexport )', 'g');
  content = content.replace(regex, '');
});

content = content.replace(
  'import { ForkliftLoader, ConstructionWorkers, TowerCrane } from "./components/3d/Vehicles";',
  'import { ForkliftLoader, ConstructionWorkers, TowerCrane } from "./components/3d/Vehicles";\nimport { PlacedObject, DraggableObject, GlobalClippingPlane, CostScheduleHeatmap, InSceneGantt, RfiMarker3D, PulsingClashMarker, ProgressLabel3D, MeasurementRenderer } from "./components/3d/Overlays";'
);

fs.writeFileSync('src/app/admin/pm/construction-3d/Construction3D.tsx', content);
console.log("Done.");
