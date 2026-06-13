"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import {
  Card, Button, Slider, Tag, Space, Progress, Tooltip, Typography,
  Segmented, Switch, Collapse, Badge, Row, Col, message, theme, Divider,
  Select, Spin, InputNumber, Drawer, Modal, Form, Input, Popover
} from "antd";
import {
  PlayCircleOutlined, PauseCircleOutlined, StepForwardOutlined,
  StepBackwardOutlined, FullscreenOutlined, FullscreenExitOutlined,
  EyeOutlined, EyeInvisibleOutlined, BuildOutlined, AimOutlined,
  ClockCircleOutlined, CheckCircleOutlined, DashboardOutlined,
  ToolOutlined, HomeOutlined, AppstoreOutlined, BgColorsOutlined,
  CameraOutlined, BlockOutlined, ColumnWidthOutlined,
  ThunderboltOutlined, AlertOutlined, CalendarOutlined,
  RocketOutlined, SafetyCertificateOutlined, ExperimentOutlined,
  FormatPainterOutlined, ExpandOutlined, CloudOutlined,
  DatabaseOutlined, SyncOutlined, UploadOutlined,
  DragOutlined, EditOutlined, SaveOutlined, FolderOpenOutlined, DeleteOutlined
} from "@ant-design/icons";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, TransformControls, Sky, Stars, Environment, ContactShadows, Grid, Line } from "@react-three/drei";
import { EffectComposer, Bloom, SSAO } from "@react-three/postprocessing";
import * as THREE from "three";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import dayjs from "dayjs";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import {
  TEMPLATES, TEMPLATE_LIST, DEFAULT_TEMPLATE,
  getPhaseOpacity, acresToFieldGrid,
  type PhaseDefinition, type PhaseTask, type SceneProps, type SceneConfig,
} from "./templates";

const { Text: AntText, Title } = Typography;

export const CATALOG_ITEMS = [
  // Construction
  { id: "dumpster", name: "Dumpster", icon: "🗑️", category: "Construction", image: "https://loremflickr.com/150/150/dumpster" },
  { id: "cone", name: "Traffic Cone", icon: "🚧", category: "Construction", image: "https://loremflickr.com/150/150/traffic_cone" },
  { id: "concrete_mixer", name: "Concrete Mixer", icon: "🛢️", category: "Construction", image: "https://loremflickr.com/150/150/concrete_mixer" },
  { id: "excavator", name: "Excavator", icon: "🚜", category: "Construction", image: "https://loremflickr.com/150/150/excavator" },
  // Farming
  { id: "tractor", name: "Tractor", icon: "🚜", category: "Farming", image: "https://loremflickr.com/150/150/tractor" },
  { id: "silo", name: "Silo", icon: "🏭", category: "Farming", image: "https://loremflickr.com/150/150/silo" },
  { id: "windmill", name: "Windmill", icon: "🌬️", category: "Farming", image: "https://loremflickr.com/150/150/windmill" },
  { id: "barn", name: "Barn", icon: "🛖", category: "Farming", image: "https://loremflickr.com/150/150/barn" },
  // Manufacturing
  { id: "robotic_arm", name: "Robotic Arm", icon: "🦾", category: "Manufacturing", image: "https://loremflickr.com/150/150/robotic_arm" },
  { id: "conveyor_belt", name: "Conveyor Belt", icon: "🛤️", category: "Manufacturing", image: "https://loremflickr.com/150/150/conveyor_belt" },
  { id: "forklift", name: "Forklift", icon: "🛻", category: "Manufacturing", image: "https://loremflickr.com/150/150/forklift" },
  { id: "pallet", name: "Pallet Stack", icon: "📦", category: "Manufacturing", image: "https://loremflickr.com/150/150/pallet" },
  // General Amenities
  { id: "bench", name: "Park Bench", icon: "🪑", category: "Amenities", image: "https://loremflickr.com/150/150/park_bench" },
  { id: "streetlight", name: "Street Light", icon: "💡", category: "Amenities", image: "https://loremflickr.com/150/150/streetlight" },
  { id: "tree", name: "Tree", icon: "🌳", category: "Landscaping", image: "https://loremflickr.com/150/150/tree" },
  { id: "bush", name: "Bush", icon: "🌿", category: "Landscaping", image: "https://loremflickr.com/150/150/bush" },
  // Healthcare
  { id: "ambulance", name: "Ambulance", icon: "🚑", category: "Healthcare", image: "https://loremflickr.com/150/150/ambulance" },
  { id: "medical_bed", name: "Medical Bed", icon: "🛏️", category: "Healthcare", image: "https://loremflickr.com/150/150/medical_bed" },
  { id: "mri_machine", name: "MRI Machine", icon: "🧲", category: "Healthcare", image: "https://loremflickr.com/150/150/mri_machine" },
  // Education
  { id: "school_bus", name: "School Bus", icon: "🚌", category: "Education", image: "https://loremflickr.com/150/150/school_bus" },
  { id: "desk", name: "School Desk", icon: "🪑", category: "Education", image: "https://loremflickr.com/150/150/school_desk" },
  { id: "whiteboard", name: "Whiteboard", icon: "📋", category: "Education", image: "https://loremflickr.com/150/150/whiteboard" },
];

// ---------------------------------------------------------------
// --  GRAPHQL QUERIES  --
// ---------------------------------------------------------------

const GET_PROJECTS = `query GetProjects($tenantId: String!) {
  pmProjects(tenantId: $tenantId) {
    id projectNumber name description status priority
    startDate endDate budget spent methodology tags
    owner { id firstName lastName avatarUrl }
  }
}`;

const GET_PROJECT_TASKS = `query GetTasks($tenantId: String!, $projectId: String!) {
  pmTasks(tenantId: $tenantId, projectId: $projectId) {
    id projectId parentTaskId title description status priority type
    assigneeId estimatedHours loggedHours startDate dueDate tags
    assignee { id firstName lastName avatarUrl }
  }
}`;

const GET_WBS_ITEMS = `query GetWbs($projectId: String!) {
  pmWbsItems(projectId: $projectId) {
    id projectId parentId wbsCode title description
    level sortOrder status assignedTo
    estimatedCost actualCost
  }
}`;

const GET_MILESTONES = `query GetMilestones($projectId: String!) {
  pmMilestones(projectId: $projectId) {
    id projectId name description dueDate completedDate
    percentComplete isCritical status sortOrder
  }
}`;

// ---------------------------------------------------------------
// --  DEMO DATA  --
// ---------------------------------------------------------------

interface ConstructionPhase {
  id: string;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  startPercent: number;
  endPercent: number;
  startDate: string;
  endDate: string;
  description: string;
  tasks: ConstructionTask[];
}

interface ConstructionTask {
  id: string;
  name: string;
  assignee: string;
  status: "completed" | "in_progress" | "pending";
  startDate: string;
  endDate: string;
  completion: number;
}

const PROJECT_START = "2025-01-15";
const PROJECT_END = "2026-07-15";
const TOTAL_DAYS = dayjs(PROJECT_END).diff(dayjs(PROJECT_START), "day");

const CONSTRUCTION_PHASES: ConstructionPhase[] = [
  {
    id: "site_prep",
    name: "Site Preparation",
    shortName: "Site Prep",
    icon: <ToolOutlined />,
    color: "#8B4513",
    gradient: "linear-gradient(135deg, #8B4513, #A0522D)",
    startPercent: 0,
    endPercent: 8,
    startDate: "2025-01-15",
    endDate: "2025-02-28",
    description: "Land clearing, grading, and excavation for foundation",
    tasks: [
      { id: "t1", name: "Site Survey & Staking", assignee: "Ahmad R.", status: "completed", startDate: "2025-01-15", endDate: "2025-01-25", completion: 100 },
      { id: "t2", name: "Demolition & Clearing", assignee: "Budi S.", status: "completed", startDate: "2025-01-20", endDate: "2025-02-05", completion: 100 },
      { id: "t3", name: "Excavation & Grading", assignee: "Carlos M.", status: "completed", startDate: "2025-02-01", endDate: "2025-02-20", completion: 100 },
      { id: "t4", name: "Temporary Fencing & Access", assignee: "Dewi A.", status: "completed", startDate: "2025-02-15", endDate: "2025-02-28", completion: 100 },
    ],
  },
  {
    id: "foundation",
    name: "Foundation",
    shortName: "Foundation",
    icon: <BlockOutlined />,
    color: "#6B7280",
    gradient: "linear-gradient(135deg, #6B7280, #9CA3AF)",
    startPercent: 6,
    endPercent: 20,
    startDate: "2025-02-20",
    endDate: "2025-05-10",
    description: "Concrete footings, foundation walls, and ground floor slab",
    tasks: [
      { id: "t5", name: "Pile Driving / Footings", assignee: "Eko P.", status: "completed", startDate: "2025-02-20", endDate: "2025-03-15", completion: 100 },
      { id: "t6", name: "Foundation Walls", assignee: "Fajar H.", status: "completed", startDate: "2025-03-10", endDate: "2025-04-05", completion: 100 },
      { id: "t7", name: "Ground Floor Slab Pour", assignee: "Gita N.", status: "completed", startDate: "2025-04-01", endDate: "2025-04-25", completion: 100 },
      { id: "t8", name: "Waterproofing & Drainage", assignee: "Hadi W.", status: "completed", startDate: "2025-04-20", endDate: "2025-05-10", completion: 100 },
    ],
  },
  {
    id: "structure",
    name: "Structural Frame",
    shortName: "Structure",
    icon: <BuildOutlined />,
    color: "#3B82F6",
    gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    startPercent: 18,
    endPercent: 42,
    startDate: "2025-05-01",
    endDate: "2025-09-15",
    description: "Steel/concrete columns, beams, and structural connections per floor",
    tasks: [
      { id: "t9", name: "1st Floor Columns & Beams", assignee: "Irfan L.", status: "completed", startDate: "2025-05-01", endDate: "2025-05-30", completion: 100 },
      { id: "t10", name: "2nd Floor Columns & Beams", assignee: "Irfan L.", status: "completed", startDate: "2025-05-25", endDate: "2025-06-20", completion: 100 },
      { id: "t11", name: "3rd Floor Columns & Beams", assignee: "Joko T.", status: "completed", startDate: "2025-06-15", endDate: "2025-07-15", completion: 100 },
      { id: "t12", name: "4th Floor Columns & Beams", assignee: "Joko T.", status: "completed", startDate: "2025-07-10", endDate: "2025-08-10", completion: 100 },
      { id: "t13", name: "5th Floor Columns & Beams", assignee: "Irfan L.", status: "completed", startDate: "2025-08-05", endDate: "2025-09-15", completion: 100 },
    ],
  },
  {
    id: "floor_slabs",
    name: "Floor Slabs",
    shortName: "Floors",
    icon: <ColumnWidthOutlined />,
    color: "#8B5CF6",
    gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
    startPercent: 25,
    endPercent: 48,
    startDate: "2025-06-01",
    endDate: "2025-10-01",
    description: "Concrete floor plates for each story",
    tasks: [
      { id: "t14", name: "2nd Floor Slab Pour", assignee: "Kurnia D.", status: "completed", startDate: "2025-06-01", endDate: "2025-06-25", completion: 100 },
      { id: "t15", name: "3rd Floor Slab Pour", assignee: "Kurnia D.", status: "completed", startDate: "2025-07-01", endDate: "2025-07-25", completion: 100 },
      { id: "t16", name: "4th Floor Slab Pour", assignee: "Lestari S.", status: "completed", startDate: "2025-08-01", endDate: "2025-08-25", completion: 100 },
      { id: "t17", name: "5th Floor Slab Pour", assignee: "Lestari S.", status: "completed", startDate: "2025-09-01", endDate: "2025-10-01", completion: 100 },
    ],
  },
  {
    id: "ext_walls",
    name: "External Walls",
    shortName: "Ext. Walls",
    icon: <AppstoreOutlined />,
    color: "#F59E0B",
    gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)",
    startPercent: 40,
    endPercent: 62,
    startDate: "2025-09-01",
    endDate: "2025-12-20",
    description: "Exterior wall panels, masonry, and cladding with window openings",
    tasks: [
      { id: "t18", name: "1st-2nd Floor Masonry", assignee: "Mira K.", status: "completed", startDate: "2025-09-01", endDate: "2025-10-10", completion: 100 },
      { id: "t19", name: "3rd-4th Floor Masonry", assignee: "Nanda R.", status: "completed", startDate: "2025-10-05", endDate: "2025-11-15", completion: 100 },
      { id: "t20", name: "5th Floor Masonry", assignee: "Mira K.", status: "in_progress", startDate: "2025-11-10", endDate: "2025-12-05", completion: 75 },
      { id: "t21", name: "Exterior Cladding", assignee: "Oscar B.", status: "in_progress", startDate: "2025-11-20", endDate: "2025-12-20", completion: 40 },
    ],
  },
  {
    id: "windows",
    name: "Windows & Glazing",
    shortName: "Windows",
    icon: <ExpandOutlined />,
    color: "#06B6D4",
    gradient: "linear-gradient(135deg, #06B6D4, #22D3EE)",
    startPercent: 55,
    endPercent: 72,
    startDate: "2025-11-15",
    endDate: "2026-02-10",
    description: "Window frames, glass panels, and curtain wall systems",
    tasks: [
      { id: "t22", name: "Window Frame Installation (F1-F3)", assignee: "Putri A.", status: "in_progress", startDate: "2025-11-15", endDate: "2025-12-20", completion: 60 },
      { id: "t23", name: "Window Frame Installation (F4-F5)", assignee: "Putri A.", status: "pending", startDate: "2025-12-15", endDate: "2026-01-20", completion: 0 },
      { id: "t24", name: "Glazing & Sealing", assignee: "Qodir M.", status: "pending", startDate: "2026-01-10", endDate: "2026-02-10", completion: 0 },
    ],
  },
  {
    id: "roofing",
    name: "Roofing",
    shortName: "Roof",
    icon: <HomeOutlined />,
    color: "#EF4444",
    gradient: "linear-gradient(135deg, #EF4444, #F87171)",
    startPercent: 65,
    endPercent: 78,
    startDate: "2026-01-05",
    endDate: "2026-03-10",
    description: "Roof structure, waterproofing membrane, and finishing",
    tasks: [
      { id: "t25", name: "Roof Steel Structure", assignee: "Rizal F.", status: "pending", startDate: "2026-01-05", endDate: "2026-01-30", completion: 0 },
      { id: "t26", name: "Waterproof Membrane", assignee: "Sari D.", status: "pending", startDate: "2026-01-25", endDate: "2026-02-15", completion: 0 },
      { id: "t27", name: "Roof Finishing & Drainage", assignee: "Rizal F.", status: "pending", startDate: "2026-02-10", endDate: "2026-03-10", completion: 0 },
    ],
  },
  {
    id: "mep",
    name: "MEP Systems",
    shortName: "MEP",
    icon: <ThunderboltOutlined />,
    color: "#10B981",
    gradient: "linear-gradient(135deg, #10B981, #34D399)",
    startPercent: 50,
    endPercent: 85,
    startDate: "2025-11-01",
    endDate: "2026-04-15",
    description: "Mechanical, electrical, and plumbing rough-in and finishing",
    tasks: [
      { id: "t28", name: "Electrical Rough-In", assignee: "Tono H.", status: "in_progress", startDate: "2025-11-01", endDate: "2026-01-15", completion: 55 },
      { id: "t29", name: "Plumbing Rough-In", assignee: "Umar S.", status: "in_progress", startDate: "2025-11-15", endDate: "2026-01-30", completion: 45 },
      { id: "t30", name: "HVAC Installation", assignee: "Vina L.", status: "pending", startDate: "2026-01-15", endDate: "2026-03-15", completion: 0 },
      { id: "t31", name: "Fire Protection System", assignee: "Wawan K.", status: "pending", startDate: "2026-02-01", endDate: "2026-04-15", completion: 0 },
    ],
  },
  {
    id: "interior",
    name: "Interior Finishing",
    shortName: "Interior",
    icon: <FormatPainterOutlined />,
    color: "#EC4899",
    gradient: "linear-gradient(135deg, #EC4899, #F472B6)",
    startPercent: 72,
    endPercent: 92,
    startDate: "2026-02-15",
    endDate: "2026-06-01",
    description: "Interior walls, flooring, ceiling, painting, and fixtures",
    tasks: [
      { id: "t32", name: "Interior Partitions", assignee: "Xenia R.", status: "pending", startDate: "2026-02-15", endDate: "2026-03-20", completion: 0 },
      { id: "t33", name: "Floor Tiling & Finishing", assignee: "Yoga P.", status: "pending", startDate: "2026-03-15", endDate: "2026-04-30", completion: 0 },
      { id: "t34", name: "Ceiling & Painting", assignee: "Zahra N.", status: "pending", startDate: "2026-04-01", endDate: "2026-05-15", completion: 0 },
      { id: "t35", name: "Fixtures & Fittings", assignee: "Ahmad R.", status: "pending", startDate: "2026-05-01", endDate: "2026-06-01", completion: 0 },
    ],
  },
  {
    id: "exterior",
    name: "Exterior Finishing",
    shortName: "Exterior",
    icon: <BgColorsOutlined />,
    color: "#14B8A6",
    gradient: "linear-gradient(135deg, #14B8A6, #2DD4BF)",
    startPercent: 85,
    endPercent: 100,
    startDate: "2026-05-01",
    endDate: "2026-07-15",
    description: "Facade treatment, landscaping, parking, and final site work",
    tasks: [
      { id: "t36", name: "Facade Paint & Treatment", assignee: "Budi S.", status: "pending", startDate: "2026-05-01", endDate: "2026-05-30", completion: 0 },
      { id: "t37", name: "Landscaping", assignee: "Carlos M.", status: "pending", startDate: "2026-05-20", endDate: "2026-06-20", completion: 0 },
      { id: "t38", name: "Parking & Driveways", assignee: "Dewi A.", status: "pending", startDate: "2026-06-01", endDate: "2026-06-30", completion: 0 },
      { id: "t39", name: "Final Inspection & Handover", assignee: "Eko P.", status: "pending", startDate: "2026-06-25", endDate: "2026-07-15", completion: 0 },
    ],
  },
];

// ---------------------------------------------------------------
// --  BUILDING CONFIG  --
// ---------------------------------------------------------------

const BUILDING = {
  floors: 5,
  width: 12,
  depth: 8,
  floorHeight: 3.2,
  columnRadius: 0.25,
  wallThickness: 0.3,
  windowWidth: 1.8,
  windowHeight: 1.6,
  windowsPerSide: 4,
  windowsPerEnd: 2,
};

// ---------------------------------------------------------------
// --  3D BUILDING COMPONENTS  --
// ---------------------------------------------------------------

// Utility: lerp helper
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}




// --- Uploaded 3D Model Renderer ---
function UploadedModel({ url, scale, rotationDeg }: { url: string; scale: number; rotationDeg: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    const loader = new THREE.ObjectLoader();
    // Use dynamic import for GLTFLoader to avoid SSR issues
    import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        url,
        (gltf) => {
          const scene = gltf.scene.clone();
          // Auto-center
          const box = new THREE.Box3().setFromObject(scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          scene.position.sub(center);
          scene.position.y += size.y / 2; // Sit on ground plane
          setModel(scene);
        },
        undefined,
        (err) => console.error("Failed to load model:", err)
      );
    });
    return () => {
      setModel(null);
    };
  }, [url]);

  if (!model) return null;

  return (
    <group
      ref={groupRef}
      scale={[scale, scale, scale]}
      rotation={[0, (rotationDeg * Math.PI) / 180, 0]}
    >
      <primitive object={model} />
    </group>
  );
}

// --- Ground / Site ---
function SitePrep({ progress, highlighted }: { progress: number; highlighted: boolean }) {
  const phase = CONSTRUCTION_PHASES[0];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  return (
    <group>
      {/* Excavation pit - layered soil */}
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[BUILDING.width + 4, 0.6, BUILDING.depth + 4]} />
        <meshStandardMaterial color={highlighted ? "#D4A574" : "#8B6914"} transparent opacity={opacity * 0.9} roughness={0.9} />
      </mesh>
      {/* Subsoil layer */}
      <mesh position={[0, -0.65, 0]} receiveShadow>
        <boxGeometry args={[BUILDING.width + 5, 0.1, BUILDING.depth + 5]} />
        <meshStandardMaterial color="#5C3A0A" transparent opacity={opacity * 0.7} roughness={1} />
      </mesh>
      {/* Clay layer */}
      <mesh position={[0, -0.8, 0]} receiveShadow>
        <boxGeometry args={[BUILDING.width + 6, 0.2, BUILDING.depth + 6]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={opacity * 0.5} roughness={1} />
      </mesh>

      {/* Construction fence posts with safety tape */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r = Math.max(BUILDING.width, BUILDING.depth) / 2 + 3.5;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        return (
          <group key={`fence-${i}`}>
            <mesh position={[x, 0.5, z]}>
              <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
              <meshStandardMaterial color="#F59E0B" transparent opacity={opacity} />
            </mesh>
            {/* Safety tape between posts */}
            {i < 11 && (
              <mesh position={[(x + Math.cos(((i + 1) / 12) * Math.PI * 2) * r) / 2, 0.9, (z + Math.sin(((i + 1) / 12) * Math.PI * 2) * r) / 2]}>
                <boxGeometry args={[0.8, 0.08, 0.02]} />
                <meshStandardMaterial color="#FF6600" transparent opacity={opacity * 0.8} emissive="#FF4400" emissiveIntensity={0.2} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Surveyor stakes with string lines */}
      {[
        [-BUILDING.width / 2, -BUILDING.depth / 2],
        [BUILDING.width / 2, -BUILDING.depth / 2],
        [BUILDING.width / 2, BUILDING.depth / 2],
        [-BUILDING.width / 2, BUILDING.depth / 2],
      ].map(([sx, sz], i) => (
        <group key={`stake-${i}`}>
          <mesh position={[sx, 0.3, sz]}>
            <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
            <meshStandardMaterial color="#FF0000" transparent opacity={opacity} />
          </mesh>
          <mesh position={[sx, 0.65, sz]}>
            <boxGeometry args={[0.15, 0.15, 0.01]} />
            <meshStandardMaterial color="#FF8800" transparent opacity={opacity} emissive="#FF4400" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* Excavator tracks in dirt */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`track-${i}`} position={[-BUILDING.width / 2 + 2 + i * 1.2, -0.25, BUILDING.depth / 2 + 1.5]} rotation={[-Math.PI / 2, 0, 0.15]}>
          <planeGeometry args={[0.6, 0.15]} />
          <meshStandardMaterial color="#5A3A10" transparent opacity={opacity * 0.6} roughness={1} />
        </mesh>
      ))}

      {/* Material staging area */}
      <group position={[-BUILDING.width / 2 - 3, 0, -BUILDING.depth / 2]}>
        {/* Rebar bundles */}
        {[0, 0.4, 0.8].map((dy, i) => (
          <mesh key={`rebar-${i}`} position={[0, 0.15 + dy * 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 2.5, 8]} />
            <meshStandardMaterial color="#8B4513" transparent opacity={opacity * 0.8} metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
        {/* Cement bags stack */}
        {Array.from({ length: 3 }).map((_, i) =>
          Array.from({ length: 2 }).map((_, j) => (
            <mesh key={`cement-${i}-${j}`} position={[2, 0.2 + i * 0.35, -1 + j * 0.8]}>
              <boxGeometry args={[0.6, 0.3, 0.7]} />
              <meshStandardMaterial color="#A0A0A0" transparent opacity={opacity * 0.85} roughness={0.9} />
            </mesh>
          ))
        )}
        {/* Wooden planks */}
        <mesh position={[3.5, 0.15, 0]}>
          <boxGeometry args={[0.3, 0.08, 3]} />
          <meshStandardMaterial color="#C49A6C" transparent opacity={opacity * 0.8} roughness={0.8} />
        </mesh>
        <mesh position={[3.5, 0.25, 0]}>
          <boxGeometry args={[0.3, 0.08, 3]} />
          <meshStandardMaterial color="#B8905A" transparent opacity={opacity * 0.8} roughness={0.8} />
        </mesh>
      </group>

      {/* Temporary site office (porta cabin) */}
      <group position={[BUILDING.width / 2 + 4, 0, BUILDING.depth / 2]}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[3, 1.6, 2]} />
          <meshStandardMaterial color="#E8E0D0" transparent opacity={opacity} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.2, 1.01]}>
          <boxGeometry args={[1.2, 0.6, 0.02]} />
          <meshStandardMaterial color="#88AACC" transparent opacity={opacity * 0.5} roughness={0.1} />
        </mesh>
        {/* Door */}
        <mesh position={[-0.8, 0.6, 1.01]}>
          <boxGeometry args={[0.6, 1.2, 0.02]} />
          <meshStandardMaterial color="#666" transparent opacity={opacity} />
        </mesh>
      </group>
    </group>
  );
}

// --- Foundation ---
function Foundation({ progress, highlighted }: { progress: number; highlighted: boolean }) {
  const phase = CONSTRUCTION_PHASES[1];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const baseColor = highlighted ? "#A0A0A0" : "#808080";

  return (
    <group>
      {/* Waterproofing membrane */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[BUILDING.width + 1.5, 0.05, BUILDING.depth + 1.5]} />
        <meshStandardMaterial color="#1A1A1A" transparent opacity={opacity * 0.7} roughness={0.4} />
      </mesh>
      {/* Main slab */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[BUILDING.width + 1, 0.5, BUILDING.depth + 1]} />
        <meshStandardMaterial color={baseColor} transparent opacity={opacity} roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Rebar grid on slab surface */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`rb-x-${i}`} position={[-BUILDING.width / 2 + 0.5 + (i * BUILDING.width) / 9, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, BUILDING.depth + 0.5, 4]} />
          <meshStandardMaterial color="#6B3A1F" transparent opacity={opacity * 0.5} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={`rb-z-${i}`} position={[0, 0.42, -BUILDING.depth / 2 + 0.5 + (i * BUILDING.depth) / 6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, BUILDING.width + 0.5, 4]} />
          <meshStandardMaterial color="#6B3A1F" transparent opacity={opacity * 0.5} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {/* Footings with pile caps */}
      {Array.from({ length: 6 }).map((_, i) =>
        Array.from({ length: 3 }).map((_, j) => {
          const x = -BUILDING.width / 2 + (i * BUILDING.width) / 5;
          const z = -BUILDING.depth / 2 + (j * BUILDING.depth) / 2;
          return (
            <group key={`ft-${i}-${j}`}>
              <mesh position={[x, -0.15, z]} castShadow>
                <boxGeometry args={[1.2, 0.6, 1.2]} />
                <meshStandardMaterial color={highlighted ? "#909090" : "#707070"} transparent opacity={opacity * 0.95} roughness={0.85} />
              </mesh>
              <mesh position={[x, -0.7, z]}>
                <cylinderGeometry args={[0.2, 0.2, 0.8, 8]} />
                <meshStandardMaterial color="#606060" transparent opacity={opacity * 0.5} roughness={0.9} />
              </mesh>
            </group>
          );
        })
      )}
      {/* Grade beams */}
      {Array.from({ length: 3 }).map((_, j) => (
        <mesh key={`gb-${j}`} position={[0, -0.1, -BUILDING.depth / 2 + (j * BUILDING.depth) / 2]}>
          <boxGeometry args={[BUILDING.width, 0.35, 0.5]} />
          <meshStandardMaterial color="#757575" transparent opacity={opacity * 0.65} roughness={0.85} />
        </mesh>
      ))}
      {/* Formwork edges */}
      {[
        { pos: [0, 0.15, BUILDING.depth / 2 + 0.55] as [number, number, number], size: [BUILDING.width + 1.2, 0.5, 0.1] as [number, number, number] },
        { pos: [0, 0.15, -BUILDING.depth / 2 - 0.55] as [number, number, number], size: [BUILDING.width + 1.2, 0.5, 0.1] as [number, number, number] },
        { pos: [BUILDING.width / 2 + 0.55, 0.15, 0] as [number, number, number], size: [0.1, 0.5, BUILDING.depth + 1.2] as [number, number, number] },
        { pos: [-BUILDING.width / 2 - 0.55, 0.15, 0] as [number, number, number], size: [0.1, 0.5, BUILDING.depth + 1.2] as [number, number, number] },
      ].map((fw, i) => (
        <mesh key={`fw-${i}`} position={fw.pos}>
          <boxGeometry args={fw.size} />
          <meshStandardMaterial color="#B8905A" transparent opacity={opacity * 0.7} roughness={0.8} />
        </mesh>
      ))}
      {/* Drainage pipe */}
      <mesh position={[BUILDING.width / 2 + 0.8, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, BUILDING.depth + 2, 8]} />
        <meshStandardMaterial color="#2266AA" transparent opacity={opacity * 0.45} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

// --- Structural Frame (Columns + Beams per floor) ---
function StructuralFrame({ progress, highlighted, xray }: { progress: number; highlighted: boolean; xray: boolean }) {
  const phase = CONSTRUCTION_PHASES[2];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const columnColor = highlighted ? "#5B9FFF" : "#4080D0";
  const beamColor = highlighted ? "#7BB8FF" : "#5090DD";

  const columns: React.ReactElement[] = [];
  const beams: React.ReactElement[] = [];

  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const floorProgress = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorProgress <= 0) continue;

    const baseY = 0.4 + floor * BUILDING.floorHeight;

    // Columns at grid intersections
    for (let xi = 0; xi <= 5; xi++) {
      for (let zi = 0; zi <= 2; zi++) {
        const x = -BUILDING.width / 2 + (xi * BUILDING.width) / 5;
        const z = -BUILDING.depth / 2 + (zi * BUILDING.depth) / 2;
        columns.push(
          <mesh
            key={`col-${floor}-${xi}-${zi}`}
            position={[x, baseY + (BUILDING.floorHeight * floorProgress) / 2, z]}
            castShadow
          >
            <boxGeometry args={[0.4, BUILDING.floorHeight * floorProgress, 0.4]} />
            <meshStandardMaterial
              color={columnColor}
              transparent
              opacity={xray ? 0.5 : opacity * floorProgress}
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
        );
      }
    }

    // Horizontal beams along length
    if (floorProgress > 0.5) {
      for (let zi = 0; zi <= 2; zi++) {
        const z = -BUILDING.depth / 2 + (zi * BUILDING.depth) / 2;
        beams.push(
          <mesh
            key={`beam-l-${floor}-${zi}`}
            position={[0, baseY + BUILDING.floorHeight, z]}
            castShadow
          >
            <boxGeometry args={[BUILDING.width, 0.3, 0.3]} />
            <meshStandardMaterial
              color={beamColor}
              transparent
              opacity={xray ? 0.4 : opacity * floorProgress}
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
        );
      }
      // Beams along width
      for (let xi = 0; xi <= 5; xi++) {
        const x = -BUILDING.width / 2 + (xi * BUILDING.width) / 5;
        beams.push(
          <mesh
            key={`beam-w-${floor}-${xi}`}
            position={[x, baseY + BUILDING.floorHeight, 0]}
            castShadow
          >
            <boxGeometry args={[0.3, 0.3, BUILDING.depth]} />
            <meshStandardMaterial
              color={beamColor}
              transparent
              opacity={xray ? 0.4 : opacity * floorProgress}
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
        );
      }
    }
  }

  // Stairwell core (left side of building)
  const stairX = -BUILDING.width / 2 + 1.5;
  const totalH = BUILDING.floors * BUILDING.floorHeight;
  const stairElements: React.ReactElement[] = [];
  // Stair core walls
  stairElements.push(
    <mesh key="stair-wall-1" position={[stairX, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 1.5]}>
      <boxGeometry args={[0.2, totalH * opacity, 3]} />
      <meshStandardMaterial color="#708090" transparent opacity={xray ? 0.3 : opacity * 0.7} roughness={0.7} metalness={0.3} />
    </mesh>
  );
  stairElements.push(
    <mesh key="stair-wall-2" position={[stairX - 1.3, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 1.5]}>
      <boxGeometry args={[0.2, totalH * opacity, 3]} />
      <meshStandardMaterial color="#708090" transparent opacity={xray ? 0.3 : opacity * 0.7} roughness={0.7} metalness={0.3} />
    </mesh>
  );
  // Stair flights per floor
  for (let f = 0; f < BUILDING.floors; f++) {
    const sy = 0.4 + f * BUILDING.floorHeight;
    stairElements.push(
      <mesh key={`stair-flight-${f}`} position={[stairX - 0.65, sy + BUILDING.floorHeight / 2, -BUILDING.depth / 2 + 1.5]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[1.8, 0.1, 2.5]} />
        <meshStandardMaterial color="#607080" transparent opacity={xray ? 0.25 : opacity * 0.5} roughness={0.6} metalness={0.4} />
      </mesh>
    );
  }

  // Elevator shaft (right side of building)
  const elevX = BUILDING.width / 2 - 1.5;
  const elevElements: React.ReactElement[] = [];
  // Shaft walls
  elevElements.push(
    <mesh key="elev-front" position={[elevX, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 0.7]}>
      <boxGeometry args={[2, totalH * opacity, 0.15]} />
      <meshStandardMaterial color="#555" transparent opacity={xray ? 0.2 : opacity * 0.6} roughness={0.5} metalness={0.5} />
    </mesh>
  );
  elevElements.push(
    <mesh key="elev-back" position={[elevX, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 2.5]}>
      <boxGeometry args={[2, totalH * opacity, 0.15]} />
      <meshStandardMaterial color="#555" transparent opacity={xray ? 0.2 : opacity * 0.6} roughness={0.5} metalness={0.5} />
    </mesh>
  );
  // Elevator guide rails
  elevElements.push(
    <mesh key="elev-rail-1" position={[elevX - 0.7, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 1.6]}>
      <boxGeometry args={[0.06, totalH * opacity, 0.06]} />
      <meshStandardMaterial color="#888" transparent opacity={opacity * 0.5} metalness={0.8} roughness={0.2} />
    </mesh>
  );
  elevElements.push(
    <mesh key="elev-rail-2" position={[elevX + 0.7, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 1.6]}>
      <boxGeometry args={[0.06, totalH * opacity, 0.06]} />
      <meshStandardMaterial color="#888" transparent opacity={opacity * 0.5} metalness={0.8} roughness={0.2} />
    </mesh>
  );

  return (
    <group>
      {columns}
      {beams}
      {stairElements}
      {elevElements}
    </group>
  );
}

// --- Floor Slabs ---
function FloorSlabs({ progress, highlighted, xray }: { progress: number; highlighted: boolean; xray: boolean }) {
  const phase = CONSTRUCTION_PHASES[3];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  return (
    <group>
      {Array.from({ length: BUILDING.floors }).map((_, floor) => {
        const floorOpacity = getPhaseOpacity(
          progress,
          phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
          phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
        );
        if (floorOpacity <= 0) return null;

        const y = 0.4 + (floor + 1) * BUILDING.floorHeight;

        return (
          <mesh key={`slab-${floor}`} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[BUILDING.width + 0.2, 0.25, BUILDING.depth + 0.2]} />
            <meshStandardMaterial
              color={highlighted ? "#B8A0E0" : "#9080C0"}
              transparent
              opacity={xray ? 0.3 : opacity * floorOpacity}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// --- External Walls ---
function ExternalWalls({ progress, highlighted, xray, config }: { progress: number; highlighted: boolean; xray: boolean; config: SceneConfig }) {
  const phase = CONSTRUCTION_PHASES[4];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const walls: React.ReactElement[] = [];
  const wallColor = highlighted ? "#FFD080" : (config.wallColor ?? "#E8C868");

  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const floorOpacity = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorOpacity <= 0) continue;

    const baseY = 0.4 + floor * BUILDING.floorHeight + BUILDING.floorHeight / 2 + 0.12;

    // Front and back walls (along x-axis)  with window cutouts simulated as segments
    for (const zSide of [-1, 1]) {
      const z = zSide * (BUILDING.depth / 2);
      const segmentWidth = BUILDING.width / (BUILDING.windowsPerSide * 2 + 1);

      for (let seg = 0; seg <= BUILDING.windowsPerSide * 2; seg++) {
        const isWindow = seg % 2 === 1;
        if (isWindow) continue; // Skip window openings

        const x = -BUILDING.width / 2 + segmentWidth / 2 + seg * segmentWidth;
        walls.push(
          <mesh key={`wall-fb-${floor}-${zSide}-${seg}`} position={[x, baseY, z]} castShadow>
            <boxGeometry args={[segmentWidth, BUILDING.floorHeight - 0.25, BUILDING.wallThickness]} />
            <meshStandardMaterial
              color={wallColor}
              transparent
              opacity={xray ? 0.15 : opacity * floorOpacity * 0.95}
              roughness={0.75}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      }

      // Wall sections above and below windows
      for (let seg = 0; seg < BUILDING.windowsPerSide; seg++) {
        const windowX = -BUILDING.width / 2 + segmentWidth + segmentWidth * 2 * seg + segmentWidth / 2;
        // Below window
        walls.push(
          <mesh key={`wall-bw-${floor}-${zSide}-${seg}`} position={[windowX, baseY - BUILDING.floorHeight / 2 + 0.4, z]} castShadow>
            <boxGeometry args={[segmentWidth, 0.8, BUILDING.wallThickness]} />
            <meshStandardMaterial
              color={wallColor}
              transparent
              opacity={xray ? 0.15 : opacity * floorOpacity * 0.95}
              roughness={0.75}
            />
          </mesh>
        );
        // Above window
        walls.push(
          <mesh key={`wall-aw-${floor}-${zSide}-${seg}`} position={[windowX, baseY + BUILDING.floorHeight / 2 - 0.3, z]} castShadow>
            <boxGeometry args={[segmentWidth, 0.4, BUILDING.wallThickness]} />
            <meshStandardMaterial
              color={wallColor}
              transparent
              opacity={xray ? 0.15 : opacity * floorOpacity * 0.95}
              roughness={0.75}
            />
          </mesh>
        );
      }
    }

    // Side walls (along z-axis)
    for (const xSide of [-1, 1]) {
      const x = xSide * (BUILDING.width / 2);
      walls.push(
        <mesh key={`wall-side-${floor}-${xSide}`} position={[x, baseY, 0]} castShadow>
          <boxGeometry args={[BUILDING.wallThickness, BUILDING.floorHeight - 0.25, BUILDING.depth]} />
          <meshStandardMaterial
            color={wallColor}
            transparent
            opacity={xray ? 0.15 : opacity * floorOpacity * 0.95}
            roughness={0.75}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    }
  }

  return <group>{walls}</group>;
}

// --- Windows & Glazing ---
function WindowsGlazing({ progress, highlighted, xray, config }: { progress: number; highlighted: boolean; xray: boolean; config: SceneConfig }) {
  const phase = CONSTRUCTION_PHASES[5];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const windows: React.ReactElement[] = [];
  const glassColor = highlighted ? "#80E0FF" : (config.glassColor ?? "#88CCEE");

  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const floorOpacity = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorOpacity <= 0) continue;

    const baseY = 0.4 + floor * BUILDING.floorHeight + BUILDING.floorHeight / 2 + 0.12;
    const segmentWidth = BUILDING.width / (BUILDING.windowsPerSide * 2 + 1);

    // Front and back windows
    for (const zSide of [-1, 1]) {
      const z = zSide * (BUILDING.depth / 2);

      for (let w = 0; w < BUILDING.windowsPerSide; w++) {
        const windowX = -BUILDING.width / 2 + segmentWidth + segmentWidth * 2 * w + segmentWidth / 2;

        // Glass pane
        windows.push(
          <mesh key={`win-${floor}-${zSide}-${w}`} position={[windowX, baseY, z + zSide * 0.01]} >
            <planeGeometry args={[segmentWidth * 0.9, BUILDING.windowHeight]} />
            <meshPhysicalMaterial
              color={glassColor}
              transparent
              opacity={xray ? 0.1 : opacity * floorOpacity * 0.45}
              roughness={0.05}
              metalness={0.3}
              transmission={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        );

        // Window frame
        const frameThickness = 0.06;
        const framePositions = [
          { pos: [windowX, baseY + BUILDING.windowHeight / 2, z + zSide * 0.05] as [number, number, number], size: [segmentWidth * 0.95, frameThickness, frameThickness] as [number, number, number] },
          { pos: [windowX, baseY - BUILDING.windowHeight / 2, z + zSide * 0.05] as [number, number, number], size: [segmentWidth * 0.95, frameThickness, frameThickness] as [number, number, number] },
          { pos: [windowX - segmentWidth * 0.45, baseY, z + zSide * 0.05] as [number, number, number], size: [frameThickness, BUILDING.windowHeight, frameThickness] as [number, number, number] },
          { pos: [windowX + segmentWidth * 0.45, baseY, z + zSide * 0.05] as [number, number, number], size: [frameThickness, BUILDING.windowHeight, frameThickness] as [number, number, number] },
        ];

        framePositions.forEach((fp, fi) => {
          windows.push(
            <mesh key={`frame-${floor}-${zSide}-${w}-${fi}`} position={fp.pos}>
              <boxGeometry args={fp.size} />
              <meshStandardMaterial
                color="#404040"
                transparent
                opacity={opacity * floorOpacity}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
          );
        });
      }
    }
  }

  return <group>{windows}</group>;
}

// --- Roofing ---
function Roofing({ progress, highlighted, config }: { progress: number; highlighted: boolean; config: SceneConfig }) {
  const phase = CONSTRUCTION_PHASES[6];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const roofY = 0.4 + BUILDING.floors * BUILDING.floorHeight + 0.15;
  const roofColor = highlighted ? "#FF7070" : (config.roofColor ?? "#CC4040");

  return (
    <group>
      {/* Main roof slab */}
      <mesh position={[0, roofY, 0]} castShadow receiveShadow>
        <boxGeometry args={[BUILDING.width + 0.8, 0.35, BUILDING.depth + 0.8]} />
        <meshStandardMaterial color={roofColor} transparent opacity={opacity} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Parapet walls */}
      {[
        { pos: [0, roofY + 0.5, BUILDING.depth / 2 + 0.3] as [number, number, number], size: [BUILDING.width + 0.8, 0.7, 0.15] as [number, number, number] },
        { pos: [0, roofY + 0.5, -BUILDING.depth / 2 - 0.3] as [number, number, number], size: [BUILDING.width + 0.8, 0.7, 0.15] as [number, number, number] },
        { pos: [BUILDING.width / 2 + 0.3, roofY + 0.5, 0] as [number, number, number], size: [0.15, 0.7, BUILDING.depth + 0.8] as [number, number, number] },
        { pos: [-BUILDING.width / 2 - 0.3, roofY + 0.5, 0] as [number, number, number], size: [0.15, 0.7, BUILDING.depth + 0.8] as [number, number, number] },
      ].map((p, i) => (
        <mesh key={`parapet-${i}`} position={p.pos} castShadow>
          <boxGeometry args={p.size} />
          <meshStandardMaterial color="#888" transparent opacity={opacity * 0.9} roughness={0.7} />
        </mesh>
      ))}

      {/* Mechanical Penthouse */}
      <mesh position={[-2, roofY + 1.5, -1]} castShadow>
        <boxGeometry args={[3.5, 2.5, 3]} />
        <meshStandardMaterial color="#606068" transparent opacity={opacity * 0.85} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Penthouse door */}
      <mesh position={[-2, roofY + 1.2, 0.51]}>
        <boxGeometry args={[0.8, 1.6, 0.02]} />
        <meshStandardMaterial color="#444" transparent opacity={opacity} metalness={0.5} />
      </mesh>
      {/* Penthouse vent grilles */}
      {[-3.1, -0.9].map((dz, i) => (
        <mesh key={`vent-${i}`} position={[-3.76, roofY + 1.8, dz]}>
          <boxGeometry args={[0.02, 0.8, 0.6]} />
          <meshStandardMaterial color="#555" transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* HVAC Units Array */}
      {[[-4, 2], [-1, 2], [2, 2]].map(([dx, dz], i) => (
        <group key={`hvac-${i}`} position={[dx, roofY + 0.35, dz]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[1.8, 0.7, 1.2]} />
            <meshStandardMaterial color="#778888" transparent opacity={opacity * 0.8} metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Fan grill on top */}
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.06, 12]} />
            <meshStandardMaterial color="#444" transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Elevator overrun */}
      <mesh position={[BUILDING.width / 2 - 1.5, roofY + 1.2, -BUILDING.depth / 2 + 1.6]} castShadow>
        <boxGeometry args={[2.2, 2, 2]} />
        <meshStandardMaterial color="#606068" transparent opacity={opacity * 0.8} roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Roof access stair enclosure */}
      <mesh position={[-BUILDING.width / 2 + 1.5, roofY + 1, -BUILDING.depth / 2 + 1.5]} castShadow>
        <boxGeometry args={[2.5, 1.5, 2.5]} />
        <meshStandardMaterial color="#666670" transparent opacity={opacity * 0.75} roughness={0.7} />
      </mesh>

      {/* Solar panel area */}
      <mesh position={[3, roofY + 0.2, -1]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[4, 0.05, 3]} />
        <meshStandardMaterial color="#1a237e" transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Solar panel grid lines */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`solar-line-${i}`} position={[1.5 + i * 1, roofY + 0.23, -1]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.02, 0.02, 3]} />
          <meshStandardMaterial color="#283593" transparent opacity={opacity * 0.5} />
        </mesh>
      ))}

      {/* Drainage slopes (slight raised edges) */}
      <mesh position={[0, roofY + 0.12, 0]} rotation={[0.02, 0, 0.01]}>
        <boxGeometry args={[BUILDING.width - 1, 0.08, BUILDING.depth - 1]} />
        <meshStandardMaterial color="#888080" transparent opacity={opacity * 0.3} roughness={0.9} />
      </mesh>
    </group>
  );
}

// --- Scaffolding (appears during construction, fades out near end) ---
function Scaffolding({ progress }: { progress: number }) {
  const fadeIn = Math.min(1, Math.max(0, (progress - 15) / 10));
  const fadeOut = progress > 80 ? Math.max(0, (90 - progress) / 10) : 1;
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0) return null;

  const elements: React.ReactElement[] = [];
  const scaffoldLevels = BUILDING.floors + 1;
  const pipeColor = "#708090";

  // Scaffold on front face (z positive)
  for (let level = 0; level < scaffoldLevels; level++) {
    const y = 0.4 + level * BUILDING.floorHeight;
    const z = BUILDING.depth / 2 + 1;

    // Horizontal ledger
    elements.push(
      <mesh key={`sc-h-f-${level}`} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, BUILDING.width + 1, 6]} />
        <meshStandardMaterial color={pipeColor} transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.4} />
      </mesh>
    );

    // Working platform (plank)
    if (level > 0) {
      elements.push(
        <mesh key={`sc-plat-f-${level}`} position={[0, y + 0.01, z - 0.3]}>
          <boxGeometry args={[BUILDING.width + 0.5, 0.04, 0.6]} />
          <meshStandardMaterial color="#B8905A" transparent opacity={opacity * 0.5} roughness={0.8} />
        </mesh>
      );
    }
  }

  // Vertical standards
  for (let xi = 0; xi <= 4; xi++) {
    const x = -BUILDING.width / 2 - 0.3 + (xi * (BUILDING.width + 0.6)) / 4;
    const totalH = scaffoldLevels * BUILDING.floorHeight;
    elements.push(
      <mesh key={`sc-v-f-${xi}`} position={[x, 0.4 + totalH / 2, BUILDING.depth / 2 + 1]}>
        <cylinderGeometry args={[0.04, 0.04, totalH, 6]} />
        <meshStandardMaterial color={pipeColor} transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.4} />
      </mesh>
    );
  }

  // Safety netting (semi-transparent green on one side)
  elements.push(
    <mesh key="sc-net" position={[0, 0.4 + (scaffoldLevels * BUILDING.floorHeight) / 2, BUILDING.depth / 2 + 1.3]}>
      <boxGeometry args={[BUILDING.width + 1, scaffoldLevels * BUILDING.floorHeight, 0.02]} />
      <meshStandardMaterial color="#22AA44" transparent opacity={opacity * 0.12} roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );

  // Side scaffold (x positive)
  for (let level = 0; level < scaffoldLevels; level++) {
    const y = 0.4 + level * BUILDING.floorHeight;
    const x = BUILDING.width / 2 + 1;
    elements.push(
      <mesh key={`sc-h-s-${level}`} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, BUILDING.depth + 1, 6]} />
        <meshStandardMaterial color={pipeColor} transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.4} />
      </mesh>
    );
  }

  return <group>{elements}</group>;
}

// --- MEP Systems (simplified visual indicators) ---
function MEPSystems({ progress, highlighted }: { progress: number; highlighted: boolean }) {
  const phase = CONSTRUCTION_PHASES[7];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const pipes: React.ReactElement[] = [];
  const pipeColor = highlighted ? "#40E0A0" : "#20C080";

  // Vertical risers
  for (const x of [-BUILDING.width / 2 + 0.8, BUILDING.width / 2 - 0.8]) {
    for (const z of [-BUILDING.depth / 2 + 0.5, BUILDING.depth / 2 - 0.5]) {
      const totalH = BUILDING.floors * BUILDING.floorHeight;
      pipes.push(
        <mesh key={`pipe-v-${x}-${z}`} position={[x, 0.4 + totalH / 2, z]}>
          <cylinderGeometry args={[0.08, 0.08, totalH * opacity, 8]} />
          <meshStandardMaterial color={pipeColor} transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.3} />
        </mesh>
      );
    }
  }

  // Horizontal runs per floor
  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const y = 0.4 + (floor + 1) * BUILDING.floorHeight - 0.3;
    const floorOpacity = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorOpacity <= 0) continue;

    pipes.push(
      <mesh key={`pipe-h-${floor}`} position={[0, y, -BUILDING.depth / 2 + 0.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, BUILDING.width * 0.8, 8]} />
        <meshStandardMaterial color="#3B82F6" transparent opacity={opacity * floorOpacity * 0.6} metalness={0.5} roughness={0.4} />
      </mesh>
    );
  }

  return <group>{pipes}</group>;
}

// --- Interior Finishing (simplified) ---
function InteriorFinishing({ progress, highlighted }: { progress: number; highlighted: boolean }) {
  const phase = CONSTRUCTION_PHASES[8];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const elements: React.ReactElement[] = [];

  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const floorOpacity = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorOpacity <= 0) continue;

    const baseY = 0.4 + floor * BUILDING.floorHeight + 0.25;

    // Floor finish layer
    elements.push(
      <mesh key={`ifloor-${floor}`} position={[0, baseY, 0]}>
        <boxGeometry args={[BUILDING.width - 0.6, 0.05, BUILDING.depth - 0.6]} />
        <meshStandardMaterial
          color={highlighted ? "#FFB0D0" : "#E890B0"}
          transparent
          opacity={opacity * floorOpacity * 0.6}
          roughness={0.3}
        />
      </mesh>
    );

    // Interior partition walls
    for (let i = 1; i <= 2; i++) {
      const x = -BUILDING.width / 2 + (i * BUILDING.width) / 3;
      elements.push(
        <mesh key={`iwall-${floor}-${i}`} position={[x, baseY + BUILDING.floorHeight / 2, 0]}>
          <boxGeometry args={[0.12, BUILDING.floorHeight - 0.5, BUILDING.depth * 0.6]} />
          <meshStandardMaterial
            color="#F0E0E8"
            transparent
            opacity={opacity * floorOpacity * 0.5}
            roughness={0.8}
          />
        </mesh>
      );
    }
  }

  return <group>{elements}</group>;
}

// --- Exterior Finishing ---
function ExteriorFinishing({ progress, highlighted }: { progress: number; highlighted: boolean }) {
  const phase = CONSTRUCTION_PHASES[9];
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  return (
    <group>
      {/* Entrance canopy */}
      <mesh position={[0, 2, BUILDING.depth / 2 + 1]} castShadow>
        <boxGeometry args={[4, 0.15, 2]} />
        <meshStandardMaterial
          color={highlighted ? "#60E8D0" : "#40C8B0"}
          transparent
          opacity={opacity}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      {/* Canopy supports */}
      {[-1.5, 1.5].map((x) => (
        <mesh key={`canopy-sup-${x}`} position={[x, 1, BUILDING.depth / 2 + 1.8]}>
          <cylinderGeometry args={[0.08, 0.08, 2, 8]} />
          <meshStandardMaterial color="#555" transparent opacity={opacity} metalness={0.7} />
        </mesh>
      ))}
      {/* Landscaping - simplified trees */}
      {[
        [-BUILDING.width / 2 - 2, 0, 3],
        [BUILDING.width / 2 + 2, 0, -2],
        [-BUILDING.width / 2 - 2, 0, -3],
        [BUILDING.width / 2 + 2, 0, 3],
      ].map(([x, y, z], i) => (
        <group key={`tree-${i}`} position={[x, y, z]}>
          {/* Trunk */}
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 1.6, 8]} />
            <meshStandardMaterial color="#5D3A1A" transparent opacity={opacity} />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 2, 0]}>
            <sphereGeometry args={[0.9, 16, 12]} />
            <meshStandardMaterial color="#228B22" transparent opacity={opacity * 0.85} />
          </mesh>
        </group>
      ))}
      {/* Parking markers */}
      <mesh position={[0, 0.01, -BUILDING.depth / 2 - 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BUILDING.width, 4]} />
        <meshStandardMaterial color="#444" transparent opacity={opacity * 0.6} />
      </mesh>
    </group>
  );
}

// --- Construction Crane ---
function ConstructionCrane({ progress }: { progress: number }) {
  const craneOpacity = Math.min(1, Math.max(0, (progress - 5) / 10));
  const fadeOut = progress > 85 ? Math.max(0, (95 - progress) / 10) : 1;
  const opacity = craneOpacity * fadeOut;
  if (opacity <= 0) return null;

  const craneX = BUILDING.width / 2 + 3;
  const craneZ = -BUILDING.depth / 2 + 2;
  const craneHeight = BUILDING.floors * BUILDING.floorHeight + 8;
  const boomLength = 16;
  const craneColor = "#FFB020";
  const counterColor = "#CC8810";

  // Slow rotation of the boom
  const boomRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (boomRef.current) {
      boomRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.4;
    }
  });

  return (
    <group position={[craneX, 0, craneZ]}>
      {/* Mast (vertical tower) */}
      <mesh position={[0, craneHeight / 2, 0]}>
        <boxGeometry args={[0.8, craneHeight, 0.8]} />
        <meshStandardMaterial color={craneColor} transparent opacity={opacity} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Mast lattice lines */}
      {Array.from({ length: Math.floor(craneHeight / 2) }).map((_, i) => (
        <mesh key={`lattice-${i}`} position={[0, i * 2 + 1, 0]}>
          <boxGeometry args={[1, 0.08, 1]} />
          <meshStandardMaterial color={"#DD9918"} transparent opacity={opacity * 0.8} metalness={0.3} />
        </mesh>
      ))}
      {/* Base */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[2.5, 0.4, 2.5]} />
        <meshStandardMaterial color={"#555"} transparent opacity={opacity} metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Rotating boom group */}
      <group ref={boomRef} position={[0, craneHeight, 0]}>
        {/* Boom (horizontal arm) */}
        <mesh position={[-boomLength / 2 + 2, 0.4, 0]}>
          <boxGeometry args={[boomLength, 0.5, 0.5]} />
          <meshStandardMaterial color={craneColor} transparent opacity={opacity} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Counter-boom */}
        <mesh position={[4, 0.4, 0]}>
          <boxGeometry args={[5, 0.5, 0.5]} />
          <meshStandardMaterial color={counterColor} transparent opacity={opacity} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Counterweight */}
        <mesh position={[6, -0.2, 0]}>
          <boxGeometry args={[1.5, 1, 1]} />
          <meshStandardMaterial color={"#666"} transparent opacity={opacity} metalness={0.3} roughness={0.7} />
        </mesh>
        {/* Operator cabin */}
        <mesh position={[0.5, -0.3, 0]}>
          <boxGeometry args={[1.2, 1.2, 1]} />
          <meshStandardMaterial color={craneColor} transparent opacity={opacity} metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Hook cable */}
        <mesh position={[-boomLength / 2, -2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4, 6]} />
          <meshStandardMaterial color={"#333"} transparent opacity={opacity * 0.7} />
        </mesh>
        {/* Hook */}
        <mesh position={[-boomLength / 2, -4.2, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color={"#444"} transparent opacity={opacity} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// --- Camera Animator (supports target positions for view presets) ---
function CameraAnimator({ targetPos, lookAtPos, controlsRef }: { targetPos: [number, number, number]; lookAtPos?: [number, number, number]; controlsRef?: React.MutableRefObject<any> }) {
  const isAnimating = useRef(true);
  const startTime = useRef(Date.now());
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endPos = useMemo(() => new THREE.Vector3(...targetPos), [targetPos]);
  const endTarget = useMemo(() => new THREE.Vector3(...(lookAtPos || [0, 6, 0])), [lookAtPos]);
  const duration = 1500;
  const initialized = useRef(false);

  useFrame(({ camera }) => {
    if (!initialized.current) {
      startPos.current.copy(camera.position);
      if (controlsRef?.current) {
        startTarget.current.copy(controlsRef.current.target);
      } else {
        startTarget.current.copy(endTarget);
      }
      initialized.current = true;
      isAnimating.current = true;
      startTime.current = Date.now();
    }
    if (!isAnimating.current) return;
    const elapsed = Date.now() - startTime.current;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(startPos.current, endPos, eased);
    if (controlsRef?.current) {
      controlsRef.current.target.lerpVectors(startTarget.current, endTarget, eased);
    } else {
      camera.lookAt(endTarget);
    }

    if (t >= 1) isAnimating.current = false;
  });

  return null;
}

// View presets
const VIEW_PRESETS: Record<string, { pos: [number, number, number]; label: string; icon: string }> = {
  iso: { pos: [20, 15, 20], label: "Isometric", icon: "3D" },
  front: { pos: [0, 8, 30], label: "Front", icon: "F" },
  right: { pos: [30, 8, 0], label: "Right", icon: "R" },
  top: { pos: [0, 35, 0.1], label: "Top", icon: "T" },
  back: { pos: [0, 8, -30], label: "Back", icon: "B" },
};

// --- Construction Site Fence ---
function ConstructionFence({ progress }: { progress: number }) {
  const opacity = Math.min(1, Math.max(0, (progress - 2) / 8));
  const fadeOut = progress > 90 ? Math.max(0, (100 - progress) / 10) : 1;
  const finalOpacity = opacity * fadeOut;
  if (finalOpacity <= 0) return null;

  const fenceW = BUILDING.width + 8;
  const fenceD = BUILDING.depth + 8;
  const postHeight = 1.2;
  const postSpacing = 3;
  const posts: React.ReactElement[] = [];

  // Generate fence posts around perimeter
  for (let x = -fenceW / 2; x <= fenceW / 2; x += postSpacing) {
    posts.push(
      <mesh key={`fp-f-${x}`} position={[x, postHeight / 2, fenceD / 2]}>
        <cylinderGeometry args={[0.05, 0.05, postHeight, 6]} />
        <meshStandardMaterial color="#FF6600" transparent opacity={finalOpacity} />
      </mesh>,
      <mesh key={`fp-b-${x}`} position={[x, postHeight / 2, -fenceD / 2]}>
        <cylinderGeometry args={[0.05, 0.05, postHeight, 6]} />
        <meshStandardMaterial color="#FF6600" transparent opacity={finalOpacity} />
      </mesh>
    );
  }
  for (let z = -fenceD / 2 + postSpacing; z < fenceD / 2; z += postSpacing) {
    posts.push(
      <mesh key={`fp-l-${z}`} position={[-fenceW / 2, postHeight / 2, z]}>
        <cylinderGeometry args={[0.05, 0.05, postHeight, 6]} />
        <meshStandardMaterial color="#FF6600" transparent opacity={finalOpacity} />
      </mesh>,
      <mesh key={`fp-r-${z}`} position={[fenceW / 2, postHeight / 2, z]}>
        <cylinderGeometry args={[0.05, 0.05, postHeight, 6]} />
        <meshStandardMaterial color="#FF6600" transparent opacity={finalOpacity} />
      </mesh>
    );
  }

  // Horizontal rails (2 levels)
  const rails: React.ReactElement[] = [];
  for (const h of [0.4, 0.9]) {
    // Front & back
    rails.push(
      <mesh key={`rail-f-${h}`} position={[0, h, fenceD / 2]}>
        <boxGeometry args={[fenceW, 0.04, 0.04]} />
        <meshStandardMaterial color="#FF8800" transparent opacity={finalOpacity * 0.8} />
      </mesh>,
      <mesh key={`rail-b-${h}`} position={[0, h, -fenceD / 2]}>
        <boxGeometry args={[fenceW, 0.04, 0.04]} />
        <meshStandardMaterial color="#FF8800" transparent opacity={finalOpacity * 0.8} />
      </mesh>
    );
    // Left & right
    rails.push(
      <mesh key={`rail-l-${h}`} position={[-fenceW / 2, h, 0]}>
        <boxGeometry args={[0.04, 0.04, fenceD]} />
        <meshStandardMaterial color="#FF8800" transparent opacity={finalOpacity * 0.8} />
      </mesh>,
      <mesh key={`rail-r-${h}`} position={[fenceW / 2, h, 0]}>
        <boxGeometry args={[0.04, 0.04, fenceD]} />
        <meshStandardMaterial color="#FF8800" transparent opacity={finalOpacity * 0.8} />
      </mesh>
    );
  }

  return (
    <group>
      {posts}
      {rails}
    </group>
  );
}

// --- Construction Site Vehicles & Equipment ---

function Excavator({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 0, 25);
  const armRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (armRef.current) {
      armRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.8) * 0.12;
    }
  });
  if (opacity <= 0) return null;
  const px = -BUILDING.width / 2 - 5;
  return (
    <group position={[px, 0, -2]}>
      {/* Body */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[2, 1.2, 1.5]} />
        <meshPhysicalMaterial color="#E8B230" transparent opacity={opacity} roughness={0.4} metalness={0.3} clearcoat={0.5} />
      </mesh>
      {/* Cab */}
      <mesh position={[0.5, 1.9, 0]} castShadow>
        <boxGeometry args={[1, 0.8, 1.2]} />
        <meshPhysicalMaterial color="#D4A020" transparent opacity={opacity} roughness={0.3} metalness={0.4} clearcoat={0.6} />
        <Html position={[0, 1.5, 0]} center>
          <div style={{ background: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", whiteSpace: "nowrap", pointerEvents: "none", opacity: opacity > 0.5 ? 1 : 0, transition: "opacity 0.3s" }}>
            Excavating
          </div>
        </Html>
      </mesh>
      {/* Cab window */}
      <mesh position={[1.01, 2, 0]}>
        <boxGeometry args={[0.02, 0.45, 0.8]} />
        <meshPhysicalMaterial color="#88CCEE" transparent opacity={opacity * 0.5} roughness={0.1} metalness={0.9} clearcoat={1.0} />
      </mesh>
      {/* Left track */}
      <mesh position={[0, 0.2, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 2.4, 8]} />
        <meshStandardMaterial color="#333" transparent opacity={opacity} roughness={0.9} />
      </mesh>
      {/* Right track */}
      <mesh position={[0, 0.2, -0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 2.4, 8]} />
        <meshStandardMaterial color="#333" transparent opacity={opacity} roughness={0.9} />
      </mesh>
      {/* Arm assembly */}
      <group ref={armRef} position={[-0.8, 1.6, 0]}>
        {/* Boom */}
        <mesh position={[-1, 0.4, 0]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[2.2, 0.3, 0.25]} />
          <meshStandardMaterial color="#D4A020" transparent opacity={opacity} roughness={0.5} />
        </mesh>
        {/* Stick */}
        <mesh position={[-2.3, 0.2, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[1.5, 0.22, 0.2]} />
          <meshStandardMaterial color="#C09018" transparent opacity={opacity} roughness={0.5} />
        </mesh>
        {/* Bucket */}
        <mesh position={[-3.1, -0.15, 0]} rotation={[0, 0, -0.6]}>
          <boxGeometry args={[0.6, 0.5, 0.7]} />
          <meshPhysicalMaterial color="#888" transparent opacity={opacity} roughness={0.4} metalness={0.8} clearcoat={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function ConcreteMixer({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 10, 45);
  const drumRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (drumRef.current) {
      drumRef.current.rotation.x += 0.02;
    }
  });
  if (opacity <= 0) return null;
  const px = BUILDING.width / 2 + 6;
  return (
    <group position={[px, 0, 3]}>
      {/* Truck body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[3, 1.2, 1.5]} />
        <meshPhysicalMaterial color="#E0E0E0" transparent opacity={opacity} roughness={0.4} metalness={0.2} clearcoat={0.8} />
      </mesh>
      {/* Cab */}
      <mesh position={[1.7, 1.1, 0]} castShadow>
        <boxGeometry args={[1, 1, 1.4]} />
        <meshPhysicalMaterial color="#CCCCCC" transparent opacity={opacity} roughness={0.3} metalness={0.3} clearcoat={0.9} />
      </mesh>
      {/* Drum */}
      <mesh ref={drumRef} position={[-0.2, 1.7, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.7, 0.9, 2.2, 12]} />
        <meshPhysicalMaterial color="#F0F0F0" transparent opacity={opacity} roughness={0.3} metalness={0.6} clearcoat={0.4} />
        <Html position={[0, 1.5, 0]} center>
          <div style={{ background: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", whiteSpace: "nowrap", pointerEvents: "none", opacity: opacity > 0.5 ? 1 : 0, transition: "opacity 0.3s" }}>
            Mixing Concrete
          </div>
        </Html>
      </mesh>
      {/* Wheels */}
      {[-0.9, -0.4, 0.7, 1.2].map((wx, i) => (
        <mesh key={`mw-${i}`} position={[wx, 0.2, i < 2 ? 0.8 : 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.15, 10]} />
          <meshStandardMaterial color="#222" transparent opacity={opacity} roughness={0.9} />
        </mesh>
      ))}
      {[-0.9, -0.4, 0.7, 1.2].map((wx, i) => (
        <mesh key={`mw2-${i}`} position={[wx, 0.2, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.15, 10]} />
          <meshStandardMaterial color="#222" transparent opacity={opacity} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function MaterialPiles({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 5, 80);
  if (opacity <= 0) return null;
  return (
    <group>
      {/* Sand pile */}
      <mesh position={[BUILDING.width / 2 + 4, 0.5, -4]} castShadow>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#D2B48C" transparent opacity={opacity} roughness={1} />
      </mesh>
      {/* Gravel pile */}
      <mesh position={[BUILDING.width / 2 + 4, 0.4, -6]} castShadow>
        <coneGeometry args={[0.8, 0.8, 8]} />
        <meshStandardMaterial color="#888888" transparent opacity={opacity} roughness={1} />
      </mesh>
      {/* Lumber stack */}
      {[0, 0.22, 0.44].map((dy, i) => (
        <mesh key={`lum-${i}`} position={[-BUILDING.width / 2 - 4, 0.12 + dy, -5]}>
          <boxGeometry args={[2, 0.18, 0.5]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#A0724A" : "#8B6333"} transparent opacity={opacity} roughness={0.8} />
        </mesh>
      ))}
      {/* Steel rebar bundles */}
      {[0, 0.15, 0.3].map((dy, i) => (
        <mesh key={`reb-${i}`} position={[-BUILDING.width / 2 - 4, 0.1 + dy, -7]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 2.5, 6]} />
          <meshStandardMaterial color="#555" transparent opacity={opacity} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {/* Concrete blocks */}
      {[0, 0.35].map((dy, i) =>
        [0, 0.55].map((dx, j) => (
          <mesh key={`cb-${i}-${j}`} position={[BUILDING.width / 2 + 6 + dx, 0.17 + dy, -5]}>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <meshStandardMaterial color="#999" transparent opacity={opacity} roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
}

function ConstructionWorkers({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 5, 95);
  const bobRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (bobRef.current) {
      bobRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.04;
    }
  });
  if (opacity <= 0) return null;
  const workers: [number, number, number][] = [
    [-3, 0, 2], [2, 0, 5], [-5, 0, -3], [4, 0, -2],
    [-1, 0, 6], [6, 0, 1], [-4, 0, 4], [3, 0, -5],
  ];
  return (
    <group ref={bobRef}>
      {workers.map(([wx, , wz], i) => (
        <group key={`worker-${i}`} position={[wx, 0, wz]}>
          {/* Hard hat */}
          <mesh position={[0, 1.15, 0]}>
            <sphereGeometry args={[0.15, 8, 6]} />
            <meshStandardMaterial color="#FFD700" transparent opacity={opacity} />
          </mesh>
          {/* Body */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 0.8, 6]} />
            <meshStandardMaterial color="#3366AA" transparent opacity={opacity} roughness={0.7} />
          </mesh>
          {/* Legs */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.25, 5]} />
            <meshStandardMaterial color="#555" transparent opacity={opacity} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SiteOffice({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 2, 90);
  if (opacity <= 0) return null;
  const ox = BUILDING.width / 2 + 8;
  const oz = BUILDING.depth / 2;
  return (
    <group position={[ox, 0, oz]}>
      {/* Main body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[4, 2.2, 2.5]} />
        <meshStandardMaterial color="#F5F0E8" transparent opacity={opacity} roughness={0.7} />
      </mesh>
      {/* Door */}
      <mesh position={[-1.2, 0.7, 1.26]}>
        <boxGeometry args={[0.7, 1.4, 0.05]} />
        <meshStandardMaterial color="#6B4226" transparent opacity={opacity} roughness={0.8} />
      </mesh>
      {/* Window 1 */}
      <mesh position={[0.3, 1.3, 1.26]}>
        <boxGeometry args={[0.8, 0.5, 0.03]} />
        <meshStandardMaterial color="#88BBDD" transparent opacity={opacity * 0.5} />
      </mesh>
      {/* Window 2 */}
      <mesh position={[1.4, 1.3, 1.26]}>
        <boxGeometry args={[0.8, 0.5, 0.03]} />
        <meshStandardMaterial color="#88BBDD" transparent opacity={opacity * 0.5} />
      </mesh>
      {/* Steps */}
      <mesh position={[-1.2, 0.12, 1.6]}>
        <boxGeometry args={[0.8, 0.12, 0.4]} />
        <meshStandardMaterial color="#777" transparent opacity={opacity} roughness={0.8} />
      </mesh>
      <mesh position={[-1.2, 0.24, 1.4]}>
        <boxGeometry args={[0.8, 0.12, 0.3]} />
        <meshStandardMaterial color="#777" transparent opacity={opacity} roughness={0.8} />
      </mesh>
      {/* Sign indicator */}
      <mesh position={[0.5, 2.35, 1.26]}>
        <boxGeometry args={[1.5, 0.25, 0.04]} />
        <meshStandardMaterial color="#2255AA" transparent opacity={opacity} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[4.2, 0.08, 2.7]} />
        <meshStandardMaterial color="#AAA" transparent opacity={opacity} roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

function ParkingArea({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 2, 100);
  if (opacity <= 0) return null;
  const bx = -BUILDING.width / 2 - 8;
  const bz = BUILDING.depth / 2 + 3;
  const carColors = ["#CC3333", "#3366CC", "#666666"];
  return (
    <group position={[bx, 0, bz]}>
      {/* Parking surface */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 4]} />
        <meshStandardMaterial color="#444" transparent opacity={opacity * 0.5} roughness={0.9} />
      </mesh>
      {/* Parking lines */}
      {[-2, 0, 2].map((lx, i) => (
        <mesh key={`pline-${i}`} position={[lx, 0.02, 0]}>
          <boxGeometry args={[0.06, 0.01, 3.5]} />
          <meshStandardMaterial color="#FFF" transparent opacity={opacity * 0.7} />
        </mesh>
      ))}
      {/* Cars */}
      {carColors.map((cc, i) => (
        <group key={`car-${i}`} position={[-2 + i * 2, 0, 0]}>
          {/* Car body */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[1.4, 0.5, 0.8]} />
            <meshStandardMaterial color={cc} transparent opacity={opacity} roughness={0.4} />
          </mesh>
          {/* Car roof */}
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[0.9, 0.3, 0.75]} />
            <meshStandardMaterial color={cc} transparent opacity={opacity} roughness={0.4} />
          </mesh>
          {/* Wheels */}
          {[[-0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [0.5, -0.5]].map(([cwx, cwz], wi) => (
            <mesh key={`cw-${wi}`} position={[cwx, 0.12, cwz]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.08, 8]} />
              <meshStandardMaterial color="#111" transparent opacity={opacity} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// --- Compass Indicator ---
function CompassIndicator() {
  const hw = BUILDING.width;
  return (
    <group position={[-18, 0.1, -18]}>
      {/* Base ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.5, 32]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      {/* North arrow (red cone pointing +Z) */}
      <mesh position={[0, 0.05, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 1.2, 8]} />
        <meshStandardMaterial color="#EE3333" />
      </mesh>
      {/* South line */}
      <mesh position={[0, 0.02, -0.7]}>
        <boxGeometry args={[0.04, 0.02, 0.8]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      {/* East line */}
      <mesh position={[0.7, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.04]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      {/* West line */}
      <mesh position={[-0.7, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.04]} />
        <meshStandardMaterial color="#888" />
      </mesh>
      {/* "N" label */}
      <Html position={[0, 0.3, 1.8]} center style={{ pointerEvents: "none" }}>
        <div style={{ color: "#EE3333", fontWeight: 900, fontSize: 14 }}>N</div>
      </Html>
    </group>
  );
}

// --- Weather Effects (Rain / Snow) ---
function WeatherEffects({ enabled, type }: { enabled: boolean; type: "rain" | "snow" }) {
  const groupRef = useRef<THREE.Group>(null);
  const dropData = useMemo(() => {
    const arr: { x: number; z: number; y: number; speed: number; swaySpeed: number; swayOffset: number }[] = [];
    for (let i = 0; i < 200; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 40,
        z: (Math.random() - 0.5) * 40,
        y: Math.random() * 30,
        speed: type === "snow" ? (2 + Math.random() * 3) : (12 + Math.random() * 8),
        swaySpeed: type === "snow" ? (0.5 + Math.random()) : 0,
        swayOffset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!enabled || !groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const d = dropData[i];
      child.position.y -= d.speed * delta;
      if (type === "snow") {
        child.position.x = d.x + Math.sin(Date.now() * 0.001 * d.swaySpeed + d.swayOffset) * 0.5;
      }
      if (child.position.y < 0) {
        child.position.y = 30 + Math.random() * 5;
      }
    });
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {dropData.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]}>
          {type === "snow" ? (
            <sphereGeometry args={[0.08, 4, 4]} />
          ) : (
            <boxGeometry args={[0.02, 0.3, 0.02]} />
          )}
          <meshStandardMaterial 
            color={type === "snow" ? "#FFFFFF" : "#6688CC"} 
            transparent 
            opacity={type === "snow" ? 0.8 : 0.35} 
          />
        </mesh>
      ))}
    </group>
  );
}

// --- Safety Zones ---
function SafetyZones({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 5, 80);
  if (opacity <= 0) return null;

  const hw = BUILDING.width / 2 + 2;
  const hd = BUILDING.depth / 2 + 2;
  const tapeY = 0.6;
  const tapeH = 0.12;
  const tapeT = 0.04;

  const corners: [number, number, number][] = [
    [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
  ];

  return (
    <group>
      {/* Barrier tapes - 4 sides */}
      {/* Front & Back (along X) */}
      {([-hd, hd] as number[]).map((z) => (
        <mesh key={`tape-x-${z}`} position={[0, tapeY, z]}>
          <boxGeometry args={[hw * 2, tapeH, tapeT]} />
          <meshStandardMaterial color="#DDCC00" transparent opacity={opacity * 0.85} />
        </mesh>
      ))}
      {/* Left & Right (along Z) */}
      {([-hw, hw] as number[]).map((x) => (
        <mesh key={`tape-z-${x}`} position={[x, tapeY, 0]}>
          <boxGeometry args={[tapeT, tapeH, hd * 2]} />
          <meshStandardMaterial color="#DDCC00" transparent opacity={opacity * 0.85} />
        </mesh>
      ))}
      {/* Warning posts at corners */}
      {corners.map(([cx, , cz], i) => (
        <group key={`warn-${i}`}>
          {/* Pole */}
          <mesh position={[cx, 0.5, cz]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
            <meshStandardMaterial color="#888" transparent opacity={opacity} />
          </mesh>
          {/* Red triangle sign */}
          <mesh position={[cx, 1.15, cz]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.2, 0.3, 3]} />
            <meshStandardMaterial color="#EE2222" transparent opacity={opacity} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- Ground Access Road ---
function GroundAccessRoad({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 0, 5);
  if (opacity <= 0) return null;

  const roadX = -BUILDING.width / 2 - 8;
  const roadW = 4;
  const roadLen = 30;
  const roadZ = roadLen / 2 - 5;

  return (
    <group>
      {/* Main road surface */}
      <mesh position={[roadX, 0.01, roadZ]}>
        <boxGeometry args={[roadW, 0.02, roadLen]} />
        <meshStandardMaterial color="#3a3a3a" transparent opacity={opacity * 0.9} roughness={0.95} />
      </mesh>
      {/* Sidewalk edges */}
      {([-1, 1] as number[]).map((side) => (
        <mesh key={`sw-${side}`} position={[roadX + side * (roadW / 2 + 0.3), 0.03, roadZ]}>
          <boxGeometry args={[0.5, 0.06, roadLen]} />
          <meshStandardMaterial color="#aaaaaa" transparent opacity={opacity * 0.8} roughness={0.85} />
        </mesh>
      ))}
      {/* Center dashed line */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={`dash-${i}`} position={[roadX, 0.025, roadZ - roadLen / 2 + 1.5 + i * 3]}>
          <boxGeometry args={[0.12, 0.02, 1.5]} />
          <meshStandardMaterial color="#DDCC00" transparent opacity={opacity * 0.9} />
        </mesh>
      ))}
      {/* Speed bumps */}
      {([roadZ - 4, roadZ + 6] as number[]).map((bz, i) => (
        <mesh key={`bump-${i}`} position={[roadX, 0.06, bz]} rotation={[0, 0, 0]}>
          <boxGeometry args={[roadW - 0.6, 0.1, 0.5]} />
          <meshStandardMaterial color="#CCAA00" transparent opacity={opacity * 0.85} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// --- Building Wing (L-shape / U-shape extension) ---
function BuildingWing({
  progress, xray, wingWidth, wingDepth, floors, floorHeight,
  offsetX, offsetZ, opacity, config
}: {
  progress: number; xray: boolean;
  wingWidth: number; wingDepth: number; floors: number; floorHeight: number;
  offsetX: number; offsetZ: number; opacity: number; config: SceneConfig;
}) {
  if (opacity <= 0) return null;
  const totalH = floors * floorHeight;
  const foundationOpacity = getPhaseOpacity(progress, 6, 20);
  const structureOpacity = getPhaseOpacity(progress, 18, 42);
  const slabOpacity = getPhaseOpacity(progress, 25, 48);
  const wallOpacity = getPhaseOpacity(progress, 40, 62);
  const windowOpacity = getPhaseOpacity(progress, 55, 72);
  const roofOpacity = getPhaseOpacity(progress, 65, 80);

  return (
    <group position={[offsetX, 0, offsetZ]}>
      {/* Foundation slab */}
      {foundationOpacity > 0 && (
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[wingWidth + 0.5, 0.5, wingDepth + 0.5]} />
          <meshStandardMaterial color="#808080" transparent opacity={foundationOpacity * 0.9} roughness={0.8} />
        </mesh>
      )}
      {/* Structural columns + beams per floor */}
      {structureOpacity > 0 && Array.from({ length: floors }).map((_, f) => {
        const fp = getPhaseOpacity(progress, 18 + (f / floors) * 24, 18 + ((f + 1) / floors) * 24);
        if (fp <= 0) return null;
        const baseY = 0.4 + f * floorHeight;
        const cols: React.ReactElement[] = [];
        const colsX = Math.max(2, Math.ceil(wingWidth / 4) + 1);
        const colsZ = Math.max(2, Math.ceil(wingDepth / 4) + 1);
        for (let xi = 0; xi < colsX; xi++) {
          for (let zi = 0; zi < colsZ; zi++) {
            const cx = -wingWidth / 2 + (xi * wingWidth) / (colsX - 1);
            const cz = -wingDepth / 2 + (zi * wingDepth) / (colsZ - 1);
            cols.push(
              <mesh key={`wc-${f}-${xi}-${zi}`} position={[cx, baseY + floorHeight / 2, cz]}>
                <boxGeometry args={[0.35, floorHeight * fp, 0.35]} />
                <meshStandardMaterial color="#4080D0" transparent opacity={structureOpacity} metalness={0.5} roughness={0.3} />
              </mesh>
            );
          }
        }
        return <group key={`wf-${f}`}>{cols}</group>;
      })}
      {/* Floor slabs */}
      {slabOpacity > 0 && Array.from({ length: floors }).map((_, f) => {
        const fp = getPhaseOpacity(progress, 25 + (f / floors) * 23, 25 + ((f + 1) / floors) * 23);
        if (fp <= 0) return null;
        return (
          <mesh key={`ws-${f}`} position={[0, 0.4 + (f + 1) * floorHeight, 0]} castShadow>
            <boxGeometry args={[wingWidth, 0.25, wingDepth]} />
            <meshStandardMaterial color="#A0A0B0" transparent opacity={slabOpacity * fp} roughness={0.7} />
          </mesh>
        );
      })}
      {/* External walls */}
      {wallOpacity > 0 && Array.from({ length: floors }).map((_, f) => {
        const baseY = 0.4 + f * floorHeight;
        const walls = [
          { p: [0, baseY + floorHeight / 2, wingDepth / 2] as [number,number,number], s: [wingWidth, floorHeight, 0.25] as [number,number,number] },
          { p: [0, baseY + floorHeight / 2, -wingDepth / 2] as [number,number,number], s: [wingWidth, floorHeight, 0.25] as [number,number,number] },
          { p: [wingWidth / 2, baseY + floorHeight / 2, 0] as [number,number,number], s: [0.25, floorHeight, wingDepth] as [number,number,number] },
          { p: [-wingWidth / 2, baseY + floorHeight / 2, 0] as [number,number,number], s: [0.25, floorHeight, wingDepth] as [number,number,number] },
        ];
        return (
          <group key={`ww-${f}`}>
            {walls.map((w, i) => (
              <mesh key={i} position={w.p} castShadow>
                <boxGeometry args={w.s} />
                <meshStandardMaterial color={config.wallColor ?? "#E8D5B5"} transparent opacity={wallOpacity * (xray ? 0.15 : 0.85)} roughness={0.7} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* Windows */}
      {windowOpacity > 0 && Array.from({ length: floors }).map((_, f) => {
        const baseY = 0.4 + f * floorHeight;
        const winsPerSide = Math.max(1, Math.floor(wingWidth / 3));
        const wins: React.ReactElement[] = [];
        for (let wi = 0; wi < winsPerSide; wi++) {
          const wx = -wingWidth / 2 + 1.5 + (wi * (wingWidth - 3)) / Math.max(1, winsPerSide - 1);
          wins.push(
            <mesh key={`wwin-f-${f}-${wi}`} position={[wx, baseY + floorHeight * 0.5, wingDepth / 2 + 0.13]}>
              <boxGeometry args={[1.4, 1.3, 0.05]} />
              <meshStandardMaterial color={config.glassColor ?? "#88ccee"} transparent opacity={windowOpacity * 0.6} metalness={0.8} roughness={0.1} />
            </mesh>
          );
          wins.push(
            <mesh key={`wwin-b-${f}-${wi}`} position={[wx, baseY + floorHeight * 0.5, -wingDepth / 2 - 0.13]}>
              <boxGeometry args={[1.4, 1.3, 0.05]} />
              <meshStandardMaterial color={config.glassColor ?? "#88ccee"} transparent opacity={windowOpacity * 0.6} metalness={0.8} roughness={0.1} />
            </mesh>
          );
        }
        return <group key={`wwins-${f}`}>{wins}</group>;
      })}
      {/* Roof slab */}
      {roofOpacity > 0 && (
        <mesh position={[0, 0.4 + totalH + 0.2, 0]} castShadow>
          <boxGeometry args={[wingWidth + 0.8, 0.35, wingDepth + 0.8]} />
          <meshStandardMaterial color={config.roofColor ?? "#607080"} transparent opacity={roofOpacity} roughness={0.5} metalness={0.3} />
        </mesh>
      )}
    </group>
  );
}

// --- Animated Equipment ---
function TowerCrane({ progress }: { progress: number }) {
  const craneRef = useRef<THREE.Group>(null!);
  const hookRef = useRef<THREE.Group>(null!);
  const active = progress > 15 && progress < 90;
  
  useFrame(({ clock }) => {
    if (craneRef.current && active) {
      const t = clock.getElapsedTime();
      // Slow slewing (rotation)
      craneRef.current.rotation.y = Math.sin(t * 0.2) * 1.5;
    }
    if (hookRef.current && active) {
      const t = clock.getElapsedTime();
      // Hook going up and down
      hookRef.current.position.y = 8 + Math.sin(t * 0.5) * 4;
    }
  });

  if (!active) return null;

  return (
    <group position={[-12, 0, 10]}>
      {/* Mast */}
      <mesh position={[0, 10, 0]}>
        <boxGeometry args={[0.8, 20, 0.8]} />
        <meshStandardMaterial color="#EAB308" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Cabin & Jib Group */}
      <group ref={craneRef} position={[0, 20, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* Jib */}
        <mesh position={[8, 0.5, 0]}>
          <boxGeometry args={[16, 0.6, 0.6]} />
          <meshStandardMaterial color="#EAB308" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Counter-jib */}
        <mesh position={[-3, 0.5, 0]}>
          <boxGeometry args={[6, 0.6, 0.6]} />
          <meshStandardMaterial color="#EAB308" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Counter-weight */}
        <mesh position={[-5, 0, 0]}>
          <boxGeometry args={[2, 1.5, 1]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        {/* Hook */}
        <group ref={hookRef} position={[12, 0, 0]}>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 15]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, -8, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, -8.4, 0]}>
            <torusGeometry args={[0.15, 0.05, 8, 12]} />
            <meshStandardMaterial color="#ff2222" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// --- Placed Object Wrapper (Sims-like) ---
function PlacedObject({
  id,
  defaultPosition,
  rotationY = 0,
  pathType,
  editMode,
  selectedObjectId,
  onSelect,
  onMove,
  onRotate,
  onDelete,
  children,
}: {
  id: string;
  defaultPosition: [number, number, number];
  rotationY?: number;
  pathType?: string;
  editMode: boolean;
  selectedObjectId: string | null;
  onSelect: (id: string | null) => void;
  onMove?: (id: string) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
  children: React.ReactNode;
}) {
  const isSelected = editMode && selectedObjectId === id;
  const groupRef = useRef<THREE.Group>(null);

  const handleClick = useCallback((e: any) => {
    if (!editMode) return;
    e.stopPropagation();
    onSelect(selectedObjectId === id ? null : id);
  }, [editMode, id, selectedObjectId, onSelect]);

  useFrame((state) => {
    if (groupRef.current && pathType === "patrol" && !editMode) {
      const time = state.clock.getElapsedTime();
      const offset = Math.sin(time) * 4; 
      // animate position along the object's local forward axis relative to rotation
      groupRef.current.position.set(
        defaultPosition[0] + Math.sin(rotationY) * offset,
        defaultPosition[1],
        defaultPosition[2] + Math.cos(rotationY) * offset
      );
    } else if (groupRef.current) {
      groupRef.current.position.set(defaultPosition[0], defaultPosition[1], defaultPosition[2]);
    }
  });

  return (
    <group ref={groupRef} position={defaultPosition} rotation={[0, rotationY, 0]} onClick={handleClick}>
      {editMode && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2, 2.3, 32]} />
          <meshBasicMaterial color={isSelected ? "#00ff88" : "#ffffff"} transparent opacity={isSelected ? 0.6 : 0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
      {isSelected && (
        <Html position={[0, 4, 0]} center>
          <div style={{
            display: "flex", gap: 8, background: "rgba(0,0,0,0.8)",
            padding: "4px 8px", borderRadius: 8, pointerEvents: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
          }}>
            <Button type="text" size="small" style={{ color: "#fff" }} icon={<DragOutlined />} onClick={(e) => { e.stopPropagation(); onMove?.(id); }}>Move</Button>
            <Button type="text" size="small" style={{ color: "#fff" }} icon={<SyncOutlined />} onClick={(e) => { e.stopPropagation(); onRotate?.(id); }}>Rotate</Button>
            <Button type="text" size="small" danger icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}>Delete</Button>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- Draggable Object Wrapper ---
function DraggableObject({
  id,
  defaultPosition,
  rotationY = 0,
  editMode,
  selectedObjectId,
  onSelect,
  onPositionChange,
  onRotate,
  onDelete,
  children,
}: {
  id: string;
  defaultPosition: [number, number, number];
  rotationY?: number;
  editMode: boolean;
  selectedObjectId: string | null;
  onSelect: (id: string | null) => void;
  onPositionChange: (id: string, pos: [number, number, number]) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isSelected = editMode && selectedObjectId === id;

  const handleClick = useCallback((e: any) => {
    if (!editMode) return;
    e.stopPropagation();
    onSelect(selectedObjectId === id ? null : id);
  }, [editMode, id, selectedObjectId, onSelect]);

  const handleDragEnd = useCallback(() => {
    if (groupRef.current) {
      const p = groupRef.current.position;
      onPositionChange(id, [p.x, p.y, p.z]);
    }
  }, [id, onPositionChange]);

  if (isSelected) {
    return (
      <TransformControls
        mode="translate"
        showY={false}
        onMouseUp={handleDragEnd}
      >
        <group ref={groupRef} position={defaultPosition} rotation={[0, rotationY, 0]} onClick={handleClick}>
          {/* Selection glow ring */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2, 2.3, 32]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          {children}

          {/* Context Menu overlay */}
          <Html position={[0, 4, 0]} center>
            <div style={{
              display: "flex", gap: 8, background: "rgba(0,0,0,0.8)",
              padding: "4px 8px", borderRadius: 8, pointerEvents: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            }}>
              <Button type="text" size="small" style={{ color: "#fff" }} icon={<SyncOutlined />} onClick={(e) => { e.stopPropagation(); onRotate?.(id); }}>Rotate</Button>
              <Button type="text" size="small" danger icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}>Delete</Button>
            </div>
          </Html>
        </group>
      </TransformControls>
    );
  }

  return (
    <group position={defaultPosition} rotation={[0, rotationY, 0]} onClick={handleClick}>
      {editMode && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
    </group>
  );
}

// --- Complete Building Scene ---
function BuildingScene({
  progress,
  selectedPhase,
  wireframe,
  xray,
  config,
  editMode,
  selectedObjectId,
  onSelectObject,
  objectPositions,
  onObjectPositionChange,
  activeTemplateId,
}: {
  progress: number;
  selectedPhase: string | null;
  wireframe: boolean;
  xray: boolean;
  config: SceneConfig;
  editMode?: boolean;
  selectedObjectId?: string | null;
  onSelectObject?: (id: string | null) => void;
  objectPositions?: Record<string, [number, number, number]>;
  onObjectPositionChange?: (id: string, pos: [number, number, number]) => void;
  activeTemplateId?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const shape = config.buildingShape ?? "rectangular";
  const bw = config.buildingWidth ?? BUILDING.width;
  const bd = config.buildingDepth ?? BUILDING.depth;
  const floors = config.floors ?? BUILDING.floors;
  const fh = config.floorHeight ?? BUILDING.floorHeight;

  // Wing dimensions for L/U shapes
  const wingW = bw * 0.45;
  const wingD = bd * 0.7;

  const isHealthcare = activeTemplateId === "healthcare";
  const isEducation = activeTemplateId === "education";

  const getHighlight = (cPhase: string) => {
    if (isHealthcare) {
      if (cPhase === "site_prep" || cPhase === "foundation") return selectedPhase === "h_planning" || selectedPhase === "h_infrastructure";
      if (cPhase === "structure" || cPhase === "floor_slabs" || cPhase === "ext_walls") return selectedPhase === "h_infrastructure" || selectedPhase === "h_sterile";
      if (cPhase === "windows" || cPhase === "mep") return selectedPhase === "h_sterile" || selectedPhase === "h_equipment";
      if (cPhase === "roofing" || cPhase === "interior" || cPhase === "exterior") return selectedPhase === "h_equipment" || selectedPhase === "h_certification";
    }
    if (isEducation) {
      if (cPhase === "site_prep" || cPhase === "foundation") return selectedPhase === "e_design" || selectedPhase === "e_academic";
      if (cPhase === "structure" || cPhase === "floor_slabs" || cPhase === "ext_walls") return selectedPhase === "e_academic" || selectedPhase === "e_sports";
      if (cPhase === "windows" || cPhase === "mep") return selectedPhase === "e_sports" || selectedPhase === "e_dorm";
      if (cPhase === "roofing" || cPhase === "interior" || cPhase === "exterior") return selectedPhase === "e_dorm" || selectedPhase === "e_opening";
    }
    return selectedPhase === cPhase;
  };

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
    }
  });

  const noop = useCallback(() => {}, []);
  const noopPos = useCallback((_id: string, _p: [number, number, number]) => {}, []);
  const em = editMode ?? false;
  const selId = selectedObjectId ?? null;
  const onSel = onSelectObject ?? noop;
  const onPos = onObjectPositionChange ?? noopPos;
  const objPos = objectPositions ?? {};

  // Get position (from stored or default)
  const getPos = useCallback((id: string, def: [number, number, number]): [number, number, number] => {
    return objPos[id] || def;
  }, [objPos]);

  return (
    <group ref={groupRef}>
      {/* If user uploaded a 3D model, show it instead of procedural building */}
      {config.uploadedModelUrl ? (
        <UploadedModel
          url={config.uploadedModelUrl}
          scale={config.modelScale ?? 1}
          rotationDeg={config.modelRotation ?? 0}
        />
      ) : (
        <>
          {/* Scale main building based on config vs defaults */}
          <group scale={[
            bw / BUILDING.width,
            (floors * fh) / (BUILDING.floors * BUILDING.floorHeight),
            bd / BUILDING.depth,
          ]}>
            <SitePrep progress={progress} highlighted={getHighlight("site_prep")} />
            <Foundation progress={progress} highlighted={getHighlight("foundation")} />
            <TowerCrane progress={progress} />
            {config.showVehicles && <Excavator progress={progress} />}

            <StructuralFrame progress={progress} highlighted={getHighlight("structure")} xray={xray} />
            <FloorSlabs progress={progress} highlighted={getHighlight("floor_slabs")} xray={xray} />
            <ExternalWalls progress={progress} highlighted={getHighlight("ext_walls")} xray={xray} config={config} />
            <WindowsGlazing progress={progress} highlighted={getHighlight("windows")} xray={xray} config={config} />
            <Roofing progress={progress} highlighted={getHighlight("roofing")} config={config} />
            <MEPSystems progress={progress} highlighted={getHighlight("mep")} />
            <InteriorFinishing progress={progress} highlighted={getHighlight("interior")} />
            <ExteriorFinishing progress={progress} highlighted={getHighlight("exterior")} />
            <Scaffolding progress={progress} />
          </group>

          {/* Construction site objects */}
          <Excavator progress={progress} />
          <ConcreteMixer progress={progress} />
          <MaterialPiles progress={progress} />
          <ConstructionWorkers progress={progress} />
          <SiteOffice progress={progress} />
          <ParkingArea progress={progress} />

          {/* Template-specific objects that appear near completion */}
          {activeTemplateId === "healthcare" && progress > 85 && (
            <group position={[bw / 2 + 3, 0, bd / 2 + 2]}>
              <CatalogItemRenderer type="ambulance" />
            </group>
          )}
          {activeTemplateId === "education" && progress > 85 && (
            <group position={[bw / 2 + 4, 0, bd / 2 + 2]}>
              <CatalogItemRenderer type="school_bus" />
            </group>
          )}
          <SafetyZones progress={progress} />
          <GroundAccessRoad progress={progress} />

          {/* L-shape wing: extends from the right-front corner */}
          {shape === "l_shape" && (
            <BuildingWing
              progress={progress} xray={xray}
              wingWidth={wingW} wingDepth={wingD}
              floors={floors} floorHeight={fh}
              offsetX={bw / 2 + wingW / 2 - 0.1}
              offsetZ={-(bd / 2 - wingD / 2)}
              opacity={1}
              config={config}
            />
          )}

          {/* U-shape: two wings extending from both front corners */}
          {shape === "u_shape" && (
            <>
              <BuildingWing
                progress={progress} xray={xray}
                wingWidth={wingW} wingDepth={wingD}
                floors={floors} floorHeight={fh}
                offsetX={bw / 2 + wingW / 2 - 0.1}
                offsetZ={-(bd / 2 - wingD / 2)}
                opacity={1}
                config={config}
              />
              <BuildingWing
                progress={progress} xray={xray}
                wingWidth={wingW} wingDepth={wingD}
                floors={floors} floorHeight={fh}
                offsetX={-(bw / 2 + wingW / 2 - 0.1)}
                offsetZ={-(bd / 2 - wingD / 2)}
                opacity={1}
                config={config}
              />
            </>
          )}
        </>
      )}

      {/* Crane - draggable */}
      <DraggableObject
        id="crane"
        defaultPosition={getPos("crane", [0, 0, 0])}
        editMode={em}
        selectedObjectId={selId}
        onSelect={onSel as (id: string | null) => void}
        onPositionChange={onPos}
      >
        <ConstructionCrane progress={progress} />
      </DraggableObject>

      {/* Fence - draggable */}
      <DraggableObject
        id="fence"
        defaultPosition={getPos("fence", [0, 0, 0])}
        editMode={em}
        selectedObjectId={selId}
        onSelect={onSel as (id: string | null) => void}
        onPositionChange={onPos}
      >
        <ConstructionFence progress={progress} />
      </DraggableObject>

      {/* Education Specific Elements */}
      {isEducation && (
        <group>
           {/* Flagpole */}
           <mesh position={[bw / 2 + 5, 3, bd / 2 + 5]}>
             <cylinderGeometry args={[0.05, 0.05, 6]} />
             <meshStandardMaterial color="#ddd" />
           </mesh>
           <mesh position={[bw / 2 + 5.5, 5, bd / 2 + 5]}>
             <planeGeometry args={[1, 0.6]} />
             <meshStandardMaterial color="#fca5a5" side={THREE.DoubleSide} />
           </mesh>

           {/* Basketball Court */}
           <group position={[-bw / 2 - 8, 0.05, 0]}>
             <mesh rotation={[-Math.PI / 2, 0, 0]}>
               <planeGeometry args={[10, 16]} />
               <meshStandardMaterial color="#2d8e5d" />
             </mesh>
             {/* Lines */}
             <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
               <planeGeometry args={[9.6, 15.6]} />
               <meshStandardMaterial color="#fff" />
             </mesh>
             <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
               <planeGeometry args={[9.4, 15.4]} />
               <meshStandardMaterial color="#2d8e5d" />
             </mesh>
             {/* Hoops */}
             <group position={[0, 0, -7.5]}>
               <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.05, 0.05, 4]}/><meshStandardMaterial color="#888" /></mesh>
               <mesh position={[0, 3.5, 0.5]}><boxGeometry args={[1.5, 1, 0.05]} /><meshStandardMaterial color="#eee" /></mesh>
             </group>
             <group position={[0, 0, 7.5]} rotation={[0, Math.PI, 0]}>
               <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.05, 0.05, 4]}/><meshStandardMaterial color="#888" /></mesh>
               <mesh position={[0, 3.5, 0.5]}><boxGeometry args={[1.5, 1, 0.05]} /><meshStandardMaterial color="#eee" /></mesh>
             </group>
           </group>

           {/* School Buses */}
           <group position={[0, 0, bd / 2 + 8]}>
             <DraggableObject id="bus1" defaultPosition={[0, 0, 0]} editMode={em} selectedObjectId={selId} onSelect={onSel as any} onPositionChange={onPos}>
               <CatalogItemRenderer type="school_bus" />
             </DraggableObject>
           </group>
           <group position={[4, 0, bd / 2 + 8]}>
             <DraggableObject id="bus2" defaultPosition={[0, 0, 0]} editMode={em} selectedObjectId={selId} onSelect={onSel as any} onPositionChange={onPos}>
               <CatalogItemRenderer type="school_bus" />
             </DraggableObject>
           </group>
        </group>
      )}

      {/* Healthcare Specific Elements */}
      {isHealthcare && (
        <group>
          {/* Helipad on roof */}
          {progress >= 80 && (
             <group position={[0, floors * fh + 0.1, 0]}>
               <mesh rotation={[-Math.PI / 2, 0, 0]}>
                 <circleGeometry args={[4, 32]} />
                 <meshStandardMaterial color="#333" />
               </mesh>
               {/* H logo */}
               <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                 <planeGeometry args={[1, 2.5]} />
                 <meshStandardMaterial color="#fff" />
               </mesh>
               <mesh position={[-1.5, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                 <planeGeometry args={[1, 5]} />
                 <meshStandardMaterial color="#fff" />
               </mesh>
               <mesh position={[1.5, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                 <planeGeometry args={[1, 5]} />
                 <meshStandardMaterial color="#fff" />
               </mesh>
             </group>
          )}

          {/* Ambulances */}
           <group position={[bw / 2 + 4, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
             <DraggableObject id="amb1" defaultPosition={[0, 0, 0]} editMode={em} selectedObjectId={selId} onSelect={onSel as any} onPositionChange={onPos}>
               <CatalogItemRenderer type="ambulance" />
             </DraggableObject>
           </group>
           <group position={[bw / 2 + 4, 0, 3]} rotation={[0, Math.PI / 2, 0]}>
             <DraggableObject id="amb2" defaultPosition={[0, 0, 0]} editMode={em} selectedObjectId={selId} onSelect={onSel as any} onPositionChange={onPos}>
               <CatalogItemRenderer type="ambulance" />
             </DraggableObject>
           </group>
        </group>
      )}
    </group>
  );
}

// --- Progress Label in 3D ---
function ProgressLabel3D({ progress }: { progress: number }) {
  const labelY = 22;

  return (
    <Html position={[0, labelY, 0]} center distanceFactor={15} style={{ pointerEvents: "none" }}>
      <div
        style={{
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(8px)",
          borderRadius: 12,
          padding: "8px 16px",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          border: "1px solid rgba(255,255,255,0.15)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800 }}>{Math.round(progress)}%</div>
        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
          {progress >= 100 ? "Complete" : "In Progress"}
        </div>
      </div>
    </Html>
  );
}

// --------------------------------------------------------
// --- SCENE IMPORTS (lazy) ---
// --------------------------------------------------------

const FarmingSceneLazy = React.lazy(() => import("./scenes/FarmingScene"));
const ManufacturingSceneLazy = React.lazy(() => import("./scenes/ManufacturingScene"));
const GenericSceneLazy = React.lazy(() => import("./scenes/GenericScene"));

// --------------------------------------------------------
// --- DATA MAPPER - PM Tasks -> Template Phases ---
// --------------------------------------------------------

function mapTasksToPhases(
  tasks: any[],
  wbsItems: any[],
  templatePhases: PhaseDefinition[]
): PhaseDefinition[] {
  // Strategy: distribute tasks across template phases proportionally
  const taskCount = tasks.length;
  const phaseCount = templatePhases.length;
  const tasksPerPhase = Math.max(1, Math.ceil(taskCount / phaseCount));

  return templatePhases.map((tmpl, idx) => {
    const start = idx * tasksPerPhase;
    const phaseTasks = tasks.slice(start, start + tasksPerPhase);

    const mappedTasks: PhaseTask[] = phaseTasks.map((t: any) => ({
      id: t.id,
      name: t.title || "Untitled Task",
      assignee: t.assignee
        ? `${t.assignee.firstName || ""} ${t.assignee.lastName || ""}`.trim()
        : "Unassigned",
      status: t.status === "done" ? "completed" as const
        : (t.status === "in_progress" || t.status === "in_review") ? "in_progress" as const
        : "pending" as const,
      completion: t.status === "done" ? 100
        : (t.status === "in_progress" || t.status === "in_review")
          ? (t.estimatedHours > 0 ? Math.round((t.loggedHours / t.estimatedHours) * 100) : 50)
          : 0,
      startDate: t.startDate || tmpl.startDate,
      endDate: t.dueDate || tmpl.endDate,
    }));

    // Calculate phase progress from tasks
    const totalCompletion = mappedTasks.reduce((s, t) => s + t.completion, 0);
    const avgCompletion = mappedTasks.length > 0 ? totalCompletion / mappedTasks.length : 0;

    return {
      ...tmpl,
      tasks: mappedTasks.length > 0 ? mappedTasks : tmpl.tasks,
      startDate: phaseTasks[0]?.startDate || tmpl.startDate,
      endDate: phaseTasks[phaseTasks.length - 1]?.dueDate || tmpl.endDate,
    };
  });
}

// --------------------------------------------------------
// --- MAIN PAGE COMPONENT ---
// --------------------------------------------------------

// --- Catalog Item Renderer ---
function CatalogItemRenderer({ type }: { type: string }) {
  switch (type) {
    case "excavator":
      return <Excavator progress={100} />;
    case "concrete_mixer":
      return <ConcreteMixer progress={100} />;
    case "cone":
      return (
        <group scale={1.5}>
          <mesh position={[0, 0.4, 0]}>
            <coneGeometry args={[0.3, 0.8, 16]} />
            <meshStandardMaterial color="#FF5500" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.7, 0.1, 0.7]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      );
    case "bench":
      return (
        <group>
          {/* Seat */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[2, 0.1, 0.8]} />
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 1, -0.35]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[2, 0.6, 0.1]} />
            <meshStandardMaterial color="#8B4513" roughness={0.8} />
          </mesh>
          {/* Legs */}
          <mesh position={[-0.8, 0.25, 0.2]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0.8, 0.25, 0.2]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[-0.8, 0.25, -0.2]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0.8, 0.25, -0.2]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#222" /></mesh>
        </group>
      );
    case "dumpster":
      return (
        <group>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[2.5, 1.5, 1.5]} />
            <meshStandardMaterial color="#2E8B57" roughness={0.7} metalness={0.2} />
          </mesh>
          <mesh position={[0, 1.5, 0]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[2.5, 0.1, 1.5]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        </group>
      );
    case "streetlight":
      return (
        <group>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.05, 0.1, 6, 8]} />
            <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0.5, 6, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.05, 1, 8]} />
            <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[1, 5.9, 0]}>
            <boxGeometry args={[0.4, 0.1, 0.2]} />
            <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} />
          </mesh>
        </group>
      );
    case "tree":
      return (
        <group>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 2]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3, 0]}>
            <dodecahedronGeometry args={[1.5]} />
            <meshStandardMaterial color="#2e8b57" roughness={0.8} />
          </mesh>
        </group>
      );
    case "bush":
      return (
        <group>
          <mesh position={[0, 0.6, 0]}>
            <dodecahedronGeometry args={[0.8]} />
            <meshStandardMaterial color="#3cb371" roughness={0.9} />
          </mesh>
        </group>
      );
    case "ambulance":
      return (
        <group>
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[1.2, 1.2, 2.8]} /><meshPhysicalMaterial color="#ffffff" roughness={0.4} clearcoat={0.5} /></mesh>
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[1.25, 0.3, 0.3]} /><meshStandardMaterial color="#e63946" /></mesh>
          <mesh position={[0, 1.3, 0]}><boxGeometry args={[0.4, 0.1, 0.8]} /><meshStandardMaterial color="#0055ff" emissive="#0055ff" emissiveIntensity={0.8} /></mesh>
          <mesh position={[-0.6, 0.3, 0.9]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.3, 0.3, 0.2]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0.6, 0.3, 0.9]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.3, 0.3, 0.2]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[-0.6, 0.3, -0.9]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.3, 0.3, 0.2]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0.6, 0.3, -0.9]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.3, 0.3, 0.2]} /><meshStandardMaterial color="#222" /></mesh>
        </group>
      );
    case "medical_bed":
      return (
        <group>
          <mesh position={[0, 0.4, 0]}><boxGeometry args={[1.0, 0.1, 2.0]} /><meshStandardMaterial color="#e0e0e0" metalness={0.8} roughness={0.2} /></mesh>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.9, 0.15, 1.9]} /><meshStandardMaterial color="#88ccff" /></mesh>
          <mesh position={[0, 0.7, -0.9]} rotation={[0.4, 0, 0]}><boxGeometry args={[0.9, 0.6, 0.1]} /><meshStandardMaterial color="#e0e0e0" metalness={0.8} roughness={0.2} /></mesh>
        </group>
      );
    case "mri_machine":
      return (
        <group>
          <mesh position={[0, 1, -0.5]}><boxGeometry args={[2, 2, 1.5]} /><meshPhysicalMaterial color="#ffffff" clearcoat={0.8} roughness={0.1} /></mesh>
          <mesh position={[0, 1, -0.5]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.6, 0.6, 1.6]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0, 0.4, 0.8]}><boxGeometry args={[0.8, 0.1, 2]} /><meshStandardMaterial color="#aaccff" /></mesh>
        </group>
      );
    case "school_bus":
      return (
        <group>
          <mesh position={[0, 0.9, 0]}><boxGeometry args={[1.4, 1.4, 3.8]} /><meshPhysicalMaterial color="#ffcc00" roughness={0.5} clearcoat={0.3} /></mesh>
          <mesh position={[0, 0.9, 1.8]}><boxGeometry args={[1.4, 0.6, 0.4]} /><meshStandardMaterial color="#ffcc00" /></mesh>
          <mesh position={[0, 0.4, 1.4]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.4, 0.4, 1.6]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0, 0.4, -1.4]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.4, 0.4, 1.6]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0, 1.2, 0]}><boxGeometry args={[1.45, 0.4, 3.0]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      );
    case "desk":
      return (
        <group>
          <mesh position={[0, 0.7, 0]}><boxGeometry args={[1.2, 0.05, 0.6]} /><meshStandardMaterial color="#d2b48c" roughness={0.8} /></mesh>
          <mesh position={[-0.5, 0.35, -0.2]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#444" metalness={0.8} /></mesh>
          <mesh position={[0.5, 0.35, -0.2]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#444" metalness={0.8} /></mesh>
          <mesh position={[-0.5, 0.35, 0.2]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#444" metalness={0.8} /></mesh>
          <mesh position={[0.5, 0.35, 0.2]}><cylinderGeometry args={[0.03, 0.03, 0.7]} /><meshStandardMaterial color="#444" metalness={0.8} /></mesh>
        </group>
      );
    case "whiteboard":
      return (
        <group>
          <mesh position={[0, 1.5, 0]}><boxGeometry args={[2.4, 1.2, 0.05]} /><meshStandardMaterial color="#ffffff" roughness={0.1} /></mesh>
          <mesh position={[-1.1, 0.7, 0]}><boxGeometry args={[0.05, 1.4, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
          <mesh position={[1.1, 0.7, 0]}><boxGeometry args={[0.05, 1.4, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
          <mesh position={[-1.1, 0, 0.3]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.05, 1.5, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
          <mesh position={[1.1, 0, 0.3]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.05, 1.5, 0.05]} /><meshStandardMaterial color="#888" /></mesh>
        </group>
      );
    case "tractor":
      return (
        <group>
          <mesh position={[0, 0.8, 0]}><boxGeometry args={[1.2, 0.8, 2]} /><meshStandardMaterial color="#d32f2f" roughness={0.7} /></mesh>
          <mesh position={[0, 1.6, -0.4]}><boxGeometry args={[1.2, 1, 1]} /><meshStandardMaterial color="#444" transparent opacity={0.8} /></mesh>
          <mesh position={[-0.7, 0.6, -0.6]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.3, 16]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0.7, 0.6, -0.6]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.6, 0.6, 0.3, 16]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[-0.7, 0.4, 0.7]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 0.2, 16]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0.7, 0.4, 0.7]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 0.2, 16]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      );
    case "silo":
      return (
        <group>
          <mesh position={[0, 3, 0]}><cylinderGeometry args={[2, 2, 6, 16]} /><meshStandardMaterial color="#a0a0a0" metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[0, 6.5, 0]}><coneGeometry args={[2.1, 1, 16]} /><meshStandardMaterial color="#d32f2f" /></mesh>
        </group>
      );
    case "windmill":
      return (
        <group>
          <mesh position={[0, 4, 0]}><cylinderGeometry args={[0.3, 0.8, 8, 8]} /><meshStandardMaterial color="#888" metalness={0.5} roughness={0.5} /></mesh>
          <group position={[0, 8, 0.5]}>
            <mesh><boxGeometry args={[4, 0.2, 0.1]} /><meshStandardMaterial color="#e0e0e0" /></mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[4, 0.2, 0.1]} /><meshStandardMaterial color="#e0e0e0" /></mesh>
          </group>
        </group>
      );
    case "barn":
      return (
        <group>
          <mesh position={[0, 1.5, 0]}><boxGeometry args={[4, 3, 6]} /><meshStandardMaterial color="#b71c1c" /></mesh>
          <mesh position={[-1.2, 3.5, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[2.5, 0.2, 6.2]} /><meshStandardMaterial color="#444" /></mesh>
          <mesh position={[1.2, 3.5, 0]} rotation={[0, 0, -0.5]}><boxGeometry args={[2.5, 0.2, 6.2]} /><meshStandardMaterial color="#444" /></mesh>
        </group>
      );
    case "robotic_arm":
      return (
        <group>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.6, 0.8, 0.4, 16]} /><meshStandardMaterial color="#e67e22" /></mesh>
          <mesh position={[0, 1, 0]}><boxGeometry args={[0.3, 1.6, 0.3]} /><meshStandardMaterial color="#e67e22" /></mesh>
          <mesh position={[0.4, 1.6, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[1.2, 0.25, 0.25]} /><meshStandardMaterial color="#e67e22" /></mesh>
          <mesh position={[0.9, 1.1, 0]}><boxGeometry args={[0.1, 0.5, 0.4]} /><meshStandardMaterial color="#333" /></mesh>
        </group>
      );
    case "conveyor_belt":
      return (
        <group>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[4, 0.1, 1]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[-1.8, 0.25, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 1, 8]} /><meshStandardMaterial color="#888" /></mesh>
          <mesh position={[1.8, 0.25, 0]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 1, 8]} /><meshStandardMaterial color="#888" /></mesh>
          <mesh position={[-1.8, 0.25, 0.4]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#f39c12" /></mesh>
          <mesh position={[-1.8, 0.25, -0.4]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#f39c12" /></mesh>
          <mesh position={[1.8, 0.25, 0.4]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#f39c12" /></mesh>
          <mesh position={[1.8, 0.25, -0.4]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#f39c12" /></mesh>
        </group>
      );
    case "forklift":
      return (
        <group>
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[1.6, 0.8, 1]} /><meshStandardMaterial color="#f1c40f" /></mesh>
          <mesh position={[-0.4, 1.4, 0]}><boxGeometry args={[0.8, 0.8, 0.8]} /><meshStandardMaterial color="#222" transparent opacity={0.6} /></mesh>
          <mesh position={[0.9, 0.8, 0]}><boxGeometry args={[0.2, 1.6, 0.8]} /><meshStandardMaterial color="#333" /></mesh>
          <mesh position={[1.4, 0.1, 0.2]}><boxGeometry args={[1, 0.1, 0.15]} /><meshStandardMaterial color="#888" /></mesh>
          <mesh position={[1.4, 0.1, -0.2]}><boxGeometry args={[1, 0.1, 0.15]} /><meshStandardMaterial color="#888" /></mesh>
          <mesh position={[-0.5, 0.3, 0.5]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.2, 16]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0.5, 0.3, 0.5]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.2, 16]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[-0.5, 0.3, -0.5]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.2, 16]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0.5, 0.3, -0.5]} rotation={[Math.PI/2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.2, 16]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      );
    case "pallet":
      return (
        <group>
          <mesh position={[0, 0.1, 0]}><boxGeometry args={[1.2, 0.2, 1.2]} /><meshStandardMaterial color="#d4ac0d" /></mesh>
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[1, 0.8, 1]} /><meshStandardMaterial color="#aab7b8" /></mesh>
          <mesh position={[0, 1.4, 0]}><boxGeometry args={[1, 0.8, 1]} /><meshStandardMaterial color="#aab7b8" /></mesh>
        </group>
      );
    default:
      return (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="magenta" />
        </mesh>
      );
  }
}

// --- Measurement Tool Renderer ---
function MeasurementRenderer({ points }: { points: [number, number, number][] }) {
  if (points.length === 0) return null;
  const p1 = new THREE.Vector3(...points[0]);
  const p2 = points.length > 1 ? new THREE.Vector3(...points[1]) : null;
  const distance = p2 ? p1.distanceTo(p2) : 0;
  return (
    <group>
      <mesh position={p1}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff0000" depthTest={false} />
      </mesh>
      {p2 && (
        <>
          <mesh position={p2}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ff0000" depthTest={false} />
          </mesh>
          <Line points={[p1, p2]} color="#ff0000" lineWidth={4} depthTest={false} />
          <Html position={p1.clone().lerp(p2, 0.5)} center style={{ pointerEvents: "none" }}>
            <div style={{ background: "rgba(0,0,0,0.8)", padding: "4px 8px", borderRadius: 4, color: "#fff", fontSize: 13, fontWeight: "bold", whiteSpace: "nowrap" }}>
              {distance.toFixed(2)}m
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

export default function Construction3DPage() {
  const { token } = theme.useToken();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { themeColor } = usePreferencesStore();
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  // Template & Project State
  const [activeTemplateId, setActiveTemplateId] = useState<string>(DEFAULT_TEMPLATE);
  const [dataMode, setDataMode] = useState<"demo" | "live">("demo");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [livePhases, setLivePhases] = useState<PhaseDefinition[] | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const refreshLiveData = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const activeTemplate = TEMPLATES[activeTemplateId];
  const currentPhases = dataMode === "live" && livePhases ? livePhases : activeTemplate.defaultPhases;

  // Editable Scene Config - user can customize the 3D scene
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({ ...activeTemplate.defaultConfig });
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Update config helper
  const updateConfig = useCallback((key: keyof SceneConfig, value: any) => {
    setSceneConfig(prev => {
      const next = { ...prev, [key]: value };
      // Auto-compute field grid from acres
      if (key === "landAcres" && typeof value === "number") {
        const { rows, cols } = acresToFieldGrid(value);
        next.fieldRows = rows;
        next.fieldCols = cols;
      }
      return next;
    });
  }, []);

  // Derive project dates from phases
  const PROJECT_START = useMemo(() => currentPhases[0]?.startDate || "2025-01-15", [currentPhases]);
  const PROJECT_END = useMemo(() => currentPhases[currentPhases.length - 1]?.endDate || "2026-07-15", [currentPhases]);
  const TOTAL_DAYS = useMemo(() => dayjs(PROJECT_END).diff(dayjs(PROJECT_START), "day") || 365, [PROJECT_START, PROJECT_END]);

  // Core State
  const [progress, setProgress] = useState(58);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPhasePanel, setShowPhasePanel] = useState(true);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([50, 35, 50]);
  const [cameraLookAtTarget, setCameraLookAtTarget] = useState<[number, number, number]>([0, 6, 0]);
  const controlsRef = useRef<any>(null);
  const [savedViewpoints, setSavedViewpoints] = useState<Array<{ id: string; name: string; position: [number, number, number]; target: [number, number, number] }>>([]);

  const handleSaveViewpoint = useCallback(() => {
    if (controlsRef.current) {
      const pos = controlsRef.current.object.position.toArray() as [number, number, number];
      const tgt = controlsRef.current.target.toArray() as [number, number, number];
      setSavedViewpoints(prev => [
        ...prev,
        { id: `vp-${Date.now()}`, name: `View ${prev.length + 1}`, position: pos, target: tgt }
      ]);
      message.success("Viewpoint saved!");
    }
  }, []);

  // Edit mode (drag-and-drop / build mode) state
  const [editMode, setEditMode] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState("All");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [objectPositions, setObjectPositions] = useState<Record<string, [number, number, number]>>({});

  type PlacedObject = {
    id: string;
    type: string;
    position: [number, number, number];
    rotationY: number;
    pathType?: string;
  };
  const [customObjects, setCustomObjects] = useState<PlacedObject[]>([]);
  
  // Placement Mode States
  const [placingItem, setPlacingItem] = useState<{ id: string, type: string, rotationY: number } | null>(null);
  const [placementPos, setPlacementPos] = useState<[number, number, number]>([0, 0, 0]);

  // Keyboard shortcut for rotating/canceling placement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!placingItem) return;
      if (e.key === "Escape") {
        setPlacingItem(null);
      } else if (e.key === "r" || e.key === "R") {
        setPlacingItem(prev => prev ? { ...prev, rotationY: prev.rotationY + Math.PI / 4 } : null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [placingItem]);

  const handleObjectPositionChange = useCallback((id: string, pos: [number, number, number]) => {
    setObjectPositions(prev => ({ ...prev, [id]: pos }));
    setCustomObjects(prev => prev.map(obj => obj.id === id ? { ...obj, position: pos } : obj));
  }, []);

  const handleObjectRotate = useCallback((id: string, newRotation?: number) => {
    setCustomObjects(prev => prev.map(obj => obj.id === id ? { ...obj, rotationY: newRotation !== undefined ? newRotation : obj.rotationY + Math.PI / 4 } : obj));
  }, []);

  const handleObjectDelete = useCallback((id: string) => {
    setCustomObjects(prev => prev.filter(obj => obj.id !== id));
    setSelectedObjectId(null);
  }, []);

  const handleObjectMove = useCallback((id: string, newPos?: [number, number, number]) => {
    if (newPos) {
      setCustomObjects(prev => prev.map(o => o.id === id ? { ...o, position: newPos } : o));
      return;
    }
    setCustomObjects(prev => {
      const obj = prev.find(o => o.id === id);
      if (obj) {
        setPlacingItem({ id: obj.id, type: obj.type, rotationY: obj.rotationY });
        return prev.filter(o => o.id !== id);
      }
      return prev;
    });
    setSelectedObjectId(null);
  }, []);

  const handleAddCatalogItem = useCallback((type: string) => {
    const id = `custom_${type}_${Date.now()}`;
    setPlacingItem({ id, type, rotationY: 0 });
    setSelectedObjectId(null);
  }, []);

  const saveLayout = useCallback(() => {
    const layout = {
      customObjects,
      sceneConfig,
    };
    try {
      localStorage.setItem(`3d_layout_${activeTemplateId}`, JSON.stringify(layout));
      message.success("Layout saved successfully!");
    } catch (e) {
      message.error("Failed to save layout.");
    }
  }, [customObjects, sceneConfig, activeTemplateId]);

  const loadLayout = useCallback(() => {
    try {
      const saved = localStorage.getItem(`3d_layout_${activeTemplateId}`);
      if (saved) {
        const layout = JSON.parse(saved);
        if (layout.customObjects) setCustomObjects(layout.customObjects);
        if (layout.sceneConfig) setSceneConfig(layout.sceneConfig);
        message.success("Layout loaded!");
      } else {
        message.info("No saved layout found for this template.");
      }
    } catch (e) {
      message.error("Failed to load layout.");
    }
  }, [activeTemplateId]);

  // Day/Night mode
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    let interval: any;
    if (sceneConfig.simulateTime) {
      interval = setInterval(() => {
        setIsNightMode(prev => !prev);
      }, 10000); // Toggle every 10 seconds
    }
    return () => clearInterval(interval);
  }, [sceneConfig.simulateTime]);

  // Floor section cut (clip plane Y)
  const [sectionCutEnabled, setSectionCutEnabled] = useState(false);
  const [sectionFloor, setSectionFloor] = useState(5);

  // Annotation pins
  const [annotations, setAnnotations] = useState<Array<{
    id: string; position: [number, number, number]; text: string; color: string; type: string;
  }>>([]);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [annotationMode, setAnnotationMode] = useState(false);
  
  // Measure tool
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<[number, number, number][]>([]);

  const handleSceneClick = useCallback((e: any) => {
    if (measureMode) {
      e.stopPropagation();
      setMeasurePoints(prev => {
        if (prev.length >= 2) return [e.point.toArray()];
        return [...prev, e.point.toArray()];
      });
    } else if (annotationMode) {
      e.stopPropagation();
      addAnnotation([e.point.x, e.point.y, e.point.z]);
    }
  }, [measureMode, annotationMode, addAnnotation]);

  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [pendingAnnotationPos, setPendingAnnotationPos] = useState<[number, number, number] | null>(null);
  const [annotationForm] = Form.useForm();

  const addAnnotation = useCallback((pos: [number, number, number]) => {
    setPendingAnnotationPos(pos);
    setIsAnnotationModalOpen(true);
  }, []);

  const handleAnnotationSubmit = useCallback((values: { title: string, type: string }) => {
    if (!pendingAnnotationPos) return;
    const colors: Record<string, string> = { info: "#339af0", warning: "#fcc419", issue: "#ff6b6b", done: "#51cf66" };
    const newPin = {
      id: `pin-${Date.now()}`,
      position: pendingAnnotationPos,
      text: values.title,
      color: colors[values.type] || "#339af0",
      type: values.type,
    };
    setAnnotations(prev => [...prev, newPin]);
    message.success(`Pin added: ${values.title}`);
    setIsAnnotationModalOpen(false);
    setPendingAnnotationPos(null);
    annotationForm.resetFields();
  }, [pendingAnnotationPos, annotationForm]);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }, []);

  // Screenshot handler
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const takeScreenshot = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.download = `construction-3d-${dayjs().format("YYYY-MM-DD-HHmmss")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      message.success("Screenshot saved!");
    }
  }, []);

  // Stats
  const hudCompleted = currentPhases.filter(p => progress >= p.endPercent).length;
  const hudTotal = currentPhases.length;
  const hudActive = currentPhases.filter(p => progress >= p.startPercent && progress < p.endPercent).length;

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Auto-play timeline
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setProgress((prev) => {
        const next = prev + delta * playSpeed * 2;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playSpeed]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!canvasContainerRef.current) return;
    if (!document.fullscreenElement) {
      canvasContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Fetch projects list
  useEffect(() => {
    if (dataMode !== "live") return;
    setProjectLoading(true);
    gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID })
      .then((data: any) => setProjects(data.pmProjects || []))
      .catch(() => message.error("Failed to load projects"))
      .finally(() => setProjectLoading(false));
  }, [dataMode, refreshKey]);

  // Fetch project tasks + milestones when project selected
  useEffect(() => {
    if (dataMode !== "live" || !selectedProjectId) return;
    setProjectLoading(true);
    // Store selected project metadata
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    setSelectedProject(proj || null);
    Promise.all([
      gql(GET_PROJECT_TASKS, { tenantId: DEFAULT_TENANT_ID, projectId: selectedProjectId }),
      gql(GET_WBS_ITEMS, { projectId: selectedProjectId }),
      gql(GET_MILESTONES, { projectId: selectedProjectId }),
    ]).then(([taskData, wbsData, msData]: any[]) => {
      const tasks = taskData.pmTasks || [];
      const wbsItems = wbsData.pmWbsItems || [];
      const ms = msData.pmMilestones || [];
      setMilestones(ms);
      // Map tasks to template phases by grouping
      if (tasks.length > 0) {
        const phases = mapTasksToPhases(tasks, wbsItems, activeTemplate.defaultPhases);
        setLivePhases(phases);
        // Auto-compute progress from task completions
        const totalCompletion = tasks.reduce((s: number, t: any) => {
          if (t.status === 'done') return s + 100;
          if (t.status === 'in_progress' || t.status === 'in_review') {
            return s + (t.estimatedHours > 0 ? Math.min(99, Math.round((t.loggedHours / t.estimatedHours) * 100)) : 50);
          }
          return s;
        }, 0);
        const autoProgress = tasks.length > 0 ? Math.round(totalCompletion / tasks.length) : 0;
        setProgress(autoProgress);
      }
    }).catch(() => message.error("Failed to load project data"))
      .finally(() => { setProjectLoading(false); setLastSyncTime(dayjs().format("HH:mm:ss")); });
  }, [dataMode, selectedProjectId, activeTemplateId, refreshKey]);

  // Handle template change - reset camera and config
  useEffect(() => {
    const pos = activeTemplate.cameraDefaults.position;
    setCameraTarget(pos);
    setCameraKey(k => k + 1);
    setSelectedPhase(null);
    setShowTaskPanel(false);
    setSceneConfig({ ...activeTemplate.defaultConfig });
  }, [activeTemplateId]);

  // Computed values
  const currentDate = useMemo(() => {
    const elapsed = Math.round((progress / 100) * TOTAL_DAYS);
    return dayjs(PROJECT_START).add(elapsed, "day");
  }, [progress, TOTAL_DAYS, PROJECT_START]);

  const daysElapsed = useMemo(() => {
    return Math.round((progress / 100) * TOTAL_DAYS);
  }, [progress, TOTAL_DAYS]);

  const daysRemaining = useMemo(() => TOTAL_DAYS - daysElapsed, [TOTAL_DAYS, daysElapsed]);

  const activePhase = useMemo(() => {
    return currentPhases.find(
      (p) => progress >= p.startPercent && progress < p.endPercent
    ) || currentPhases[currentPhases.length - 1];
  }, [progress, currentPhases]);

  const completedPhases = useMemo(() => {
    return currentPhases.filter((p) => progress >= p.endPercent).length;
  }, [progress, currentPhases]);

  const totalTasks = useMemo(() => {
    return currentPhases.reduce((sum, p) => sum + p.tasks.length, 0);
  }, [currentPhases]);

  const completedTasks = useMemo(() => {
    return currentPhases.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === "completed").length,
      0
    );
  }, [currentPhases]);

  const selectedPhaseData = useMemo(() => {
    return currentPhases.find((p) => p.id === selectedPhase) || null;
  }, [selectedPhase, currentPhases]);

  // -- Glassmorphism styles --
  const glassCard = useMemo(
    () => ({
      background: isDark ? "rgba(15, 15, 23, 0.65)" : "rgba(255,255,255,0.75)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.4)",
      boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.02)",
      borderRadius: 16,
    }),
    [isDark]
  );

  const glassPanel = useMemo(
    () => ({
      background: isDark ? "rgba(15, 15, 23, 0.75)" : "rgba(255,255,255,0.85)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.6)",
      boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02)",
      borderRadius: 16,
    }),
    [isDark]
  );

  // Get phase status
  const getPhaseStatus = (phase: PhaseDefinition) => {
    if (progress >= phase.endPercent) return "completed";
    if (progress >= phase.startPercent) return "in_progress";
    return "pending";
  };

  const getPhaseProgress = (phase: PhaseDefinition) => {
    return Math.round(getPhaseOpacity(progress, phase.startPercent, phase.endPercent) * 100);
  };

  // -- Stat Card --
  const StatCard = ({
    title,
    value,
    suffix,
    icon,
    gradient,
  }: {
    title: string;
    value: number | string;
    suffix?: string;
    icon: React.ReactNode;
    gradient: string;
  }) => (
    <Card
      size="small"
      style={{
        ...glassCard,
        overflow: "hidden",
        position: "relative",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      styles={{ body: { padding: "16px 14px", position: "relative", zIndex: 1 } }}
      hoverable
    >
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: gradient, borderRadius: "16px 16px 0 0",
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <AntText type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {title}
          </AntText>
          <div
            style={{
              fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginTop: 2,
              background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}
          >
            {value}
            {suffix && <span style={{ fontSize: 16 }}>{suffix}</span>}
          </div>
        </div>
        <div
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: gradient, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#fff", opacity: 0.85,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );

  // -- Phase List Item --
  const PhaseItem = ({ phase, index }: { phase: PhaseDefinition; index: number }) => {
    const status = getPhaseStatus(phase);
    const phaseProgress = getPhaseProgress(phase);
    const isSelected = selectedPhase === phase.id;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <div
          onClick={() => {
            setSelectedPhase(isSelected ? null : phase.id);
            setShowTaskPanel(!isSelected);
            setSelectedTaskId(null);
          }}
          style={{
            padding: "12px",
            borderRadius: 14,
            cursor: "pointer",
            background: isSelected
              ? isDark ? "rgba(139,92,246,0.2)" : "rgba(99,102,241,0.12)"
              : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            border: isSelected
              ? `1px solid ${phase.color}66`
              : isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)",
            boxShadow: isSelected ? `0 4px 12px ${phase.color}22` : "none",
            transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            marginBottom: 8,
            transform: isSelected ? "scale(1.02)" : "scale(1)",
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
              e.currentTarget.style.transform = "scale(1.01)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
              e.currentTarget.style.transform = "scale(1)";
            }
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: phase.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              {phase.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.2px" }}>{phase.name}</div>
              <div style={{ fontSize: 10, color: isDark ? "#94a3b8" : "#888", marginTop: 2, fontWeight: 500 }}>
                {phase.tasks.length} tasks • {dayjs(phase.startDate).format("MMM D")} - {dayjs(phase.endDate).format("MMM D, 'YY")}
              </div>
            </div>
            <Tag
              style={{
                borderRadius: 12, fontSize: 10, fontWeight: 600, padding: "2px 8px", margin: 0,
                background: status === "completed" ? "#22c55e15" : status === "in_progress" ? "#f59e0b15" : "#6b728015",
                color: status === "completed" ? "#22c55e" : status === "in_progress" ? "#f59e0b" : "#9ca3af",
                border: `1px solid ${status === "completed" ? "#22c55e30" : status === "in_progress" ? "#f59e0b30" : "#6b728030"}`,
              }}
            >
              {status === "completed" ? "Done" : status === "in_progress" ? "Active" : "Pending"}
            </Tag>
          </div>
          <Progress
            percent={phaseProgress}
            size="small"
            showInfo={false}
            strokeColor={phase.color}
            trailColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
            style={{ margin: 0 }}
          />
        </div>
      </motion.div>
    );
  };

  // -- Task Status Config --
  const taskStatusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    completed: { color: "#22c55e", label: "Completed", icon: <CheckCircleOutlined /> },
    in_progress: { color: "#f59e0b", label: "In Progress", icon: <ClockCircleOutlined /> },
    pending: { color: "#6b7280", label: "Pending", icon: <ClockCircleOutlined /> },
  };

  return (
    <CMSLayout
      title={
        <AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>
          3D {activeTemplate.name} Progress
        </AuroraText>
      }
      subTitle={
        <DecryptedText
          text={`Interactive ${activeTemplate.name.toLowerCase()} visualization by time and task`}
          animateOn="view"
          revealDirection="center"
          speed={40}
          maxIterations={15}
          sequential
        />
      }
    >
      {/* -- Stats Header -- */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <StatCard
              title="Overall Progress"
              value={Math.round(progress)}
              suffix="%"
              icon={<DashboardOutlined />}
              gradient={`linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`}
            />
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <StatCard
              title="Active Phase"
              value={activePhase.shortName}
              icon={<RocketOutlined />}
              gradient={activePhase.gradient}
            />
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <StatCard
              title="Phases Done"
              value={`${completedPhases}/${currentPhases.length}`}
              icon={<CheckCircleOutlined />}
              gradient="linear-gradient(135deg, #22c55e, #4ade80)"
            />
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <StatCard
              title="Days Remaining"
              value={daysRemaining}
              icon={<CalendarOutlined />}
              gradient="linear-gradient(135deg, #f59e0b, #fbbf24)"
            />
          </motion.div>
        </Col>
      </Row>
      {/* -- Template Selector Bar -- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card
          size="small"
          style={{ ...glassCard, marginBottom: 12 }}
          styles={{ body: { padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" } }}
        >
          {/* Template Type */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexDirection: "column", width: "100%" }}>
            <AntText type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Template Options
            </AntText>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, width: "100%", padding: "4px" }}>
              {TEMPLATE_LIST.map(t => (
                <Card
                  key={t.id}
                  hoverable
                  onClick={() => { setActiveTemplateId(t.id); setLivePhases(null); }}
                  style={{
                    minWidth: 100,
                    border: activeTemplateId === t.id ? "2px solid #3b82f6" : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    background: activeTemplateId === t.id ? (isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.05)") : (isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.4)"),
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  styles={{ body: { padding: "12px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 } }}
                >
                  <span style={{ fontSize: 28 }}>{t.icon}</span>
                  <AntText style={{ fontSize: 12, fontWeight: activeTemplateId === t.id ? 600 : 500, textAlign: "center" }}>{t.name}</AntText>
                </Card>
              ))}
            </div>
          </div>

          <Divider type="vertical" style={{ height: 24, margin: 0 }} />

          {/* Data Mode */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AntText type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Data
            </AntText>
            <Segmented
              size="small"
              value={dataMode}
              onChange={(val) => setDataMode(val as "demo" | "live")}
              options={[
                { value: "demo", label: <span>Demo</span> },
                { value: "live", label: <span><DatabaseOutlined /> Live</span> },
              ]}
              style={{ borderRadius: 8 }}
            />
          </div>

          {/* Project Selector (only in live mode) */}
          {dataMode === "live" && (
            <>
              <Divider type="vertical" style={{ height: 24, margin: 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
                <AntText type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Project
                </AntText>
                <Select
                  size="small"
                  placeholder="Select a project..."
                  loading={projectLoading}
                  value={selectedProjectId}
                  onChange={(val) => setSelectedProjectId(val)}
                  style={{ flex: 1, minWidth: 180 }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={projects.map((p: any) => ({
                    value: p.id,
                    label: `${p.projectNumber ? p.projectNumber + ' - ' : ''}${p.name}`,
                  }))}
                />
                {projectLoading && <Spin size="small" />}
              </div>
            </>
          )}

          {/* Demo mode indicator */}
          {dataMode === "demo" && (
            <Tag color="orange" style={{ margin: 0, borderRadius: 6 }}>
              Demo Mode - Showing sample data
            </Tag>
          )}

          {/* Live mode: project info bar */}
          {dataMode === "live" && selectedProject && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Tag color="green" style={{ margin: 0, borderRadius: 6 }}>
                <CheckCircleOutlined /> Live
              </Tag>
              {selectedProject.owner && (
                <Tag style={{ margin: 0, borderRadius: 6, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }}>
                  {selectedProject.owner.firstName} {selectedProject.owner.lastName}
                </Tag>
              )}
              {selectedProject.startDate && (
                <Tag style={{ margin: 0, borderRadius: 6, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }}>
                  <CalendarOutlined /> {dayjs(selectedProject.startDate).format("MMM D")} - {selectedProject.endDate ? dayjs(selectedProject.endDate).format("MMM D, YYYY") : "TBD"}
                </Tag>
              )}
              {milestones.length > 0 && (
                <Tooltip title={milestones.map((m: any) => m.name + ": " + (m.completedDate ? "Done" : (m.percentComplete || 0) + "%")).join(", ")}>
                  <Tag color="blue" style={{ margin: 0, borderRadius: 6, cursor: "pointer" }}>
                    <RocketOutlined /> {milestones.filter((m: any) => m.completedDate).length}/{milestones.length} Milestones
                  </Tag>
                </Tooltip>
              )}
            </div>
          )}

          {/* Live mode: refresh button */}
          {dataMode === "live" && selectedProjectId && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Tooltip title="Refresh project data">
                <Button
                  size="small"
                  type="text"
                  icon={<SyncOutlined spin={projectLoading} />}
                  onClick={refreshLiveData}
                  disabled={projectLoading}
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
              {lastSyncTime && (
                <AntText type="secondary" style={{ fontSize: 10, opacity: 0.6 }}>
                  Synced {lastSyncTime}
                </AntText>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Edit Mode Toggle */}
          <Tooltip title={editMode ? "Exit Edit Mode (drag objects)" : "Edit Mode (drag & drop objects)"}>
            <Button
              type={editMode ? "primary" : "text"}
              size="small"
              icon={<DragOutlined />}
              onClick={() => { setEditMode(!editMode); if (editMode) setSelectedObjectId(null); }}
              style={{
                borderRadius: 8,
                ...(editMode ? { background: "linear-gradient(135deg, #52c41a, #389e0d)", border: "none" } : {}),
              }}
            >
              {editMode ? "Editing" : "Edit"}
            </Button>
          </Tooltip>

          {/* Config Toggle */}
          <Tooltip title="Customize 3D Scene">
            <Button
              type={showConfigPanel ? "primary" : "text"}
              size="small"
              icon={<ToolOutlined />}
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              style={{ borderRadius: 8 }}
            >
              Configure
            </Button>
          </Tooltip>
        </Card>
      </motion.div>


      {/*  Main Content: Panels + 3D Viewport  */}
      <div
        ref={canvasContainerRef}
        style={{
          display: "flex",
          gap: 12,
          height: isFullscreen ? "100vh" : "calc(100vh - 340px)",
          minHeight: 480,
          position: "relative",
        }}
      >
        {/*  Left Panel: Phase List  */}
        <AnimatePresence>
          {showPhasePanel && !isFullscreen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                ...glassPanel,
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "14px 14px 8px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Construction Phases</div>
                <AntText type="secondary" style={{ fontSize: 11 }}>
                  {completedPhases} of {currentPhases.length} completed
                </AntText>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
                {currentPhases.map((phase, i) => (
                  <PhaseItem key={phase.id} phase={phase} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/*  3D Viewport  */}
        <div
          style={{
            flex: 1,
            ...glassPanel,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Viewport Controls Overlay */}
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10,
              display: "flex",
              gap: 4,
              padding: "4px 6px",
              ...glassPanel,
              borderRadius: 24,
              alignItems: "center",
              boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.5)" : "0 12px 40px rgba(0,0,0,0.1)",
            }}
          >
            <Tooltip title={showPhasePanel ? "Hide Phases" : "Show Phases"}>
              <Button
                type={showPhasePanel ? "primary" : "text"}
                shape="circle"
                icon={showPhasePanel ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={() => setShowPhasePanel(!showPhasePanel)}
                style={{ color: showPhasePanel ? "#fff" : (isDark ? "#ccc" : "#555") }}
              />
            </Tooltip>
            <Tooltip title="X-Ray Mode">
              <Button
                type={xray ? "primary" : "text"}
                shape="circle"
                icon={<ExperimentOutlined />}
                onClick={() => setXray(!xray)}
                style={{ color: xray ? "#fff" : (isDark ? "#ccc" : "#555") }}
              />
            </Tooltip>
            <Tooltip title="Reset Camera">
              <Button
                type="text"
                shape="circle"
                icon={<AimOutlined />}
                onClick={() => { setCameraTarget([20, 15, 20]); setCameraKey((k) => k + 1); }}
                style={{ color: isDark ? "#ccc" : "#555" }}
              />
            </Tooltip>
            <Tooltip title="Scene Settings">
              <Button
                type={showConfigPanel ? "primary" : "text"}
                shape="circle"
                icon={<ToolOutlined />}
                onClick={() => setShowConfigPanel(!showConfigPanel)}
                style={{ color: showConfigPanel ? "#fff" : (isDark ? "#ccc" : "#555") }}
              />
            </Tooltip>
            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <Button
                type="text"
                shape="circle"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
                style={{ color: isDark ? "#ccc" : "#555" }}
              />
            </Tooltip>
            <Tooltip title="Screenshot">
              <Button
                type="text"
                shape="circle"
                icon={<CameraOutlined />}
                onClick={takeScreenshot}
                style={{ color: isDark ? "#ccc" : "#555" }}
              />
            </Tooltip>
            <div style={{ width: 1, height: 16, background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)", margin: "0 4px" }} />
            <Popover
              title={<span style={{ fontSize: 13, fontWeight: 600 }}>Environment Settings</span>}
              trigger="click"
              placement="bottomRight"
              content={
                <div style={{ width: 240, paddingTop: 8 }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: isDark ? "#aaa" : "#666", marginBottom: 8, fontWeight: 500 }}>Time of Day</div>
                    <Segmented
                      block
                      value={isNightMode ? "night" : "day"}
                      onChange={(val) => setIsNightMode(val === "night")}
                      options={[
                        { label: "Day", value: "day" },
                        { label: "Night", value: "night" },
                      ]}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: isDark ? "#aaa" : "#666", marginBottom: 8, fontWeight: 500 }}>Weather Condition</div>
                    <Segmented
                      block
                      value={sceneConfig.showWeather ? sceneConfig.weatherType || "rain" : "clear"}
                      onChange={(val) => {
                        if (val === "clear") {
                          updateConfig("showWeather", false);
                        } else {
                          updateConfig("showWeather", true);
                          updateConfig("weatherType", val);
                        }
                      }}
                      options={[
                        { label: "Clear", value: "clear" },
                        { label: "Rain", value: "rain" },
                        { label: "Snow", value: "snow" },
                      ]}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, color: isDark ? "#aaa" : "#666", fontWeight: 500 }}>Auto-Simulate Time</div>
                    <Switch
                      checked={sceneConfig.simulateTime}
                      onChange={(c) => updateConfig("simulateTime", c)}
                      size="small"
                    />
                  </div>
                </div>
              }
            >
              <Tooltip title="Environment Controls">
                <Button
                  type={isNightMode || sceneConfig.showWeather ? "primary" : "text"}
                  shape="circle"
                  icon={<CloudOutlined />}
                  style={{ color: isNightMode || sceneConfig.showWeather ? "#fff" : (isDark ? "#ccc" : "#555") }}
                />
              </Tooltip>
            </Popover>
            <Tooltip title={sectionCutEnabled ? "Disable Section Cut" : "Section Cut"}>
              <Button
                type={sectionCutEnabled ? "primary" : "text"}
                shape="circle"
                icon={<ColumnWidthOutlined />}
                onClick={() => setSectionCutEnabled(!sectionCutEnabled)}
                style={{ color: sectionCutEnabled ? "#fff" : (isDark ? "#ccc" : "#555") }}
              />
            </Tooltip>
            <Tooltip title={annotationMode ? "Exit Pin Mode" : "Add Pins"}>
              <Button
                type={annotationMode ? "primary" : "text"}
                shape="circle"
                icon={<AlertOutlined />}
                onClick={() => setAnnotationMode(!annotationMode)}
                style={{ color: annotationMode ? "#fff" : (isDark ? "#ccc" : "#555"), ...(annotationMode ? { background: "#e64980", borderColor: "#e64980" } : {}) }}
              />
            </Tooltip>
            <Tooltip title={measureMode ? "Exit Measure Mode" : "Measure Distance"}>
              <Button
                type={measureMode ? "primary" : "text"}
                shape="circle"
                icon={<AimOutlined />}
                onClick={() => {
                  setMeasureMode(!measureMode);
                  if (measureMode) setMeasurePoints([]); // clear on exit
                }}
                style={{ color: measureMode ? "#fff" : (isDark ? "#ccc" : "#555"), ...(measureMode ? { background: "#f59f00", borderColor: "#f59f00" } : {}) }}
              />
            </Tooltip>
            {annotations.length > 0 && (
              <Tooltip title={showAnnotations ? "Hide Pins" : "Show Pins"}>
                <Badge count={annotations.length} size="small" offset={[-2, 2]}>
                  <Button
                    type={showAnnotations ? "primary" : "text"}
                    shape="circle"
                    icon={<AppstoreOutlined />}
                    onClick={() => setShowAnnotations(!showAnnotations)}
                    style={{ color: showAnnotations ? "#fff" : (isDark ? "#ccc" : "#555") }}
                  />
                </Badge>
              </Tooltip>
            )}
          </div>

          {/* Section Cut Slider */}
          {sectionCutEnabled && (
            <div
              style={{
                position: "absolute",
                top: 50,
                right: 10,
                zIndex: 10,
                background: isDark ? "rgba(20,20,40,0.9)" : "rgba(255,255,255,0.95)",
                backdropFilter: "blur(12px)",
                borderRadius: 12,
                padding: "12px 16px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                width: 160,
              }}
            >
              <AntText strong style={{ fontSize: 11, display: "block", marginBottom: 6 }}>
                Floor Section Cut
              </AntText>
              <Slider
                vertical
                min={1}
                max={sceneConfig.floors ?? 5}
                value={sectionFloor}
                onChange={(v) => setSectionFloor(v)}
                tooltip={{ formatter: (v) => `Floor ${v}` }}
                style={{ height: 120, margin: "0 auto" }}
              />
              <AntText type="secondary" style={{ fontSize: 10, display: "block", textAlign: "center", marginTop: 4 }}>
                Showing floors 1-{sectionFloor}
              </AntText>
            </div>
          )}

          {/* View Preset Buttons */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {Object.entries(VIEW_PRESETS).map(([key, preset]) => (
              <Tooltip key={key} title={preset.label} placement="right">
                <Button
                  size="small"
                  onClick={() => { setCameraTarget(preset.pos); setCameraLookAtTarget([0, 6, 0]); setCameraKey((k) => k + 1); }}
                  style={{
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    width: 36,
                    height: 28,
                    padding: 0,
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  {preset.icon}
                </Button>
              </Tooltip>
            ))}
            
            {savedViewpoints.length > 0 && <div style={{ height: 1, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", margin: "4px 0" }} />}
            
            {savedViewpoints.map((vp) => (
              <Tooltip key={vp.id} title={vp.name} placement="right">
                <Button
                  size="small"
                  onClick={() => { setCameraTarget(vp.position); setCameraLookAtTarget(vp.target); setCameraKey((k) => k + 1); }}
                  style={{
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    width: 36,
                    height: 28,
                    padding: 0,
                    background: isDark ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)",
                    border: isDark ? "1px solid rgba(76, 175, 80, 0.3)" : "1px solid rgba(76, 175, 80, 0.2)",
                    color: isDark ? "#81c784" : "#2e7d32",
                  }}
                >
                  <EyeOutlined />
                </Button>
              </Tooltip>
            ))}

            <Tooltip title="Save Current Viewpoint" placement="right">
              <Button
                size="small"
                onClick={handleSaveViewpoint}
                style={{
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  width: 36,
                  height: 28,
                  padding: 0,
                  background: "transparent",
                  border: isDark ? "1px dashed rgba(255,255,255,0.2)" : "1px dashed rgba(0,0,0,0.2)",
                  color: isDark ? "#aaa" : "#666",
                  marginTop: 4,
                }}
              >
                +
              </Button>
            </Tooltip>
          </div>

          {/* Phase color legend */}
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              zIndex: 10,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              background: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              borderRadius: 10,
              padding: "6px 10px",
              maxWidth: 500,
            }}
          >
            {currentPhases.map((phase) => {
              const status = getPhaseStatus(phase);
              return (
                <Tooltip key={phase.id} title={`${phase.name}: ${getPhaseProgress(phase)}%`}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      opacity: status === "pending" ? 0.4 : 1,
                      transition: "opacity 0.2s",
                    }}
                    onClick={() => {
                      setSelectedPhase(selectedPhase === phase.id ? null : phase.id);
                      setShowTaskPanel(selectedPhase !== phase.id);
                    }}
                  >
                    <div
                      style={{
                        width: 8, height: 8, borderRadius: 2,
                        background: phase.color,
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 500, color: isDark ? "#ccc" : "#555" }}>
                      {phase.shortName}
                    </span>
                  </div>
                </Tooltip>
              );
            })}
          </div>

          {/* Stats HUD overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              zIndex: 10,
              background: isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              borderRadius: 12,
              padding: "10px 14px",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
              Project Stats
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ opacity: 0.7 }}>Progress</span>
                <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{progress}%</Tag>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ opacity: 0.7 }}>Completed</span>
                <Tag color="green" style={{ margin: 0, fontSize: 10 }}>{hudCompleted}/{hudTotal}</Tag>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ opacity: 0.7 }}>Active</span>
                <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>{hudActive}</Tag>
              </div>
              {annotations.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ opacity: 0.7 }}>Pins</span>
                  <Tag color="red" style={{ margin: 0, fontSize: 10 }}>{annotations.length}</Tag>
                </div>
              )}
              {(sceneConfig.buildingShape ?? "rectangular") !== "rectangular" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ opacity: 0.7 }}>Shape</span>
                  <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>{(sceneConfig.buildingShape ?? "rectangular").replace("_", "-")}</Tag>
                </div>
              )}
              {isNightMode && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ opacity: 0.7 }}>Mode</span>
                  <Tag color="geekblue" style={{ margin: 0, fontSize: 10 }}> Night</Tag>
                </div>
              )}
            </div>
          </div>

          {/* Build Catalog UI */}
          {editMode && (
            <div
              style={{
                position: "absolute",
                bottom: 120, // Sit above the timeline scrubber
                left: "50%",
                transform: "translateX(-50%)",
                ...glassPanel,
                padding: "12px 20px",
                borderRadius: 24,
                boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)" : "0 16px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "center",
                zIndex: 9999,
              }}
            >
              <Segmented
                size="small"
                value={catalogCategory}
                onChange={(val) => setCatalogCategory(val as string)}
                options={["All", ...Array.from(new Set(CATALOG_ITEMS.map(item => item.category)))]}
                style={{ marginBottom: 2, background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)" }}
              />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", maxWidth: 600 }}>
                {CATALOG_ITEMS.filter(item => catalogCategory === "All" || item.category === catalogCategory).map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("catalogItem", item.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCatalogItem(item.id);
                    }}
                    style={{
                      width: 90, height: 110,
                      borderRadius: 12,
                      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)",
                      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                      overflow: "hidden",
                      display: "flex", flexDirection: "column",
                      cursor: "grab",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = isDark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
                    }}
                  >
                    <div style={{ height: 65, width: "100%", background: "#f0f0f0", position: "relative" }}>
                      {/* Using loremflickr for realistic pictures as requested */}
                      <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", textAlign: "center" }}>
                      <AntText style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.1 }}>{item.name}</AntText>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mini-map overlay code restored */}
          <div
            style={{
              position: "absolute",
              bottom: 140,
              right: 10,
              zIndex: 10,
              width: 120,
              height: 120,
              background: isDark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
              borderRadius: 10,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
              overflow: "hidden",
              padding: 8,
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 700, opacity: 0.5, textAlign: "center", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
              Site Plan
            </div>
            <div style={{ position: "relative", width: "100%", height: "calc(100% - 16px)" }}>
              {/* Grid background */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} 1px, transparent 1px)`, backgroundSize: "10px 10px" }} />
              {/* Building footprint */}
              <div style={{
                position: "absolute",
                left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                width: `${Math.min(50, (sceneConfig.buildingWidth ?? 12) * 2.5)}px`,
                height: `${Math.min(40, (sceneConfig.buildingDepth ?? 8) * 2.5)}px`,
                background: progress > 20 ? "#4080D0" : "#808080",
                opacity: 0.8,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.3)",
              }} />
              {/* L-shape wing */}
              {(sceneConfig.buildingShape === "l_shape" || sceneConfig.buildingShape === "u_shape") && (
                <div style={{
                  position: "absolute",
                  right: "15%", top: "30%",
                  width: 12, height: 20,
                  background: "#4080D0",
                  opacity: 0.6,
                  borderRadius: 1,
                }} />
              )}
              {/* U-shape left wing */}
              {sceneConfig.buildingShape === "u_shape" && (
                <div style={{
                  position: "absolute",
                  left: "15%", top: "30%",
                  width: 12, height: 20,
                  background: "#4080D0",
                  opacity: 0.6,
                  borderRadius: 1,
                }} />
              )}
              {/* Fence perimeter */}
              <div style={{
                position: "absolute",
                left: "50%", top: "50%",
                transform: "translate(-50%, -50%)",
                width: `${Math.min(70, (sceneConfig.buildingWidth ?? 12) * 3.5)}px`,
                height: `${Math.min(55, (sceneConfig.buildingDepth ?? 8) * 3.5)}px`,
                border: `1px dashed ${isDark ? "rgba(255,200,0,0.3)" : "rgba(200,150,0,0.4)"}`,
                borderRadius: 3,
              }} />
              {/* Parking area */}
              <div style={{
                position: "absolute",
                left: 4, bottom: 4,
                width: 14, height: 10,
                background: "#333",
                opacity: 0.5,
                borderRadius: 1,
              }} />
              {/* Road */}
              <div style={{
                position: "absolute",
                left: 9, bottom: 0,
                width: 4, height: 20,
                background: "#555",
                opacity: 0.4,
              }} />
              {/* North indicator */}
              <div style={{
                position: "absolute",
                top: 2, left: "50%",
                transform: "translateX(-50%)",
                fontSize: 8, fontWeight: 900, color: "#ff4444", opacity: 0.7,
              }}>N</div>
            </div>
          </div>

          {/* Three.js Canvas */}
          <div 
            style={{ width: "100%", height: "100%" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const itemId = e.dataTransfer.getData("catalogItem");
              if (itemId) {
                handleAddCatalogItem(itemId);
              }
            }}
          >
            <Canvas
              shadows
              orthographic={sceneConfig.cameraMode === "orthographic"}
              camera={{ 
                position: [20, 15, 20], 
                fov: 45,
                zoom: sceneConfig.cameraMode === "orthographic" ? 25 : 1
              }}
              style={{ width: "100%", height: "100%", background: isNightMode ? "#040410" : isDark ? "#0a0a14" : "#f0f4f8" }}
              gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
              dpr={[1, 2]}
            >
            {/* Fog for depth */}
            <fog attach="fog" args={[isDark ? "#0a0a14" : "#f0f4f8", 40, 80]} />

            {/* Environment (Required for PBR materials) */}
            <Environment preset="city" />

            {/* High Quality Environment */}
            {sceneConfig.highQualityGraphics && (
              <>
                {isNightMode ? (
                  <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                ) : (
                  <Sky sunPosition={[15, 25, 10]} inclination={0.2} azimuth={0.25} />
                )}
              </>
            )}

            {/* Camera animator */}
            <CameraAnimator key={cameraKey} targetPos={cameraTarget} lookAtPos={cameraLookAtTarget} controlsRef={controlsRef} />

            {/* Lighting  no external HDR needed */}
            <ambientLight intensity={isNightMode ? 0.15 : isDark ? 0.5 : 0.7} color={isNightMode ? "#1a1a3e" : "#ffffff"} />
            <hemisphereLight
              color={isNightMode ? "#1a1a4e" : isDark ? "#6666aa" : "#aaccff"}
              groundColor={isNightMode ? "#0a0a1a" : isDark ? "#222222" : "#886644"}
              intensity={isNightMode ? 0.2 : isDark ? 0.6 : 0.5}
            />
            <directionalLight
              position={isNightMode ? [5, 15, 5] : [15, 25, 10]}
              intensity={isNightMode ? 0.3 : isDark ? 1.4 : 1.8}
              color={isNightMode ? "#4466aa" : "#ffffff"}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-far={60}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
              shadow-bias={-0.0005}
            />
            <directionalLight 
              position={[-10, 10, -5]} 
              intensity={isNightMode ? 0.05 : 0.3} 
              color={isNightMode ? "#334477" : "#8888ff"} 
              castShadow
              shadow-bias={-0.0005}
            />
            <pointLight position={[0, 20, 0]} intensity={isNightMode ? 0.1 : 0.3} color="#ffffff" />
            {isNightMode && (
              <>
                <pointLight position={[-8, 8, -8]} intensity={1.5} color="#ffaa44" distance={25} decay={2} />
                <pointLight position={[8, 8, 8]} intensity={1.5} color="#ffaa44" distance={25} decay={2} />
                <pointLight position={[0, 12, 0]} intensity={1} color="#ffffff" distance={30} decay={2} />
                <pointLight position={[-12, 4, 6]} intensity={0.8} color="#ff8844" distance={18} decay={2} />
              </>
            )}

            <mesh 
              receiveShadow 
              rotation={[-Math.PI / 2, 0, 0]} 
              position={[0, -0.05, 0]}
              onPointerMove={(e) => {
                if (editMode && placingItem) {
                  e.stopPropagation();
                  // Snap to grid (0.5 intervals)
                  const x = Math.round(e.point.x * 2) / 2;
                  const z = Math.round(e.point.z * 2) / 2;
                  setPlacementPos([x, 0, z]);
                }
              }}
              onClick={(e) => {
                if (editMode) {
                  e.stopPropagation();
                  if (placingItem) {
                    setCustomObjects(prev => [...prev, {
                      id: placingItem.id,
                      type: placingItem.type,
                      position: placementPos,
                      rotationY: placingItem.rotationY
                    }]);
                    setPlacingItem(null);
                  } else {
                    setSelectedObjectId(null);
                  }
                }
              }}
            >
              <planeGeometry args={[120, 120]} />
              <meshPhysicalMaterial
                color={isNightMode ? "#020617" : isDark ? "#0f172a" : "#cbd5e1"}
                roughness={0.8}
                metalness={0.2}
                clearcoat={sceneConfig.highQualityGraphics ? 0.3 : 0}
                clearcoatRoughness={0.2}
              />
            </mesh>
            
            {/* Soft Contact Shadows for premium grounded look */}
            {sceneConfig.highQualityGraphics && (
              <ContactShadows
                position={[0, 0, 0]}
                opacity={0.65}
                scale={60}
                blur={2.5}
                far={10}
                resolution={512}
                color={isNightMode ? "#000000" : "#1a2a3a"}
              />
            )}

            {/* Premium Fading Grid */}
            <Grid
              position={[0, 0.01, 0]}
              args={[120, 120]}
              cellSize={2}
              cellThickness={1}
              cellColor={isNightMode ? "#1e3a8a" : isDark ? "#1e3a8a" : "#3b82f6"}
              sectionSize={10}
              sectionThickness={1.5}
              sectionColor={isNightMode ? "#3b82f6" : isDark ? "#3b82f6" : "#60a5fa"}
              fadeDistance={50}
              fadeStrength={1.5}
            />


            {(sceneConfig.showCompass ?? true) && <CompassIndicator />}
            <WeatherEffects enabled={!!(sceneConfig.showWeather) && !isNightMode} type={sceneConfig.weatherType ?? "rain"} />

            {/* Ghost Object for Placement */}
            {editMode && placingItem && (
              <group position={placementPos} rotation={[0, placingItem.rotationY, 0]}>
                <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[2, 2.3, 32]} />
                  <meshBasicMaterial color="#339af0" transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
                <group>
                  <CatalogItemRenderer type={placingItem.type} />
                </group>
              </group>
            )}

            {/* Custom Placed Objects (Build Mode) */}
            {customObjects.map(obj => (
              <PlacedObject
                key={obj.id}
                id={obj.id}
                defaultPosition={obj.position}
                rotationY={obj.rotationY}
                pathType={obj.pathType}
                editMode={editMode}
                selectedObjectId={selectedObjectId}
                onSelect={setSelectedObjectId}
                onMove={handleObjectMove}
                onRotate={handleObjectRotate}
                onDelete={handleObjectDelete}
              >
                <CatalogItemRenderer type={obj.type} />
              </PlacedObject>
            ))}

            {/* Scene Router  renders the right 3D scene for the active template */}
            <group onPointerDown={handleSceneClick}>
              <MeasurementRenderer points={measurePoints} />
              {["construction", "healthcare", "education"].includes(activeTemplateId) && (
                <BuildingScene
                  progress={progress}
                  selectedPhase={selectedPhase}
                  wireframe={wireframe}
                  xray={xray}
                  config={sceneConfig}
                  editMode={editMode}
                  selectedObjectId={selectedObjectId}
                  onSelectObject={setSelectedObjectId}
                  objectPositions={objectPositions}
                  onObjectPositionChange={handleObjectPositionChange}
                  activeTemplateId={activeTemplateId}
                />
              )}
              {activeTemplateId === "farming" && (
                <Suspense fallback={null}>
                  <FarmingSceneLazy
                    progress={progress}
                    selectedPhase={selectedPhase}
                    xray={xray}
                    config={sceneConfig}
                  />
                </Suspense>
              )}
              {activeTemplateId === "manufacturing" && (
                <Suspense fallback={null}>
                  <ManufacturingSceneLazy
                    progress={progress}
                    selectedPhase={selectedPhase}
                    xray={xray}
                    config={sceneConfig}
                  />
                </Suspense>
              )}
              {activeTemplateId === "generic" && (
                <Suspense fallback={null}>
                  <GenericSceneLazy
                    progress={progress}
                    selectedPhase={selectedPhase}
                    xray={xray}
                    config={sceneConfig}
                  />
                </Suspense>
              )}
            </group>


            {/* Dimension guides for construction */}
            {["construction", "healthcare", "education"].includes(activeTemplateId) && !sceneConfig.uploadedModelUrl && (
              <group>
                {/* Width dimension line (X axis) */}
                <mesh position={[0, -0.3, (sceneConfig.buildingDepth ?? 8) / 2 + 2]}>
                  <boxGeometry args={[sceneConfig.buildingWidth ?? 12, 0.02, 0.02]} />
                  <meshBasicMaterial color="#ff6b6b" />
                </mesh>
                {/* Width label */}
                <Html position={[0, 0.3, (sceneConfig.buildingDepth ?? 8) / 2 + 2]} center distanceFactor={20} style={{ pointerEvents: "none" }}>
                  <div style={{ background: "rgba(255,107,107,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,107,107,0.5)", boxShadow: "0 4px 12px rgba(255,107,107,0.3)", color: "#fff", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    W: {sceneConfig.buildingWidth ?? 12}m
                  </div>
                </Html>
                {/* Depth dimension line (Z axis) */}
                <mesh position={[(sceneConfig.buildingWidth ?? 12) / 2 + 2, -0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <boxGeometry args={[sceneConfig.buildingDepth ?? 8, 0.02, 0.02]} />
                  <meshBasicMaterial color="#51cf66" />
                </mesh>
                {/* Depth label */}
                <Html position={[(sceneConfig.buildingWidth ?? 12) / 2 + 2, 0.3, 0]} center distanceFactor={20} style={{ pointerEvents: "none" }}>
                  <div style={{ background: "rgba(81,207,102,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(81,207,102,0.5)", boxShadow: "0 4px 12px rgba(81,207,102,0.3)", color: "#fff", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    D: {sceneConfig.buildingDepth ?? 8}m
                  </div>
                </Html>
                {/* Height dimension line (Y axis) */}
                {(() => {
                  const totalH = (sceneConfig.floors ?? 5) * (sceneConfig.floorHeight ?? 3.2);
                  const scaleY = totalH / (BUILDING.floors * BUILDING.floorHeight);
                  return (
                    <>
                      <mesh position={[-(sceneConfig.buildingWidth ?? 12) / 2 - 2, totalH * scaleY / 2, 0]}>
                        <boxGeometry args={[0.02, totalH, 0.02]} />
                        <meshBasicMaterial color="#339af0" />
                      </mesh>
                      <Html position={[-(sceneConfig.buildingWidth ?? 12) / 2 - 2, totalH * scaleY / 2 + 1, 0]} center distanceFactor={20} style={{ pointerEvents: "none" }}>
                        <div style={{ background: "rgba(51,154,240,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(51,154,240,0.5)", boxShadow: "0 4px 12px rgba(51,154,240,0.3)", color: "#fff", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                          H: {totalH.toFixed(1)}m ({sceneConfig.floors ?? 5}F)
                        </div>
                      </Html>
                    </>
                  );
                })()}
                {/* Shape label */}
                {(sceneConfig.buildingShape ?? "rectangular") !== "rectangular" && (
                  <Html position={[0, -1, 0]} center distanceFactor={25} style={{ pointerEvents: "none" }}>
                    <div style={{ background: "rgba(124,58,237,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(124,58,237,0.5)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)", color: "#fff", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                      {(sceneConfig.buildingShape ?? "rectangular").replace("_", "-")}
                    </div>
                  </Html>
                )}
              </group>
            )}

            {/* Edit mode selected object indicator */}
            {editMode && selectedObjectId && (
              <Html position={[0, 25, 0]} center distanceFactor={20} style={{ pointerEvents: "none" }}>
                <div style={{ background: "rgba(82,196,26,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(82,196,26,0.5)", boxShadow: "0 4px 12px rgba(82,196,26,0.3)", color: "#fff", padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <EditOutlined /> Editing {CATALOG_ITEMS.find(i => i.id === selectedObjectId)?.name ?? "Object"}
                </div>
              </Html>
            )}

            {/* Section cut plane visualization */}
            {sectionCutEnabled && (
              <group>
                <mesh position={[0, sectionFloor * (sceneConfig.floorHeight ?? 3.2), 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[40, 40]} />
                  <meshBasicMaterial color="#ff4444" transparent opacity={0.08} side={THREE.DoubleSide} />
                </mesh>
                {/* Cut line edges */}
                <mesh position={[0, sectionFloor * (sceneConfig.floorHeight ?? 3.2), 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[19.5, 20, 64]} />
                  <meshBasicMaterial color="#ff4444" transparent opacity={0.3} side={THREE.DoubleSide} />
                </mesh>
                <Html position={[20, sectionFloor * (sceneConfig.floorHeight ?? 3.2) + 0.5, 0]} center distanceFactor={20} style={{ pointerEvents: "none" }}>
                  <div style={{ background: "rgba(255,68,68,0.85)", color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                    Cut: Floor {sectionFloor}
                  </div>
                </Html>
              </group>
            )}

            {/* Annotation pins */}
            {showAnnotations && annotations.map((pin) => (
              <group key={pin.id} position={pin.position}>
                {/* Pin pole */}
                <mesh position={[0, 0.75, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 1.5, 8]} />
                  <meshStandardMaterial color={pin.color} />
                </mesh>
                {/* Pin head */}
                <mesh position={[0, 1.6, 0]}>
                  <sphereGeometry args={[0.2, 16, 16]} />
                  <meshStandardMaterial color={pin.color} emissive={pin.color} emissiveIntensity={0.3} />
                </mesh>
                {/* Pin label */}
                <Html position={[0, 2.2, 0]} center distanceFactor={15}>
                  <div
                    style={{
                      background: isDark ? `${pin.color}25` : `${pin.color}15`,
                      backdropFilter: "blur(12px)",
                      border: `1px solid ${pin.color}60`,
                      color: isDark ? "#fff" : "#222",
                      padding: "8px 14px",
                      borderRadius: 16,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 4,
                      boxShadow: `0 8px 32px ${pin.color}30, inset 0 0 0 1px rgba(255,255,255,0.1)`,
                      pointerEvents: "auto",
                      transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = `0 12px 40px ${pin.color}50, inset 0 0 0 1px rgba(255,255,255,0.2)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = `0 8px 32px ${pin.color}30, inset 0 0 0 1px rgba(255,255,255,0.1)`;
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: pin.color }} />
                        {pin.text}
                      </span>
                      <span
                        onClick={(e) => { e.stopPropagation(); removeAnnotation(pin.id); }}
                        style={{ marginLeft: 8, cursor: "pointer", opacity: 0.5, fontSize: 16 }}
                      >×</span>
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>
                      Type: <span style={{ textTransform: "capitalize" }}>{pin.type}</span>
                    </div>
                  </div>
                </Html>
              </group>
            ))}

            {/* Annotation click plane (invisible, catches clicks in pin mode) */}
            {annotationMode && (
              <mesh
                position={[0, 5, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                visible={false}
                onClick={(e) => {
                  e.stopPropagation();
                  const p = e.point;
                  addAnnotation([p.x, p.y, p.z]);
                }}
              >
                <planeGeometry args={[80, 80]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
            )}

            {/* Progress Label */}
            <Suspense fallback={null}>
              <ProgressLabel3D progress={progress} />
            </Suspense>

            {/* High Quality Post-Processing */}
            {sceneConfig.highQualityGraphics && (
              <EffectComposer multisampling={4}>
                <SSAO
                  samples={21}
                  radius={0.2}
                  intensity={10}
                  luminanceInfluence={0.8}
                />
                <Bloom
                  luminanceThreshold={1.5}
                  luminanceSmoothing={0.9}
                  intensity={0.5}
                />
              </EffectComposer>
            )}

            {/* Controls */}
            <OrbitControls
              ref={controlsRef}
              makeDefault
              minPolarAngle={0.1}
              maxPolarAngle={Math.PI / 2 - 0.05}
              minDistance={8}
              maxDistance={60}
              enableDamping
              dampingFactor={0.05}
              autoRotate={sceneConfig.autoRotate}
              autoRotateSpeed={0.5}
              target={[0, 6, 0]}
            />
          </Canvas>
          </div>

          {/* Build Catalog UI has been moved above Canvas */}

        </div>

        {/*  Right Panel: Task Details  */}
        <AnimatePresence>
          {showTaskPanel && selectedPhaseData && !isFullscreen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                ...glassPanel,
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "14px",
                  borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: selectedPhaseData.gradient,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, color: "#fff",
                    }}
                  >
                    {selectedPhaseData.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedPhaseData.name}</div>
                    <AntText type="secondary" style={{ fontSize: 11 }}>
                      {getPhaseProgress(selectedPhaseData)}% complete
                    </AntText>
                  </div>
                </div>
                <AntText type="secondary" style={{ fontSize: 11 }}>
                  {selectedPhaseData.name}  {selectedPhaseData.tasks.length} tasks
                </AntText>
                <Progress
                  percent={getPhaseProgress(selectedPhaseData)}
                  strokeColor={selectedPhaseData.color}
                  trailColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                  size="small"
                  style={{ marginTop: 8 }}
                />
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, padding: "6px 6px 4px", color: isDark ? "#94a3b8" : "#666" }}>
                  Tasks ({selectedPhaseData.tasks.length})
                </div>
                {selectedPhaseData.tasks.map((task, idx) => {
                  const statusCfg = taskStatusConfig[task.status];
                  const isSelected = selectedTaskId === task.id;

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div
                        onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                        style={{
                          padding: "12px",
                          borderRadius: 12,
                          cursor: "pointer",
                          background: isSelected
                            ? isDark ? "rgba(139,92,246,0.15)" : "rgba(99,102,241,0.1)"
                            : isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                          border: isSelected
                            ? `1px solid ${statusCfg.color}55`
                            : isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)",
                          boxShadow: isSelected ? `0 4px 12px ${statusCfg.color}15` : "none",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          marginBottom: 6,
                          transform: isSelected ? "translateX(4px)" : "translateX(0)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
                            e.currentTarget.style.transform = "translateX(2px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
                            e.currentTarget.style.transform = "translateX(0)";
                          }
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: `${statusCfg.color}15`,
                            color: statusCfg.color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12,
                          }}>
                            {statusCfg.icon}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.3, letterSpacing: "-0.2px" }}>
                            {task.name}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: isDark ? "#333" : "#ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
                              {task.assignee.charAt(0)}
                            </div>
                            <AntText type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
                              {task.assignee}
                            </AntText>
                          </div>
                          <Tag
                            style={{
                              borderRadius: 10, fontSize: 10, fontWeight: 600, padding: "2px 8px", margin: 0,
                              background: statusCfg.color + "15",
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.color}30`,
                            }}
                          >
                            {statusCfg.label}
                          </Tag>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                          <Progress
                            percent={task.completion}
                            size="small"
                            showInfo={false}
                            strokeColor={statusCfg.color}
                            trailColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                            style={{ flex: 1, margin: 0 }}
                          />
                          <span style={{ fontSize: 10, fontWeight: 600, color: statusCfg.color, minWidth: 28, textAlign: "right" }}>
                            {task.completion}%
                          </span>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            style={{ marginTop: 8, paddingTop: 8, borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" }}
                          >
                            <div style={{ fontSize: 10, color: isDark ? "#94a3b8" : "#888" }}>
                              <div style={{ marginBottom: 3 }}>
                                <strong>Start:</strong> {dayjs(task.startDate).format("MMM D, YYYY")}
                              </div>
                              <div>
                                <strong>End:</strong> {dayjs(task.endDate).format("MMM D, YYYY")}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/*  Right Panel: Object Properties  */}
        <AnimatePresence>
          {editMode && selectedObjectId && !isFullscreen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                ...glassPanel,
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                borderLeft: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {(() => {
                const obj = customObjects.find(o => o.id === selectedObjectId);
                if (!obj) return <div style={{ padding: 20 }}>Select an object on the canvas.</div>;
                const itemDef = CATALOG_ITEMS.find(i => i.id === obj.type);
                
                return (
                  <>
                    <div
                      style={{
                        padding: "14px",
                        borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "space-between"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16, color: "#fff",
                          }}
                        >
                          {itemDef?.icon || "📦"}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{itemDef?.name || "Object"}</div>
                          <AntText type="secondary" style={{ fontSize: 11, textTransform: "capitalize" }}>
                            {obj.type}
                          </AntText>
                        </div>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => {
                           handleObjectDelete(obj.id);
                           setSelectedObjectId(null);
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: isDark ? "#94a3b8" : "#666" }}>Transform Properties</div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, marginBottom: 4, opacity: 0.7 }}>Position X</div>
                        <InputNumber 
                          size="small" 
                          value={obj.position[0]} 
                          onChange={(v) => handleObjectMove(obj.id, [v || 0, obj.position[1], obj.position[2]])} 
                          style={{ width: "100%" }} 
                          step={0.5}
                        />
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, marginBottom: 4, opacity: 0.7 }}>Position Y (Elevation)</div>
                        <InputNumber 
                          size="small" 
                          value={obj.position[1]} 
                          onChange={(v) => handleObjectMove(obj.id, [obj.position[0], v || 0, obj.position[2]])} 
                          style={{ width: "100%" }} 
                          step={0.5}
                        />
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, marginBottom: 4, opacity: 0.7 }}>Position Z</div>
                        <InputNumber 
                          size="small" 
                          value={obj.position[2]} 
                          onChange={(v) => handleObjectMove(obj.id, [obj.position[0], obj.position[1], v || 0])} 
                          style={{ width: "100%" }} 
                          step={0.5}
                        />
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, marginBottom: 4, opacity: 0.7 }}>Rotation Y</div>
                        <Slider 
                          min={0} max={Math.PI * 2} step={Math.PI / 8} 
                          value={obj.rotationY} 
                          onChange={(v) => handleObjectRotate(obj.id, v)} 
                        />
                      </div>

                      <Divider style={{ margin: "16px 0", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />

                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: isDark ? "#94a3b8" : "#666" }}>Animation</div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? "#fff" : "#111" }}>Enable Patrol</div>
                          <div style={{ fontSize: 10, color: isDark ? "#94a3b8" : "#666" }}>Moves object back and forth</div>
                        </div>
                        <Switch 
                          checked={obj.pathType === "patrol"} 
                          onChange={(v) => {
                            setCustomObjects(prev => prev.map(o => o.id === obj.id ? { ...o, pathType: v ? "patrol" : undefined } : o));
                          }} 
                        />
                      </div>

                      <Divider style={{ margin: "16px 0", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />

                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: isDark ? "#94a3b8" : "#666" }}>Info</div>
                      <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#666", lineHeight: 1.5 }}>
                        Drag objects in the 3D scene to move them around the grid. Use this panel for precise numerical adjustments.
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/*  Scene Config Drawer  */}
        <Drawer
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ToolOutlined style={{ color: themeColor }} />
              <span style={{ fontWeight: 700 }}>Scene Settings</span>
              <Tag style={{ borderRadius: 8, fontSize: 10, margin: 0 }}>
                {activeTemplate.icon} {activeTemplate.name}
              </Tag>
            </div>
          }
          open={showConfigPanel}
          onClose={() => setShowConfigPanel(false)}
          width={340}
          styles={{
            body: { padding: "16px 20px" },
            header: {
              background: isDark ? "rgba(15,15,23,0.95)" : "rgba(255,255,255,0.95)",
              backdropFilter: "blur(12px)",
              borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
            },
            wrapper: {},
          }}
        >
          {/* Construction Config */}
          {["construction", "healthcare", "education"].includes(activeTemplateId) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Floors</div>
                <Slider
                  min={1} max={20} value={sceneConfig.floors ?? 5}
                  onChange={(v) => updateConfig("floors", v)}
                  marks={{ 1: "1", 5: "5", 10: "10", 15: "15", 20: "20" }}
                />
              </div>
              <Row gutter={12}>
                <Col span={12}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Width (m)</div>
                  <InputNumber min={6} max={40} value={sceneConfig.buildingWidth ?? 16} onChange={(v) => updateConfig("buildingWidth", v)} style={{ width: "100%" }} />
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Depth (m)</div>
                  <InputNumber min={4} max={30} value={sceneConfig.buildingDepth ?? 10} onChange={(v) => updateConfig("buildingDepth", v)} style={{ width: "100%" }} />
                </Col>
              </Row>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Floor Height (m)</div>
                <Slider min={2.5} max={5} step={0.1} value={sceneConfig.floorHeight ?? 3.5} onChange={(v) => updateConfig("floorHeight", v)} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Building Shape</div>
                <Segmented
                  block
                  value={sceneConfig.buildingShape ?? "rectangular"}
                  onChange={(v) => updateConfig("buildingShape", v)}
                  options={[
                    { label: "Rectangular", value: "rectangular" },
                    { label: "L-Shape", value: "l_shape" },
                    { label: "U-Shape", value: "u_shape" },
                  ]}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Roof Type</div>
                <Segmented
                  block
                  value={sceneConfig.roofType ?? "flat"}
                  onChange={(v) => updateConfig("roofType", v)}
                  options={[
                    { label: "Flat", value: "flat" },
                    { label: "Pitched", value: "pitched" },
                    { label: "Sawtooth", value: "sawtooth" },
                  ]}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}>Has Basement</span>
                <Switch checked={sceneConfig.hasBasement ?? false} onChange={(v) => updateConfig("hasBasement", v)} />
              </div>

              {/* Material Palette */}
              <Divider style={{ margin: "8px 0", fontSize: 11 }}>Material Palette</Divider>
              <Row gutter={[12, 8]}>
                <Col span={8}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: isDark ? "#94a3b8" : "#666" }}>Walls</div>
                  <input
                    type="color"
                    value={sceneConfig.wallColor ?? "#E8D5B5"}
                    onChange={(e) => updateConfig("wallColor", e.target.value)}
                    style={{ width: "100%", height: 28, border: "none", borderRadius: 6, cursor: "pointer" }}
                  />
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: isDark ? "#94a3b8" : "#666" }}>Roof</div>
                  <input
                    type="color"
                    value={sceneConfig.roofColor ?? "#607080"}
                    onChange={(e) => updateConfig("roofColor", e.target.value)}
                    style={{ width: "100%", height: 28, border: "none", borderRadius: 6, cursor: "pointer" }}
                  />
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: isDark ? "#94a3b8" : "#666" }}>Glass</div>
                  <input
                    type="color"
                    value={sceneConfig.glassColor ?? "#88CCEE"}
                    onChange={(e) => updateConfig("glassColor", e.target.value)}
                    style={{ width: "100%", height: 28, border: "none", borderRadius: 6, cursor: "pointer" }}
                  />
                </Col>
              </Row>

              {/* Site Features */}
              <Divider style={{ margin: "8px 0", fontSize: 11 }}>Site Features</Divider>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}> Weather Effects</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {sceneConfig.showWeather && (
                    <Select
                      size="small"
                      value={sceneConfig.weatherType ?? "rain"}
                      onChange={(v) => updateConfig("weatherType", v)}
                      style={{ width: 80, fontSize: 11 }}
                      options={[{ value: "rain", label: "Rain" }, { value: "snow", label: "Snow" }]}
                    />
                  )}
                  <Switch checked={isNightMode ? false : (sceneConfig.showWeather ?? false)} onChange={(v) => updateConfig("showWeather", v)} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}> Safety Zones</span>
                <Switch checked={sceneConfig.showSafetyZones ?? true} onChange={(v) => updateConfig("showSafetyZones", v)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}> Site Vehicles</span>
                <Switch checked={sceneConfig.showVehicles ?? true} onChange={(v) => updateConfig("showVehicles", v)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}> Workers</span>
                <Switch checked={sceneConfig.showWorkers ?? true} onChange={(v) => updateConfig("showWorkers", v)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}> Compass</span>
                <Switch checked={sceneConfig.showCompass ?? true} onChange={(v) => updateConfig("showCompass", v)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}> Auto Rotate</span>
                <Switch checked={sceneConfig.autoRotate ?? false} onChange={(v) => updateConfig("autoRotate", v)} />
              </div>

              {/* 3D Model Upload */}
              <Divider style={{ margin: "8px 0", fontSize: 11 }}>3D Model Upload</Divider>
              {sceneConfig.uploadedModelUrl ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Tag color="green" style={{ borderRadius: 8, padding: "4px 10px" }}>
                     Model loaded
                  </Tag>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Scale</div>
                    <Slider
                      min={0.01} max={10} step={0.01}
                      value={sceneConfig.modelScale ?? 1}
                      onChange={(v) => updateConfig("modelScale", v)}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Rotation ()</div>
                    <Slider
                      min={0} max={360} step={1}
                      value={sceneConfig.modelRotation ?? 0}
                      onChange={(v) => updateConfig("modelRotation", v)}
                    />
                  </div>
                  <Button
                    danger
                    size="small"
                    block
                    onClick={() => {
                      if (sceneConfig.uploadedModelUrl) {
                        URL.revokeObjectURL(sceneConfig.uploadedModelUrl);
                      }
                      updateConfig("uploadedModelUrl", undefined);
                      updateConfig("modelScale", 1);
                      updateConfig("modelRotation", 0);
                    }}
                    style={{ borderRadius: 8 }}
                  >
                    Remove Model
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    style={{ display: "none" }}
                    id="model-upload-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        updateConfig("uploadedModelUrl", url);
                        updateConfig("modelScale", 1);
                        updateConfig("modelRotation", 0);
                        message.success(`Loaded: ${file.name}`);
                      }
                      e.target.value = "";
                    }}
                  />
                  <Button
                    block
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={() => document.getElementById("model-upload-input")?.click()}
                    style={{ borderRadius: 8 }}
                  >
                    Upload GLB / GLTF
                  </Button>
                  <div style={{ fontSize: 11, color: isDark ? "#64748b" : "#999", marginTop: 6, textAlign: "center" }}>
                    Supports .glb and .gltf files
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Farming Config */}
          {activeTemplateId === "farming" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Land Area (acres)</div>
                <Slider
                  min={0.5} max={20} step={0.5}
                  value={sceneConfig.landAcres ?? 2.5}
                  onChange={(v) => updateConfig("landAcres", v)}
                  marks={{ 0.5: "0.5", 5: "5", 10: "10", 20: "20" }}
                />
                <div style={{ fontSize: 11, color: isDark ? "#64748b" : "#999", marginTop: 4 }}>
                  Auto grid: {sceneConfig.fieldRows ?? 8} rows - {sceneConfig.fieldCols ?? 12} cols
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Crop Type</div>
                <Segmented
                  block
                  value={sceneConfig.cropType ?? "grain"}
                  onChange={(v) => updateConfig("cropType", v)}
                  options={[
                    { label: "Grain", value: "grain" },
                    { label: "Veggie", value: "vegetable" },
                    { label: "Fruit", value: "fruit" },
                    { label: "Rice", value: "rice" },
                  ]}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}>Has Barn</span>
                <Switch checked={sceneConfig.hasBarn ?? true} onChange={(v) => updateConfig("hasBarn", v)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}>Has Silo</span>
                <Switch checked={sceneConfig.hasSilo ?? true} onChange={(v) => updateConfig("hasSilo", v)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}>Has Greenhouse</span>
                <Switch checked={sceneConfig.hasGreenhouse ?? false} onChange={(v) => updateConfig("hasGreenhouse", v)} />
              </div>
            </div>
          )}

          {/* Manufacturing Config */}
          {activeTemplateId === "manufacturing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Machine Count</div>
                <Slider
                  min={2} max={12} value={sceneConfig.machineCount ?? 6}
                  onChange={(v) => updateConfig("machineCount", v)}
                  marks={{ 2: "2", 6: "6", 12: "12" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Conveyor Length (m)</div>
                <Slider
                  min={8} max={40} value={sceneConfig.conveyorLength ?? 20}
                  onChange={(v) => updateConfig("conveyorLength", v)}
                />
              </div>
              <Row gutter={12}>
                <Col span={12}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Factory Width</div>
                  <InputNumber min={16} max={60} value={sceneConfig.factoryWidth ?? 32} onChange={(v) => updateConfig("factoryWidth", v)} style={{ width: "100%" }} />
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Factory Depth</div>
                  <InputNumber min={10} max={40} value={sceneConfig.factoryDepth ?? 22} onChange={(v) => updateConfig("factoryDepth", v)} style={{ width: "100%" }} />
                </Col>
              </Row>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Production Lines</div>
                <Segmented
                  block
                  value={sceneConfig.productionLines ?? 1}
                  onChange={(v) => updateConfig("productionLines", v)}
                  options={[
                    { label: "1 Line", value: 1 },
                    { label: "2 Lines", value: 2 },
                    { label: "3 Lines", value: 3 },
                  ]}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#666" }}>Loading Dock</span>
                <Switch checked={sceneConfig.hasLoadingDock ?? true} onChange={(v) => updateConfig("hasLoadingDock", v)} />
              </div>
            </div>
          )}

          {/* Generic Config */}
          {activeTemplateId === "generic" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: isDark ? "#94a3b8" : "#666" }}>Block Count</div>
                <Slider
                  min={3} max={15} value={sceneConfig.blockCount ?? 7}
                  onChange={(v) => updateConfig("blockCount", v)}
                  marks={{ 3: "3", 7: "7", 15: "15" }}
                />
              </div>
            </div>
          )}

          {/* Camera Mode Config */}
          <Divider style={{ margin: "16px 0" }} />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#111", marginBottom: 8 }}>Camera Projection</div>
            <Segmented
              block
              value={sceneConfig.cameraMode ?? "perspective"}
              onChange={(v) => updateConfig("cameraMode", v as any)}
              options={[
                { label: "Perspective", value: "perspective" },
                { label: "Orthographic", value: "orthographic" }
              ]}
            />
          </div>

          {/* Global Quality Config */}
          <Divider style={{ margin: "16px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#111" }}>High Quality Graphics</div>
              <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#666" }}>SSAO, Bloom, & Environment Maps</div>
            </div>
            <Switch checked={sceneConfig.highQualityGraphics ?? false} onChange={(v) => updateConfig("highQualityGraphics", v)} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#111" }}>Simulate Time</div>
              <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#666" }}>Auto Day/Night Cycle</div>
            </div>
            <Switch checked={sceneConfig.simulateTime ?? false} onChange={(v) => updateConfig("simulateTime", v)} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#fff" : "#111" }}>Auto Rotate Camera</div>
              <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#666" }}>Cinematic presentation view</div>
            </div>
            <Switch checked={sceneConfig.autoRotate ?? false} onChange={(v) => updateConfig("autoRotate", v)} />
          </div>

          {/* Persistence */}
          <Divider style={{ margin: "16px 0" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              onClick={saveLayout}
              icon={<SaveOutlined />}
              style={{ borderRadius: 8, width: "100%", flex: 1 }}
            >
              Save Layout
            </Button>
            <Button
              onClick={loadLayout}
              icon={<FolderOpenOutlined />}
              style={{ borderRadius: 8, width: "100%", flex: 1 }}
            >
              Load Layout
            </Button>
          </div>

          {/* Reset Button */}
          <Divider style={{ margin: "16px 0" }} />
          <Button
            block
            onClick={() => setSceneConfig({ ...activeTemplate.defaultConfig })}
            icon={<SyncOutlined />}
            style={{ borderRadius: 8 }}
          >
            Reset to Default
          </Button>
        </Drawer>
      </div>

      {/*  Timeline Scrubber  */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card
          size="small"
          style={{
            ...glassCard,
            marginTop: 12,
            overflow: "hidden",
          }}
          styles={{ body: { padding: "12px 20px" } }}
        >
          {/* Phase markers */}
          <div style={{ position: "relative", height: 24, marginBottom: 8, padding: "0 4px" }}>
            {currentPhases.map((phase) => (
              <Tooltip key={phase.id} title={`${phase.name} (${phase.startPercent}% - ${phase.endPercent}%)`} mouseEnterDelay={0.2}>
                <div
                  style={{
                    position: "absolute",
                    left: `${phase.startPercent}%`,
                    width: `${phase.endPercent - phase.startPercent}%`,
                    height: 16,
                    top: 4,
                    background: phase.color + (selectedPhase === phase.id ? "90" : "50"),
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    border: selectedPhase === phase.id ? `1px solid ${phase.color}` : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: selectedPhase === phase.id ? `0 4px 12px ${phase.color}40` : "none",
                    zIndex: selectedPhase === phase.id ? 2 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scaleY(1.2)";
                    e.currentTarget.style.background = phase.color + "AA";
                    e.currentTarget.style.zIndex = "3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scaleY(1)";
                    e.currentTarget.style.background = phase.color + (selectedPhase === phase.id ? "90" : "50");
                    e.currentTarget.style.zIndex = selectedPhase === phase.id ? "2" : "1";
                  }}
                  onClick={() => {
                    setSelectedPhase(selectedPhase === phase.id ? null : phase.id);
                    setShowTaskPanel(selectedPhase !== phase.id);
                  }}
                />
              </Tooltip>
            ))}
          </div>

          {/* Milestone markers on timeline */}
          {milestones.length > 0 && (
            <div style={{ position: "relative", height: 16, marginBottom: 4, padding: "0 4px" }}>
              {milestones.map((ms: any, idx: number) => {
                // Position milestones proportionally based on dueDate relative to project dates
                const projStart = selectedProject?.startDate || PROJECT_START;
                const projEnd = selectedProject?.endDate || PROJECT_END;
                const totalDays = dayjs(projEnd).diff(dayjs(projStart), "day") || 1;
                const msDays = dayjs(ms.dueDate).diff(dayjs(projStart), "day");
                const pct = Math.max(0, Math.min(100, (msDays / totalDays) * 100));
                const isDone = !!ms.completedDate;
                const msColor = isDone ? "#22c55e" : ms.isCritical ? "#ef4444" : themeColor;
                return (
                  <Tooltip key={ms.id || idx} title={`${ms.name}${ms.dueDate ? " - " + dayjs(ms.dueDate).format("MMM D, YYYY") : ""}${isDone ? " ✓" : ""}`}>
                    <div
                      style={{
                        position: "absolute",
                        left: `${pct}%`,
                        top: 2,
                        transform: "translateX(-50%) rotate(45deg)",
                        width: 10,
                        height: 10,
                        background: isDone ? "#22c55e" : ms.isCritical ? "#ef4444" : themeColor,
                        border: `1.5px solid ${isDark ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)"}`,
                        borderRadius: 2,
                        cursor: "pointer",
                        zIndex: 2,
                        boxShadow: `0 0 8px ${msColor}80, 0 2px 4px rgba(0,0,0,0.3)`,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(-50%) rotate(45deg) scale(1.4)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(-50%) rotate(45deg) scale(1)"}
                    />
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Slider */}
          <Slider
            value={progress}
            onChange={(val) => setProgress(val)}
            min={0}
            max={100}
            step={0.1}
            tooltip={{
              formatter: (val) => `${val?.toFixed(1)}% - ${dayjs(PROJECT_START).add(Math.round(((val || 0) / 100) * TOTAL_DAYS), "day").format("MMM D, YYYY")}`,
            }}
            styles={{
              track: {
                background: `linear-gradient(90deg, ${themeColor}, ${themeColor}ee)`,
                height: 6,
                borderRadius: 3,
                boxShadow: `0 0 10px ${themeColor}40`,
              },
              rail: {
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                height: 6,
                borderRadius: 3,
              },
            }}
          />

          {/* Controls Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            {/* Left: Playback controls */}
            <Space size={8}>
              <Tooltip title="Jump to Start">
                <Button
                  size="small"
                  type="text"
                  icon={<StepBackwardOutlined />}
                  onClick={() => { setProgress(0); setIsPlaying(false); }}
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
              <Tooltip title={isPlaying ? "Pause" : "Play"}>
                <Button
                  size="small"
                  type="primary"
                  shape="circle"
                  icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    width: 36, height: 36,
                    background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
                    border: "none",
                  }}
                />
              </Tooltip>
              <Tooltip title="Jump to End">
                <Button
                  size="small"
                  type="text"
                  icon={<StepForwardOutlined />}
                  onClick={() => { setProgress(100); setIsPlaying(false); }}
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
              <Segmented
                size="small"
                value={`${playSpeed}x`}
                onChange={(val) => setPlaySpeed(parseFloat(String(val).replace("x", "")))}
                options={["0.5x", "1x", "2x", "4x"]}
                style={{ borderRadius: 8 }}
              />
            </Space>

            {/* Center: Current date */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {currentDate.format("MMMM D, YYYY")}
              </div>
              <AntText type="secondary" style={{ fontSize: 11 }}>
                Day {daysElapsed} of {TOTAL_DAYS}  {completedTasks}/{totalTasks} tasks completed
              </AntText>
            </div>

            {/* Right: Date range */}
            <Space size={12}>
              <AntText type="secondary" style={{ fontSize: 11 }}>
                {dayjs(PROJECT_START).format("MMM D, 'YY")}
              </AntText>
              <div
                style={{
                  width: 60, height: 4, borderRadius: 2,
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`, height: "100%", borderRadius: 2,
                    background: `linear-gradient(90deg, ${themeColor}, ${themeColor}cc)`,
                    transition: "width 0.1s linear",
                  }}
                />
              </div>
              <AntText type="secondary" style={{ fontSize: 11 }}>
                {dayjs(PROJECT_END).format("MMM D, 'YY")}
              </AntText>
            </Space>
          </div>
        </Card>
      </motion.div>

      {/* Add Annotation Modal */}
      <Modal
        title="Add Project Annotation"
        open={isAnnotationModalOpen}
        onCancel={() => { setIsAnnotationModalOpen(false); setPendingAnnotationPos(null); annotationForm.resetFields(); }}
        onOk={() => annotationForm.submit()}
        okText="Add Pin"
        destroyOnClose
        centered
        styles={{
          mask: { backdropFilter: "blur(4px)" }
        }}
      >
        <Form form={annotationForm} layout="vertical" onFinish={handleAnnotationSubmit} initialValues={{ type: "info" }}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Please enter a title for the pin" }]}>
            <Input placeholder="e.g. Needs inspection" />
          </Form.Item>
          <Form.Item name="type" label="Type">
            <Select>
              <Select.Option value="info"><Badge status="processing" text="Info" /></Select.Option>
              <Select.Option value="warning"><Badge status="warning" text="Warning" /></Select.Option>
              <Select.Option value="issue"><Badge status="error" text="Issue" /></Select.Option>
              <Select.Option value="done"><Badge status="success" text="Done" /></Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

    </CMSLayout>
  );
}
