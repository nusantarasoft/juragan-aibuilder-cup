const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/admin/pm/construction-3d/components/3d/BuildingStructure.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Export all functions
content = content.replace(/function SitePrep/g, 'export function SitePrep');
content = content.replace(/function Foundation/g, 'export function Foundation');
content = content.replace(/function StructuralFrame/g, 'export function StructuralFrame');
content = content.replace(/function FloorSlabs/g, 'export function FloorSlabs');
content = content.replace(/function ExternalWalls/g, 'export function ExternalWalls');
content = content.replace(/function WindowsGlazing/g, 'export function WindowsGlazing');
content = content.replace(/function Roofing/g, 'export function Roofing');
content = content.replace(/function Scaffolding/g, 'export function Scaffolding');
content = content.replace(/function MEPSystems/g, 'export function MEPSystems');
content = content.replace(/function InteriorFinishing/g, 'export function InteriorFinishing');
content = content.replace(/function ExteriorFinishing/g, 'export function ExteriorFinishing');

fs.writeFileSync(filePath, content);

// Also need to create shared.ts so these files can share BUILDING, getPhaseOpacity, ConstructionPhase, SceneConfig
const sharedPath = path.join(__dirname, 'src/app/admin/pm/construction-3d/components/3d/shared.ts');
const sharedCode = `
export const BUILDING = {
  width: 40,
  depth: 30,
  heightPerFloor: 3,
  floors: 5,
};

export interface ConstructionPhase {
  id: string;
  name: string;
  startProgress: number;
  endProgress: number;
}

export interface SceneConfig {
  xray: boolean;
  wireframe: boolean;
  materials: boolean;
  lighting: 'day' | 'night' | 'dusk';
  weather: 'clear' | 'rain' | 'snow';
  showWorkers: boolean;
  showVehicles: boolean;
  showSafety: boolean;
  showMeasurements: boolean;
  showZones: boolean;
  quality: 'low' | 'medium' | 'high';
}

export const getPhaseOpacity = (progress: number, start: number, end: number) => {
  if (progress < start) return 0;
  if (progress > end) return 1;
  return (progress - start) / (end - start);
};
`;

fs.writeFileSync(sharedPath, sharedCode);

// Add Scaffolding to the imports in Construction3D
const mainPath = path.join(__dirname, 'src/app/admin/pm/construction-3d/Construction3D.tsx');
let mainContent = fs.readFileSync(mainPath, 'utf-8');
mainContent = mainContent.replace(
    'import { SitePrep, Foundation, StructuralFrame, FloorSlabs, ExternalWalls, WindowsGlazing, Roofing, MEPSystems, InteriorFinishing, ExteriorFinishing } from "./components/3d/BuildingStructure";',
    'import { SitePrep, Foundation, StructuralFrame, FloorSlabs, ExternalWalls, WindowsGlazing, Roofing, Scaffolding, MEPSystems, InteriorFinishing, ExteriorFinishing } from "./components/3d/BuildingStructure";'
);
fs.writeFileSync(mainPath, mainContent);

console.log("Fix successful!");
