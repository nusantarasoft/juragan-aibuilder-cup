const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'src/app/admin/pm/construction-3d/Construction3D.tsx');
let content = fs.readFileSync(mainPath, 'utf-8');

// 1. Remove large duplicated components from line ~388 to BuildingScene
const startMatch = content.match(/function UploadedModel/);
const endMatch = content.match(/function BuildingScene/);

if (startMatch && endMatch) {
    const startIndex = startMatch.index;
    const endIndex = endMatch.index;
    content = content.substring(0, startIndex) + content.substring(endIndex);
    console.log("Removed monolithic functions");
}

// 2. Remove ConstructionPhase interface (already imported)
content = content.replace(/interface ConstructionPhase \{[\s\S]*?tasks: ConstructionTask\[\];\n\}\n/g, '');

// 3. Add shared imports
if (!content.includes('import { ConstructionPhase, SceneConfig }')) {
    content = content.replace(
        'import { ForkliftLoader, ConstructionWorkers, TowerCrane, ConstructionFence, VIEW_PRESETS, CameraAnimator } from "./components/3d/Vehicles";',
        'import { ForkliftLoader, ConstructionWorkers, TowerCrane, ConstructionFence, VIEW_PRESETS, CameraAnimator } from "./components/3d/Vehicles";\nimport { ConstructionPhase, SceneConfig } from "./components/3d/shared";'
    );
}

// 4. Add back the Phase 19 post processing changes that were lost!
if (!content.includes('SoftShadows')) {
    content = content.replace(
        'Grid, Line, Instances, Instance, Text } from "@react-three/drei";',
        'Grid, Line, Instances, Instance, Text, SoftShadows } from "@react-three/drei";'
    );
    // Add SoftShadows before WeatherEffects
    content = content.replace(
        '<WeatherEffects enabled={!!(sceneConfig.showWeather)',
        '{!xray && sceneConfig.postProcessing && (<SoftShadows size={20} samples={10} focus={0.5} />)}\n            <WeatherEffects enabled={!!(sceneConfig.showWeather)'
    );
}

fs.writeFileSync(mainPath, content);
console.log("Cleanup and restoration complete.");
