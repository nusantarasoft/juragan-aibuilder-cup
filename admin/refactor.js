const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/admin/pm/construction-3d/Construction3D.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Find start of SitePrep
const startRegex = /function SitePrep\(/;
const startMatch = content.match(startRegex);

if (!startMatch) {
    console.error("Could not find SitePrep");
    process.exit(1);
}

const startIndex = startMatch.index;

// Find start of ConstructionCrane (which comes after ExteriorFinishing)
// Wait, the order in previous grep was:
// SitePrep, Foundation, StructuralFrame, FloorSlabs, ExternalWalls, WindowsGlazing, Roofing, Scaffolding, MEPSystems, InteriorFinishing, ExteriorFinishing, ConstructionCrane...
// Wait, Scaffolding is in between!
// Let's just extract SitePrep to ExteriorFinishing.
const endRegex = /function ConstructionCrane\(/;
const endMatch = content.match(endRegex);

if (!endMatch) {
    console.error("Could not find ConstructionCrane");
    process.exit(1);
}

const endIndex = endMatch.index;

const extractedCode = content.substring(startIndex, endIndex);

// Now we need to remove Scaffolding from the extracted code if it's there
let buildingStructureCode = `
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { BUILDING, getPhaseOpacity, ConstructionPhase, SceneConfig } from './shared';

${extractedCode}
`;

// Remove the extracted chunk from original file
const newContent = content.substring(0, startIndex) + content.substring(endIndex);

// Add imports for the new components at the top of Construction3D
// We will just do a simple replace
const finalContent = newContent.replace(
    'import { MaterialPiles, SiteOffice, ParkingArea, CompassIndicator, WeatherEffects } from "./components/3d/Environment";',
    'import { MaterialPiles, SiteOffice, ParkingArea, CompassIndicator, WeatherEffects } from "./components/3d/Environment";\nimport { SitePrep, Foundation, StructuralFrame, FloorSlabs, ExternalWalls, WindowsGlazing, Roofing, MEPSystems, InteriorFinishing, ExteriorFinishing } from "./components/3d/BuildingStructure";'
);

fs.writeFileSync(path.join(__dirname, 'src/app/admin/pm/construction-3d/components/3d/BuildingStructure.tsx'), buildingStructureCode);
fs.writeFileSync(filePath, finalContent);

console.log("Extraction successful!");
