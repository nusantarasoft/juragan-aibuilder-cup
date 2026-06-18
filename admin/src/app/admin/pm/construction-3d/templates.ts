// ═══════════════════════════════════════════════════════════════
// ██  3D PROJECT VISUALIZATION — TEMPLATE REGISTRY  ██
// ═══════════════════════════════════════════════════════════════

// --- Core Types ---

export interface PhaseTask {
  id: string;
  name: string;
  assignee: string;
  status: "completed" | "in_progress" | "pending";
  completion: number;
  startDate: string;
  endDate: string;
}

export interface PhaseDefinition {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  gradient: string;
  startPercent: number;
  endPercent: number;
  startDate: string;
  endDate: string;
  description?: string;
  tasks: PhaseTask[];
}

export interface SceneConfig {
  // Construction
  floors?: number;
  buildingWidth?: number;
  buildingDepth?: number;
  floorHeight?: number;
  buildingShape?: "rectangular" | "l_shape" | "u_shape";
  roofType?: "flat" | "pitched" | "sawtooth";
  hasBasement?: boolean;
  // Farming
  fieldRows?: number;
  fieldCols?: number;
  landAcres?: number; // User inputs acres → auto-compute fieldRows/fieldCols
  hasBarn?: boolean;
  hasSilo?: boolean;
  cropType?: "grain" | "vegetable" | "fruit" | "rice";
  hasGreenhouse?: boolean;
  hasOrchard?: boolean;
  hasPond?: boolean;
  season?: "spring" | "summer" | "fall" | "winter";
  // Manufacturing
  machineCount?: number;
  conveyorLength?: number;
  hasLoadingDock?: boolean;
  factoryWidth?: number;
  factoryDepth?: number;
  productionLines?: number;
  // Generic
  blockCount?: number;
  // 3D Model Upload (Construction)
  uploadedModelUrl?: string;
  modelScale?: number;
  modelRotation?: number; // Y-axis rotation in degrees
  // Material Palette
  wallColor?: string;
  roofColor?: string;
  glassColor?: string;
  // Site Feature Toggles
  showWeather?: boolean;
  weatherType?: "rain" | "snow" | "clear";
  showSafetyZones?: boolean;
  showVehicles?: boolean;
  showWorkers?: boolean;
  showCompass?: boolean;
  // Visual Quality
  highQualityGraphics?: boolean;
  visualStyle?: "realistic" | "sketchup";
  cameraMode?: "perspective" | "orthographic";
  simulateTime?: boolean;
  timeOfDay?: "morning" | "noon" | "sunset" | "night";
  autoRotate?: boolean;
}

// Helper: convert acres to field grid dimensions (roughly 1 acre ≈ 63.6m × 63.6m)
export function acresToFieldGrid(acres: number): { rows: number; cols: number } {
  const side = Math.sqrt(acres) * 8; // scale for 3D scene units
  const cols = Math.max(4, Math.round(side * 1.5));
  const rows = Math.max(3, Math.round(side));
  return { rows: Math.min(rows, 24), cols: Math.min(cols, 36) };
}

export interface SceneProps {
  progress: number;
  selectedPhase: string | null;
  xray: boolean;
  config: SceneConfig;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultPhases: PhaseDefinition[];
  defaultConfig: SceneConfig;
  groundColor: { dark: string; light: string };
  cameraDefaults: { position: [number, number, number]; target: [number, number, number] };
}

// --- Utility ---
export function getPhaseOpacity(progress: number, startPct: number, endPct: number): number {
  if (progress <= startPct) return 0;
  if (progress >= endPct) return 1;
  return (progress - startPct) / (endPct - startPct);
}

// ═══════════════════════════════════════════════════════════════
// 🏗️  CONSTRUCTION TEMPLATE
// ═══════════════════════════════════════════════════════════════

const CONSTRUCTION_PHASES: PhaseDefinition[] = [
  {
    id: "site_prep", name: "Site Preparation", shortName: "Site", icon: "🚜",
    color: "#8B6914", gradient: "linear-gradient(135deg, #8B6914, #D4A017)",
    startPercent: 0, endPercent: 8, startDate: "2025-01-15", endDate: "2025-03-01",
    tasks: [
      { id: "t1", name: "Site survey & geotechnical", assignee: "Ahmad R.", status: "completed", completion: 100, startDate: "2025-01-15", endDate: "2025-02-01" },
      { id: "t2", name: "Clear vegetation & demolition", assignee: "Budi S.", status: "completed", completion: 100, startDate: "2025-02-01", endDate: "2025-02-15" },
      { id: "t3", name: "Excavation & grading", assignee: "Cahyo P.", status: "completed", completion: 100, startDate: "2025-02-15", endDate: "2025-03-01" },
    ],
  },
  {
    id: "foundation", name: "Foundation", shortName: "Found.", icon: "🧱",
    color: "#6B7280", gradient: "linear-gradient(135deg, #6B7280, #9CA3AF)",
    startPercent: 8, endPercent: 20, startDate: "2025-03-01", endDate: "2025-05-15",
    tasks: [
      { id: "t4", name: "Pile driving", assignee: "Dedi M.", status: "completed", completion: 100, startDate: "2025-03-01", endDate: "2025-03-20" },
      { id: "t5", name: "Foundation slab pouring", assignee: "Eko W.", status: "completed", completion: 100, startDate: "2025-03-20", endDate: "2025-04-15" },
      { id: "t6", name: "Waterproofing & curing", assignee: "Fajar T.", status: "completed", completion: 100, startDate: "2025-04-15", endDate: "2025-05-15" },
    ],
  },
  {
    id: "structure", name: "Structural Frame", shortName: "Struct.", icon: "🏗️",
    color: "#3B82F6", gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    startPercent: 20, endPercent: 42, startDate: "2025-05-15", endDate: "2025-09-01",
    tasks: [
      { id: "t7", name: "Column erection - GF to 2F", assignee: "Gunawan H.", status: "completed", completion: 100, startDate: "2025-05-15", endDate: "2025-06-15" },
      { id: "t8", name: "Column erection - 3F to 5F", assignee: "Gunawan H.", status: "completed", completion: 100, startDate: "2025-06-15", endDate: "2025-07-20" },
      { id: "t9", name: "Beam installation all floors", assignee: "Hadi K.", status: "completed", completion: 100, startDate: "2025-07-01", endDate: "2025-08-15" },
      { id: "t10", name: "Steel connections & welding", assignee: "Irfan N.", status: "completed", completion: 100, startDate: "2025-08-01", endDate: "2025-09-01" },
    ],
  },
  {
    id: "floor_slabs", name: "Floor Slabs", shortName: "Floors", icon: "📐",
    color: "#8B5CF6", gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
    startPercent: 35, endPercent: 50, startDate: "2025-08-01", endDate: "2025-10-15",
    tasks: [
      { id: "t11", name: "Formwork installation", assignee: "Joko L.", status: "completed", completion: 100, startDate: "2025-08-01", endDate: "2025-08-20" },
      { id: "t12", name: "Rebar placement", assignee: "Kurnia S.", status: "completed", completion: 100, startDate: "2025-08-20", endDate: "2025-09-10" },
      { id: "t13", name: "Concrete pour all floors", assignee: "Luthfi A.", status: "completed", completion: 100, startDate: "2025-09-10", endDate: "2025-10-01" },
      { id: "t14", name: "Curing & stripping", assignee: "Mulia R.", status: "in_progress", completion: 75, startDate: "2025-10-01", endDate: "2025-10-15" },
    ],
  },
  {
    id: "ext_walls", name: "External Walls", shortName: "Walls", icon: "🧱",
    color: "#F59E0B", gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)",
    startPercent: 45, endPercent: 62, startDate: "2025-09-15", endDate: "2025-12-15",
    tasks: [
      { id: "t15", name: "Masonry walls GF-2F", assignee: "Nanda P.", status: "completed", completion: 100, startDate: "2025-09-15", endDate: "2025-10-20" },
      { id: "t16", name: "Masonry walls 3F-5F", assignee: "Nanda P.", status: "in_progress", completion: 60, startDate: "2025-10-20", endDate: "2025-11-25" },
      { id: "t17", name: "External cladding", assignee: "Omar B.", status: "pending", completion: 0, startDate: "2025-11-25", endDate: "2025-12-15" },
    ],
  },
  {
    id: "windows", name: "Windows & Glazing", shortName: "Windows", icon: "🪟",
    color: "#06B6D4", gradient: "linear-gradient(135deg, #06B6D4, #22D3EE)",
    startPercent: 55, endPercent: 70, startDate: "2025-11-01", endDate: "2026-01-15",
    tasks: [
      { id: "t18", name: "Window frame installation", assignee: "Putra D.", status: "in_progress", completion: 40, startDate: "2025-11-01", endDate: "2025-12-10" },
      { id: "t19", name: "Glass panel fitting", assignee: "Reza K.", status: "pending", completion: 0, startDate: "2025-12-10", endDate: "2026-01-05" },
      { id: "t20", name: "Sealant & weatherproofing", assignee: "Samsul W.", status: "pending", completion: 0, startDate: "2026-01-05", endDate: "2026-01-15" },
    ],
  },
  {
    id: "roofing", name: "Roofing", shortName: "Roof", icon: "🏠",
    color: "#EF4444", gradient: "linear-gradient(135deg, #EF4444, #F87171)",
    startPercent: 62, endPercent: 72, startDate: "2025-12-15", endDate: "2026-02-01",
    tasks: [
      { id: "t21", name: "Roof structure", assignee: "Taufik M.", status: "pending", completion: 0, startDate: "2025-12-15", endDate: "2026-01-10" },
      { id: "t22", name: "Waterproofing membrane", assignee: "Umar S.", status: "pending", completion: 0, startDate: "2026-01-10", endDate: "2026-01-20" },
      { id: "t23", name: "Rooftop equipment pads", assignee: "Vino R.", status: "pending", completion: 0, startDate: "2026-01-20", endDate: "2026-02-01" },
    ],
  },
  {
    id: "mep", name: "MEP Systems", shortName: "MEP", icon: "⚡",
    color: "#10B981", gradient: "linear-gradient(135deg, #10B981, #34D399)",
    startPercent: 50, endPercent: 80, startDate: "2025-10-15", endDate: "2026-03-15",
    tasks: [
      { id: "t24", name: "Electrical rough-in", assignee: "Wahyu L.", status: "in_progress", completion: 45, startDate: "2025-10-15", endDate: "2025-12-15" },
      { id: "t25", name: "Plumbing rough-in", assignee: "Xander T.", status: "pending", completion: 0, startDate: "2025-11-15", endDate: "2026-01-15" },
      { id: "t26", name: "HVAC ductwork", assignee: "Yanto B.", status: "pending", completion: 0, startDate: "2026-01-01", endDate: "2026-02-15" },
      { id: "t27", name: "Fire protection systems", assignee: "Zaki N.", status: "pending", completion: 0, startDate: "2026-02-15", endDate: "2026-03-15" },
    ],
  },
  {
    id: "interior", name: "Interior Finishing", shortName: "Interior", icon: "🎨",
    color: "#EC4899", gradient: "linear-gradient(135deg, #EC4899, #F472B6)",
    startPercent: 75, endPercent: 92, startDate: "2026-03-01", endDate: "2026-06-01",
    tasks: [
      { id: "t28", name: "Partition walls", assignee: "Ahmad R.", status: "pending", completion: 0, startDate: "2026-03-01", endDate: "2026-03-20" },
      { id: "t29", name: "Floor tiling", assignee: "Budi S.", status: "pending", completion: 0, startDate: "2026-03-20", endDate: "2026-04-15" },
      { id: "t30", name: "Ceiling installation", assignee: "Cahyo P.", status: "pending", completion: 0, startDate: "2026-04-15", endDate: "2026-05-01" },
      { id: "t31", name: "Painting & wall finishes", assignee: "Dedi M.", status: "pending", completion: 0, startDate: "2026-05-01", endDate: "2026-05-20" },
      { id: "t32", name: "Door & hardware installation", assignee: "Eko W.", status: "pending", completion: 0, startDate: "2026-05-20", endDate: "2026-06-01" },
    ],
  },
  {
    id: "exterior", name: "Exterior & Landscape", shortName: "Exterior", icon: "🌳",
    color: "#14B8A6", gradient: "linear-gradient(135deg, #14B8A6, #2DD4BF)",
    startPercent: 88, endPercent: 100, startDate: "2026-05-15", endDate: "2026-07-15",
    tasks: [
      { id: "t33", name: "Entrance canopy & signage", assignee: "Fajar T.", status: "pending", completion: 0, startDate: "2026-05-15", endDate: "2026-06-01" },
      { id: "t34", name: "Landscaping & planting", assignee: "Gunawan H.", status: "pending", completion: 0, startDate: "2026-06-01", endDate: "2026-06-20" },
      { id: "t35", name: "Parking lot & paving", assignee: "Hadi K.", status: "pending", completion: 0, startDate: "2026-06-20", endDate: "2026-07-05" },
      { id: "t36", name: "Final cleanup & handover", assignee: "Irfan N.", status: "pending", completion: 0, startDate: "2026-07-05", endDate: "2026-07-15" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// 🌾  FARMING TEMPLATE
// ═══════════════════════════════════════════════════════════════

const FARMING_PHASES: PhaseDefinition[] = [
  {
    id: "land_prep", name: "Land Preparation", shortName: "Land", icon: "🚜",
    color: "#92400E", gradient: "linear-gradient(135deg, #92400E, #B45309)",
    startPercent: 0, endPercent: 12, startDate: "2025-01-15", endDate: "2025-02-15",
    tasks: [
      { id: "f1", name: "Soil testing & analysis", assignee: "Agus P.", status: "completed", completion: 100, startDate: "2025-01-15", endDate: "2025-01-25" },
      { id: "f2", name: "Land clearing & plowing", assignee: "Bambang S.", status: "completed", completion: 100, startDate: "2025-01-25", endDate: "2025-02-10" },
      { id: "f3", name: "Soil amendment & fertilizing", assignee: "Candra W.", status: "completed", completion: 100, startDate: "2025-02-10", endDate: "2025-02-15" },
    ],
  },
  {
    id: "irrigation", name: "Irrigation Setup", shortName: "Irrigation", icon: "💧",
    color: "#0284C7", gradient: "linear-gradient(135deg, #0284C7, #38BDF8)",
    startPercent: 10, endPercent: 22, startDate: "2025-02-10", endDate: "2025-03-15",
    tasks: [
      { id: "f4", name: "Main canal excavation", assignee: "Dwi K.", status: "completed", completion: 100, startDate: "2025-02-10", endDate: "2025-02-25" },
      { id: "f5", name: "Pipe installation", assignee: "Eko R.", status: "completed", completion: 100, startDate: "2025-02-25", endDate: "2025-03-10" },
      { id: "f6", name: "Sprinkler/drip system setup", assignee: "Farid N.", status: "completed", completion: 100, startDate: "2025-03-10", endDate: "2025-03-15" },
    ],
  },
  {
    id: "seeding", name: "Seeding & Planting", shortName: "Seeding", icon: "🌱",
    color: "#15803D", gradient: "linear-gradient(135deg, #15803D, #22C55E)",
    startPercent: 20, endPercent: 35, startDate: "2025-03-10", endDate: "2025-04-20",
    tasks: [
      { id: "f7", name: "Seed selection & procurement", assignee: "Gani M.", status: "completed", completion: 100, startDate: "2025-03-10", endDate: "2025-03-20" },
      { id: "f8", name: "Row planting - Phase 1", assignee: "Haris B.", status: "completed", completion: 100, startDate: "2025-03-20", endDate: "2025-04-05" },
      { id: "f9", name: "Row planting - Phase 2", assignee: "Haris B.", status: "in_progress", completion: 70, startDate: "2025-04-05", endDate: "2025-04-20" },
    ],
  },
  {
    id: "growth", name: "Growth & Monitoring", shortName: "Growth", icon: "🌿",
    color: "#059669", gradient: "linear-gradient(135deg, #059669, #34D399)",
    startPercent: 32, endPercent: 55, startDate: "2025-04-15", endDate: "2025-07-01",
    tasks: [
      { id: "f10", name: "Growth monitoring setup", assignee: "Indra L.", status: "in_progress", completion: 50, startDate: "2025-04-15", endDate: "2025-05-15" },
      { id: "f11", name: "Fertilizer application cycle", assignee: "Jaya T.", status: "pending", completion: 0, startDate: "2025-05-01", endDate: "2025-06-15" },
      { id: "f12", name: "Weed management", assignee: "Krisna D.", status: "pending", completion: 0, startDate: "2025-05-15", endDate: "2025-07-01" },
    ],
  },
  {
    id: "pest_control", name: "Pest Control", shortName: "Pest", icon: "🐛",
    color: "#DC2626", gradient: "linear-gradient(135deg, #DC2626, #F87171)",
    startPercent: 40, endPercent: 60, startDate: "2025-05-15", endDate: "2025-07-15",
    tasks: [
      { id: "f13", name: "Pest identification survey", assignee: "Lukman A.", status: "pending", completion: 0, startDate: "2025-05-15", endDate: "2025-06-01" },
      { id: "f14", name: "Organic pest treatment", assignee: "Mukhlis R.", status: "pending", completion: 0, startDate: "2025-06-01", endDate: "2025-06-20" },
      { id: "f15", name: "Monitoring & reapplication", assignee: "Nabil S.", status: "pending", completion: 0, startDate: "2025-06-20", endDate: "2025-07-15" },
    ],
  },
  {
    id: "harvest_prep", name: "Harvest Preparation", shortName: "Prep", icon: "📋",
    color: "#D97706", gradient: "linear-gradient(135deg, #D97706, #FBBF24)",
    startPercent: 58, endPercent: 70, startDate: "2025-07-10", endDate: "2025-08-15",
    tasks: [
      { id: "f16", name: "Equipment maintenance", assignee: "Omar W.", status: "pending", completion: 0, startDate: "2025-07-10", endDate: "2025-07-25" },
      { id: "f17", name: "Storage preparation", assignee: "Pandu K.", status: "pending", completion: 0, startDate: "2025-07-25", endDate: "2025-08-10" },
      { id: "f18", name: "Harvest team coordination", assignee: "Qasim H.", status: "pending", completion: 0, startDate: "2025-08-10", endDate: "2025-08-15" },
    ],
  },
  {
    id: "harvesting", name: "Harvesting", shortName: "Harvest", icon: "🌾",
    color: "#CA8A04", gradient: "linear-gradient(135deg, #CA8A04, #EAB308)",
    startPercent: 68, endPercent: 82, startDate: "2025-08-10", endDate: "2025-09-15",
    tasks: [
      { id: "f19", name: "Mechanical harvesting", assignee: "Rizal M.", status: "pending", completion: 0, startDate: "2025-08-10", endDate: "2025-08-30" },
      { id: "f20", name: "Manual collection", assignee: "Surya T.", status: "pending", completion: 0, startDate: "2025-08-30", endDate: "2025-09-15" },
    ],
  },
  {
    id: "processing", name: "Processing", shortName: "Process", icon: "⚙️",
    color: "#7C3AED", gradient: "linear-gradient(135deg, #7C3AED, #A78BFA)",
    startPercent: 78, endPercent: 88, startDate: "2025-09-01", endDate: "2025-10-01",
    tasks: [
      { id: "f21", name: "Sorting & grading", assignee: "Toni A.", status: "pending", completion: 0, startDate: "2025-09-01", endDate: "2025-09-12" },
      { id: "f22", name: "Cleaning & drying", assignee: "Udin N.", status: "pending", completion: 0, startDate: "2025-09-12", endDate: "2025-09-25" },
      { id: "f23", name: "Packaging", assignee: "Veri S.", status: "pending", completion: 0, startDate: "2025-09-25", endDate: "2025-10-01" },
    ],
  },
  {
    id: "storage", name: "Storage", shortName: "Store", icon: "🏪",
    color: "#6366F1", gradient: "linear-gradient(135deg, #6366F1, #818CF8)",
    startPercent: 86, endPercent: 94, startDate: "2025-09-25", endDate: "2025-10-20",
    tasks: [
      { id: "f24", name: "Warehouse loading", assignee: "Wahid K.", status: "pending", completion: 0, startDate: "2025-09-25", endDate: "2025-10-10" },
      { id: "f25", name: "Inventory registration", assignee: "Xeno R.", status: "pending", completion: 0, startDate: "2025-10-10", endDate: "2025-10-20" },
    ],
  },
  {
    id: "distribution", name: "Distribution", shortName: "Distrib.", icon: "🚛",
    color: "#0891B2", gradient: "linear-gradient(135deg, #0891B2, #22D3EE)",
    startPercent: 92, endPercent: 100, startDate: "2025-10-15", endDate: "2025-11-15",
    tasks: [
      { id: "f26", name: "Logistics coordination", assignee: "Yudi P.", status: "pending", completion: 0, startDate: "2025-10-15", endDate: "2025-10-30" },
      { id: "f27", name: "Market delivery", assignee: "Zainal M.", status: "pending", completion: 0, startDate: "2025-10-30", endDate: "2025-11-15" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// 🏭  MANUFACTURING TEMPLATE
// ═══════════════════════════════════════════════════════════════

const MANUFACTURING_PHASES: PhaseDefinition[] = [
  {
    id: "design", name: "Product Design", shortName: "Design", icon: "📐",
    color: "#7C3AED", gradient: "linear-gradient(135deg, #7C3AED, #A78BFA)",
    startPercent: 0, endPercent: 12, startDate: "2025-01-15", endDate: "2025-02-28",
    tasks: [
      { id: "m1", name: "CAD modeling & prototyping", assignee: "Andi W.", status: "completed", completion: 100, startDate: "2025-01-15", endDate: "2025-02-10" },
      { id: "m2", name: "Design review & approval", assignee: "Bima T.", status: "completed", completion: 100, startDate: "2025-02-10", endDate: "2025-02-28" },
    ],
  },
  {
    id: "raw_materials", name: "Raw Materials", shortName: "Materials", icon: "📦",
    color: "#92400E", gradient: "linear-gradient(135deg, #92400E, #B45309)",
    startPercent: 10, endPercent: 25, startDate: "2025-02-20", endDate: "2025-04-15",
    tasks: [
      { id: "m3", name: "Supplier sourcing", assignee: "Citra N.", status: "completed", completion: 100, startDate: "2025-02-20", endDate: "2025-03-15" },
      { id: "m4", name: "Material procurement", assignee: "Dinda P.", status: "completed", completion: 100, startDate: "2025-03-15", endDate: "2025-04-05" },
      { id: "m5", name: "Quality inspection", assignee: "Eka S.", status: "completed", completion: 100, startDate: "2025-04-05", endDate: "2025-04-15" },
    ],
  },
  {
    id: "machine_setup", name: "Machine Setup", shortName: "Setup", icon: "🔧",
    color: "#475569", gradient: "linear-gradient(135deg, #475569, #94A3B8)",
    startPercent: 22, endPercent: 35, startDate: "2025-04-10", endDate: "2025-05-20",
    tasks: [
      { id: "m6", name: "Machine calibration", assignee: "Faisal K.", status: "completed", completion: 100, startDate: "2025-04-10", endDate: "2025-04-25" },
      { id: "m7", name: "Tooling installation", assignee: "Gilang R.", status: "completed", completion: 100, startDate: "2025-04-25", endDate: "2025-05-10" },
      { id: "m8", name: "Test run & validation", assignee: "Hendra M.", status: "in_progress", completion: 80, startDate: "2025-05-10", endDate: "2025-05-20" },
    ],
  },
  {
    id: "production", name: "Production Line", shortName: "Production", icon: "🏭",
    color: "#2563EB", gradient: "linear-gradient(135deg, #2563EB, #60A5FA)",
    startPercent: 33, endPercent: 55, startDate: "2025-05-15", endDate: "2025-08-01",
    tasks: [
      { id: "m9", name: "Batch production - Phase 1", assignee: "Ilham W.", status: "in_progress", completion: 60, startDate: "2025-05-15", endDate: "2025-06-15" },
      { id: "m10", name: "Batch production - Phase 2", assignee: "Ilham W.", status: "pending", completion: 0, startDate: "2025-06-15", endDate: "2025-07-15" },
      { id: "m11", name: "Continuous production", assignee: "Jefri S.", status: "pending", completion: 0, startDate: "2025-07-15", endDate: "2025-08-01" },
    ],
  },
  {
    id: "assembly", name: "Assembly", shortName: "Assembly", icon: "🔩",
    color: "#0891B2", gradient: "linear-gradient(135deg, #0891B2, #22D3EE)",
    startPercent: 50, endPercent: 65, startDate: "2025-07-20", endDate: "2025-09-10",
    tasks: [
      { id: "m12", name: "Sub-assembly line", assignee: "Kurnia L.", status: "pending", completion: 0, startDate: "2025-07-20", endDate: "2025-08-10" },
      { id: "m13", name: "Final assembly", assignee: "Lutfi A.", status: "pending", completion: 0, startDate: "2025-08-10", endDate: "2025-09-01" },
      { id: "m14", name: "Integration testing", assignee: "Maulana D.", status: "pending", completion: 0, startDate: "2025-09-01", endDate: "2025-09-10" },
    ],
  },
  {
    id: "quality", name: "Quality Control", shortName: "QC", icon: "✅",
    color: "#16A34A", gradient: "linear-gradient(135deg, #16A34A, #4ADE80)",
    startPercent: 62, endPercent: 75, startDate: "2025-09-05", endDate: "2025-10-15",
    tasks: [
      { id: "m15", name: "Visual inspection", assignee: "Nanda R.", status: "pending", completion: 0, startDate: "2025-09-05", endDate: "2025-09-20" },
      { id: "m16", name: "Functional testing", assignee: "Oscar P.", status: "pending", completion: 0, startDate: "2025-09-20", endDate: "2025-10-05" },
      { id: "m17", name: "Certification", assignee: "Prima H.", status: "pending", completion: 0, startDate: "2025-10-05", endDate: "2025-10-15" },
    ],
  },
  {
    id: "packaging", name: "Packaging", shortName: "Pack", icon: "📦",
    color: "#D97706", gradient: "linear-gradient(135deg, #D97706, #FBBF24)",
    startPercent: 72, endPercent: 82, startDate: "2025-10-10", endDate: "2025-11-10",
    tasks: [
      { id: "m18", name: "Packaging design", assignee: "Qori W.", status: "pending", completion: 0, startDate: "2025-10-10", endDate: "2025-10-25" },
      { id: "m19", name: "Labeling & sealing", assignee: "Rama S.", status: "pending", completion: 0, startDate: "2025-10-25", endDate: "2025-11-10" },
    ],
  },
  {
    id: "warehouse", name: "Warehousing", shortName: "Warehouse", icon: "🏪",
    color: "#6366F1", gradient: "linear-gradient(135deg, #6366F1, #818CF8)",
    startPercent: 80, endPercent: 90, startDate: "2025-11-05", endDate: "2025-12-01",
    tasks: [
      { id: "m20", name: "Inventory intake", assignee: "Sandi K.", status: "pending", completion: 0, startDate: "2025-11-05", endDate: "2025-11-20" },
      { id: "m21", name: "Storage optimization", assignee: "Teguh M.", status: "pending", completion: 0, startDate: "2025-11-20", endDate: "2025-12-01" },
    ],
  },
  {
    id: "shipping", name: "Shipping", shortName: "Ship", icon: "🚛",
    color: "#0E7490", gradient: "linear-gradient(135deg, #0E7490, #06B6D4)",
    startPercent: 88, endPercent: 96, startDate: "2025-11-25", endDate: "2025-12-20",
    tasks: [
      { id: "m22", name: "Order fulfillment", assignee: "Umar B.", status: "pending", completion: 0, startDate: "2025-11-25", endDate: "2025-12-10" },
      { id: "m23", name: "Logistics dispatch", assignee: "Vino T.", status: "pending", completion: 0, startDate: "2025-12-10", endDate: "2025-12-20" },
    ],
  },
  {
    id: "maintenance", name: "Maintenance", shortName: "Maint.", icon: "🔧",
    color: "#DC2626", gradient: "linear-gradient(135deg, #DC2626, #F87171)",
    startPercent: 94, endPercent: 100, startDate: "2025-12-15", endDate: "2026-01-15",
    tasks: [
      { id: "m24", name: "Machine servicing", assignee: "Wawan S.", status: "pending", completion: 0, startDate: "2025-12-15", endDate: "2026-01-05" },
      { id: "m25", name: "Process review & optimization", assignee: "Yusuf A.", status: "pending", completion: 0, startDate: "2026-01-05", endDate: "2026-01-15" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// 📦  GENERIC TEMPLATE
// ═══════════════════════════════════════════════════════════════

const GENERIC_PHASES: PhaseDefinition[] = [
  {
    id: "initiation", name: "Initiation", shortName: "Init", icon: "🚀",
    color: "#7C3AED", gradient: "linear-gradient(135deg, #7C3AED, #A78BFA)",
    startPercent: 0, endPercent: 10, startDate: "2025-01-15", endDate: "2025-02-15",
    tasks: [
      { id: "g1", name: "Project charter", assignee: "Team Lead", status: "completed", completion: 100, startDate: "2025-01-15", endDate: "2025-01-30" },
      { id: "g2", name: "Stakeholder identification", assignee: "PM", status: "completed", completion: 100, startDate: "2025-01-30", endDate: "2025-02-15" },
    ],
  },
  {
    id: "planning", name: "Planning", shortName: "Plan", icon: "📋",
    color: "#2563EB", gradient: "linear-gradient(135deg, #2563EB, #60A5FA)",
    startPercent: 8, endPercent: 25, startDate: "2025-02-10", endDate: "2025-04-01",
    tasks: [
      { id: "g3", name: "Scope definition", assignee: "PM", status: "completed", completion: 100, startDate: "2025-02-10", endDate: "2025-03-01" },
      { id: "g4", name: "Schedule planning", assignee: "PM", status: "completed", completion: 100, startDate: "2025-03-01", endDate: "2025-03-20" },
      { id: "g5", name: "Resource allocation", assignee: "PM", status: "completed", completion: 100, startDate: "2025-03-20", endDate: "2025-04-01" },
    ],
  },
  {
    id: "execution_1", name: "Execution Phase 1", shortName: "Exec 1", icon: "⚡",
    color: "#059669", gradient: "linear-gradient(135deg, #059669, #34D399)",
    startPercent: 23, endPercent: 45, startDate: "2025-03-25", endDate: "2025-06-15",
    tasks: [
      { id: "g6", name: "Deliverable A", assignee: "Team A", status: "in_progress", completion: 80, startDate: "2025-03-25", endDate: "2025-05-01" },
      { id: "g7", name: "Deliverable B", assignee: "Team B", status: "in_progress", completion: 50, startDate: "2025-05-01", endDate: "2025-06-15" },
    ],
  },
  {
    id: "execution_2", name: "Execution Phase 2", shortName: "Exec 2", icon: "⚡",
    color: "#0891B2", gradient: "linear-gradient(135deg, #0891B2, #22D3EE)",
    startPercent: 43, endPercent: 65, startDate: "2025-06-10", endDate: "2025-09-01",
    tasks: [
      { id: "g8", name: "Deliverable C", assignee: "Team A", status: "pending", completion: 0, startDate: "2025-06-10", endDate: "2025-07-20" },
      { id: "g9", name: "Deliverable D", assignee: "Team C", status: "pending", completion: 0, startDate: "2025-07-20", endDate: "2025-09-01" },
    ],
  },
  {
    id: "execution_3", name: "Execution Phase 3", shortName: "Exec 3", icon: "⚡",
    color: "#D97706", gradient: "linear-gradient(135deg, #D97706, #FBBF24)",
    startPercent: 63, endPercent: 82, startDate: "2025-08-25", endDate: "2025-11-15",
    tasks: [
      { id: "g10", name: "Deliverable E", assignee: "Team B", status: "pending", completion: 0, startDate: "2025-08-25", endDate: "2025-10-05" },
      { id: "g11", name: "Deliverable F", assignee: "Team C", status: "pending", completion: 0, startDate: "2025-10-05", endDate: "2025-11-15" },
    ],
  },
  {
    id: "testing", name: "Testing & QA", shortName: "QA", icon: "🧪",
    color: "#DC2626", gradient: "linear-gradient(135deg, #DC2626, #F87171)",
    startPercent: 80, endPercent: 92, startDate: "2025-11-10", endDate: "2025-12-20",
    tasks: [
      { id: "g12", name: "Integration testing", assignee: "QA Team", status: "pending", completion: 0, startDate: "2025-11-10", endDate: "2025-12-01" },
      { id: "g13", name: "User acceptance testing", assignee: "QA Team", status: "pending", completion: 0, startDate: "2025-12-01", endDate: "2025-12-20" },
    ],
  },
  {
    id: "closing", name: "Closing", shortName: "Close", icon: "🏁",
    color: "#16A34A", gradient: "linear-gradient(135deg, #16A34A, #4ADE80)",
    startPercent: 90, endPercent: 100, startDate: "2025-12-15", endDate: "2026-01-15",
    tasks: [
      { id: "g14", name: "Final documentation", assignee: "PM", status: "pending", completion: 0, startDate: "2025-12-15", endDate: "2026-01-05" },
      { id: "g15", name: "Lessons learned & handover", assignee: "PM", status: "pending", completion: 0, startDate: "2026-01-05", endDate: "2026-01-15" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// 🏥  HEALTHCARE TEMPLATE
// ═══════════════════════════════════════════════════════════════

const HEALTHCARE_PHASES: PhaseDefinition[] = [
  {
    id: "h_planning", name: "Facility Planning", shortName: "Planning", icon: "🏥",
    color: "#0284C7", gradient: "linear-gradient(135deg, #0284C7, #38BDF8)",
    startPercent: 0, endPercent: 15, startDate: "2025-01-15", endDate: "2025-03-01",
    tasks: [
      { id: "h1", name: "Medical needs assessment", assignee: "Dr. A", status: "completed", completion: 100, startDate: "2025-01-15", endDate: "2025-02-01" },
      { id: "h2", name: "Regulatory compliance review", assignee: "Dr. B", status: "completed", completion: 100, startDate: "2025-02-01", endDate: "2025-03-01" },
    ],
  },
  {
    id: "h_infrastructure", name: "Core Infrastructure", shortName: "Infra", icon: "🏗️",
    color: "#475569", gradient: "linear-gradient(135deg, #475569, #94A3B8)",
    startPercent: 12, endPercent: 35, startDate: "2025-02-15", endDate: "2025-05-15",
    tasks: [
      { id: "h3", name: "Medical gas piping", assignee: "Eng. C", status: "in_progress", completion: 60, startDate: "2025-02-15", endDate: "2025-04-10" },
      { id: "h4", name: "Backup power systems", assignee: "Eng. D", status: "pending", completion: 0, startDate: "2025-04-10", endDate: "2025-05-15" },
    ],
  },
  {
    id: "h_sterile", name: "Sterile Environments", shortName: "Sterile", icon: "✨",
    color: "#14B8A6", gradient: "linear-gradient(135deg, #14B8A6, #2DD4BF)",
    startPercent: 30, endPercent: 60, startDate: "2025-04-20", endDate: "2025-08-01",
    tasks: [
      { id: "h5", name: "Operating theater setup", assignee: "Team E", status: "pending", completion: 0, startDate: "2025-04-20", endDate: "2025-06-15" },
      { id: "h6", name: "ICU ward finishing", assignee: "Team F", status: "pending", completion: 0, startDate: "2025-06-15", endDate: "2025-08-01" },
    ],
  },
  {
    id: "h_equipment", name: "Equipment Installation", shortName: "Equipment", icon: "🩺",
    color: "#8B5CF6", gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
    startPercent: 55, endPercent: 85, startDate: "2025-07-15", endDate: "2025-10-15",
    tasks: [
      { id: "h7", name: "MRI/CT scanner delivery", assignee: "Logistics", status: "pending", completion: 0, startDate: "2025-07-15", endDate: "2025-08-20" },
      { id: "h8", name: "Calibration & testing", assignee: "Tech G", status: "pending", completion: 0, startDate: "2025-08-20", endDate: "2025-10-15" },
    ],
  },
  {
    id: "h_certification", name: "Certification", shortName: "Cert", icon: "📋",
    color: "#10B981", gradient: "linear-gradient(135deg, #10B981, #34D399)",
    startPercent: 80, endPercent: 100, startDate: "2025-10-01", endDate: "2025-12-01",
    tasks: [
      { id: "h9", name: "Health board inspection", assignee: "Admin", status: "pending", completion: 0, startDate: "2025-10-01", endDate: "2025-11-01" },
      { id: "h10", name: "Final handover", assignee: "PM", status: "pending", completion: 0, startDate: "2025-11-01", endDate: "2025-12-01" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// 🎓  EDUCATION TEMPLATE
// ═══════════════════════════════════════════════════════════════

const EDUCATION_PHASES: PhaseDefinition[] = [
  {
    id: "e_design", name: "Campus Design", shortName: "Design", icon: "🎓",
    color: "#F59E0B", gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)",
    startPercent: 0, endPercent: 15, startDate: "2025-01-15", endDate: "2025-03-01",
    tasks: [
      { id: "e1", name: "Architectural modeling", assignee: "Arch. A", status: "completed", completion: 100, startDate: "2025-01-15", endDate: "2025-02-10" },
      { id: "e2", name: "Capacity planning", assignee: "Admin B", status: "completed", completion: 100, startDate: "2025-02-10", endDate: "2025-03-01" },
    ],
  },
  {
    id: "e_academic", name: "Academic Blocks", shortName: "Academic", icon: "📚",
    color: "#3B82F6", gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    startPercent: 10, endPercent: 45, startDate: "2025-02-20", endDate: "2025-07-01",
    tasks: [
      { id: "e3", name: "Classroom construction", assignee: "Team C", status: "in_progress", completion: 40, startDate: "2025-02-20", endDate: "2025-05-15" },
      { id: "e4", name: "Library setup", assignee: "Team D", status: "pending", completion: 0, startDate: "2025-05-15", endDate: "2025-07-01" },
    ],
  },
  {
    id: "e_sports", name: "Sports Facilities", shortName: "Sports", icon: "⚽",
    color: "#10B981", gradient: "linear-gradient(135deg, #10B981, #34D399)",
    startPercent: 40, endPercent: 70, startDate: "2025-06-15", endDate: "2025-09-15",
    tasks: [
      { id: "e5", name: "Stadium seating", assignee: "Team E", status: "pending", completion: 0, startDate: "2025-06-15", endDate: "2025-08-01" },
      { id: "e6", name: "Field turf installation", assignee: "Team F", status: "pending", completion: 0, startDate: "2025-08-01", endDate: "2025-09-15" },
    ],
  },
  {
    id: "e_dorm", name: "Dormitories", shortName: "Dorms", icon: "🛏️",
    color: "#8B5CF6", gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
    startPercent: 65, endPercent: 90, startDate: "2025-08-20", endDate: "2025-11-20",
    tasks: [
      { id: "e7", name: "Residential building", assignee: "Team G", status: "pending", completion: 0, startDate: "2025-08-20", endDate: "2025-10-15" },
      { id: "e8", name: "Furnishing & utilities", assignee: "Team H", status: "pending", completion: 0, startDate: "2025-10-15", endDate: "2025-11-20" },
    ],
  },
  {
    id: "e_opening", name: "Grand Opening", shortName: "Opening", icon: "🎉",
    color: "#EC4899", gradient: "linear-gradient(135deg, #EC4899, #F472B6)",
    startPercent: 85, endPercent: 100, startDate: "2025-11-01", endDate: "2025-12-15",
    tasks: [
      { id: "e9", name: "Safety inspections", assignee: "Inspector", status: "pending", completion: 0, startDate: "2025-11-01", endDate: "2025-11-25" },
      { id: "e10", name: "Inauguration event", assignee: "PR Team", status: "pending", completion: 0, startDate: "2025-11-25", endDate: "2025-12-15" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// ██  TEMPLATE REGISTRY  ██
// ═══════════════════════════════════════════════════════════════

export const TEMPLATES: Record<string, TemplateDefinition> = {
  construction: {
    id: "construction",
    name: "Construction",
    icon: "🏗️",
    description: "Building & infrastructure projects",
    defaultPhases: CONSTRUCTION_PHASES,
    defaultConfig: { floors: 5, buildingWidth: 16, buildingDepth: 10, floorHeight: 3.5, buildingShape: "rectangular" as const, roofType: "flat" as const, hasBasement: false, highQualityGraphics: true },
    groundColor: { dark: "#111118", light: "#d8dce4" },
    cameraDefaults: { position: [20, 15, 20], target: [0, 6, 0] },
  },
  farming: {
    id: "farming",
    name: "Farming",
    icon: "🌾",
    description: "Agriculture & crop management",
    defaultPhases: FARMING_PHASES,
    defaultConfig: { fieldRows: 8, fieldCols: 12, landAcres: 2.5, hasBarn: true, hasSilo: true, cropType: "grain" as const, hasGreenhouse: false },
    groundColor: { dark: "#0a1208", light: "#d4e0c8" },
    cameraDefaults: { position: [25, 18, 25], target: [0, 1, 0] },
  },
  manufacturing: {
    id: "manufacturing",
    name: "Manufacturing",
    icon: "🏭",
    description: "Production & assembly lines",
    defaultPhases: MANUFACTURING_PHASES,
    defaultConfig: { machineCount: 6, conveyorLength: 20, hasLoadingDock: true, factoryWidth: 32, factoryDepth: 22, productionLines: 1 },
    groundColor: { dark: "#101015", light: "#dddde0" },
    cameraDefaults: { position: [22, 16, 22], target: [0, 4, 0] },
  },
  generic: {
    id: "generic",
    name: "Generic",
    icon: "📦",
    description: "Universal project visualization",
    defaultPhases: GENERIC_PHASES,
    defaultConfig: { blockCount: 7 },
    groundColor: { dark: "#0c0c14", light: "#dce0e8" },
    cameraDefaults: { position: [20, 15, 20], target: [0, 5, 0] },
  },
  healthcare: {
    id: "healthcare",
    name: "Healthcare",
    icon: "🏥",
    description: "Hospital & clinic construction",
    defaultPhases: HEALTHCARE_PHASES,
    defaultConfig: { floors: 4, buildingWidth: 20, buildingDepth: 15, floorHeight: 4, buildingShape: "u_shape" as const, roofType: "flat" as const, hasBasement: true, highQualityGraphics: true },
    groundColor: { dark: "#0f172a", light: "#e2e8f0" },
    cameraDefaults: { position: [25, 20, 25], target: [0, 8, 0] },
  },
  education: {
    id: "education",
    name: "Education",
    icon: "🎓",
    description: "Schools & university campuses",
    defaultPhases: EDUCATION_PHASES,
    defaultConfig: { floors: 3, buildingWidth: 25, buildingDepth: 12, floorHeight: 3.8, buildingShape: "l_shape" as const, roofType: "pitched" as const, hasBasement: false, highQualityGraphics: true },
    groundColor: { dark: "#1e1b4b", light: "#e0e7ff" },
    cameraDefaults: { position: [28, 18, 28], target: [0, 5, 0] },
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);
export const DEFAULT_TEMPLATE = "construction";
