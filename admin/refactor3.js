const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'src/app/admin/pm/construction-3d/Construction3D.tsx');
let mainContent = fs.readFileSync(mainPath, 'utf-8');

// Find ConstructionCrane to DumpTruck
const startRegex = /function ConstructionCrane\(/;
const startMatch = mainContent.match(startRegex);

// DumpTruck ends before SafetyZones
const endRegex = /function SafetyZones\(/;
const endMatch = mainContent.match(endRegex);

if (startMatch && endMatch) {
    const startIndex = startMatch.index;
    const endIndex = endMatch.index;

    let vehiclesCode = mainContent.substring(startIndex, endIndex);

    // Remove them from mainContent
    mainContent = mainContent.substring(0, startIndex) + mainContent.substring(endIndex);

    // Fix exports
    vehiclesCode = vehiclesCode.replace(/function ConstructionCrane/g, 'export function ConstructionCrane');
    vehiclesCode = vehiclesCode.replace(/function Excavator/g, 'export function Excavator');
    vehiclesCode = vehiclesCode.replace(/function ConcreteMixer/g, 'export function ConcreteMixer');
    vehiclesCode = vehiclesCode.replace(/function DumpTruck/g, 'export function DumpTruck');

    // Append to Vehicles.tsx
    const vehiclesPath = path.join(__dirname, 'src/app/admin/pm/construction-3d/components/3d/Vehicles.tsx');
    fs.appendFileSync(vehiclesPath, '\n' + vehiclesCode);

    // Add imports to mainContent
    mainContent = mainContent.replace(
        'import { MaterialPiles, SiteOffice, ParkingArea, CompassIndicator, WeatherEffects } from "./components/3d/Environment";',
        'import { MaterialPiles, SiteOffice, ParkingArea, CompassIndicator, WeatherEffects } from "./components/3d/Environment";\nimport { ConstructionCrane, Excavator, ConcreteMixer, DumpTruck } from "./components/3d/Vehicles";'
    );

    fs.writeFileSync(mainPath, mainContent);
    console.log("Vehicles extracted successfully!");
} else {
    console.error("Could not find start or end for vehicles");
}

// Same for Utilities (SafetyZones to GlobalClippingPlane)
// But wait, the user's diff showed SafetyZones was at line 1917.
// I will extract SafetyZones, GroundAccessRoad, BuildingWing, PlacedObject, DraggableObject, GlobalClippingPlane.
// BuildingWing is technically a structure, but let's just leave the rest in Construction3D.tsx for now. The file is already drastically smaller.
