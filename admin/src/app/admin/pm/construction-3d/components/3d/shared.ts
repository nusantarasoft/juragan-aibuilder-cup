export const BUILDING = {
  width: 40,
  depth: 30,
  heightPerFloor: 3,
  floorHeight: 3, // alias for compatibility
  floors: 5,
  windowsPerSide: 4,
  wallThickness: 0.5,
  windowHeight: 1.5,
};

export interface ConstructionPhase {
  icon?: any;
  tasks?: any[];
  id: string;
  name: string;
  shortName?: string;
  color?: string;
  gradient?: string;
  startPercent: number;
  endPercent: number;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface SceneConfig {
  xray?: boolean;
  wireframe?: boolean;
  materials?: boolean;
  lighting?: 'day' | 'night' | 'dusk';
  weather?: 'clear' | 'rain' | 'snow';
  showWorkers?: boolean;
  showVehicles?: boolean;
  showSafety?: boolean;
  showSafetyZones?: boolean;
  showMeasurements?: boolean;
  showZones?: boolean;
  quality?: 'low' | 'medium' | 'high';
  floors?: number;
  buildingWidth?: number;
  buildingDepth?: number;
  floorHeight?: number;
  buildingShape?: "rectangular" | "l_shape" | "u_shape";
  roofType?: "flat" | "pitched" | "sawtooth";
  hasBasement?: boolean;
  wallColor?: string;
  glassColor?: string;
  roofColor?: string;
  uploadedModelUrl?: string;
  modelScale?: number;
  modelRotation?: number;
  landAcres?: number;
  fieldRows?: number;
  fieldCols?: number;
  simulateTime?: boolean;
  showWeather?: boolean;
  weatherType?: 'clear' | 'rain' | 'snow';
  highQualityGraphics?: boolean;
  showCompass?: boolean;
  autoRotate?: boolean;
  cameraMode?: 'perspective' | 'orthographic';
  postProcessing?: boolean;
  cropType?: "grain" | "vegetable" | "fruit" | "rice";
  hasBarn?: boolean;
  hasSilo?: boolean;
  hasGreenhouse?: boolean;
  machineCount?: number;
  conveyorLength?: number;
  factoryWidth?: number;
  factoryDepth?: number;
  productionLines?: number;
  hasLoadingDock?: boolean;
  blockCount?: number;
}

export const getPhaseOpacity = (progress: number, start: number, end: number) => {
  if (progress < start) return 0;
  if (progress > end) return 1;
  return (progress - start) / (end - start);
};
