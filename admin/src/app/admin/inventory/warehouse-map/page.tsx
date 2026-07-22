"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Input, Drawer, Badge, Spin, Tooltip, Divider, Segmented, message, Popconfirm, Slider, Select, Modal, Upload, ColorPicker, theme as antTheme, InputNumber, Tabs, Switch } from "antd";
import {
    EnvironmentOutlined, ReloadOutlined, AppstoreOutlined,
    EditOutlined, EyeOutlined, DeleteOutlined, RotateRightOutlined,
    SaveOutlined, UndoOutlined, PlusOutlined, DragOutlined,
    ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined,
    ClearOutlined, DownloadOutlined, ColumnHeightOutlined, CopyOutlined,
    ImportOutlined, ExportOutlined, AppstoreAddOutlined, RedoOutlined,
    InfoCircleOutlined, BarChartOutlined, LockOutlined, UnlockOutlined,
    ThunderboltOutlined, CameraOutlined, SearchOutlined, AimOutlined,
    CloseCircleOutlined, InboxOutlined, FormatPainterOutlined, HomeOutlined, RadarChartOutlined, SettingOutlined, BlockOutlined, DatabaseOutlined
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import CMSLayout from "@/components/layout/CMSLayout";
import CADLayout from "@/components/cad/CADLayout";
import CADRibbon from "@/components/cad/CADRibbon";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
    PlacedObject, PlacedObjectType, BuilderPaletteItem, PALETTE_ITEMS,
    GRID_SIZE, GRID_CELLS, ZONE_TYPE_MAP, TEMPLATES, WarehouseTemplate, ZoneType,
    SavedLayout, BinOccupancy, RackInventory, ZoneInventory,
    generateId, getDefaultLayout, saveLayout, loadLayout, clearLayout,
    duplicateObject, exportLayoutJSON, importLayoutJSON,
    saveNamedLayout, listLayouts, loadNamedLayout, deleteNamedLayout,
    gridCoordsLabel, autoArrangeRacks, generateRackBinInputs,
    locationCode, suggestRow, suggestBay,
} from "./builderState";
import { generateLayoutFromInventory } from "./builderState";
import { inventoryService, InvWarehouse } from '@/lib/inventoryService';
import {
    Route, PRESET_ROUTES, PresetRouteType,
    computePresetRoute, computeRoute,
    getZonesByType, getZoneCenter,
    optimizeStopOrder, getAllZonesAsStops,
    buildGrid,
    type RouteStop,
} from "./pathfinding";
import ExplorerPanel from "./ExplorerPanel";

const { Text, Title } = Typography;

// Theme-aware glass styles (generated per-mode)
const makeGlass = (dark: boolean) => dark
    ? { background: 'linear-gradient(145deg, rgba(20,20,40,0.85) 0%, rgba(12,12,30,0.95) 100%)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)' }
    : { background: 'linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(245,247,250,0.95) 100%)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.1)' };

const panelSection = (color: string) => ({ borderLeft: `3px solid ${color}`, paddingLeft: 8, marginBottom: 4 });

// Theme color tokens
const makeThemeTokens = (dark: boolean) => ({
    // Surfaces
    panelBg: dark ? 'rgba(12,12,30,0.92)' : 'rgba(255,255,255,0.92)',
    panelBorder: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    viewportBg: dark ? '#0a0a1a' : '#e8ecf0',
    canvasBg: dark ? '#0a0a1a' : '#d5dbe3',
    // Text
    text: dark ? '#fff' : '#1a1a2e',
    textSecondary: dark ? '#aaa' : '#555',
    textMuted: dark ? '#666' : '#999',
    textFaint: dark ? '#555' : '#bbb',
    // Overlays
    overlayBg: dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
    cardBg: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    cardBgHover: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    inputBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    inputBorder: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    // Stats bar
    statsBarBg: dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)',
    statsBarBorder: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    statsLabel: dark ? '#888' : '#666',
    statsValue: dark ? '#ccc' : '#333',
    // Toolbar
    toolbarBg: dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
    toolbarBorder: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    toolbarText: dark ? '#666' : '#999',
    toolbarActive: dark ? '#fff' : '#1a1a2e',
    // Kbd
    kbdBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    kbdBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    kbdText: dark ? '#ddd' : '#444',
    // Welcome overlay
    welcomeBg: dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)',
    welcomeText: dark ? '#888' : '#999',
});

const WarehouseScene = dynamic(() => import("./WarehouseScene"), {
    ssr: false,
    loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0a0a1a' }}><Spin size="large" /></div>,
});

export interface ZoneLayout {
    id: string; code: string; name: string; zoneType: string;
    x: number; z: number; width: number; depth: number;
    bins: any[]; capacity: number;
}

const CATEGORY_ICONS: Record<string, string> = {
    zone: '🏗️', storage: '📦', structure: '🧱', equipment: '⚙️',
};

const ZONE_TYPES: { value: ZoneType; label: string; color: string }[] = [
    { value: 'receiving', label: '📥 Receiving', color: '#22c55e' },
    { value: 'storage', label: '📦 Storage', color: '#3b82f6' },
    { value: 'picking', label: '🛒 Picking', color: '#f59e0b' },
    { value: 'packing', label: '📋 Packing', color: '#a855f7' },
    { value: 'shipping', label: '📤 Shipping', color: '#06b6d4' },
    { value: 'cold', label: '❄️ Cold Storage', color: '#6366f1' },
    { value: 'quarantine', label: '⚠️ Quarantine', color: '#ef4444' },
];

const COLOR_PRESETS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#6366f1', '#ec4899', '#84cc16', '#f97316'];

type CameraPreset = 'corner' | 'top' | 'front' | 'iso' | 'first-person' | 'cad-2d';

const checkCollision = (obj: PlacedObject, allObjects: PlacedObject[]): boolean => {
    if (obj.type === 'zone') return false; // Zones don't collide
    const getBounds = (o: PlacedObject) => {
        const isRotated = o.rotation % 180 !== 0;
        return {
            minX: o.x, maxX: o.x + (isRotated ? o.depth : o.width),
            minZ: o.z, maxZ: o.z + (isRotated ? o.width : o.depth)
        };
    };
    const b1 = getBounds(obj);
    for (const other of allObjects) {
        if (other.id === obj.id || other.type === 'zone') continue;
        const b2 = getBounds(other);
        // Shrink bounding box by epsilon to allow touching
        if (!(b1.maxX <= b2.minX + 0.05 || b1.minX >= b2.maxX - 0.05 || b1.maxZ <= b2.minZ + 0.05 || b1.minZ >= b2.maxZ - 0.05)) {
            return true;
        }
    }
    return false;
};

export default function WarehouseMapPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [messageApi, ctx] = message.useMessage();
    const { token } = antTheme.useToken();

    // Detect system dark mode from Ant Design theme, allow manual override
    const systemDark = token.colorBgContainer === '#141414' || token.colorBgBase === '#000';
    const [darkOverride, setDarkOverride] = useState<boolean | null>(null);
    const isDark = darkOverride !== null ? darkOverride : systemDark;
    const t = useMemo(() => makeThemeTokens(isDark), [isDark]);
    const glass = useMemo(() => makeGlass(isDark), [isDark]);

    // Live Integration States
    const [viewingObjectId, setViewingObjectId] = useState<string | null>(null);
    const [visualizingBin, setVisualizingBin] = useState<any>(null);
    const [objects, setObjects] = useState<PlacedObject[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [buildMode, setBuildMode] = useState(false);
    const [currentFloor, setCurrentFloor] = useState<number>(0);
    const [activePalette, setActivePalette] = useState<BuilderPaletteItem | null>(null);
    const [cameraPreset, setCameraPreset] = useState<CameraPreset>('corner');
    const [history, setHistory] = useState<PlacedObject[][]>([]);
    const [redoHistory, setRedoHistory] = useState<PlacedObject[][]>([]);
    const [snapIncrement, setSnapIncrement] = useState<number>(1.0);
    const [arrayConfig, setArrayConfig] = useState({ countX: 3, countZ: 2, spaceX: 1.2, spaceZ: 2.0 });
    const [layoutManagerOpen, setLayoutManagerOpen] = useState(false);
    const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
    const [saveAsOpen, setSaveAsOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
    const [paletteCategory, setPaletteCategory] = useState<string>('zone');
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importText, setImportText] = useState('');

    // Route Planner state
    const [routes, setRoutes] = useState<Route[]>([]);
    const [showRoutes, setShowRoutes] = useState(true);
    const [animateRoutes, setAnimateRoutes] = useState(true);
    const [showTraffic, setShowTraffic] = useState(false);
    const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
    const [routeTab, setRouteTab] = useState<'quick' | 'custom'>('quick');
    const [customStops, setCustomStops] = useState<RouteStop[]>([]);
    const [customRouteName, setCustomRouteName] = useState('Custom Route');
    const CUSTOM_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
    const [showGridOverlay, setShowGridOverlay] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [clipboard, setClipboard] = useState<PlacedObject[]>([]);
    const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'performance'>('performance');

    const [activeTool, setActiveTool] = useState<'select' | 'draw_wall' | 'draw_zone' | 'place_object' | 'delete'>('select');

    // ═══ NEW FEATURES STATE ═══════════════════════
    // Heatmap overlay
    const [heatmapMode, setHeatmapMode] = useState<'off' | 'capacity' | 'activity' | 'temperature'>('off');
    // Activity markers (real-time WMS tasks)
    const [showActivityMarkers, setShowActivityMarkers] = useState(false);
    const [activityMarkers, setActivityMarkers] = useState<Array<{ id: string; type: 'putaway' | 'pick'; x: number; z: number; binCode: string; itemName?: string }>>([]);
    // Stock alerts
    const [stockAlerts, setStockAlerts] = useState<Map<string, 'low' | 'overstock' | 'empty'>>(new Map());
    // Zone stats popover
    const [selectedZoneForStats, setSelectedZoneForStats] = useState<string | null>(null);
    const [zoneStatsData, setZoneStatsData] = useState<Map<string, { totalBins: number; usedBins: number; totalItems: number; topItems: Array<{name: string; qty: number}> }>>(new Map());

    // Timelapse playback
    const [timelapseMode, setTimelapseMode] = useState(false);
    const [timelapseHour, setTimelapseHour] = useState(12);
    
    // Advanced CAD Features
    const [dragStartPos, setDragStartPos] = useState<[number, number] | null>(null);
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startZ: number, endX: number, endZ: number } | null>(null);
    const [envSettingsOpen, setEnvSettingsOpen] = useState(false);
    const [envShadows, setEnvShadows] = useState(true);

    // Inventory data for rack-level tracking
    const [rackInventoryMap, setRackInventoryMap] = useState<Map<string, RackInventory>>(new Map());
    const [zoneInventoryMap, setZoneInventoryMap] = useState<Map<string, ZoneInventory>>(new Map());
    const [binPositionRegistry, setBinPositionRegistry] = useState<Map<string, [number, number, number]>>(new Map());

    const heatmapData = useMemo(() => {
        if (heatmapMode === 'off') return new Map<string, number>();
        const map = new Map<string, number>();
        
        if (heatmapMode === 'activity') {
            activityMarkers.forEach(m => {
                const cellX = Math.floor(m.x);
                const cellZ = Math.floor(m.z);
                const k = `${cellX},${cellZ}`;
                map.set(k, (map.get(k) || 0) + 1);
            });
        } else {
            for (const [binCode, pos] of binPositionRegistry.entries()) {
                const cellX = Math.floor(pos[0]);
                const cellZ = Math.floor(pos[2]);
                const k = `${cellX},${cellZ}`;
                if (heatmapMode === 'temperature') {
                    map.set(k, (map.get(k) || 0) + (Math.random() > 0.8 ? 1 : 0));
                } else {
                    map.set(k, (map.get(k) || 0) + 1);
                }
            }
        }
        return map;
    }, [heatmapMode, activityMarkers, binPositionRegistry]);

    const effectiveActivityMarkers = useMemo(() => {
        if (!timelapseMode) return activityMarkers;
        const markers: typeof activityMarkers = [];
        const seed = Math.floor(timelapseHour * 10);
        const isPeak = (timelapseHour >= 9 && timelapseHour <= 11) || (timelapseHour >= 14 && timelapseHour <= 16);
        const count = isPeak ? 15 : 4;
        
        const binEntries = Array.from(binPositionRegistry.entries());
        if (binEntries.length === 0) return markers;

        for (let i = 0; i < count; i++) {
            const binIdx = (seed * 31 + i * 17) % binEntries.length;
            const [binCode, pos] = binEntries[binIdx];
            markers.push({
                id: `sim-${i}`,
                type: i % 2 === 0 ? 'pick' : 'putaway',
                x: pos[0], z: pos[2],
                binCode,
                itemName: 'Simulated Item'
            });
        }
        return markers;
    }, [timelapseMode, timelapseHour, activityMarkers, binPositionRegistry]);
    const [highlightBin, setHighlightBin] = useState<string | null>(null);
    const [shelfTooltip, setShelfTooltip] = useState<{ obj: PlacedObject; level: number; bin?: BinOccupancy } | null>(null);

    // Explorer Panel (integrated Item Locator + Location Browser)
    const [explorerCollapsed, setExplorerCollapsed] = useState(false);
    const [explorerTab, setExplorerTab] = useState<'locations' | 'items'>('locations');

    // Item Search in 3D
    const [itemSearchOpen, setItemSearchOpen] = useState(false);
    const [itemSearchText, setItemSearchText] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState<Array<{ itemName: string; sku: string; binCode: string; zoneName: string; zoneType: string; qty: number }>>([]);
    const [itemSearchLoading, setItemSearchLoading] = useState(false);

    const handleItemSearch = useCallback(async (query: string) => {
        setItemSearchText(query);
        if (!query || query.length < 2) { setItemSearchResults([]); return; }
        setItemSearchLoading(true);
        try {
            const [items, bins, zones, binContents, ledger, warehouses] = await Promise.all([
                inventoryService.getItems().catch(() => []),
                inventoryService.getBins().catch(() => []),
                inventoryService.getZones().catch(() => []),
                inventoryService.getBinContents().catch(() => []),
                inventoryService.getStockLedger().catch(() => []),
                inventoryService.getWarehouses().catch(() => []),
            ]);
            const q = query.toLowerCase();
            const results: typeof itemSearchResults = [];
            const coveredItemIds = new Set<string>();
            const zoneMap = new Map(zones.map((z: any) => [z.id, z]));
            const binMap = new Map(bins.map((b: any) => [b.id, b]));
            const whMap = new Map(warehouses.map((w: any) => [w.id, w]));
            const whByCode = new Map(warehouses.map((w: any) => [w.code, w]));

            // Priority 1: Search bin contents for matching items
            for (const bc of binContents) {
                const item = items.find((i: any) => i.id === bc.itemId);
                if (!item) continue;
                if (!item.name?.toLowerCase().includes(q) && !item.sku?.toLowerCase().includes(q)) continue;
                const bin = binMap.get(bc.binId);
                const zone = bin ? zoneMap.get(bin.zoneId) : null;
                results.push({
                    itemName: item.name || 'Unknown',
                    sku: item.sku || '—',
                    binCode: bin?.code || '—',
                    zoneName: zone?.name || '—',
                    zoneType: zone?.zoneType || 'storage',
                    qty: bc.quantity || 0,
                });
                coveredItemIds.add(bc.itemId);
            }

            // Priority 2: Search stock ledger — round-robin across bins per warehouse
            if (ledger.length > 0) {
                // Build per-warehouse bin pools
                const whBinPools = new Map<string, any[]>();
                const whBinCounters = new Map<string, number>();
                warehouses.forEach((wh: any) => {
                    const whZones = zones.filter((z: any) => z.warehouseId === wh.id);
                    const storageBins = bins.filter((b: any) => {
                        const z = zoneMap.get(b.zoneId);
                        return z && z.warehouseId === wh.id && ['storage', 'picking', 'cold', 'hazardous', 'climate_controlled'].includes(z.zoneType || '');
                    });
                    const allWhBins = bins.filter((b: any) => whZones.some((z: any) => z.id === b.zoneId));
                    const pool = storageBins.length > 0 ? storageBins : allWhBins;
                    whBinPools.set(wh.id, pool);
                    whBinCounters.set(wh.id, 0);
                    if (wh.code) {
                        whBinPools.set(wh.code, pool);
                        whBinCounters.set(wh.code, 0);
                    }
                });

                const relevantLedger = ledger;

                for (const l of relevantLedger) {
                    if (coveredItemIds.includes(l.itemId)) continue;
                    const item = items.find((i: any) => i.id === l.itemId);
                    if (!item) continue;
                    if (!item.name?.toLowerCase().includes(q) && !item.sku?.toLowerCase().includes(q)) continue;

                    const wh = l.warehouseId ? (whMap.get(l.warehouseId) || whByCode.get(l.warehouseId) || null) : null;
                    const pool = l.warehouseId ? (whBinPools.get(l.warehouseId) || (wh ? whBinPools.get(wh.id) : null)) : null;
                    let bin: any = null;
                    let zone: any = null;

                    if (pool && pool.length > 0) {
                        const counterKey = wh?.id || l.warehouseId!;
                        const idx = whBinCounters.get(counterKey) || 0;
                        bin = pool[idx % pool.length];
                        whBinCounters.set(counterKey, idx + 1);
                        zone = bin ? zoneMap.get(bin.zoneId) : null;
                    }

                    results.push({
                        itemName: item.name || 'Unknown',
                        sku: item.sku || '—',
                        binCode: bin?.code || '—',
                        zoneName: zone?.name || '—',
                        zoneType: zone?.zoneType || 'storage',
                        qty: l.onHand || 0,
                    });
                    coveredItemIds.add(l.itemId);
                }
            }

            // Also search by bin code directly
            if (results.length === 0) {
                const matchedBins = bins.filter((b: any) => b.code?.toLowerCase().includes(q));
                for (const bin of matchedBins.slice(0, 10)) {
                    const zone = zoneMap.get(bin.zoneId);
                    results.push({
                        itemName: `Bin ${bin.code}`,
                        sku: '—',
                        binCode: bin.code || '—',
                        zoneName: zone?.name || '—',
                        zoneType: zone?.zoneType || 'storage',
                        qty: bin.currentItemCount || 0,
                    });
                }
            }

            setItemSearchResults(results.slice(0, 20));
        } catch {
            setItemSearchResults([]);
        }
        setItemSearchLoading(false);
    }, [objects]);

    const handleLocateItem = useCallback((binCode: string) => {
        setHighlightBin(binCode);
        setItemSearchOpen(false);
        setCameraPreset('iso'); // Trigger camera movement toward the beacon
        messageApi.success(`📍 Locating bin: ${binCode}`);
    }, [messageApi]);

    // Warehouse selector state
    const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
    const [loadingWarehouse, setLoadingWarehouse] = useState(false);

    // Ruler / Measurement tool
    const [rulerMode, setRulerMode] = useState(false);
    const [rulerPoints, setRulerPoints] = useState<[number, number][]>([]);
    const handleRulerClick = useCallback((x: number, z: number) => {
        setRulerPoints(prev => {
            if (prev.length >= 2) return [[x, z]]; // reset after 2 points, start new
            return [...prev, [x, z]];
        });
    }, []);

    // Cross-navigation helpers
    const navigateTo = useCallback((path: string) => router.push(path), [router]);
    const navToLocationBrowser = useCallback((binCode?: string, zoneCode?: string) => {
        const q = new URLSearchParams();
        if (binCode) q.set('bin', binCode);
        else if (zoneCode) q.set('zone', zoneCode);
        navigateTo(`/admin/inventory/location-browser${q.toString() ? '?' + q.toString() : ''}`);
    }, [navigateTo]);
    const navToItemLocator = useCallback((binCode?: string, zoneCode?: string) => {
        const q = new URLSearchParams();
        if (binCode) q.set('bin', binCode);
        else if (zoneCode) q.set('zone', zoneCode);
        navigateTo(`/admin/inventory/item-locator${q.toString() ? '?' + q.toString() : ''}`);
    }, [navigateTo]);
    const navToHeatmap = useCallback(() => navigateTo('/admin/inventory/warehouse-heatmap'), [navigateTo]);

    // Load a warehouse-specific layout (or auto-generate if none exists)
    const loadWarehouseLayout = useCallback(async (warehouseId: string, whList?: InvWarehouse[]) => {
        setLoadingWarehouse(true);
        try {
            // Check for saved layout for this warehouse
            let savedLayouts: any[] = [];
            try {
                savedLayouts = await inventoryService.getWarehouseLayouts(undefined, warehouseId);
            } catch { /* no layouts table yet, ignore */ }
            const activeLayout = savedLayouts?.find((l: any) => l.isActive) || savedLayouts?.[0];

            if (activeLayout && activeLayout.objects) {
                const parsed = typeof activeLayout.objects === 'string'
                    ? JSON.parse(activeLayout.objects)
                    : activeLayout.objects;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setObjects(parsed);
                    setActiveLayoutId(activeLayout.id);
                    setLoadingWarehouse(false);
                    return;
                }
            }

            // No saved layout — try to auto-generate from zone/bin data
            let zones: any[] = [];
            let allBins: any[] = [];
            let generatedObjs: any[] = [];
            try {
                zones = await inventoryService.getZones(warehouseId) || [];
                for (const z of zones) {
                    const zBins = await inventoryService.getBins(z.id);
                    allBins = allBins.concat(zBins || []);
                }
            } catch { /* ignore API errors */ }

            if (zones.length > 0) {
                const whs2 = whList || warehouses;
                const wh2 = whs2.find(w => w.id === warehouseId);
                const whType = (wh2 as any)?.warehouseType || undefined;
                const generated = generateLayoutFromInventory(zones, allBins, warehouseId, whType);
                setObjects(generated);
                generatedObjs = generated;
            } else {
                // No zones exist — generate a size-based default layout
                // Use warehouse capacity to estimate size, or default to medium
                const whs = whList || warehouses;
                const wh = whs.find(w => w.id === warehouseId);
                const capacity = wh?.totalCapacity || 100;
                // Create synthetic zones so the generator can determine size tier
                const syntheticZones = [
                    { id: `syn-recv-${warehouseId}`, code: 'RECV', name: 'Receiving', zoneType: 'receiving', capacity: Math.floor(capacity * 0.1) },
                    { id: `syn-stor1-${warehouseId}`, code: 'STOR-A', name: 'Storage A', zoneType: 'storage', capacity: Math.floor(capacity * 0.3) },
                    { id: `syn-stor2-${warehouseId}`, code: 'STOR-B', name: 'Storage B', zoneType: 'storage', capacity: Math.floor(capacity * 0.3) },
                    { id: `syn-cold-${warehouseId}`, code: 'COLD', name: 'Cold Storage', zoneType: 'cold', capacity: Math.floor(capacity * 0.05) },
                    { id: `syn-pick-${warehouseId}`, code: 'PICK', name: 'Picking', zoneType: 'picking', capacity: Math.floor(capacity * 0.1) },
                    { id: `syn-pack-${warehouseId}`, code: 'PACK', name: 'Packing', zoneType: 'packing', capacity: Math.floor(capacity * 0.05) },
                    { id: `syn-ship-${warehouseId}`, code: 'SHIP', name: 'Shipping', zoneType: 'shipping', capacity: Math.floor(capacity * 0.1) },
                ];
                // Generate synthetic bins based on capacity to control size tier
                const syntheticBins: any[] = [];
                for (let i = 0; i < Math.min(capacity, 600); i++) {
                    syntheticBins.push({ id: `syn-bin-${i}`, zoneId: syntheticZones[1 + (i % 2)].id, code: `BIN-${i}`, aisle: String.fromCharCode(65 + (i % 8)), rack: `R${Math.floor(i / 8) + 1}`, level: `L${(i % 4) + 1}` });
                }
                const wh0 = (whList || warehouses).find(w => w.id === warehouseId);
                const whType0 = (wh0 as any)?.warehouseType || undefined;
                const generated = generateLayoutFromInventory(syntheticZones, syntheticBins, warehouseId, whType0);
                setObjects(generated);
                generatedObjs = generated;
            }

            // Try to save the auto-generated layout
            const whs = whList || warehouses;
            const wh = whs.find(w => w.id === warehouseId);
            try {
                const saved = await inventoryService.saveWarehouseLayout(undefined, {
                    warehouseId,
                    name: `${wh?.name || 'Warehouse'} — Auto Layout`,
                    objects: generatedObjs,
                    isActive: true,
                });
                setActiveLayoutId(saved.id);
                messageApi.success(`Generated 3D layout for ${wh?.name || 'warehouse'}`);
            } catch {
                messageApi.info(`Layout generated for ${wh?.name || 'warehouse'}`);
            }
        } catch (err) {
            console.error('loadWarehouseLayout error', err);
            setObjects(getDefaultLayout());
        }
        setLoadingWarehouse(false);
    }, [warehouses, messageApi]);

    // Regenerate layout from inventory data (forces re-generation even if saved layout exists)
    const handleRegenerateLayout = useCallback(async () => {
        const warehouseId = selectedWarehouseId;
        if (!warehouseId) { messageApi.warning('Select a warehouse first'); return; }
        setLoadingWarehouse(true);

        try {
            // Delete existing layout
            if (activeLayoutId) {
                try { await clearLayout(activeLayoutId); } catch { /* ignore */ }
                setActiveLayoutId(null);
            }

            // Fetch zone/bin data
            let zones: any[] = [];
            let allBins: any[] = [];
            try {
                zones = await inventoryService.getZones(warehouseId) || [];
                for (const z of zones) {
                    const zBins = await inventoryService.getBins(z.id);
                    allBins = allBins.concat(zBins || []);
                }
            } catch { /* ignore */ }

            if (zones.length === 0) {
                messageApi.warning('No zones found for this warehouse');
                setLoadingWarehouse(false);
                return;
            }

            const wh = warehouses.find(w => w.id === warehouseId);
            const whType = (wh as any)?.warehouseType || undefined;
            const generated = generateLayoutFromInventory(zones, allBins, warehouseId, whType);
            setObjects(generated);

            // Save it
            try {
                const saved = await inventoryService.saveWarehouseLayout(undefined, {
                    warehouseId,
                    name: `${wh?.name || 'Warehouse'} — Data-Driven Layout`,
                    objects: generated,
                    isActive: true,
                });
                setActiveLayoutId(saved.id);
            } catch { /* save optional */ }

            messageApi.success(`Regenerated 3D layout from ${zones.length} zones, ${allBins.length} bins`);
        } catch (err) {
            console.error('Regenerate layout error', err);
            messageApi.error('Failed to regenerate layout');
        }
        setLoadingWarehouse(false);
    }, [selectedWarehouseId, activeLayoutId, warehouses, messageApi]);

    // Load saved layout on mount (async from backend)
    useEffect(() => {
        (async () => {
            // Fetch all warehouses for the selector
            let whs: InvWarehouse[] = [];
            try {
                whs = await inventoryService.getWarehouses();
                setWarehouses(whs || []);
            } catch { /* ignore */ }

            // Check URL for ?warehouse= param
            const params = new URLSearchParams(window.location.search);
            const whParam = params.get('warehouse');

            if (whParam) {
                // Load specific warehouse layout
                setSelectedWarehouseId(whParam);
                await loadWarehouseLayout(whParam, whs);
            } else {
                // Load default/active layout
                const result = await loadLayout();
                if (result && result.objects && result.objects.length > 0) {
                    setObjects(result.objects);
                    setActiveLayoutId(result.layoutId);
                } else {
                    setObjects(getDefaultLayout());
                }
            }
            const layouts = await listLayouts();
            setSavedLayouts(layouts);

            // Parse URL params for deep-linking
            try {
                const binParam = params.get('bin') || params.get('search');
                const zoneParam = params.get('zone');
                const rackParam = params.get('rack');
                if (binParam) {
                    setHighlightBin(binParam);
                    setBuildMode(false); // Ensure viewer mode for beacon visibility
                    setCameraPreset('iso'); // Better angle to see the beacon
                    messageApi.info({ content: `📍 Locating bin: ${binParam}`, duration: 3, key: 'locate-bin' });
                }
                if (zoneParam) {
                    setTimeout(() => {
                        setObjects(prev => {
                            const zone = prev.find(o => o.type === 'zone' && (
                                o.linkedZoneId === zoneParam ||
                                (o.label || '').toLowerCase().includes(zoneParam.toLowerCase())
                            ));
                            if (zone) setSelectedId(zone.id);
                            return prev;
                        });
                    }, 500);
                }
                if (rackParam) {
                    setTimeout(() => {
                        setObjects(prev => {
                            const rack = prev.find(o => o.type === 'rack' && (
                                (o.row && o.bay && `${o.row}-${String(o.bay).padStart(2, '0')}` === rackParam) ||
                                (o.label || '').toLowerCase().includes(rackParam.toLowerCase())
                            ));
                            if (rack) setSelectedId(rack.id);
                            return prev;
                        });
                    }, 500);
                }
                // Handle ?tab= param for explorer panel
                const tabParam = params.get('tab');
                if (tabParam === 'items' || tabParam === 'locations') {
                    setExplorerTab(tabParam);
                    setExplorerCollapsed(false);
                }
            } catch { /* ignore */ }
        })();
    }, []);

    // Handle warehouse change from selector
    const handleWarehouseChange = useCallback(async (warehouseId: string | null) => {
        setSelectedWarehouseId(warehouseId);
        setSelectedId(null);
        setActivePalette(null);
        if (warehouseId) {
            await loadWarehouseLayout(warehouseId);
        } else {
            // Load default layout (no warehouse filter)
            const result = await loadLayout();
            if (result && result.objects && result.objects.length > 0) {
                setObjects(result.objects);
                setActiveLayoutId(result.layoutId);
            } else {
                setObjects(getDefaultLayout());
            }
        }
    }, [loadWarehouseLayout]);

    // Fetch inventory bin data and build rackInventoryMap
    useEffect(() => {
        if (objects.length === 0) return;
        (async () => {
            try {
                const bins = await inventoryService.getBins();
                if (!bins || bins.length === 0) return;

                // Fetch bin contents and item master in parallel
                let allBinContents: any[] = [];
                let allItems: any[] = [];
                try {
                    [allBinContents, allItems] = await Promise.all([
                        inventoryService.getBinContents().catch(() => []),
                        inventoryService.getItems().catch(() => []),
                    ]);
                } catch { /* ignore - optional data */ }

                // Build lookup maps
                const itemMap = new Map<string, { name: string; sku: string }>();
                for (const item of allItems) {
                    itemMap.set(item.id, { name: item.name, sku: item.sku || '' });
                }

                // Group bin contents by binId
                const binContentsMap = new Map<string, Array<{ itemId: string; quantity: number; uom?: string }>>();
                for (const bc of allBinContents) {
                    if (!binContentsMap.includes(bc.binId)) binContentsMap.set(bc.binId, []);
                    binContentsMap.get(bc.binId)!.push({ itemId: bc.itemId, quantity: bc.quantity, uom: bc.uom });
                }

                const map = new Map<string, RackInventory>();
                const racks = objects.filter(o => o.type === 'rack');
                for (const rack of racks) {
                    const levels = rack.rackLevels || 3;
                    // Match bins by linkedBinIds or by generated bin codes
                    const rackBins: BinOccupancy[] = [];
                    if (rack.linkedBinIds && rack.linkedBinIds.length > 0) {
                        // Manual linking — use linked bin IDs
                        for (let l = 0; l < levels; l++) {
                            const binId = rack.linkedBinIds[l];
                            if (!binId) continue;
                            const bin = bins.find(b => b.id === binId);
                            if (bin) {
                                // Look up bin contents → item names
                                const contents = binContentsMap.get(bin.id) || [];
                                const binItems = contents.map(c => {
                                    const item = itemMap.get(c.itemId);
                                    return { name: item?.name || 'Unknown Item', sku: item?.sku || '', qty: c.quantity };
                                });
                                const itemCount = contents.reduce((s, c) => s + c.quantity, 0) || bin.currentItemCount || 0;

                                rackBins.push({
                                    binId: bin.id, binCode: bin.code, level: l,
                                    currentItemCount: itemCount,
                                    isOccupied: bin.isOccupied || itemCount > 0,
                                    maxWeight: bin.maxWeight || 20,
                                    items: binItems.length > 0 ? binItems : undefined,
                                });
                            }
                        }
                    } else {
                        // Auto-match: try multiple strategies to link bins to rack levels

                        // Strategy 1: match by generated bin code pattern
                        const expectedCodes = generateRackBinInputs(rack);

                        // Strategy 2: match by bin aisle+rack+level properties
                        // E.g. rack row="A-01" bay=1 → bins where aisle="A-01" and rack contains "R01"
                        const rackRow = rack.row || '';
                        const rackBay = rack.bay != null ? String(rack.bay).padStart(2, '0') : '';
                        const rackCode = rackRow && rackBay ? `${rackRow}-${rackBay}` : '';
                        
                        // Find bins that belong to this rack by aisle/rack properties
                        const matchedBinsByAisle = bins.filter(b => {
                            if (!b.aisle || !rackRow) return false;
                            // Match aisle to rack row (e.g. aisle="A-01" and row="A-01")
                            const aisleMatch = b.aisle === rackRow;
                            // Match bin rack to bay (e.g. bin.rack="R01" and bay="01", or bin.rack matches pattern)
                            const rackMatch = rackBay 
                                ? (b.rack === `R${rackBay}` || b.rack === `R${parseInt(rackBay)}` || b.rack === rackBay)
                                : true;
                            return aisleMatch && rackMatch;
                        }).sort((a, b) => {
                            const la = parseInt((a.level || '1').replace(/\D/g, '')) || 1;
                            const lb = parseInt((b.level || '1').replace(/\D/g, '')) || 1;
                            return la - lb;
                        });

                        // Strategy 3: fuzzy match by bin code containing row-bay pattern
                        const fuzzyPattern = rackCode ? rackCode : rackRow;
                        const matchedBinsByCode = fuzzyPattern ? bins.filter(b => {
                            return b.code.includes(fuzzyPattern) || b.code.replace(/^[A-Z]-/, '').startsWith(fuzzyPattern);
                        }).sort((a, b) => {
                            const la = parseInt((a.level || '1').replace(/\D/g, '')) || 1;
                            const lb = parseInt((b.level || '1').replace(/\D/g, '')) || 1;
                            return la - lb;
                        }) : [];

                        // Use the best match: prioritize aisle-based, then fuzzy code, then generated codes
                        const bestMatch = matchedBinsByAisle.length > 0 ? matchedBinsByAisle 
                            : matchedBinsByCode.length > 0 ? matchedBinsByCode : null;

                        if (bestMatch && bestMatch.length > 0) {
                            for (let l = 0; l < Math.min(bestMatch.length, levels); l++) {
                                const bin = bestMatch[l];
                                const contents = binContentsMap.get(bin.id) || [];
                                const binItems = contents.map(c => {
                                    const item = itemMap.get(c.itemId);
                                    return { name: item?.name || 'Unknown Item', sku: item?.sku || '', qty: c.quantity };
                                });
                                const itemCount = contents.reduce((s, c) => s + c.quantity, 0) || bin.currentItemCount || 0;

                                rackBins.push({
                                    binId: bin.id, binCode: bin.code, level: l,
                                    currentItemCount: itemCount,
                                    isOccupied: bin.isOccupied || itemCount > 0,
                                    maxWeight: bin.maxWeight || 20,
                                    items: binItems.length > 0 ? binItems : undefined,
                                });
                            }
                        } else {
                            // Fallback: try generated codes
                            for (let l = 0; l < levels; l++) {
                                const expected = expectedCodes[l];
                                if (!expected) continue;
                                const bin = bins.find(b => b.code === expected.code);
                                if (bin) {
                                    const contents = binContentsMap.get(bin.id) || [];
                                    const binItems = contents.map(c => {
                                        const item = itemMap.get(c.itemId);
                                        return { name: item?.name || 'Unknown Item', sku: item?.sku || '', qty: c.quantity };
                                    });
                                    const itemCount = contents.reduce((s, c) => s + c.quantity, 0) || bin.currentItemCount || 0;

                                    rackBins.push({
                                        binId: bin.id, binCode: bin.code, level: l,
                                        currentItemCount: itemCount,
                                        isOccupied: bin.isOccupied || itemCount > 0,
                                        maxWeight: bin.maxWeight || 20,
                                        items: binItems.length > 0 ? binItems : undefined,
                                    });
                                }
                            }
                        }
                    }
                    if (rackBins.length > 0) {
                        const totalItems = rackBins.reduce((s, b) => s + b.currentItemCount, 0);
                        const maxCapacity = rackBins.reduce((s, b) => s + (b.maxWeight || 20), 0);
                        map.set(rack.id, {
                            rackObjectId: rack.id,
                            bins: rackBins,
                            totalItems,
                            fillPercent: maxCapacity > 0 ? (totalItems / maxCapacity) * 100 : 0,
                        });
                    }
                }
                setRackInventoryMap(map);

                // ═════════════════════════════════════════════════════
                // BUILD BIN POSITION REGISTRY — maps EVERY bin code to a unique 3D position
                // ═════════════════════════════════════════════════════
                const posRegistry = new Map<string, [number, number, number]>();

                // Phase 1: Register bins that are linked to racks via rackInventoryMap
                for (const [rackId, rackInv] of map.entries()) {
                    const rackObj = objects.find(o => o.id === rackId);
                    if (!rackObj) continue;
                    for (const bin of rackInv.bins) {
                        const levels = rackObj.rackLevels || 3;
                        const levelHeight = (bin.level / levels) * (levels * 0.42) + 0.3;
                        posRegistry.set(bin.binCode, [
                            rackObj.x + (rackObj.width || 1) / 2,
                            levelHeight,
                            rackObj.z + (rackObj.depth || 1) / 2,
                        ]);
                    }
                }

                // Phase 2: Register all remaining bins by matching to racks via bin code patterns
                for (const bin of bins) {
                    if (posRegistry.includes(bin.code)) continue; // Already registered

                    // Try to match by aisle/rack/level fields from the bin
                    if (bin.aisle && bin.rack) {
                        const matchedRack = racks.find(r => {
                            const rRow = r.row || suggestRow(r.z);
                            const rBay = r.bay != null ? r.bay : Math.floor(r.x) + 1;
                            const rackCode = `${rRow}-${String(rBay).padStart(2, '0')}`;
                            return bin.rack === rackCode || bin.aisle === rRow;
                        });
                        if (matchedRack) {
                            const levels = matchedRack.rackLevels || 3;
                            const levelNum = bin.level ? parseInt(bin.level.replace(/\D/g, '')) || 1 : 1;
                            const levelHeight = ((levelNum - 1) / levels) * (levels * 0.42) + 0.3;
                            posRegistry.set(bin.code, [
                                matchedRack.x + (matchedRack.width || 1) / 2,
                                levelHeight,
                                matchedRack.z + (matchedRack.depth || 1) / 2,
                            ]);
                            continue;
                        }
                    }

                    // Try to match by bin code pattern: "{ROW}-{BAY}-L{LEVEL}"
                    const codeUpper = bin.code.toUpperCase();
                    const genMatch = codeUpper.match(/^([A-Z]+\d*)-(\d+)-L(\d+)$/);
                    if (genMatch) {
                        const targetRow = genMatch[1];
                        const targetBay = parseInt(genMatch[2]);
                        const targetLevel = parseInt(genMatch[3]);
                        const matchedRack = racks.find(r => {
                            const rRow = (r.row || suggestRow(r.z)).toUpperCase();
                            const rBay = r.bay != null ? r.bay : Math.floor(r.x) + 1;
                            return rRow === targetRow && rBay === targetBay;
                        });
                        if (matchedRack) {
                            const levels = matchedRack.rackLevels || 3;
                            const levelHeight = ((targetLevel - 1) / levels) * (levels * 0.42) + 0.3;
                            posRegistry.set(bin.code, [
                                matchedRack.x + (matchedRack.width || 1) / 2,
                                levelHeight,
                                matchedRack.z + (matchedRack.depth || 1) / 2,
                            ]);
                            continue;
                        }
                    }

                    // Try compound codes: "ZN-A1-R2-L3", extract aisle/rack numbers
                    const aisleMatch = codeUpper.match(/A(\d+)/);
                    const rackMatch = codeUpper.match(/R(\d+)/);
                    const levelMatch = codeUpper.match(/L(\d+)/);
                    if (aisleMatch && rackMatch) {
                        const aisleNum = parseInt(aisleMatch[1]);
                        const rackNum = parseInt(rackMatch[1]);
                        const levelNum = levelMatch ? parseInt(levelMatch[1]) : 1;
                        // Sort racks by Z (aisles) then X (bays)
                        const sortedByZ = [...racks].sort((a, b) => a.z - b.z);
                        const uniqueZRows = [...new Set(sortedByZ.map(r => Math.round(r.z * 2) / 2))];
                        const aisleIdx = Math.min(aisleNum - 1, uniqueZRows.length - 1);
                        if (aisleIdx >= 0 && uniqueZRows[aisleIdx] !== undefined) {
                            const targetZ = uniqueZRows[aisleIdx];
                            const racksInRow = racks.filter(r => Math.abs(r.z - targetZ) < 1.5).sort((a, b) => a.x - b.x);
                            const rackIdx = Math.min(rackNum - 1, racksInRow.length - 1);
                            if (rackIdx >= 0 && racksInRow[rackIdx]) {
                                const matchedRack = racksInRow[rackIdx];
                                const levels = matchedRack.rackLevels || 3;
                                const levelHeight = ((levelNum - 1) / levels) * (levels * 0.42) + 0.3;
                                posRegistry.set(bin.code, [
                                    matchedRack.x + (matchedRack.width || 1) / 2,
                                    levelHeight,
                                    matchedRack.z + (matchedRack.depth || 1) / 2,
                                ]);
                                continue;
                            }
                        }
                    }
                }

                // Phase 3: For any still-unregistered bins, distribute across zones
                const zones = await inventoryService.getZones().catch(() => []);
                const unregisteredBins = bins.filter(b => !posRegistry.includes(b.code));
                if (unregisteredBins.length > 0) {
                    // Group unregistered bins by zoneId
                    const binsByZone = new Map<string, typeof bins>();
                    for (const bin of unregisteredBins) {
                        const zoneId = bin.zoneId;
                        if (!binsByZone.includes(zoneId)) binsByZone.set(zoneId, []);
                        binsByZone.get(zoneId)!.push(bin);
                    }

                    for (const [zoneId, zoneBins] of binsByZone.entries()) {
                        // Find the 3D zone object
                        const matchedZone = zones.find(z => z.id === zoneId);
                        let zoneObj: PlacedObject | undefined;
                        if (matchedZone) {
                            zoneObj = objects.find(o => o.type === 'zone' && (
                                o.linkedZoneId === zoneId ||
                                (o.label || '').toLowerCase() === (matchedZone.name || '').toLowerCase()
                            ));
                        }

                        if (zoneObj) {
                            // Find racks inside this zone
                            const zx = zoneObj.x, zz = zoneObj.z;
                            const zw = zoneObj.width || 4, zd = zoneObj.depth || 4;
                            const racksInZone = racks.filter(r =>
                                r.x >= zx && r.x < zx + zw && r.z >= zz && r.z < zz + zd
                            ).sort((a, b) => a.x === b.x ? a.z - b.z : a.x - b.x);

                            if (racksInZone.length > 0) {
                                // Distribute bins across racks in this zone
                                zoneBins.forEach((bin, i) => {
                                    const rackIdx = i % racksInZone.length;
                                    const rack = racksInZone[rackIdx];
                                    const levels = rack.rackLevels || 3;
                                    const levelIdx = Math.floor(i / racksInZone.length) % levels;
                                    const levelHeight = (levelIdx / levels) * (levels * 0.42) + 0.3;
                                    posRegistry.set(bin.code, [
                                        rack.x + (rack.width || 1) / 2,
                                        levelHeight,
                                        rack.z + (rack.depth || 1) / 2,
                                    ]);
                                });
                            } else {
                                // No racks in zone — distribute across zone floor area
                                const cols = Math.ceil(Math.sqrt(zoneBins.length));
                                zoneBins.forEach((bin, i) => {
                                    const col = i % cols;
                                    const row = Math.floor(i / cols);
                                    posRegistry.set(bin.code, [
                                        zx + 0.5 + (col / Math.max(cols - 1, 1)) * (zw - 1),
                                        0.5,
                                        zz + 0.5 + (row / Math.max(Math.ceil(zoneBins.length / cols) - 1, 1)) * (zd - 1),
                                    ]);
                                });
                            }
                        } else {
                            // No zone match — distribute across all racks
                            if (racks.length > 0) {
                                zoneBins.forEach((bin, i) => {
                                    const rackIdx = i % racks.length;
                                    const rack = racks[rackIdx];
                                    const levels = rack.rackLevels || 3;
                                    const levelIdx = Math.floor(i / racks.length) % levels;
                                    const levelHeight = (levelIdx / levels) * (levels * 0.42) + 0.3;
                                    posRegistry.set(bin.code, [
                                        rack.x + (rack.width || 1) / 2,
                                        levelHeight,
                                        rack.z + (rack.depth || 1) / 2,
                                    ]);
                                });
                            }
                        }
                    }
                }

                setBinPositionRegistry(posRegistry);
                console.log(`[Warehouse] Registered ${posRegistry.size}/${bins.length} bin positions`);

                // Build zone inventory map
                try {
                    const zoneMap = new Map<string, ZoneInventory>();
                    for (const zoneObj of objects.filter(o => o.type === 'zone')) {
                        const linkedId = zoneObj.linkedZoneId;
                        const matchedZone = linkedId
                            ? zones.find(z => z.id === linkedId)
                            : zones.find(z => z.name?.toLowerCase() === (zoneObj.label || '').toLowerCase());
                        if (matchedZone) {
                            const zoneBins = bins.filter(b => b.zoneId === matchedZone.id);
                            const totalBins = zoneBins.length;
                            const occupiedBins = zoneBins.filter(b => b.isOccupied || (b.currentItemCount || 0) > 0).length;
                            const totalItems = zoneBins.reduce((s, b) => s + (b.currentItemCount || 0), 0);
                            const utilization = totalBins > 0 ? (occupiedBins / totalBins) * 100 : 0;
                            zoneMap.set(zoneObj.linkedZoneId || zoneObj.id, {
                                zoneObjectId: zoneObj.id,
                                linkedZoneId: matchedZone.id,
                                totalBins,
                                occupiedBins,
                                totalItems,
                                utilization,
                            });
                        }
                    }
                    setZoneInventoryMap(zoneMap);

                    // ═══ COMPUTE STOCK ALERTS ═══════════════════
                    const alertsMap = new Map<string, 'low' | 'overstock' | 'empty'>();
                    for (const [rackId, rackInv] of map.entries()) {
                        if (rackInv.bins.length === 0) continue;
                        const totalItems = rackInv.totalItems;
                        const maxCapacity = rackInv.bins.reduce((s, b) => s + (b.maxWeight || 20), 0);
                        const fillPct = maxCapacity > 0 ? (totalItems / maxCapacity) * 100 : 0;
                        if (totalItems === 0 && rackInv.bins.every(b => !b.isOccupied)) {
                            alertsMap.set(rackId, 'empty');
                        } else if (fillPct > 85) {
                            alertsMap.set(rackId, 'overstock');
                        } else if (fillPct > 0 && fillPct < 20) {
                            alertsMap.set(rackId, 'low');
                        }
                    }
                    setStockAlerts(alertsMap);

                    // ═══ COMPUTE ZONE STATS DATA ═══════════════
                    const zsData = new Map<string, { totalBins: number; usedBins: number; totalItems: number; topItems: Array<{name: string; qty: number}> }>();
                    for (const [key, zInv] of zoneMap.entries()) {
                        const zoneObj = objects.find(o => o.id === zInv.zoneObjectId);
                        if (!zoneObj) continue;
                        // Collect items in this zone from rackInventoryMap
                        const racksInZone = objects.filter(o => o.type === 'rack' &&
                            o.x >= zoneObj.x && o.x < zoneObj.x + (zoneObj.width || 4) &&
                            o.z >= zoneObj.z && o.z < zoneObj.z + (zoneObj.depth || 4));
                        const itemQtyMap = new Map<string, number>();
                        for (const rack of racksInZone) {
                            const rInv = map.get(rack.id);
                            if (!rInv) continue;
                            for (const bin of rInv.bins) {
                                if (bin.items) {
                                    for (const itm of bin.items) {
                                        itemQtyMap.set(itm.name, (itemQtyMap.get(itm.name) || 0) + itm.qty);
                                    }
                                }
                            }
                        }
                        const topItems = [...itemQtyMap.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([name, qty]) => ({ name, qty }));
                        zsData.set(zoneObj.id, {
                            totalBins: zInv.totalBins,
                            usedBins: zInv.occupiedBins,
                            totalItems: zInv.totalItems,
                            topItems,
                        });
                    }
                    setZoneStatsData(zsData);

                } catch { /* zone data optional */ }
            } catch (err) {
                console.warn('Could not fetch inventory data for 3D map:', err);
            }
        })();
    }, [objects]);

    // ═══ FETCH ACTIVITY MARKERS (putaway + pick tasks) ═══
    useEffect(() => {
        if (!showActivityMarkers || objects.length === 0) { setActivityMarkers([]); return; }
        let cancelled = false;
        const fetchTasks = async () => {
            try {
                const [putaways, picks] = await Promise.all([
                    inventoryService.getPutawayTasks().catch(() => []),
                    inventoryService.getPickTasks().catch(() => []),
                ]);
                if (cancelled) return;
                const markers: typeof activityMarkers = [];
                const racks = objects.filter(o => o.type === 'rack');

                for (const task of putaways) {
                    if (task.status !== 'pending' && task.status !== 'in_progress') continue;
                    const binPos = binPositionRegistry.get(task.suggestedBinCode || '');
                    if (binPos) {
                        markers.push({ id: task.id, type: 'putaway', x: binPos[0], z: binPos[2], binCode: task.suggestedBinCode || '?', itemName: task.itemName });
                    } else if (racks.length > 0) {
                        const r = racks[markers.length % racks.length];
                        markers.push({ id: task.id, type: 'putaway', x: r.x, z: r.z, binCode: task.suggestedBinCode || '?', itemName: task.itemName });
                    }
                }
                for (const task of picks) {
                    if (task.status !== 'pending' && task.status !== 'in_progress') continue;
                    const binPos = binPositionRegistry.get(task.fromBinCode || '');
                    if (binPos) {
                        markers.push({ id: task.id, type: 'pick', x: binPos[0], z: binPos[2], binCode: task.fromBinCode || '?', itemName: task.itemName });
                    }
                }
                setActivityMarkers(markers);
            } catch { setActivityMarkers([]); }
        };
        fetchTasks();
        const interval = setInterval(fetchTasks, 30000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [showActivityMarkers, objects, binPositionRegistry]);

    // Ghost preview object for placement
    const ghostObj = useMemo<PlacedObject | null>(() => {
        if (!activePalette) return null;
        return {
            id: 'ghost', type: activePalette.type,
            x: 0, z: 0, rotation: 0,
            width: activePalette.defaultWidth, depth: activePalette.defaultDepth,
            zoneType: ZONE_TYPE_MAP[activePalette.label] as any,
            rackLevels: activePalette.type === 'rack' ? 3 : undefined,
            label: activePalette.label, color: activePalette.color,
        };
    }, [activePalette]);

    // Push to history for undo
    const pushHistory = useCallback(() => {
        setHistory(prev => [...prev.slice(-20), objects.map(o => ({ ...o }))]);
        setRedoHistory([]); // clear redo on new action
    }, [objects]);

    // Place object on grid
    const handleGridClick = useCallback((x: number, z: number) => {
        if (!buildMode) return;
        
        let newObj: PlacedObject | null = null;
        
        if (activeTool === 'draw_wall') {
            newObj = {
                id: generateId(), type: 'wall', x, z, rotation: 0,
                width: 4, depth: 0.5, label: 'Wall', color: '#64748b', floorLevel: currentFloor
            };
        } else if (activeTool === 'draw_zone') {
            newObj = {
                id: generateId(), type: 'zone', x, z, rotation: 0,
                width: 4, depth: 4, zoneType: 'storage', label: 'Storage Zone', color: '#3b82f6', floorLevel: currentFloor
            };
        } else if (activeTool === 'place_object' && activePalette) {
            newObj = {
                id: generateId(), type: activePalette.type,
                x, z, rotation: 0,
                width: activePalette.defaultWidth, depth: activePalette.defaultDepth,
                zoneType: ZONE_TYPE_MAP[activePalette.label] as any,
                rackLevels: activePalette.type === 'rack' ? 3 : undefined,
                label: activePalette.label, color: activePalette.color,
                floorLevel: currentFloor,
            };
        }
        
        if (newObj) {
            pushHistory();
            setObjects(prev => [...prev, newObj!]);
            messageApi.success(`Placed ${newObj!.label}`);
        }
    }, [buildMode, activeTool, activePalette, currentFloor, pushHistory, messageApi]);
    const handlePointerDown = useCallback((e: any) => {
        if (!buildMode || activeTool !== 'select') return;
        const pt = e.point;
        if (pt) setDragStartPos([pt.x, pt.z]);
    }, [buildMode, activeTool]);

    const handlePointerMove = useCallback((e: any) => {
        if (!dragStartPos) return;
        const pt = e.point;
        if (pt) {
            setSelectionBox({
                startX: dragStartPos[0], startZ: dragStartPos[1],
                endX: pt.x, endZ: pt.z
            });
        }
    }, [dragStartPos]);

    const handlePointerUp = useCallback((e: any) => {
        if (!dragStartPos) return;
        if (selectionBox) {
            const minX = Math.min(selectionBox.startX, selectionBox.endX);
            const maxX = Math.max(selectionBox.startX, selectionBox.endX);
            const minZ = Math.min(selectionBox.startZ, selectionBox.endZ);
            const maxZ = Math.max(selectionBox.startZ, selectionBox.endZ);

            // Find all objects whose center is inside the box
            const insideIds = objects.filter(o => {
                const ox = o.x + (o.width || 1) / 2;
                const oz = o.z + (o.depth || 1) / 2;
                return ox >= minX && ox <= maxX && oz >= minZ && oz <= maxZ && o.floorLevel === currentFloor;
            }).map(o => o.id);

            if (insideIds.length > 0) {
                const newSet = new Set(insideIds);
                setSelectedIds(newSet);
                setSelectedId(null);
                messageApi.info(`Selected ${insideIds.length} objects`);
            } else {
                setSelectedIds(new Set());
            }
        }
        setDragStartPos(null);
        setSelectionBox(null);
    }, [dragStartPos, selectionBox, objects, currentFloor, messageApi]);


    // Select object (supports multi-select with Shift)
    const handleSelectObject = useCallback((id: string, shiftKey: boolean = false) => {
        if (buildMode && activeTool !== 'select') return; // placing mode — don't select
        if (shiftKey) {
            // Multi-select: toggle this id in selectedIds
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.includes(id)) { next.delete(id); } else { next.add(id); }
                // Also add the current selectedId if there is one
                if (selectedId && selectedId !== id) next.add(selectedId);
                return next;
            });
            setSelectedId(id);
        } else {
            // Single select: clear multi-selection
            setSelectedIds(new Set());
            setSelectedId(prev => {
                const nextId = prev === id ? null : id;
                if (!buildMode) {
                    setViewingObjectId(nextId);
                }
                return nextId;
            });
        }
    }, [activeTool, selectedId, buildMode]);

    // Delete selected (supports multi-select)
    const handleDelete = useCallback(() => {
        const ids = selectedIds.size > 0 ? selectedIds : (selectedId ? new Set([selectedId]) : new Set<string>());
        if (ids.size === 0) return;
        const hasLocked = objects.some(o => ids.includes(o.id) && o.locked);
        if (hasLocked) { messageApi.warning('Some objects are locked'); return; }
        pushHistory();
        setObjects(prev => prev.filter(o => !ids.includes(o.id)));
        setSelectedId(null);
        setSelectedIds(new Set());
        messageApi.info(`${ids.size} object${ids.size > 1 ? 's' : ''} deleted`);
    }, [selectedId, selectedIds, objects, pushHistory, messageApi]);

    // Clear all objects
    const handleClear = useCallback(() => {
        pushHistory();
        setObjects([]);
        setSelectedId(null);
        setSelectedIds(new Set());
        messageApi.info('Layout cleared');
    }, [pushHistory, messageApi]);

    // Rotate selected
    const handleRotate = useCallback(() => {
        if (!selectedId) return;
        const obj = objects.find(o => o.id === selectedId);
        if (obj?.locked) { messageApi.warning('Object is locked'); return; }
        pushHistory();
        setObjects(prev => prev.map(o =>
            o.id === selectedId ? { ...o, rotation: (o.rotation + 90) % 360 } : o
        ));
    }, [selectedId, objects, pushHistory, messageApi]);

    // Move selected (supports multi-select)
    const handleMove = useCallback((dx: number, dz: number) => {
        const ids = selectedIds.size > 0 ? selectedIds : (selectedId ? new Set([selectedId]) : new Set<string>());
        if (ids.size === 0) return;
        const hasLocked = objects.some(o => ids.includes(o.id) && o.locked);
        if (hasLocked) { messageApi.warning('Some objects are locked'); return; }
        
        const proposedObjects = objects.map(o =>
            ids.includes(o.id) ? { ...o, x: Math.max(0, Math.round((o.x + dx * snapIncrement) * 10) / 10), z: Math.max(0, Math.round((o.z + dz * snapIncrement) * 10) / 10) } : o
        );
        
        // Collision check
        const hasCollision = proposedObjects.some(o => ids.includes(o.id) && checkCollision(o, proposedObjects));
        if (hasCollision) {
            messageApi.warning('Collision prevented movement');
            return;
        }

        pushHistory();
        setObjects(proposedObjects);
    }, [selectedId, selectedIds, objects, pushHistory, messageApi, snapIncrement]);

    // Undo
    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setRedoHistory(r => [...r, objects.map(o => ({ ...o }))]);
        setHistory(h => h.slice(0, -1));
        setObjects(prev);
        messageApi.info('Undone');
    }, [history, objects, messageApi]);

    // Redo
    const handleRedo = useCallback(() => {
        if (redoHistory.length === 0) return;
        const next = redoHistory[redoHistory.length - 1];
        setHistory(h => [...h, objects.map(o => ({ ...o }))]);
        setRedoHistory(r => r.slice(0, -1));
        setObjects(next);
        messageApi.info('Redone');
    }, [redoHistory, objects, messageApi]);

    // Save
    const handleSave = useCallback(async () => {
        const id = await saveLayout(objects, activeLayoutId || undefined, selectedWarehouseId || undefined);
        if (id) setActiveLayoutId(id);
        messageApi.success('Layout saved!');
    }, [objects, activeLayoutId, messageApi]);

    // Save As (named)
    const handleSaveAs = useCallback(async () => {
        if (!saveAsName.trim()) return;
        const layout = await saveNamedLayout(saveAsName.trim(), objects);
        const layouts = await listLayouts();
        setSavedLayouts(layouts);
        setSaveAsOpen(false);
        setSaveAsName('');
        messageApi.success(`Saved as "${layout.name}"`);
    }, [saveAsName, objects, messageApi]);

    // Load named layout
    const handleLoadNamed = useCallback(async (id: string) => {
        const objs = await loadNamedLayout(id);
        if (objs) {
            pushHistory();
            setObjects(objs);
            setActiveLayoutId(id);
            setLayoutManagerOpen(false);
            messageApi.success('Layout loaded');
        }
    }, [pushHistory, messageApi]);

    // Delete named layout
    const handleDeleteLayout = useCallback(async (id: string) => {
        await deleteNamedLayout(id);
        const layouts = await listLayouts();
        setSavedLayouts(layouts);
        messageApi.info('Layout deleted');
    }, [messageApi]);

    // Reset
    const handleReset = useCallback(async () => {
        pushHistory();
        setObjects(getDefaultLayout());
        await clearLayout(activeLayoutId || undefined);
        setActiveLayoutId(null);
        messageApi.info('Reset to default');
    }, [pushHistory, activeLayoutId, messageApi]);

    // Duplicate selected (supports multi-select)
    const handleDuplicate = useCallback(() => {
        const ids = selectedIds.size > 0 ? selectedIds : (selectedId ? new Set([selectedId]) : new Set<string>());
        if (ids.size === 0) return;
        const objsToDup = objects.filter(o => ids.includes(o.id));
        if (objsToDup.some(o => o.locked)) { messageApi.warning('Some objects are locked'); return; }
        pushHistory();
        const dups = objsToDup.map(o => ({ ...duplicateObject(o), locked: false }));
        setObjects(prev => [...prev, ...dups]);
        const newIds = new Set(dups.map(d => d.id));
        setSelectedIds(newIds);
        setSelectedId(dups[dups.length - 1].id);
        messageApi.success(`Duplicated ${dups.length} object${dups.length > 1 ? 's' : ''}!`);
    }, [selectedId, selectedIds, objects, pushHistory, messageApi]);

    // Lock/Unlock
    const handleLock = useCallback(() => {
        if (!selectedId) return;
        setObjects(prev => prev.map(o =>
            o.id === selectedId ? { ...o, locked: !o.locked } : o
        ));
    }, [selectedId]);

    // Auto-arrange racks in zone
    const handleAutoArrange = useCallback(() => {
        if (!selectedId) return;
        const zone = objects.find(o => o.id === selectedId);
        if (!zone || zone.type !== 'zone') return;
        pushHistory();
        const newRacks = autoArrangeRacks(zone);
        setObjects(prev => [...prev, ...newRacks]);
        messageApi.success(`Placed ${newRacks.length} racks in ${zone.label || 'zone'}`);
    }, [selectedId, objects, pushHistory, messageApi]);

    // Change label
    const handleLabelChange = useCallback((label: string) => {
        if (!selectedId) return;
        setObjects(prev => prev.map(o =>
            o.id === selectedId ? { ...o, label } : o
        ));
    }, [selectedId]);

    // Apply template
    const handleApplyTemplate = useCallback((template: WarehouseTemplate) => {
        pushHistory();
        setObjects(template.objects());
        clearLayout();
        setTemplateModalOpen(false);
        messageApi.success(`Applied: ${template.name}`);
    }, [pushHistory, messageApi]);

    // Export
    const handleExport = useCallback(() => {
        const json = exportLayoutJSON(objects);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `warehouse-layout-${Date.now()}.json`;
        a.click(); URL.revokeObjectURL(url);
        messageApi.success('Layout exported!');
    }, [objects, messageApi]);

    // Import
    const handleImport = useCallback(() => {
        const result = importLayoutJSON(importText);
        if (result) {
            pushHistory();
            setObjects(result);
            setImportModalOpen(false);
            setImportText('');
            messageApi.success(`Imported ${result.length} objects`);
        } else {
            messageApi.error('Invalid layout JSON');
        }
    }, [importText, pushHistory, messageApi]);

    // Change color
    const handleColorChange = useCallback((color: string) => {
        if (!selectedId) return;
        pushHistory();
        setObjects(prev => prev.map(o =>
            o.id === selectedId ? { ...o, color } : o
        ));
    }, [selectedId, pushHistory]);

    // Change zone type
    const handleZoneTypeChange = useCallback((zoneType: ZoneType) => {
        if (!selectedId) return;
        const zt = ZONE_TYPES.find(z => z.value === zoneType);
        pushHistory();
        setObjects(prev => prev.map(o =>
            o.id === selectedId ? { ...o, zoneType, color: zt?.color || o.color } : o
        ));
    }, [selectedId, pushHistory]);

    // Change rack levels for selected
    const handleRackLevels = useCallback((levels: number) => {
        if (!selectedId) return;
        pushHistory();
        setObjects(prev => prev.map(o =>
            o.id === selectedId ? { ...o, rackLevels: levels } : o
        ));
    }, [selectedId, pushHistory]);

    // Change zone size
    const handleResize = useCallback((dim: 'width' | 'depth', value: number) => {
        if (!selectedId) return;
        pushHistory();
        setObjects(prev => prev.map(o =>
            o.id === selectedId ? { ...o, [dim]: value } : o
        ));
    }, [selectedId, pushHistory]);

    const selectedObj = objects.find(o => o.id === selectedId);
    const filteredPalette = PALETTE_ITEMS.filter(p => p.category === paletteCategory);

    // Screenshot
    const handleScreenshot = useCallback(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) { messageApi.error('No canvas found'); return; }
        const link = document.createElement('a');
        link.download = `warehouse-layout-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        messageApi.success('Screenshot saved!');
    }, [messageApi]);

    // Warehouse analytics (computed)
    const analytics = useMemo(() => {
        const zones = objects.filter(o => o.type === 'zone');
        const racks = objects.filter(o => o.type === 'rack');
        const totalZoneArea = zones.reduce((sum, z) => sum + (z.width || 1) * (z.depth || 1), 0);
        const totalGridArea = GRID_CELLS * GRID_CELLS;
        const utilization = totalGridArea > 0 ? Math.round((totalZoneArea / totalGridArea) * 100) : 0;
        const totalRackSlots = racks.reduce((sum, r) => sum + (r.rackLevels || 3) * 4, 0);
        const zoneBreakdown = ZONE_TYPES.map(zt => ({
            ...zt,
            count: zones.filter(z => z.zoneType === zt.value).length,
            area: zones.filter(z => z.zoneType === zt.value).reduce((s, z) => s + (z.width || 1) * (z.depth || 1), 0),
        })).filter(z => z.count > 0);
        const equipment = objects.filter(o => !['zone', 'rack', 'wall', 'door', 'pallet'].includes(o.type));

        // Grid analytics (pathfinding)
        let walkable = 0, obstacles = 0, aisles = 0, zoneCells = 0;
        let gridColors: string[][] = [];
        if (objects.length > 0) {
            const grid = buildGrid(objects);
            gridColors = grid.map((row) => row.map((cell) => {
                if (cell.cost === Infinity) { obstacles++; return '#ef4444'; }
                if (cell.type === 'aisle') { aisles++; walkable++; return '#22c55e'; }
                if (cell.type === 'zone') { zoneCells++; walkable++; return cell.zoneType === 'cold' ? '#6366f1' : cell.zoneType === 'quarantine' ? '#ef444480' : '#3b82f6'; }
                walkable++;
                return '#1a1a2e';
            }));
        }
        const walkability = totalGridArea > 0 ? Math.round((walkable / totalGridArea) * 100) : 100;

        // Composite efficiency score (0-100)
        const hasZones = zones.length > 0;
        const zoneTypeCount = new Set(zones.map(z => z.zoneType)).size;
        const zoneTypeDiversity = Math.min(zoneTypeCount / 4, 1); // 4+ zone types = 100%
        const aisleRatio = objects.length > 0 ? Math.min(aisles / Math.max(obstacles, 1), 1) : 0;
        const efficiencyScore = hasZones ? Math.round(
            (walkability / 100) * 30 +      // 30% weight: walkability
            (utilization / 100) * 25 +       // 25% weight: floor coverage
            aisleRatio * 25 +                // 25% weight: aisle-to-obstacle ratio
            zoneTypeDiversity * 20            // 20% weight: zone diversity
        ) : 0;

        return { zones, racks, totalZoneArea, totalGridArea, utilization, totalRackSlots, zoneBreakdown, equipment, walkability, obstacles, aisles, zoneCells, gridColors, efficiencyScore };
    }, [objects]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Help toggle works in both modes
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) { setShowHelp(prev => !prev); return; }
            if (e.key === 'Escape' && showHelp) { setShowHelp(false); return; }
            // Screenshot shortcut (works in both modes, skip if typing)
            if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) {
                const tag = (e.target as HTMLElement)?.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                const canvas = document.querySelector('canvas');
                if (!canvas) return;
                const link = document.createElement('a');
                link.download = `warehouse-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                messageApi.success('Screenshot saved!');
                return;
            }
            if (!buildMode) return;
            if (e.key === 'Delete' || e.key === 'Backspace') handleDelete();
            if (e.key === 'r' || e.key === 'R') handleRotate();
            if (e.key === 'd' || e.key === 'D') handleDuplicate();
            if (e.key === 'Escape') { setActivePalette(null); setSelectedId(null); setSelectedIds(new Set()); }
            // Select All
            if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setSelectedIds(new Set(objects.map(o => o.id)));
                if (objects.length > 0) setSelectedId(objects[0].id);
                messageApi.info(`Selected all ${objects.length} objects`);
                return;
            }
            // Copy
            if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                const ids = selectedIds.size > 0 ? selectedIds : (selectedId ? new Set([selectedId]) : new Set<string>());
                if (ids.size === 0) return;
                setClipboard(objects.filter(o => ids.includes(o.id)));
                messageApi.info(`Copied ${ids.size} object${ids.size > 1 ? 's' : ''}`);
                return;
            }
            // Paste
            if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                if (clipboard.length === 0) return;
                pushHistory();
                const pasted = clipboard.map(o => ({ ...duplicateObject(o), locked: false }));
                setObjects(prev => [...prev, ...pasted]);
                const newIds = new Set(pasted.map(p => p.id));
                setSelectedIds(newIds);
                setSelectedId(pasted[pasted.length - 1].id);
                messageApi.success(`Pasted ${pasted.length} object${pasted.length > 1 ? 's' : ''}!`);
                return;
            }
            if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) handleUndo();
            if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) handleRedo();
            if (e.key === 'ArrowUp') { e.preventDefault(); handleMove(0, -1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); handleMove(0, 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); handleMove(-1, 0); }
            if (e.key === 'ArrowRight') { e.preventDefault(); handleMove(1, 0); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [buildMode, showHelp, objects, clipboard, selectedId, selectedIds, handleDelete, handleRotate, handleDuplicate, handleUndo, handleRedo, handleMove, pushHistory, messageApi, snapIncrement]);

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
                background: isDark ? "rgba(15, 15, 23, 0.65)" : "rgba(255,255,255,0.75)",
                backdropFilter: "blur(24px)",
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.4)",
                boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.02)",
                borderRadius: 16,
                overflow: "hidden",
                position: "relative",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            styles={{ body: { padding: "16px 14px", position: "relative", zIndex: 1 } }}
            hoverable
        >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: gradient, borderRadius: "16px 16px 0 0" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</Typography.Text>
                    <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginTop: 2, background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {value}{suffix && <span style={{ fontSize: 16 }}>{suffix}</span>}
                    </div>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", opacity: 0.85 }}>
                    {icon}
                </div>
            </div>
        </Card>
    );

    return (
        <CMSLayout
            title={
                <div style={{ margin: 0, padding: 0, fontSize: 24 }}>
                    <AuroraText className="text-xl font-bold tracking-tighter" colors={[themeColor, '#3b82f6', '#22c55e']}>
                        Warehouse Explorer
                    </AuroraText>
                </div>
            }
            subTitle={
                <DecryptedText 
                    text="3D warehouse view, item locator, and location browser — all in one" 
                    animateOn="view" 
                    revealDirection="start" 
                    speed={40} 
                    sequential 
                />
            }
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                        <StatCard title="Total Capacity" value={objects.filter(o => o.type === 'rack').reduce((acc, curr) => acc + ((curr.rackLevels || 3) * (curr.width || 1) * (curr.depth || 1)), 0) * 10} suffix=" items" icon={<AppstoreOutlined />} gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" />
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <StatCard title="Storage Zones" value={objects.filter(o => o.type === 'zone').length} icon={<BlockOutlined />} gradient="linear-gradient(135deg, #22c55e 0%, #15803d 100%)" />
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <StatCard title="Equipment" value={objects.filter(o => o.type === 'equipment').length} icon={<ThunderboltOutlined />} gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" />
                    </motion.div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <StatCard title="Total Objects" value={objects.length} icon={<DatabaseOutlined />} gradient="linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)" />
                    </motion.div>
                </Col>
            </Row>

            <div style={{ position: 'relative', height: 'calc(100vh - 220px)', overflow: 'hidden', borderRadius: 0, border: `1px solid ${isDark ? '#333' : '#ccc'}` }}>
                {/* CANVAS IN BACKGROUND */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    
                {ctx}
                {/* Main content */}
                <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: isDark !== false ? '#111827' : '#e5e7eb' }}>

                    {/* Center: 3D Viewport */}
                    <div style={{ flex: 1, width: '100%', height: '100%', background: t.viewportBg, position: 'relative' }}>
                        <WarehouseScene
                            objects={objects}
                            selectedId={selectedId}
                            selectedIds={selectedIds}
                            currentFloor={currentFloor}
                            ghostObj={ghostObj}
                            buildMode={buildMode}
                            gridCells={GRID_CELLS}
                            cameraPreset={cameraPreset}
                            onGridClick={handleGridClick}
                            onSelectObject={handleSelectObject}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            selectionBox={selectionBox}
                            envShadows={envShadows}
                            timeOfDay={timelapseHour}
                            routes={routes}
                            showRoutes={showRoutes}
                            animateRoutes={animateRoutes}
                            showTraffic={showTraffic}
                            showGridOverlay={showGridOverlay}
                            isDark={isDark}
                            rackInventoryMap={rackInventoryMap}
                            zoneInventoryMap={zoneInventoryMap}
                            binPositionRegistry={binPositionRegistry}
                            heatmapData={heatmapData}
                            showActivityMarkers={showActivityMarkers || timelapseMode}
                            activityMarkers={effectiveActivityMarkers}
                            highlightBin={highlightBin || undefined}
                            onShelfClick={(obj, level, bin) => setShelfTooltip({ obj, level, bin })}
                            rulerMode={rulerMode}
                            rulerPoints={rulerPoints.length > 0 ? rulerPoints as [number, number][] : undefined}
                            onRulerClick={handleRulerClick}
                            graphicsQuality={graphicsQuality}
                            heatmapMode={heatmapMode}
                            stockAlerts={stockAlerts}
                            onZoneClick={buildMode ? undefined : (zoneObj: any) => setSelectedZoneForStats(prev => prev === zoneObj.id ? null : zoneObj.id)}
                            selectedZoneId={selectedZoneForStats}
                            zoneStatsData={zoneStatsData}
                        />
                        {/* Shelf tooltip overlay */}
                        {shelfTooltip && (
                            <div style={{
                                position: 'absolute', top: 48, left: '50%', transform: 'translateX(-50%)', zIndex: 12,
                                padding: '10px 14px', borderRadius: 10,
                                background: t.panelBg, backdropFilter: 'blur(12px)',
                                border: `1px solid ${t.panelBorder}`,
                                color: t.text, fontSize: 11, minWidth: 180, maxWidth: 280,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontWeight: 700, fontSize: 12 }}>
                                        📦 {shelfTooltip.bin?.binCode || `Shelf L${shelfTooltip.level + 1}`}
                                    </span>
                                    <span onClick={() => setShelfTooltip(null)}
                                        style={{ cursor: 'pointer', color: t.textMuted, fontSize: 10, fontWeight: 700 }}>✕</span>
                                </div>
                                {shelfTooltip.bin ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ color: t.textSecondary }}>Items:</span>
                                            <span style={{ fontWeight: 600 }}>{shelfTooltip.bin.currentItemCount}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ color: t.textSecondary }}>Status:</span>
                                            <span style={{ fontWeight: 600, color: shelfTooltip.bin.isOccupied ? '#22c55e' : t.textMuted }}>
                                                {shelfTooltip.bin.isOccupied ? 'Occupied' : 'Empty'}
                                            </span>
                                        </div>
                                        <div style={{
                                            height: 4, borderRadius: 2, marginTop: 6,
                                            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        }}>
                                            <div style={{
                                                height: '100%', borderRadius: 2,
                                                width: `${Math.min((shelfTooltip.bin.currentItemCount / (shelfTooltip.bin.maxWeight || 20)) * 100, 100)}%`,
                                                background: shelfTooltip.bin.currentItemCount / (shelfTooltip.bin.maxWeight || 20) > 0.8 ? '#ef4444'
                                                    : shelfTooltip.bin.currentItemCount / (shelfTooltip.bin.maxWeight || 20) > 0.5 ? '#f59e0b' : '#22c55e',
                                            }} />
                                        </div>
                                        {shelfTooltip.bin.items && shelfTooltip.bin.items.length > 0 && (
                                            <div style={{ marginTop: 8, borderTop: `1px solid ${t.panelBorder}`, paddingTop: 6 }}>
                                                <div style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Items in Bin</div>
                                                {shelfTooltip.bin.items.map((item, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, marginBottom: 3, padding: '2px 4px', borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📦 {item.name}</div>
                                                            {item.sku && <div style={{ fontSize: 8, color: t.textMuted }}>{item.sku}</div>}
                                                        </div>
                                                        <span style={{ fontWeight: 700, color: '#22c55e', marginLeft: 8, whiteSpace: 'nowrap' }}>×{item.qty}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ color: t.textMuted, fontSize: 10 }}>No bin data linked to this shelf. Link inventory bins in build mode.</div>
                                )}
                            </div>
                        )}

                        {/* Item Search Overlay */}
                        <AnimatePresence>
                            {itemSearchOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    style={{
                                        position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
                                        zIndex: 20, width: 380, maxHeight: 420,
                                        background: t.panelBg, backdropFilter: 'blur(16px)',
                                        border: `1px solid ${t.panelBorder}`, borderRadius: 14,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${t.panelBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <SearchOutlined style={{ color: themeColor, fontSize: 14 }} />
                                        <Input
                                            placeholder="Search item name, SKU, or bin code..."
                                            value={itemSearchText}
                                            onChange={e => handleItemSearch(e.target.value)}
                                            allowClear
                                            autoFocus
                                            size="small"
                                            variant="borderless"
                                            style={{ flex: 1, fontSize: 12 }}
                                        />
                                        <CloseCircleOutlined
                                            style={{ color: t.textMuted, cursor: 'pointer', fontSize: 12 }}
                                            onClick={() => { setItemSearchOpen(false); setItemSearchText(''); setItemSearchResults([]); }}
                                        />
                                    </div>
                                    <div style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 8px' }}>
                                        {itemSearchLoading ? (
                                            <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
                                        ) : itemSearchResults.length > 0 ? (
                                            itemSearchResults.map((r, i) => {
                                                const zoneColors: Record<string, string> = { receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b', packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444' };
                                                return (
                                                    <motion.div
                                                        key={`${r.binCode}-${i}`}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.03 }}
                                                        onClick={() => handleLocateItem(r.binCode)}
                                                        style={{
                                                            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                                                            marginBottom: 3, transition: 'all 0.15s',
                                                            background: highlightBin === r.binCode ? `${themeColor}15` : 'transparent',
                                                            border: highlightBin === r.binCode ? `1px solid ${themeColor}30` : '1px solid transparent',
                                                        }}
                                                        whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${zoneColors[r.zoneType] || '#3b82f6'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <InboxOutlined style={{ color: zoneColors[r.zoneType] || '#3b82f6', fontSize: 12 }} />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.itemName}</div>
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                                                                    <Tag style={{ fontSize: 8, borderRadius: 4, margin: 0, padding: '0 4px', lineHeight: '14px', background: `${zoneColors[r.zoneType] || '#3b82f6'}15`, color: zoneColors[r.zoneType] || '#3b82f6', border: 'none' }}>{r.zoneName}</Tag>
                                                                    <Text type="secondary" style={{ fontSize: 9 }}>{r.binCode}</Text>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{r.qty}</div>
                                                                <div style={{ fontSize: 7, color: t.textMuted, textTransform: 'uppercase' }}>qty</div>
                                                            </div>
                                                            <AimOutlined style={{ color: themeColor, fontSize: 12, opacity: 0.6 }} />
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        ) : itemSearchText.length >= 2 ? (
                                            <div style={{ textAlign: 'center', padding: 20, color: t.textMuted, fontSize: 11 }}>
                                                No items found for "{itemSearchText}"
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: 20, color: t.textMuted, fontSize: 11 }}>
                                                Type at least 2 characters to search
                                            </div>
                                        )}
                                    </div>
                                    {highlightBin && (
                                        <div style={{ padding: '8px 12px', borderTop: `1px solid ${t.panelBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <AimOutlined style={{ color: '#22c55e', fontSize: 11 }} />
                                                <Text style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Tracking: {highlightBin}</Text>
                                            </div>
                                            <Button size="small" type="text" danger onClick={() => setHighlightBin(null)} style={{ fontSize: 9, height: 22 }}>Clear</Button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>



                        {/* Item search / highlight - right side (only in view mode, or left aligned if properties panel is open) */}
                        {!buildMode && (
                            <div style={{
                                position: 'absolute', top: 10, right: 10,
                                display: 'flex', gap: 6, borderRadius: 10, overflow: 'hidden', zIndex: 10,
                                alignItems: 'center',
                            }}>
                                {/* Item Search Button */}
                                <Tooltip title="Search & Locate Item in 3D">
                                    <div
                                        onClick={() => setItemSearchOpen(prev => !prev)}
                                        style={{
                                            width: 34, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: 8, cursor: 'pointer',
                                            background: itemSearchOpen ? `${themeColor}30` : t.toolbarBg,
                                            border: `1px solid ${itemSearchOpen ? themeColor + '50' : t.toolbarBorder}`,
                                            backdropFilter: 'blur(8px)',
                                            color: itemSearchOpen ? themeColor : t.textSecondary,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <SearchOutlined style={{ fontSize: 13 }} />
                                    </div>
                                </Tooltip>
                                {/* Clear highlight */}
                                {highlightBin && (
                                    <Tooltip title={`Tracking: ${highlightBin} — click to clear`}>
                                        <div
                                            onClick={() => { setHighlightBin(null); messageApi.info('Beacon cleared'); }}
                                            style={{
                                                padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                                                background: '#22c55e20', border: '1px solid #22c55e40',
                                                backdropFilter: 'blur(8px)',
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                fontSize: 10, fontWeight: 600, color: '#22c55e',
                                                animation: 'pulse 2s infinite',
                                            }}
                                        >
                                            <AimOutlined style={{ fontSize: 11 }} /> {highlightBin}
                                        </div>
                                    </Tooltip>
                                )}
                            </div>
                        )}

                        <div style={{
                            position: 'absolute', bottom: 160, right: 24, // Moved up to prevent overlap with Minimap
                            display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 0, overflow: 'hidden', zIndex: 9,
                            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
                            backdropFilter: 'blur(16px)',
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)"}`,
                            padding: 6,
                            boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(31,38,135,0.1)",
                        }}>
                            {[
                                { key: 'corner' as CameraPreset, label: '🎥', tip: 'Corner' },
                                { key: 'top' as CameraPreset, label: '⬇️', tip: 'Top' },
                                { key: 'front' as CameraPreset, label: '👤', tip: 'Front' },
                                { key: 'iso' as CameraPreset, label: '◆', tip: 'ISO' },
                                { key: 'first-person' as CameraPreset, label: '🚶', tip: 'First-Person (WASD)' },
                                { key: 'cad-2d' as CameraPreset, label: '📐', tip: '2D Blueprint (CAD)' },
                            ].map(cp => (
                                <Tooltip key={cp.key} title={cp.tip}>
                                    <div onClick={() => setCameraPreset(cp.key)}
                                        style={{
                                            width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 11, cursor: 'pointer', borderRadius: 6,
                                            background: cameraPreset === cp.key ? `${themeColor}40` : 'transparent',
                                            color: t.toolbarActive, transition: 'all 0.2s',
                                            border: cameraPreset === cp.key ? `1px solid ${themeColor}60` : '1px solid transparent',
                                        }}>
                                        {cp.label}
                                    </div>
                                </Tooltip>
                            ))}
                            <div style={{ height: 1, width: '100%', background: t.panelBorder, margin: '2px 0' }} />
                            <Tooltip title={`Grid Snap: ${snapIncrement}`}>
                                <div onClick={() => setSnapIncrement(prev => prev === 1.0 ? 0.5 : (prev === 0.5 ? 0.1 : 1.0))}
                                    style={{
                                        width: 36, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 10, fontWeight: 'bold', cursor: 'pointer', borderRadius: 6,
                                        background: buildMode ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: buildMode ? '#3b82f6' : t.toolbarActive,
                                    }}>
                                    ∿ {snapIncrement}
                                </div>
                            </Tooltip>
                            <Tooltip title={rulerMode ? 'Ruler ON — click 2 points' : 'Measure Distance'}>
                                <div onClick={() => { setRulerMode(m => !m); if (rulerMode) setRulerPoints([]); }}
                                    style={{
                                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                        background: rulerMode ? 'rgba(251,191,36,0.25)' : t.cardBg,
                                        color: rulerMode ? '#fbbf24' : t.toolbarText, transition: 'all 0.15s',
                                        border: rulerMode ? '1px solid rgba(251,191,36,0.4)' : '1px solid transparent',
                                    }}>
                                    📏
                                </div>
                            </Tooltip>
                            <Tooltip title="Screenshot (PNG)">
                                <div onClick={() => {
                                    const canvas = document.querySelector('canvas');
                                    if (!canvas) return;
                                    const link = document.createElement('a');
                                    link.download = `warehouse-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
                                    link.href = canvas.toDataURL('image/png');
                                    link.click();
                                    messageApi.success('Screenshot saved!');
                                }}
                                    style={{
                                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                        background: t.cardBg, color: t.toolbarText, transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.color = '#93c5fd'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = t.cardBg; e.currentTarget.style.color = t.toolbarText; }}>
                                    📷
                                </div>
                            </Tooltip>
                            <div style={{ width: 1, background: t.panelBorder, margin: '2px 0' }} />
                            {/* Heatmap Toggle */}
                            <Tooltip title={heatmapMode === 'off' ? 'Enable Heatmap (Capacity)' : heatmapMode === 'capacity' ? 'Heatmap: Activity' : heatmapMode === 'activity' ? 'Heatmap: Temperature' : 'Disable Heatmap'}>
                                <div onClick={() => setHeatmapMode(m => m === 'off' ? 'capacity' : m === 'capacity' ? 'activity' : m === 'activity' ? 'temperature' : 'off')}
                                    style={{
                                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                        background: heatmapMode !== 'off' ? 'rgba(239,68,68,0.2)' : t.cardBg,
                                        color: heatmapMode !== 'off' ? '#ef4444' : t.toolbarText, transition: 'all 0.15s',
                                        border: heatmapMode !== 'off' ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                                    }}
                                    onMouseEnter={e => { if (heatmapMode === 'off') { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; } }}
                                    onMouseLeave={e => { if (heatmapMode === 'off') { e.currentTarget.style.background = t.cardBg; e.currentTarget.style.color = t.toolbarText; } }}>
                                    🔥
                                </div>
                            </Tooltip>
                            {/* Activity Markers Toggle */}
                            <Tooltip title={showActivityMarkers ? 'Hide Activity Markers' : 'Show Activity Markers'}>
                                <div onClick={() => setShowActivityMarkers(v => !v)}
                                    style={{
                                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                        background: showActivityMarkers ? 'rgba(59,130,246,0.2)' : t.cardBg,
                                        color: showActivityMarkers ? '#3b82f6' : t.toolbarText, transition: 'all 0.15s',
                                        border: showActivityMarkers ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                                        position: 'relative',
                                    }}
                                    onMouseEnter={e => { if (!showActivityMarkers) { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.color = '#3b82f6'; } }}
                                    onMouseLeave={e => { if (!showActivityMarkers) { e.currentTarget.style.background = t.cardBg; e.currentTarget.style.color = t.toolbarText; } }}>
                                    👷
                                    {activityMarkers.length > 0 && (
                                        <span style={{
                                            position: 'absolute', top: -4, right: -4, minWidth: 14, height: 14,
                                            borderRadius: 7, background: '#3b82f6', color: '#fff',
                                            fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '0 3px',
                                        }}>{activityMarkers.length}</span>
                                    )}
                                </div>
                            </Tooltip>
                            <div style={{ width: 1, background: t.panelBorder, margin: '2px 0' }} />
                            {/* Timelapse Toggle */}
                            <Tooltip title={timelapseMode ? 'Exit Time-lapse Mode' : 'Historical Time-lapse'}>
                                <div onClick={() => setTimelapseMode(v => !v)}
                                    style={{
                                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                        background: timelapseMode ? 'rgba(168,85,247,0.2)' : t.cardBg,
                                        color: timelapseMode ? '#a855f7' : t.toolbarText, transition: 'all 0.15s',
                                        border: timelapseMode ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                                    }}
                                    onMouseEnter={e => { if (!timelapseMode) { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; e.currentTarget.style.color = '#a855f7'; } }}
                                    onMouseLeave={e => { if (!timelapseMode) { e.currentTarget.style.background = t.cardBg; e.currentTarget.style.color = t.toolbarText; } }}>
                                    ⏱️
                                </div>
                            </Tooltip>
                            <div style={{ width: 1, background: t.panelBorder, margin: '2px 0' }} />
                            <Tooltip title={graphicsQuality === 'high' ? 'Switch to Performance Mode' : 'Switch to High Quality'}>
                                <div onClick={() => setGraphicsQuality(q => q === 'high' ? 'performance' : 'high')}
                                    style={{
                                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                        background: graphicsQuality === 'performance' ? 'rgba(34,197,94,0.2)' : t.cardBg,
                                        color: graphicsQuality === 'performance' ? '#22c55e' : t.toolbarText, transition: 'all 0.15s',
                                        border: graphicsQuality === 'performance' ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                                    }}
                                    onMouseEnter={e => { if (graphicsQuality === 'high') { e.currentTarget.style.background = 'rgba(34,197,94,0.15)'; e.currentTarget.style.color = '#22c55e'; } }}
                                    onMouseLeave={e => { if (graphicsQuality === 'high') { e.currentTarget.style.background = t.cardBg; e.currentTarget.style.color = t.toolbarText; } }}>
                                    {graphicsQuality === 'high' ? '✨' : '⚡'}
                                </div>
                            </Tooltip>
                            <Tooltip title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
                                <div onClick={() => setDarkOverride(prev => prev === null ? !systemDark : !prev)}
                                    style={{
                                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                        background: t.cardBg, color: t.toolbarText, transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; e.currentTarget.style.color = '#fbbf24'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = t.cardBg; e.currentTarget.style.color = t.toolbarText; }}>
                                    {isDark ? '☀️' : '🌙'}
                                </div>
                            </Tooltip>
                        </div>

                        {/* Timelapse Timeline */}
                        {timelapseMode && (
                            <div style={{
                                position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                                width: 400, padding: '12px 20px', borderRadius: 12,
                                background: t.panelBg, backdropFilter: 'blur(12px)', border: `1px solid ${t.panelBorder}`,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: t.text, fontSize: 12, fontWeight: 600 }}>
                                    <span>Historical Playback</span>
                                    <span>{String(Math.floor(timelapseHour)).padStart(2, '0')}:{String(Math.floor((timelapseHour % 1) * 60)).padStart(2, '0')}</span>
                                </div>
                                <input type="range" min="0" max="23.99" step="0.25" value={timelapseHour}
                                    onChange={(e) => setTimelapseHour(parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                                />
                            </div>
                        )}

                        {/* Ruler info bar */}
                        {rulerMode && (
                            <div style={{
                                position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                                padding: '6px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
                                background: 'rgba(251,191,36,0.15)', backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 11, fontWeight: 600,
                            }}>
                                <span>📏 Ruler Mode</span>
                                {rulerPoints.length === 0 && <span style={{ color: t.textSecondary }}>Click first point on the floor</span>}
                                {rulerPoints.length === 1 && <span style={{ color: t.textSecondary }}>Click second point to measure</span>}
                                {rulerPoints.length >= 2 && (() => {
                                    const d = Math.sqrt((rulerPoints[1][0] - rulerPoints[0][0]) ** 2 + (rulerPoints[1][1] - rulerPoints[0][1]) ** 2);
                                    return <span style={{ color: t.text, fontSize: 13 }}>Distance: <strong>{d.toFixed(2)} m</strong> ({(d * 3.281).toFixed(2)} ft)</span>;
                                })()}
                                <span onClick={() => setRulerPoints([])}
                                    style={{ cursor: 'pointer', marginLeft: 6, color: t.textMuted, fontSize: 10 }}>Clear</span>
                                <span onClick={() => { setRulerMode(false); setRulerPoints([]); }}
                                    style={{ cursor: 'pointer', color: '#ef4444', fontSize: 10, fontWeight: 700 }}>✕</span>
                            </div>
                        )}

                        {/* Mini-map */}
                        <div style={{
                            position: 'absolute', bottom: 28, right: 24, zIndex: 5,
                            width: 120, height: 120, borderRadius: 0,
                            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
                            backdropFilter: 'blur(16px)',
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)"}`,
                            boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(31,38,135,0.1)",
                            overflow: 'hidden', padding: 5,
                        }}>
                            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 6, overflow: 'hidden' }}>
                                {/* Grid pattern background */}
                                <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px)`, backgroundSize: `${120 / 6}px ${120 / 6}px` }} />
                                {objects.map(obj => {
                                    const scale = 120 / GRID_CELLS;
                                    const ZONE_CLR: Record<string, string> = {
                                        receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
                                        packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
                                    };
                                    const c = obj.color || ZONE_CLR[obj.zoneType || ''] || (obj.type === 'rack' ? '#e87722' : '#888');
                                    const isSel = obj.id === selectedId;
                                    return (
                                        <div key={obj.id} style={{
                                            position: 'absolute',
                                            left: obj.x * scale, top: obj.z * scale,
                                            width: Math.max((obj.width || 1) * scale, 2),
                                            height: Math.max((obj.depth || 1) * scale, 2),
                                            background: c, opacity: obj.type === 'zone' ? 0.3 : 0.85,
                                            borderRadius: 1, border: isSel ? `1.5px solid ${t.text}` : 'none',
                                            boxShadow: isSel ? `0 0 6px ${c}` : 'none',
                                            transition: 'box-shadow 0.3s',
                                        }} />
                                    );
                                })}
                            </div>
                            <div style={{ position: 'absolute', bottom: 2, left: 6, color: t.textFaint, fontSize: 7, fontWeight: 600, letterSpacing: 1 }}>MINIMAP</div>
                        </div>

                        {/* Cross-Navigation Bar — appears when a zone or rack is selected */}
                        {selectedObj && !buildMode && (selectedObj.type === 'zone' || selectedObj.type === 'rack') && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 12,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', borderRadius: 12,
                                    background: t.statsBarBg, backdropFilter: 'blur(12px)',
                                    border: `1px solid ${t.statsBarBorder}`,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 8, borderRight: `1px solid ${t.panelBorder}` }}>
                                    <span style={{ fontSize: 14 }}>{selectedObj.type === 'zone' ? '🏗️' : '📦'}</span>
                                    <span style={{ color: t.text, fontSize: 11, fontWeight: 700 }}>{selectedObj.label || selectedObj.type}</span>
                                </div>
                                {[
                                    { icon: '📋', label: 'Location Browser', onClick: () => navToLocationBrowser(
                                        selectedObj.type === 'rack' ? (selectedObj.row && selectedObj.bay ? `${selectedObj.row}-${String(selectedObj.bay).padStart(2, '0')}` : undefined) : undefined,
                                        selectedObj.type === 'zone' ? (selectedObj.label || undefined) : undefined
                                    )},
                                    { icon: '🔍', label: 'Item Locator', onClick: () => navToItemLocator(
                                        selectedObj.type === 'rack' ? (selectedObj.row && selectedObj.bay ? `${selectedObj.row}-${String(selectedObj.bay).padStart(2, '0')}` : undefined) : undefined,
                                        selectedObj.type === 'zone' ? (selectedObj.label || undefined) : undefined
                                    )},
                                    { icon: '🌡️', label: 'Heatmap', onClick: navToHeatmap },
                                ].map(nav => (
                                    <div key={nav.label}
                                        onClick={nav.onClick}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                                            background: t.cardBg, border: `1px solid ${t.panelBorder}`,
                                            color: t.text, fontSize: 10, fontWeight: 600,
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = `${themeColor}20`; e.currentTarget.style.borderColor = themeColor; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = t.cardBg; e.currentTarget.style.borderColor = t.panelBorder; }}
                                    >
                                        <span style={{ fontSize: 12 }}>{nav.icon}</span>
                                        {nav.label}
                                    </div>
                                ))}
                            </motion.div>
                        )}


                        {/* Loading overlay when switching warehouse */}
                        {loadingWarehouse && (
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 20,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isDark ? 'rgba(8,8,20,0.85)' : 'rgba(200,210,220,0.85)',
                                backdropFilter: 'blur(6px)',
                            }}>
                                <div style={{ textAlign: 'center', color: t.text }}>
                                    <Spin size="large" />
                                    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600 }}>Loading warehouse layout...</div>
                                    <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>
                                        {selectedWarehouseId ? warehouses.find(w => w.id === selectedWarehouseId)?.name || '' : ''}
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Welcome overlay when empty */}
                        {objects.length === 0 && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: t.welcomeBg, pointerEvents: 'none',
                            }}>
                                <div style={{ textAlign: 'center', color: t.text }}>
                                    <div style={{ fontSize: 48, marginBottom: 8 }}>🏗️</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Welcome to Warehouse Builder</div>
                                    <div style={{ fontSize: 11, color: t.textMuted }}>
                                        Switch to <b>Build</b> mode and select an object to start placing
                                    </div>
                                    <div style={{ fontSize: 10, color: t.textFaint, marginTop: 8 }}>
                                        Or load a template from the toolbar above
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Keyboard Shortcuts Help Overlay */}
                        {showHelp && (
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 50,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: t.overlayBg, backdropFilter: 'blur(6px)',
                            }} onClick={() => setShowHelp(false)}>
                                <div style={{
                                    background: t.panelBg, borderRadius: 16,
                                    border: `1px solid ${t.panelBorder}`, padding: '20px 24px',
                                    maxWidth: 420, width: '90%', color: t.text,
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                                }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ fontSize: 16, fontWeight: 800 }}>⌨️ Keyboard Shortcuts</div>
                                        <span onClick={() => setShowHelp(false)} style={{ cursor: 'pointer', color: t.textMuted, fontSize: 16 }}>✕</span>
                                    </div>
                                    <div style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>BUILD MODE</div>
                                    {[
                                        ['R', 'Rotate selected object'],
                                        ['D', 'Duplicate selected object'],
                                        ['Del / ⌫', 'Delete selected object'],
                                        ['Esc', 'Deselect / cancel placement'],
                                        ['Arrow Keys', 'Move selected object(s) by 1 unit'],
                                        ['Ctrl+Z', 'Undo last action'],
                                        ['Ctrl+Y', 'Redo last action'],
                                        ['Shift+Click', 'Multi-select objects'],
                                        ['Ctrl+A', 'Select all objects'],
                                        ['Ctrl+C', 'Copy selected'],
                                        ['Ctrl+V', 'Paste copied objects'],
                                    ].map(([key, desc]) => (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${t.cardBg}` }}>
                                            <span style={{ color: t.textSecondary, fontSize: 11 }}>{desc}</span>
                                            <kbd style={{
                                                background: t.kbdBg, border: `1px solid ${t.kbdBorder}`,
                                                borderRadius: 4, padding: '1px 8px', fontSize: 10, fontFamily: 'monospace',
                                                color: t.kbdText, fontWeight: 600,
                                            }}>{key}</kbd>
                                        </div>
                                    ))}
                                    <div style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 8 }}>GENERAL</div>
                                    {[
                                        ['?', 'Toggle this help overlay'],
                                        ['P', 'Screenshot (download PNG)'],
                                        ['Mouse Drag', 'Orbit camera'],
                                        ['Scroll', 'Zoom in/out'],
                                        ['Right Drag', 'Pan camera'],
                                    ].map(([key, desc]) => (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${t.cardBg}` }}>
                                            <span style={{ color: t.textSecondary, fontSize: 11 }}>{desc}</span>
                                            <kbd style={{
                                                background: t.kbdBg, border: `1px solid ${t.kbdBorder}`,
                                                borderRadius: 4, padding: '1px 8px', fontSize: 10, fontFamily: 'monospace',
                                                color: t.kbdText, fontWeight: 600,
                                            }}>{key}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bottom Stats Bar */}
                        {objects.length > 0 && (
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                padding: '4px 12px', display: 'flex', gap: 12, alignItems: 'center',
                                background: t.statsBarBg, backdropFilter: 'blur(4px)',
                                borderTop: `1px solid ${t.statsBarBorder}`,
                                fontSize: 9, color: t.textMuted, fontFamily: 'monospace',
                                borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                            }}>
                                {[
                                    { icon: '📦', label: 'Zones', count: analytics.zones.length },
                                    { icon: '🗄️', label: 'Racks', count: analytics.racks.length },
                                    { icon: '🔧', label: 'Equipment', count: analytics.equipment.length },
                                    { icon: '🧱', label: 'Total', count: objects.length },
                                ].map(s => (
                                    <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                        {s.icon} <span style={{ color: t.statsLabel }}>{s.label}</span> <span style={{ color: t.statsValue, fontWeight: 700 }}>{s.count}</span>
                                    </span>
                                ))}
                                {selectedIds.size > 0 && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                                        <span style={{ color: '#93c5fd', fontWeight: 700 }}>{selectedIds.size}</span>
                                        <span style={{ color: '#60a5fa', fontSize: 8 }}>selected</span>
                                    </span>
                                )}
                                {/* Stock Alert Summary */}
                                {stockAlerts.size > 0 && (() => {
                                    const low = [...stockAlerts.values()].filter(v => v === 'low').length;
                                    const over = [...stockAlerts.values()].filter(v => v === 'overstock').length;
                                    const empty = [...stockAlerts.values()].filter(v => v === 'empty').length;
                                    return (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {low > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 8, color: '#f59e0b', fontWeight: 700 }}>⚠️ {low} low</span>}
                                            {over > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 8, color: '#ef4444', fontWeight: 700 }}>🔴 {over} full</span>}
                                            {empty > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '1px 5px', borderRadius: 3, background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.3)', fontSize: 8, color: '#94a3b8', fontWeight: 700 }}>○ {empty} empty</span>}
                                        </span>
                                    );
                                })()}
                                {/* Heatmap mode indicator */}
                                {heatmapMode !== 'off' && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                        <span style={{ fontSize: 8, color: '#ef4444', fontWeight: 700 }}>🔥 {heatmapMode}</span>
                                    </span>
                                )}
                                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: t.textFaint, fontSize: 8 }}>Scroll·Orbit·Right-Pan</span>
                                    <span style={{ color: t.panelBorder }}>│</span>
                                    <span style={{ color: t.statsLabel }}>Score</span>
                                    <span style={{ color: analytics.efficiencyScore > 70 ? '#22c55e' : analytics.efficiencyScore > 40 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{analytics.efficiencyScore}</span>
                                    {buildMode && objects.length > 0 && (
                                        <>
                                            <span style={{ color: t.panelBorder }}>│</span>
                                            <Popconfirm title="Regenerate 3D layout from inventory data? This replaces the current layout." onConfirm={handleRegenerateLayout}>
                                                <span style={{ color: '#3b82f6', fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>🔄 Regenerate</span>
                                            </Popconfirm>
                                            <Popconfirm title="Reset to default layout?" onConfirm={handleReset}>
                                                <span style={{ color: '#ef4444', fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>✕ Reset</span>
                                            </Popconfirm>
                                        </>
                                    )}
                                </span>
                                <span onClick={() => setShowHelp(true)} style={{ cursor: 'pointer', color: t.textFaint, fontSize: 10, fontWeight: 700, padding: '0 4px', borderRadius: 0, border: `1px solid ${t.toolbarBorder}` }}>?</span>
                            </div>
                        )}

                        {/* View Mode Analytics Overlay */}
                        {!buildMode && (
                            <div style={{
                                position: 'absolute', top: 24, left: 24, zIndex: 8,
                                padding: 16, borderRadius: 0,
                                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
                                backdropFilter: 'blur(16px)',
                                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)"}`,
                                boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(31,38,135,0.1)",
                                color: t.text, fontSize: 11, width: 240,
                                maxHeight: 'calc(100% - 120px)',
                                overflowY: 'auto',
                            }}>
                                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <BarChartOutlined /> Layout Analytics
                                </div>

                                {/* Efficiency Score Gauge */}
                                {objects.length > 0 && (
                                    <div style={{
                                        padding: '8px 10px', borderRadius: 8, marginBottom: 8,
                                        background: `linear-gradient(135deg, ${analytics.efficiencyScore > 70 ? 'rgba(34,197,94,0.1)' : analytics.efficiencyScore > 40 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'}, transparent)`,
                                        border: `1px solid ${analytics.efficiencyScore > 70 ? 'rgba(34,197,94,0.2)' : analytics.efficiencyScore > 40 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{ fontSize: 8, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>EFFICIENCY</span>
                                            <span style={{
                                                fontSize: 18, fontWeight: 900,
                                                color: analytics.efficiencyScore > 70 ? '#22c55e' : analytics.efficiencyScore > 40 ? '#f59e0b' : '#ef4444',
                                            }}>{analytics.efficiencyScore}</span>
                                        </div>
                                        <div style={{ height: 4, borderRadius: 2, background: t.inputBg, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 2,
                                                width: `${analytics.efficiencyScore}%`,
                                                background: `linear-gradient(90deg, ${analytics.efficiencyScore > 70 ? '#22c55e' : analytics.efficiencyScore > 40 ? '#f59e0b' : '#ef4444'}, ${analytics.efficiencyScore > 70 ? '#86efac' : analytics.efficiencyScore > 40 ? '#fbbf24' : '#fca5a5'})`,
                                                transition: 'width 0.8s ease',
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                            {[{l:'Walk',v:30},{l:'Cover',v:25},{l:'Aisle',v:25},{l:'Zones',v:20}].map(f => (
                                                <span key={f.l} style={{ fontSize: 6.5, color: t.textFaint }}>{f.l} {f.v}%</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ color: t.textSecondary }}>Floor coverage</span>
                                    <span style={{ color: analytics.utilization > 60 ? '#22c55e' : analytics.utilization > 30 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                                        {analytics.utilization}%
                                    </span>
                                </div>
                                <div style={{
                                    height: 4, borderRadius: 2, background: t.inputBg, marginBottom: 8,
                                }}>
                                    <div style={{
                                        height: '100%', borderRadius: 2, width: `${Math.min(analytics.utilization, 100)}%`,
                                        background: analytics.utilization > 60 ? '#22c55e' : analytics.utilization > 30 ? '#f59e0b' : '#ef4444',
                                        transition: 'width 0.5s',
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <span style={{ color: t.textSecondary }}>Zone area</span>
                                    <span>{analytics.totalZoneArea} sq units</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <span style={{ color: t.textSecondary }}>Rack slots</span>
                                    <span style={{ color: '#e87722' }}>{analytics.totalRackSlots}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ color: t.textSecondary }}>Equipment</span>
                                    <span>{analytics.equipment.length}</span>
                                </div>
                                {analytics.zoneBreakdown.length > 0 && (
                                    <>
                                        <div style={{ borderTop: `1px solid ${t.panelBorder}`, paddingTop: 6, marginTop: 2, fontWeight: 600, fontSize: 9, color: t.textSecondary, marginBottom: 4 }}>ZONES</div>
                                        {analytics.zoneBreakdown.map(z => (
                                            <div key={z.value} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: 2, background: z.color, display: 'inline-block' }} />
                                                    {z.label.split(' ').slice(1).join(' ')}
                                                </span>
                                                <span style={{ color: t.textSecondary }}>{z.count} ({z.area}sq)</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Walkability & Grid Stats */}
                                <div style={{ borderTop: `1px solid ${t.panelBorder}`, paddingTop: 6, marginTop: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 9, color: t.textSecondary, marginBottom: 4 }}>PATHFINDING GRID</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <span style={{ color: t.textSecondary }}>Walkability</span>
                                        <span style={{ color: analytics.walkability > 70 ? '#22c55e' : analytics.walkability > 40 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                                            {analytics.walkability}%
                                        </span>
                                    </div>
                                    <div style={{
                                        height: 3, borderRadius: 2, background: t.inputBg, marginBottom: 6,
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: 2,
                                            width: `${Math.min(analytics.walkability, 100)}%`,
                                            background: analytics.walkability > 70 ? '#22c55e' : analytics.walkability > 40 ? '#f59e0b' : '#ef4444',
                                            transition: 'width 0.5s',
                                        }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, fontSize: 9, marginBottom: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <span style={{ width: 5, height: 5, borderRadius: 1, background: '#ef4444', display: 'inline-block' }} />
                                            <span style={{ color: t.textSecondary }}>Obstacles</span>
                                            <span style={{ color: t.statsValue, fontWeight: 600, marginLeft: 'auto' }}>{analytics.obstacles}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <span style={{ width: 5, height: 5, borderRadius: 1, background: '#22c55e', display: 'inline-block' }} />
                                            <span style={{ color: t.textSecondary }}>Aisles</span>
                                            <span style={{ color: t.statsValue, fontWeight: 600, marginLeft: 'auto' }}>{analytics.aisles}</span>
                                        </div>
                                    </div>

                                    {/* Mini occupancy grid */}
                                    {analytics.gridColors.length > 0 && (
                                        <div style={{ marginTop: 2 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                                <div style={{ fontWeight: 600, fontSize: 8, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>OCCUPANCY MAP</div>
                                                <div onClick={() => setShowGridOverlay(!showGridOverlay)}
                                                    style={{
                                                        padding: '1px 5px', borderRadius: 3, cursor: 'pointer', fontSize: 7, fontWeight: 700,
                                                        background: showGridOverlay ? 'rgba(34,197,94,0.15)' : t.cardBg,
                                                        color: showGridOverlay ? '#86efac' : t.textMuted,
                                                        border: `1px solid ${showGridOverlay ? 'rgba(34,197,94,0.3)' : t.panelBorder}`,
                                                        transition: 'all 0.2s',
                                                    }}>
                                                    {showGridOverlay ? '🗺️ 3D ON' : '3D'}
                                                </div>
                                            </div>
                                            <div style={{
                                                width: '100%', aspectRatio: '1', borderRadius: 4, overflow: 'hidden',
                                                border: `1px solid ${t.panelBorder}`,
                                                display: 'grid',
                                                gridTemplateColumns: `repeat(${GRID_CELLS}, 1fr)`,
                                                gridTemplateRows: `repeat(${GRID_CELLS}, 1fr)`,
                                                gap: 0,
                                            }}>
                                                {analytics.gridColors.flatMap((row: string[], gz: number) =>
                                                    row.map((color: string, gx: number) => (
                                                        <div key={`${gz}-${gx}`} style={{ background: color, opacity: color === '#1a1a2e' ? 0.3 : 0.75 }} />
                                                    ))
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 4, justifyContent: 'center' }}>
                                                {[{c:'#ef4444',l:'Obstacle'},{c:'#3b82f6',l:'Zone'},{c:'#22c55e',l:'Aisle'},{c:'#1a1a2e',l:'Empty'}].map(x => (
                                                    <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 7, color: t.textMuted }}>
                                                        <span style={{ width: 5, height: 5, borderRadius: 1, background: x.c, display: 'inline-block', opacity: x.c === '#1a1a2e' ? 0.5 : 0.75 }} />
                                                        {x.l}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* WMS Activity Feed */}
                                <div style={{ borderTop: `1px solid ${t.panelBorder}`, paddingTop: 6, marginTop: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 9, color: t.textSecondary, marginBottom: 4 }}>WMS ACTIVITY</div>
                                    <WmsActivityFeed isDark={isDark} t={t} />
                                </div>
                            </div>
                        )}

                        {/* ═══ AI Route Planner Panel (View Mode) ═══ */}
                        {!buildMode && (
                            <div style={{
                                position: 'absolute', bottom: 28, left: 24, zIndex: 6,
                                borderRadius: 0,
                                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
                                backdropFilter: 'blur(16px)',
                                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.6)"}`,
                                boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 8px 32px rgba(31,38,135,0.1)",
                                color: t.text, fontSize: 10,
                                overflow: 'hidden',
                                width: routePlannerOpen ? 260 : 'auto',
                                transition: 'width 0.3s ease',
                            }}>
                                {/* Toggle header */}
                                <div
                                    onClick={() => setRoutePlannerOpen(!routePlannerOpen)}
                                    style={{
                                        padding: '8px 12px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        borderBottom: routePlannerOpen ? `1px solid ${t.panelBorder}` : 'none',
                                        background: routes.length > 0 ? 'rgba(139,92,246,0.15)' : 'transparent',
                                    }}
                                >
                                    <div style={{
                                        width: 22, height: 22, borderRadius: 6,
                                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                                    }}>🧭</div>
                                    <span style={{ fontWeight: 700, fontSize: 11 }}>AI Route Planner</span>
                                    {routes.length > 0 && (
                                        <span style={{
                                            padding: '1px 6px', borderRadius: 8,
                                            background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.4)',
                                            fontSize: 8, fontWeight: 700, color: '#c4b5fd',
                                        }}>{routes.length} active</span>
                                    )}
                                    <span style={{ marginLeft: 'auto', color: t.textMuted, fontSize: 10 }}>{routePlannerOpen ? '▼' : '▶'}</span>
                                </div>

                                {/* Expanded panel */}
                                {routePlannerOpen && (
                                    <div style={{ padding: 10 }}>
                                        {/* Tab switcher */}
                                        <div style={{ display: 'flex', gap: 2, marginBottom: 8, borderRadius: 6, overflow: 'hidden', border: `1px solid ${t.panelBorder}` }}>
                                            {(['quick', 'custom'] as const).map(tab => (
                                                <div key={tab} onClick={() => setRouteTab(tab)}
                                                    style={{
                                                        flex: 1, padding: '5px 0', textAlign: 'center', cursor: 'pointer',
                                                        background: routeTab === tab ? 'rgba(139,92,246,0.2)' : t.cardBg,
                                                        color: routeTab === tab ? '#c4b5fd' : t.textMuted,
                                                        fontWeight: 700, fontSize: 9, transition: 'all 0.2s',
                                                    }}>
                                                    {tab === 'quick' ? '⚡ Quick' : '✏️ Custom'}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Preset routes (Quick tab) */}
                                        {routeTab === 'quick' && (<>
                                        <div style={{ marginBottom: 8 }}>
                                            <div style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>QUICK ROUTES</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                {PRESET_ROUTES.map(pr => {
                                                    const hasZones = (() => {
                                                        switch (pr.type) {
                                                            case 'inbound': return getZonesByType(objects, 'receiving').length > 0 && getZonesByType(objects, 'storage').length > 0;
                                                            case 'pick': return getZonesByType(objects, 'storage').length > 0 && getZonesByType(objects, 'picking').length > 0;
                                                            case 'outbound': return (getZonesByType(objects, 'picking').length > 0 || getZonesByType(objects, 'packing').length > 0) && getZonesByType(objects, 'shipping').length > 0;
                                                            case 'fullFlow': return getZonesByType(objects, 'receiving').length > 0 && getZonesByType(objects, 'shipping').length > 0;
                                                            default: return false;
                                                        }
                                                    })();
                                                    return (
                                                        <div key={pr.type}
                                                            onClick={() => {
                                                                if (!hasZones) return;
                                                                const route = computePresetRoute(objects, pr.type);
                                                                if (route) {
                                                                    setRoutes(prev => [...prev.filter(r => r.name !== route.name), route]);
                                                                    setShowRoutes(true);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '6px 10px', borderRadius: 8, cursor: hasZones ? 'pointer' : 'not-allowed',
                                                                display: 'flex', alignItems: 'center', gap: 8,
                                                            background: hasZones ? t.cardBg : t.inputBg,
                                                                border: `1px solid ${hasZones ? t.panelBorder : 'transparent'}`,
                                                                opacity: hasZones ? 1 : 0.4,
                                                                transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={e => hasZones && (e.currentTarget.style.background = `${pr.color}15`)}
                                                            onMouseLeave={e => (e.currentTarget.style.background = hasZones ? t.cardBg : t.inputBg)}
                                                        >
                                                            <span style={{ fontSize: 14 }}>{pr.icon}</span>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 700, fontSize: 10, color: hasZones ? t.text : t.textMuted }}>{pr.label}</div>
                                                                <div style={{ fontSize: 8, color: t.textMuted }}>{pr.description}</div>
                                                            </div>
                                                            <div style={{ width: 6, height: 6, borderRadius: 6, background: pr.color, opacity: 0.6 }} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        </>)}

                                        {/* Custom Route Builder tab */}
                                        {routeTab === 'custom' && (
                                            <div>
                                                {/* Zone picker */}
                                                <div style={{ marginBottom: 8 }}>
                                                    <div style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>ADD ZONES TO ROUTE</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                        {getAllZonesAsStops(objects).map((zone, i) => {
                                                            const alreadyAdded = customStops.some(s => s.label === zone.label && s.x === zone.x && s.z === zone.z);
                                                            return (
                                                                <div key={`z-${i}`}
                                                                    onClick={() => !alreadyAdded && setCustomStops(prev => [...prev, zone])}
                                                                    style={{
                                                                        padding: '3px 8px', borderRadius: 6, cursor: alreadyAdded ? 'default' : 'pointer',
                                                                        background: alreadyAdded ? `${zone.color}20` : t.cardBg,
                                                                        border: `1px solid ${alreadyAdded ? zone.color + '40' : t.panelBorder}`,
                                                                        color: alreadyAdded ? zone.color : t.textSecondary,
                                                                        fontSize: 8, fontWeight: 600, opacity: alreadyAdded ? 0.6 : 1,
                                                                        transition: 'all 0.15s',
                                                                    }}
                                                                    onMouseEnter={e => !alreadyAdded && (e.currentTarget.style.background = `${zone.color}15`)}
                                                                    onMouseLeave={e => !alreadyAdded && (e.currentTarget.style.background = t.cardBg)}
                                                                >
                                                                    <span style={{ width: 6, height: 6, borderRadius: 3, background: zone.color, display: 'inline-block', marginRight: 4 }} />
                                                                    {zone.label}
                                                                    {alreadyAdded && ' ✓'}
                                                                </div>
                                                            );
                                                        })}
                                                        {getAllZonesAsStops(objects).length === 0 && (
                                                            <div style={{ color: t.textMuted, fontSize: 8, fontStyle: 'italic', padding: 4 }}>No zones placed. Add zones in Build Mode first.</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Stop order */}
                                                {customStops.length > 0 && (
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                            <div style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>STOP ORDER ({customStops.length})</div>
                                                            <div style={{ display: 'flex', gap: 3 }}>
                                                                {customStops.length >= 3 && (
                                                                    <div onClick={() => setCustomStops(optimizeStopOrder(customStops))}
                                                                        style={{ padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 7, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' }}>
                                                                        ⚡ Optimize
                                                                    </div>
                                                                )}
                                                                <div onClick={() => setCustomStops([])}
                                                                    style={{ padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 7, fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                                    ✕ Clear
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            {customStops.map((stop, i) => (
                                                                <div key={`cs-${i}`} style={{
                                                                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6,
                                                                    background: t.cardBg, border: `1px solid ${t.panelBorder}`,
                                                                }}>
                                                                    <span style={{
                                                                        width: 16, height: 16, borderRadius: 8, fontSize: 8, fontWeight: 900,
                                                                        background: `${stop.color}30`, color: stop.color, display: 'flex',
                                                                        alignItems: 'center', justifyContent: 'center',
                                                                    }}>{i + 1}</span>
                                                                    <span style={{ flex: 1, fontSize: 9, fontWeight: 600, color: t.text }}>{stop.label}</span>
                                                                    <div style={{ display: 'flex', gap: 2 }}>
                                                                        {i > 0 && (
                                                                            <span onClick={() => { const n = [...customStops]; [n[i-1], n[i]] = [n[i], n[i-1]]; setCustomStops(n); }}
                                                                                style={{ cursor: 'pointer', color: t.textMuted, fontSize: 9, padding: '0 2px' }}>▲</span>
                                                                        )}
                                                                        {i < customStops.length - 1 && (
                                                                            <span onClick={() => { const n = [...customStops]; [n[i], n[i+1]] = [n[i+1], n[i]]; setCustomStops(n); }}
                                                                                style={{ cursor: 'pointer', color: t.textMuted, fontSize: 9, padding: '0 2px' }}>▼</span>
                                                                        )}
                                                                        <span onClick={() => setCustomStops(prev => prev.filter((_, j) => j !== i))}
                                                                            style={{ cursor: 'pointer', color: '#ef4444', fontSize: 9, padding: '0 2px' }}>✕</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Compute button */}
                                                {customStops.length >= 2 && (
                                                    <div
                                                        onClick={() => {
                                                            const colorIdx = routes.length % CUSTOM_COLORS.length;
                                                            const route = computeRoute(objects, customStops, `✏️ ${customRouteName}`, CUSTOM_COLORS[colorIdx]);
                                                            if (route) {
                                                                setRoutes(prev => [...prev, route]);
                                                                setShowRoutes(true);
                                                                setCustomStops([]);
                                                                messageApi.success('Custom route computed!');
                                                            } else {
                                                                messageApi.error('Could not compute route — check for blocked paths');
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '7px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                                                            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.3))',
                                                            border: '1px solid rgba(139,92,246,0.4)',
                                                            color: '#c4b5fd', fontWeight: 700, fontSize: 10,
                                                            transition: 'all 0.2s',
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.45), rgba(99,102,241,0.45))'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.3))'}
                                                    >
                                                        🧭 Compute Route ({customStops.length} stops)
                                                    </div>
                                                )}
                                                {customStops.length < 2 && customStops.length > 0 && (
                                                    <div style={{ color: t.textMuted, fontSize: 8, fontStyle: 'italic', textAlign: 'center', padding: 4 }}>Add at least 2 zones to compute a route</div>
                                                )}
                                            </div>
                                        )}

                                        {/* Controls */}
                                        {routes.length > 0 && (
                                            <>
                                                <div style={{ borderTop: `1px solid ${t.panelBorder}`, paddingTop: 8, marginTop: 4 }}>
                                                    <div style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>CONTROLS</div>
                                                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                                        <div onClick={() => setShowRoutes(!showRoutes)}
                                                            style={{
                                                                flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                                                                background: showRoutes ? 'rgba(34,197,94,0.15)' : t.cardBg,
                                                                border: `1px solid ${showRoutes ? 'rgba(34,197,94,0.3)' : t.panelBorder}`,
                                                                color: showRoutes ? '#86efac' : t.textMuted, fontWeight: 600, fontSize: 9,
                                                            }}>
                                                            {showRoutes ? '👁️ Visible' : '🚫 Hidden'}
                                                        </div>
                                                        <div onClick={() => setAnimateRoutes(!animateRoutes)}
                                                            style={{
                                                                flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                                                                background: animateRoutes ? 'rgba(59,130,246,0.15)' : t.cardBg,
                                                                border: `1px solid ${animateRoutes ? 'rgba(59,130,246,0.3)' : t.panelBorder}`,
                                                                color: animateRoutes ? '#93c5fd' : t.textMuted, fontWeight: 600, fontSize: 9,
                                                            }}>
                                                            {animateRoutes ? '📦 Animate' : '⏸ Paused'}
                                                        </div>
                                                        <div onClick={() => setShowTraffic(!showTraffic)}
                                                            style={{
                                                                flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                                                                background: showTraffic ? 'rgba(239,68,68,0.15)' : t.cardBg,
                                                                border: `1px solid ${showTraffic ? 'rgba(239,68,68,0.3)' : t.panelBorder}`,
                                                                color: showTraffic ? '#fca5a5' : t.textMuted, fontWeight: 600, fontSize: 9,
                                                            }}>
                                                            {showTraffic ? '🔥 Traffic On' : 'Traffic Off'}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 3 }}>
                                                        <div onClick={() => {
                                                            const data = routes.map(r => ({
                                                                name: r.name, color: r.color,
                                                                stops: r.stops.map(s => ({ label: s.label, x: s.x, z: s.z, zoneType: s.zoneType })),
                                                                metrics: r.metrics,
                                                                pathLength: r.fullPath.length,
                                                            }));
                                                            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                                                            messageApi.success('Routes copied to clipboard!');
                                                        }}
                                                            style={{
                                                                flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                                                                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                                                                color: '#93c5fd', fontWeight: 600, fontSize: 9,
                                                            }}>
                                                            📋 Export
                                                        </div>
                                                        <div onClick={() => setRoutes([])}
                                                            style={{
                                                                flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                                                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                                                color: '#fca5a5', fontWeight: 600, fontSize: 9,
                                                            }}>
                                                            ✕ Clear All
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Active route metrics */}
                                                <div style={{ borderTop: `1px solid ${t.panelBorder}`, paddingTop: 8, marginTop: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                        <div style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>ACTIVE ROUTES ({routes.length})</div>
                                                    </div>

                                                    {/* Comparison summary bar (2+ routes) */}
                                                    {routes.length >= 2 && (
                                                        <div style={{
                                                            padding: '6px 8px', borderRadius: 8, marginBottom: 6,
                                                            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
                                                        }}>
                                                            <div style={{ color: '#8b5cf6', fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>📊 COMPARISON</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                                                                <div>
                                                                    <div style={{ color: t.textMuted, fontSize: 6.5, fontWeight: 600 }}>SHORTEST</div>
                                                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#86efac' }}>
                                                                        {Math.min(...routes.map(r => r.metrics.totalDistance)).toFixed(1)}u
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: t.textMuted, fontSize: 6.5, fontWeight: 600 }}>LONGEST</div>
                                                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#fca5a5' }}>
                                                                        {Math.max(...routes.map(r => r.metrics.totalDistance)).toFixed(1)}u
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: t.textMuted, fontSize: 6.5, fontWeight: 600 }}>AVG TIME</div>
                                                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#93c5fd' }}>
                                                                        {(routes.reduce((s, r) => s + r.metrics.totalDistance, 0) / routes.length / 2.2).toFixed(0)}s
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {routes.map(route => {
                                                        const isShortest = routes.length >= 2 && route.metrics.totalDistance === Math.min(...routes.map(r => r.metrics.totalDistance));
                                                        return (
                                                        <div key={route.id} style={{
                                                            padding: '6px 8px', borderRadius: 8, marginBottom: 4,
                                                            background: `${route.color}10`, border: `1px solid ${route.color}25`,
                                                            position: 'relative',
                                                        }}>
                                                            {/* Route header with controls */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <span style={{ width: 8, height: 8, borderRadius: 4, background: route.color, display: 'inline-block', boxShadow: `0 0 6px ${route.color}60` }} />
                                                                    <span style={{ fontWeight: 700, fontSize: 10, color: route.color }}>{route.name}</span>
                                                                    {isShortest && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: 'rgba(34,197,94,0.15)', color: '#86efac', fontWeight: 700 }}>BEST</span>}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                                    {/* Reverse route */}
                                                                    <span title="Reverse route" onClick={() => {
                                                                        const reversed = computeRoute(objects, [...route.stops].reverse(), route.name + ' ⇄', route.color);
                                                                        if (reversed) setRoutes(prev => prev.map(r => r.id === route.id ? reversed : r));
                                                                    }} style={{ cursor: 'pointer', color: t.textMuted, fontSize: 10, transition: 'color 0.15s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = t.textSecondary}
                                                                    onMouseLeave={e => e.currentTarget.style.color = t.textMuted}>⇄</span>
                                                                    {/* Delete route */}
                                                                    <span onClick={() => setRoutes(prev => prev.filter(r => r.id !== route.id))}
                                                                        style={{ cursor: 'pointer', color: t.textMuted, fontSize: 9, transition: 'color 0.15s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = t.textMuted}>✕</span>
                                                                </div>
                                                            </div>
                                                            {/* Metrics grid */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                                                                <div style={{ background: t.cardBg, borderRadius: 4, padding: '2px 6px' }}>
                                                                    <div style={{ color: t.textMuted, fontSize: 7, fontWeight: 600 }}>DISTANCE</div>
                                                                    <div style={{ color: t.text, fontSize: 11, fontWeight: 700 }}>{route.metrics.totalDistance}u</div>
                                                                </div>
                                                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px' }}>
                                                                    <div style={{ color: t.textMuted, fontSize: 7, fontWeight: 600 }}>EST. TIME</div>
                                                                    <div style={{ color: t.text, fontSize: 11, fontWeight: 700 }}>{(route.metrics.totalDistance / 2.2).toFixed(0)}s</div>
                                                                </div>
                                                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px' }}>
                                                                    <div style={{ color: t.textMuted, fontSize: 7, fontWeight: 600 }}>TURNS</div>
                                                                    <div style={{ color: t.text, fontSize: 11, fontWeight: 700 }}>{route.metrics.turns}</div>
                                                                </div>
                                                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px' }}>
                                                                    <div style={{ color: t.textMuted, fontSize: 7, fontWeight: 600 }}>STOPS</div>
                                                                    <div style={{ color: t.text, fontSize: 11, fontWeight: 700 }}>{route.stops.length}</div>
                                                                </div>
                                                            </div>
                                                            {/* Route path description */}
                                                            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                                                                {route.stops.map((stop, si) => (
                                                                    <React.Fragment key={si}>
                                                                        <span style={{
                                                                            padding: '1px 5px', borderRadius: 4, fontSize: 7, fontWeight: 700,
                                                                            background: `${stop.color || route.color}25`,
                                                                            color: stop.color || route.color,
                                                                            border: `1px solid ${stop.color || route.color}30`,
                                                                        }}>{stop.label}</span>
                                                                        {si < route.stops.length - 1 && <span style={{ color: t.textFaint, fontSize: 8 }}>→</span>}
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                </div>
            {/* Templates Modal */}
            <Modal title={null} open={templateModalOpen} onCancel={() => setTemplateModalOpen(false)} footer={null} width={520}
                styles={{ body: { padding: '16px 20px' }, header: { display: 'none' } }}>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏭</div>
                        <div>
                            <Text strong style={{ fontSize: 15 }}>Warehouse Templates</Text>
                            <div><Text type="secondary" style={{ fontSize: 10 }}>Choose a starting layout for your warehouse</Text></div>
                        </div>
                    </div>
                </div>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {TEMPLATES.map((t) => (
                        <Card key={t.name} size="small" hoverable style={{ borderRadius: 12, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` }}
                            onClick={() => handleApplyTemplate(t)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: isDark ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                                }}>{t.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <Text strong style={{ fontSize: 13 }}>{t.name}</Text>
                                    <div><Text type="secondary" style={{ fontSize: 10 }}>{t.description}</Text></div>
                                    <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
                                        <Tag style={{ fontSize: 8, borderRadius: 4, margin: 0 }} color="blue">{t.objects().filter((o: any) => o.type === 'zone').length} zones</Tag>
                                        <Tag style={{ fontSize: 8, borderRadius: 4, margin: 0 }} color="orange">{t.objects().filter((o: any) => o.type === 'rack').length} racks</Tag>
                                        <Tag style={{ fontSize: 8, borderRadius: 4, margin: 0 }}>{t.objects().length} total</Tag>
                                    </div>
                                </div>
                                <div style={{ color: '#d1d5db', fontSize: 16 }}>→</div>
                            </div>
                        </Card>
                    ))}
                </Space>
            </Modal>

            {/* Import Modal */}
            {/* Environment Settings Modal */}
            <Modal title="🌤️ Environment Settings" open={envSettingsOpen} onCancel={() => setEnvSettingsOpen(false)} footer={null} width={400}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 10 }}>
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                            <span>Time of Day (Lighting)</span>
                            <span style={{ color: t.textSecondary }}>{timelapseHour}:00</span>
                        </div>
                        <Slider 
                            min={0} max={24} step={0.5} 
                            value={timelapseHour} 
                            onChange={setTimelapseHour}
                            marks={{ 6: '6am', 12: '12pm', 18: '6pm' }}
                        />
                    </div>
                    
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Visual Toggles</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Floor Grid</span>
                                <Switch checked={showGridOverlay} onChange={setShowGridOverlay} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Cast Shadows (Performance)</span>
                                <Switch checked={envShadows} onChange={setEnvShadows} />
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal title="📥 Import Layout" open={importModalOpen} onCancel={() => setImportModalOpen(false)}
                onOk={handleImport} okText="Import" okButtonProps={{ disabled: !importText.trim() }}>
                <Text type="secondary" style={{ fontSize: 11, marginBottom: 8, display: 'block' }}>
                    Paste the exported JSON layout below:
                </Text>
                <Input.TextArea rows={10} value={importText} onChange={e => setImportText(e.target.value)}
                    placeholder='{"version": 1, "objects": [...]}' style={{ fontFamily: 'monospace', fontSize: 10 }} />
            </Modal>

            {/* Save As Modal */}
            <Modal title="💾 Save Layout As" open={saveAsOpen} onCancel={() => setSaveAsOpen(false)}
                onOk={handleSaveAs} okText="Save" okButtonProps={{ disabled: !saveAsName.trim() }}>
                <Input value={saveAsName} onChange={e => setSaveAsName(e.target.value)}
                    placeholder="Enter layout name..." size="large"
                    prefix={<span>🏗️</span>}
                    onPressEnter={handleSaveAs}
                    style={{ fontSize: 14 }} />
                <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                    This saves a named copy. Use "Save" to update the active layout.
                </Text>
            </Modal>

            {/* Layout Manager Modal */}
            <Modal title={null} open={layoutManagerOpen} onCancel={() => setLayoutManagerOpen(false)}
                footer={null} width={560}
                styles={{ body: { padding: '16px 20px' }, header: { display: 'none' } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📁</div>
                        <div>
                            <Text strong style={{ fontSize: 15 }}>My Layouts</Text>
                            <div><Text type="secondary" style={{ fontSize: 10 }}>{savedLayouts.length} saved layout{savedLayouts.length !== 1 ? 's' : ''}</Text></div>
                        </div>
                    </div>
                    <Button size="small" type="primary" icon={<PlusOutlined />}
                        onClick={() => { setLayoutManagerOpen(false); setSaveAsOpen(true); }}
                        style={{ borderRadius: 8 }}>New</Button>
                </div>
                {savedLayouts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                        <div style={{ fontSize: 48, marginBottom: 8, opacity: 0.4 }}>📦</div>
                        <Text type="secondary" style={{ fontSize: 13 }}>No saved layouts yet</Text>
                        <div style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>Use "Save As" to save your first layout</div>
                    </div>
                ) : (
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        {savedLayouts.map(layout => (
                            <Card key={layout.id} size="small" hoverable style={{ borderRadius: 12, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 16 }}>🏗️</span>
                                            <Text strong style={{ fontSize: 13 }}>{layout.name}</Text>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                            <Tag style={{ fontSize: 9, borderRadius: 4, margin: 0 }} color="purple">{layout.objectCount} objects</Tag>
                                            <Tag style={{ fontSize: 9, borderRadius: 4, margin: 0 }} color="blue">{layout.zoneCount} zones</Tag>
                                            <Tag style={{ fontSize: 9, borderRadius: 4, margin: 0 }} color="orange">{layout.rackCount} racks</Tag>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 9, marginTop: 4, display: 'block' }}>
                                            Saved {new Date(layout.savedAt).toLocaleDateString()} at {new Date(layout.savedAt).toLocaleTimeString()}
                                        </Text>
                                    </div>
                                    <Space>
                                        <Button size="small" type="primary" onClick={() => handleLoadNamed(layout.id)} style={{ borderRadius: 6 }}>Load</Button>
                                        <Popconfirm title="Delete this layout?" onConfirm={() => handleDeleteLayout(layout.id)}>
                                            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                                        </Popconfirm>
                                    </Space>
                                </div>
                            </Card>
                        ))}
                    </Space>
                )}
            </Modal>
            
            {/* Live Bin Detail Drawer */}
            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>📦</span>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Live Location Details</div>
                            <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 400 }}>
                                {(() => {
                                    const obj = objects.find(o => o.id === viewingObjectId);
                                    if (!obj) return 'Unknown Object';
                                    return `${obj.type === 'zone' ? 'Zone' : 'Rack'} • ${obj.label || obj.id.split('-')[0]}`;
                                })()}
                            </div>
                        </div>
                    </div>
                }
                placement="right"
                onClose={() => setViewingObjectId(null)}
                open={!!viewingObjectId}
                size={360}
                styles={{
                    header: { background: t.cardBg, borderBottom: `1px solid ${t.panelBorder}`, padding: '16px 20px' },
                    body: { background: t.viewportBg, padding: 20 },
                }}
            >
                {(() => {
                    const obj = objects.find(o => o.id === viewingObjectId);
                    if (!obj) return null;
                    if (obj.type === 'rack') {
                        const inv = rackInventoryMap.get(obj.id);
                        if (!inv) return <div style={{ color: t.textMuted, textAlign: 'center', padding: 40 }}>No stock data available for this rack.</div>;
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: t.cardBg, borderRadius: 8, border: `1px solid ${t.panelBorder}` }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase' }}>Utilization</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: (inv as any).utilization || (inv as any).fillPercent > 80 ? '#ef4444' : (inv as any).utilization || (inv as any).fillPercent > 50 ? '#f59e0b' : '#22c55e' }}>{(inv as any).utilization || (inv as any).fillPercent.toFixed(1)}%</div>
                                    </div>
                                    <div style={{ width: 1, background: t.panelBorder }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase' }}>Total Qty</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{inv.totalItems}</div>
                                    </div>
                                    <div style={{ width: 1, background: t.panelBorder }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase' }}>Bins</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{inv.bins.length}</div>
                                    </div>
                                </div>
                                <Divider style={{ margin: 0, borderColor: t.panelBorder }} />
                                <div style={{ fontWeight: 600, fontSize: 12, color: t.text }}>Bin Breakdown</div>
                                {inv.bins.map(b => (
                                    <Card key={b.binId} size="small" style={{ background: t.cardBg, borderColor: t.panelBorder, borderRadius: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>{b.binCode}</div>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <div 
                                                    onClick={() => setVisualizingBin(b)}
                                                    style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                                                >
                                                    📦 3D View
                                                </div>
                                                <Tag color={(b as any).utilization || (b as any).fillPercent > 80 ? 'error' : (b as any).utilization || (b as any).fillPercent > 0 ? 'processing' : 'default'} style={{ margin: 0 }}>
                                                    {(b as any).utilization || (b as any).fillPercent.toFixed(0)}% Full
                                                </Tag>
                                            </div>
                                        </div>
                                        {(b.items || []).length === 0 ? (
                                            <div style={{ color: t.textMuted, fontSize: 11, fontStyle: 'italic' }}>Empty Bin</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {(b.items || []).map((it, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.viewportBg, padding: '4px 8px', borderRadius: 4 }}>
                                                        <div>
                                                            <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{(it as any).itemCode || (it as any).sku}</div>
                                                            <div style={{ fontSize: 9, color: t.textMuted }}>{(it as any).itemName || (it as any).name}</div>
                                                        </div>
                                                        <div style={{ fontWeight: 700, color: t.text, fontSize: 12 }}>{it.qty} {(it as any).uom}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        );
                    } else if (obj.type === 'zone') {
                        const inv = zoneInventoryMap.get(obj.id);
                        if (!inv) return <div style={{ color: t.textMuted, textAlign: 'center', padding: 40 }}>No stock data available for this zone.</div>;
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: t.cardBg, borderRadius: 8, border: `1px solid ${t.panelBorder}` }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase' }}>Utilization</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: (inv as any).utilization || (inv as any).fillPercent > 80 ? '#ef4444' : (inv as any).utilization || (inv as any).fillPercent > 50 ? '#f59e0b' : '#22c55e' }}>{(inv as any).utilization || (inv as any).fillPercent.toFixed(1)}%</div>
                                    </div>
                                    <div style={{ width: 1, background: t.panelBorder }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase' }}>Total Qty</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{inv.totalItems}</div>
                                    </div>
                                </div>
                                <Divider style={{ margin: 0, borderColor: t.panelBorder }} />
                                <div style={{ fontWeight: 600, fontSize: 12, color: t.text }}>Top Items in Zone</div>
                                {inv.items.map((it, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.cardBg, padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.panelBorder}` }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{(it as any).itemCode || (it as any).sku}</div>
                                            <div style={{ fontSize: 10, color: t.textMuted }}>{(it as any).itemName || (it as any).name}</div>
                                        </div>
                                        <div style={{ fontWeight: 700, color: t.text, fontSize: 13 }}>{it.qty} {(it as any).uom}</div>
                                    </div>
                                ))}
                            </div>
                        );
                    }
                    return <div style={{ color: t.textMuted, textAlign: 'center', padding: 40 }}>Select a rack or zone.</div>;
                })()}
            </Drawer>

            {/* 3D Bin Visualizer Modal */}
            <Modal
                title={visualizingBin ? `📦 3D Bin Visualizer - ${visualizingBin.binCode}` : ''}
                open={!!visualizingBin}
                onCancel={() => setVisualizingBin(null)}
                footer={null}
                width={800}
                centered
                styles={{
                    header: { background: '#111', color: '#fff', borderBottom: '1px solid #333', padding: '16px 24px', margin: 0 },
                    body: { padding: 0, height: 500, background: '#0a0a0a', overflow: 'hidden', position: 'relative' }
                }}
            >
                {visualizingBin && (
                    <>
                        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: 6, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>Contained Items:</div>
                            {visualizingBin.items.map((it: any, i: number) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: i % 2 === 0 ? '#3b82f6' : '#f59e0b' }} />
                                    <span>{it.qty}x {(it as any).itemCode || (it as any).sku}</span>
                                </div>
                            ))}
                        </div>
                        <Canvas camera={{ position: [1.5, 1, 1.5], fov: 45 }}>
                            <ambientLight intensity={0.6} />
                            <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
                            <pointLight position={[-5, 5, -5]} intensity={0.5} />
                            <OrbitControls makeDefault minDistance={1} maxDistance={4} maxPolarAngle={Math.PI/2 - 0.05} />
                            
                            {/* Bin Shelf Bounds (wireframe) */}
                            <mesh position={[0, 0.2, 0]}>
                                <boxGeometry args={[1.2, 0.4, 0.8]} />
                                <meshBasicMaterial color="#444" wireframe transparent opacity={0.3} />
                            </mesh>
                            
                            {/* Floor of the bin */}
                            <mesh position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                                <planeGeometry args={[1.2, 0.8]} />
                                <meshStandardMaterial color="#222" roughness={0.8} />
                            </mesh>
                            
                            <group position={[-0.58, 0.01, -0.38]}>
                                {/* Render stacked boxes based on bin.items */}
                                {(() => {
                                    let elements: any[] = [];
                                    let xOff = 0, zOff = 0, yOff = 0;
                                    let maxHInRow = 0;
                                    
                                    visualizingBin.items.forEach((it: any, i: number) => {
                                        // Mocking physical dimensions for demonstration since we don't have real dimensions populated
                                        const w = 0.15 + ((i % 3) * 0.05);
                                        const h = 0.1 + ((i % 2) * 0.05);
                                        const d = 0.15 + ((i % 2) * 0.05);
                                        const boxColor = i % 2 === 0 ? '#3b82f6' : '#f59e0b';
                                        
                                        // Let's cap the boxes rendered to avoid lag if qty is massive
                                        const count = Math.min(it.qty, 80); 
                                        
                                        for (let j = 0; j < count; j++) {
                                            if (xOff + w > 1.16) {
                                                xOff = 0;
                                                zOff += d + 0.02;
                                            }
                                            if (zOff + d > 0.76) {
                                                zOff = 0;
                                                yOff += maxHInRow + 0.01;
                                                maxHInRow = 0;
                                            }
                                            if (yOff + h > 0.38) break; // Bin full vertically
                                            
                                            maxHInRow = Math.max(maxHInRow, h);
                                            
                                            elements.push(
                                                <mesh key={`${i}-${j}`} position={[xOff + w/2, yOff + h/2, zOff + d/2]} castShadow receiveShadow>
                                                    <boxGeometry args={[w - 0.01, h - 0.01, d - 0.01]} />
                                                    <meshStandardMaterial color={boxColor} roughness={0.7} metalness={0.1} />
                                                    {/* Little tape marker */}
                                                    <mesh position={[0, h/2, 0]}>
                                                        <boxGeometry args={[w*0.8, 0.005, d*0.2]} />
                                                        <meshStandardMaterial color="#ddd" />
                                                    </mesh>
                                                </mesh>
                                            );
                                            xOff += w + 0.01;
                                        }
                                    });
                                    return elements;
                                })()}
                            </group>
                            <gridHelper args={[2, 10, '#333', '#222']} position={[0, -0.01, 0]} />
                        </Canvas>
                    </>
                )}
            </Modal>
        
                </div>

                {/* OVERLAYS */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
                    {/* Header Overlay */}
                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'auto' }}>
                        <GlassPanel style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderRadius: 0, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: themeColor, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AppstoreOutlined /> Workspace
                        </div>
                        
                        {/* Warehouse Selector */}
                        {warehouses.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12 }}>🏭</span>
                                <Select
                                    value={selectedWarehouseId}
                                    onChange={handleWarehouseChange}
                                    placeholder="All Warehouses"
                                    allowClear
                                    size="small"
                                    loading={loadingWarehouse}
                                    style={{ minWidth: 180, fontSize: 12 }}
                                    options={warehouses.map(wh => {
                                        const typeIcons: Record<string, string> = { general: '🏭', cold: '❄️', hazardous: '☢️', bonded: '🔒', transit: '🔄' };
                                        const typeIcon = typeIcons[(wh as any).warehouseType || 'general'] || '🏭';
                                        return { value: wh.id, label: `${typeIcon} ${wh.name}${wh.code ? ` (${wh.code})` : ''}` };
                                    })}
                                />
                            </div>
                        )}

                        {/* Mode switch */}
                        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: `1px solid ${t.panelBorder}` }}>
                            {[
                                { mode: false, icon: <EyeOutlined />, label: 'View', color: '#22c55e' },
                                { mode: true, icon: <EditOutlined />, label: 'Build', color: '#3b82f6' },
                            ].map(m => (
                                <div key={m.label}
                                    onClick={() => { setBuildMode(m.mode); setActivePalette(null); setSelectedId(null); setSelectedIds(new Set()); }}
                                    style={{
                                        padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: buildMode === m.mode ? `${m.color}20` : 'transparent',
                                        color: buildMode === m.mode ? m.color : t.textSecondary,
                                        transition: 'all 0.2s',
                                    }}>
                                    {m.icon} {m.label}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Button size="small" type="primary" icon={<SaveOutlined />} onClick={() => handleSave()} style={{ background: themeColor, borderColor: themeColor }}>Save</Button>
                        <Tooltip title="Save As"><Button size="small" icon={<PlusOutlined />} onClick={() => { setSaveAsName(''); setSaveAsOpen(true); }} /></Tooltip>
                        <Tooltip title="Layouts"><Button size="small" icon={<AppstoreOutlined />} onClick={async () => { setSavedLayouts(await listLayouts()); setLayoutManagerOpen(true); }} /></Tooltip>
                        <div style={{ width: 1, height: 16, background: t.panelBorder, margin: '0 4px' }} />
                        <Tooltip title="Environment"><Button size="small" icon={<SettingOutlined />} onClick={() => setEnvSettingsOpen(true)} /></Tooltip>
                        <Tooltip title="Export"><Button size="small" icon={<ExportOutlined />} onClick={() => handleExport()} /></Tooltip>
                        <Tooltip title="Import"><Button size="small" icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)} /></Tooltip>
                        <Tooltip title="Screenshot"><Button size="small" icon={<CameraOutlined />} onClick={() => handleScreenshot()} /></Tooltip>
                        <Popconfirm title="Clear all?" onConfirm={() => handleClear()}><Button size="small" danger icon={<ClearOutlined />} /></Popconfirm>
                    </div>
                </div>
            
                        </GlassPanel>
                    </motion.div>

                    {/* Left Panel Overlay */}
                    <AnimatePresence>
                        {buildMode && (
                            <motion.div initial={{ x: -340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -340, opacity: 0 }} style={{ position: 'absolute', top: 80, left: 16, bottom: 16, width: 'fit-content', pointerEvents: 'auto' }}>
                                <GlassPanel style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                    
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    {!buildMode && (
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0 }}>
                                <ExplorerPanel
                                    isDark={isDark}
                                    themeColor={themeColor}
                                    onLocateBin={(binCode) => {
                                        setHighlightBin(binCode);
                                        setCameraPreset('iso');
                                        messageApi.success(`Locating bin: ${binCode}`);
                                    }}
                                    onSelectBin={() => {}}
                                    selectedWarehouseId={selectedWarehouseId}
                                />
                            </div>
                        </div>
                    )}
                    {buildMode && (
                        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, width: 48, margin: '0 auto' }}>
                            {[
                                { id: 'select', icon: <AimOutlined />, tip: 'Select (Esc)' },
                                { id: 'draw_wall', icon: <EditOutlined />, tip: 'Draw Wall' },
                                { id: 'draw_zone', icon: <AppstoreAddOutlined />, tip: 'Draw Zone' },
                                { id: 'place_object', icon: <PlusOutlined />, tip: 'Place Object' },
                                { id: 'delete', icon: <DeleteOutlined />, tip: 'Delete (Del)' },
                            ].map(tool => {
                                const active = activeTool === tool.id;
                                return (
                                    <Tooltip key={tool.id} title={tool.tip} placement="right">
                                        <div
                                            onClick={() => setActiveTool(tool.id as any)}
                                            style={{
                                                width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: active ? themeColor : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                color: active ? '#fff' : isDark ? '#ccc' : '#555',
                                                cursor: 'pointer', transition: 'all 0.2s', border: `1px solid ${active ? themeColor : 'transparent'}`,
                                            }}
                                        >
                                            {tool.icon}
                                        </div>
                                    </Tooltip>
                                );
                            })}
                                <div style={{ height: 1, background: t.panelBorder, margin: '4px 0' }} />

                                <Tooltip title="Undo (Ctrl+Z)" placement="right">
                                    <div onClick={handleUndo} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: history.length ? 'pointer' : 'not-allowed', color: history.length ? t.textSecondary : t.textMuted, fontSize: 16 }}>
                                        <UndoOutlined />
                                    </div>
                                </Tooltip>
                                <Tooltip title="Redo (Ctrl+Y)" placement="right">
                                    <div onClick={handleRedo} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: redoHistory.length ? 'pointer' : 'not-allowed', color: redoHistory.length ? t.textSecondary : t.textMuted, fontSize: 16 }}>
                                        <RedoOutlined />
                                    </div>
                                </Tooltip>
                                
                                {/* Floor Level Switcher in CAD toolbar */}
                                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {[2, 1, 0].map(lvl => (
                                        <Tooltip key={lvl} title={`Floor ${lvl === 0 ? 'GND' : `L${lvl}`}`} placement="right">
                                            <div onClick={() => setCurrentFloor(lvl)}
                                                style={{
                                                    width: 32, height: 24, borderRadius: 6, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 9, fontWeight: 700, transition: 'all 0.2s',
                                                    background: currentFloor === lvl ? themeColor : 'transparent',
                                                    color: currentFloor === lvl ? '#fff' : t.textMuted,
                                                    border: `1px solid ${currentFloor === lvl ? themeColor : t.panelBorder}`
                                                }}>
                                                {lvl === 0 ? 'G' : `L${lvl}`}
                                            </div>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                
                                </GlassPanel>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Right Panel Overlay */}
                    <AnimatePresence>
                        {selectedId || (buildMode && activeTool === 'place_object') ? (
                            <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} style={{ position: 'absolute', top: 80, right: 16, bottom: 16, width: 'fit-content', pointerEvents: 'auto' }}>
                                <GlassPanel style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                    
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                        {buildMode && (activeTool === 'place_object' || selectedId) && (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 16 }}>

                                {activeTool === 'place_object' && !selectedId && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <EditOutlined /> Object Palette
                                        </div>
                                        {/* Category tabs */}
                                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                            {['zone', 'storage', 'structure', 'equipment'].map(cat => (
                                                <div key={cat}
                                                    onClick={() => setPaletteCategory(cat)}
                                                    style={{
                                                        padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 9, fontWeight: 600,
                                                        background: paletteCategory === cat ? `${themeColor}25` : t.cardBg,
                                                        border: `1px solid ${paletteCategory === cat ? themeColor : t.panelBorder}`,
                                                        color: paletteCategory === cat ? themeColor : t.textSecondary,
                                                        transition: 'all 0.2s', flexGrow: 1, textAlign: 'center'
                                                    }}>
                                                    {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                </div>
                                            ))}
                                        </div>
                                        {/* Palette items */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {filteredPalette.map((item, idx) => {
                                                const isActive = activePalette?.label === item.label;
                                                return (
                                                    <motion.div key={item.label}
                                                        onClick={() => setActivePalette(isActive ? null : item)}
                                                        style={{
                                                            padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                                                            background: isActive ? `${item.color}20` : t.cardBg,
                                                            border: `1.5px solid ${isActive ? item.color : 'transparent'}`,
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ width: 24, height: 24, borderRadius: 4, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: `1px solid ${item.color}30` }}>
                                                                {item.icon}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <Text style={{ color: t.text, fontSize: 10, fontWeight: 600, display: 'block' }}>{item.label}</Text>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                    {/* Right: Properties panel (when object selected in build mode) */}
                    
                        {selectedObj && (
                            <div style={{ flex: 1, overflowY: "auto" }}>
                                <Card size="small" style={{ ...glass, height: '100%', overflowY: 'auto' }}
                                    styles={{ body: { padding: 12 } }}
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 3, height: 14, borderRadius: 2, background: '#3b82f6' }} />
                                                <Text style={{ color: t.text, fontSize: 12, fontWeight: 700 }}>Properties</Text>
                                            </div>
                                            {selectedObj.locked && (
                                                <Tag style={{ fontSize: 8, margin: 0, padding: '0 6px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 6 }}>🔒 LOCKED</Tag>
                                            )}
                                        </div>
                                    }
                                >
                                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                        {/* Type + Label header */}
                                        <div style={{ ...panelSection(selectedObj.color || '#3b82f6') }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 6,
                                                    background: `${selectedObj.color || '#3b82f6'}20`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 14,
                                                }}>
                                                    {PALETTE_ITEMS.find(p => p.type === selectedObj.type)?.icon || '📦'}
                                                </div>
                                                <div>
                                                    <Tag style={{ fontSize: 9, background: `${selectedObj.color || '#3b82f6'}20`, border: `1px solid ${selectedObj.color || '#3b82f6'}40`, color: selectedObj.color || '#3b82f6', borderRadius: 6 }}>{selectedObj.type.toUpperCase()}</Tag>
                                                    <div style={{ color: t.textMuted, fontSize: 8, marginTop: 1 }}>📍 {gridCoordsLabel(selectedObj.x, selectedObj.z)}</div>
                                                </div>
                                            </div>
                                            <Input size="small" value={selectedObj.label || ''}
                                                onChange={e => handleLabelChange(e.target.value)}
                                                placeholder="Enter label..."
                                                style={{ background: t.inputBg, borderColor: t.inputBorder, color: t.text, fontSize: 11, borderRadius: 6 }} />
                                        </div>
                                        {/* Position & Rotation */}
                                        <div style={{ ...panelSection('#666') }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Position & Rotation</Text>
                                                <Tooltip title="Rotate 90°">
                                                    <div onClick={handleRotate} style={{ cursor: 'pointer', fontSize: 10, padding: '2px 6px', background: t.cardBg, borderRadius: 4, border: `1px solid ${t.panelBorder}`, color: t.text }}>↻</div>
                                                </Tooltip>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                {[
                                                    { label: 'X', value: selectedObj.x, field: 'x' as const },
                                                    { label: 'Z', value: selectedObj.z, field: 'z' as const },
                                                    { label: 'R', value: selectedObj.rotation, field: 'rotation' as const },
                                                ].map(p => (
                                                    <div key={p.label} style={{ flex: 1 }}>
                                                        <div style={{ color: t.textMuted, fontSize: 7, fontWeight: 600, marginBottom: 2, textAlign: 'center' }}>{p.label}</div>
                                                        <InputNumber
                                                            size="small"
                                                            value={p.value}
                                                            step={p.field === 'rotation' ? 90 : snapIncrement}
                                                            onChange={val => {
                                                                if (val === null) return;
                                                                const proposed = { ...selectedObj, [p.field]: val };
                                                                if (p.field !== 'rotation' && checkCollision(proposed, objects)) {
                                                                    messageApi.warning('Collision detected!');
                                                                    return;
                                                                }
                                                                pushHistory();
                                                                setObjects(prev => prev.map(o => o.id === selectedObj.id ? proposed : o));
                                                            }}
                                                            style={{ width: '100%', background: t.cardBg, color: t.text, fontSize: 11, borderColor: t.panelBorder }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Multi-Object Alignment */}
                                        {selectedIds.size > 1 && (
                                            <div style={{ ...panelSection('#ec4899') }}>
                                                <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Align {selectedIds.size} Objects</Text>
                                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                    <Button size="small" style={{ flex: 1, fontSize: 10 }} onClick={() => {
                                                        const minX = Math.min(...objects.filter(o => selectedIds.has(o.id)).map(o => o.x));
                                                        pushHistory(); setObjects(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, x: minX } : o));
                                                    }}>Left (X)</Button>
                                                    <Button size="small" style={{ flex: 1, fontSize: 10 }} onClick={() => {
                                                        const minZ = Math.min(...objects.filter(o => selectedIds.has(o.id)).map(o => o.z));
                                                        pushHistory(); setObjects(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, z: minZ } : o));
                                                    }}>Top (Z)</Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Array Clone Tool */}
                                        {selectedIds.size > 0 && (
                                            <div style={{ ...panelSection('#a855f7') }}>
                                                <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Array Clone</Text>
                                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 7, color: t.textMuted }}>Cols (X)</div>
                                                        <InputNumber size="small" min={1} max={50} value={arrayConfig.countX} onChange={v => v && setArrayConfig(c => ({...c, countX: v}))} style={{ width: '100%', fontSize: 10 }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 7, color: t.textMuted }}>Rows (Z)</div>
                                                        <InputNumber size="small" min={1} max={50} value={arrayConfig.countZ} onChange={v => v && setArrayConfig(c => ({...c, countZ: v}))} style={{ width: '100%', fontSize: 10 }} />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 7, color: t.textMuted }}>Gap X</div>
                                                        <InputNumber size="small" min={0.1} step={0.1} value={arrayConfig.spaceX} onChange={v => v && setArrayConfig(c => ({...c, spaceX: v}))} style={{ width: '100%', fontSize: 10 }} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 7, color: t.textMuted }}>Gap Z</div>
                                                        <InputNumber size="small" min={0.1} step={0.1} value={arrayConfig.spaceZ} onChange={v => v && setArrayConfig(c => ({...c, spaceZ: v}))} style={{ width: '100%', fontSize: 10 }} />
                                                    </div>
                                                </div>
                                                <Button size="small" block onClick={() => {
                                                    const clones: PlacedObject[] = [];
                                                    const sourceObjects = objects.filter(o => selectedIds.has(o.id));
                                                    for (let x = 0; x < arrayConfig.countX; x++) {
                                                        for (let z = 0; z < arrayConfig.countZ; z++) {
                                                            if (x === 0 && z === 0) continue; // Skip original
                                                            for (const sourceObj of sourceObjects) {
                                                                const newObj = {
                                                                    ...duplicateObject(sourceObj),
                                                                    x: sourceObj.x + x * arrayConfig.spaceX,
                                                                    z: sourceObj.z + z * arrayConfig.spaceZ,
                                                                };
                                                                clones.push(newObj);
                                                            }
                                                        }
                                                    }
                                                    if (clones.length === 0) { messageApi.warning('Array blocked'); return; }
                                                    pushHistory();
                                                    setObjects(prev => [...prev, ...clones]);
                                                    messageApi.success(`Generated ${clones.length} clones`);
                                                }} style={{ marginTop: 6, fontSize: 10 }}>Create Array</Button>
                                            </div>
                                        )}
                                        {/* Zone type selector & Auto-Aisle */}
                                        {selectedObj.type === 'zone' && (
                                            <>
                                                <div style={{ ...panelSection('#a855f7') }}>
                                                    <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Zone Type</Text>
                                                    <Select size="small" value={selectedObj.zoneType || 'storage'}
                                                        onChange={(v: ZoneType) => handleZoneTypeChange(v)}
                                                        style={{ width: '100%', marginTop: 4 }}
                                                        options={ZONE_TYPES.map(z => ({ value: z.value, label: z.label }))}
                                                    />
                                                </div>
                                                <div style={{ ...panelSection('#3b82f6') }}>
                                                    <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Auto Layout</Text>
                                                    <Button size="small" block type="primary" onClick={() => {
                                                        const newRacks = autoArrangeRacks(selectedObj, 3, 2);
                                                        if (newRacks.length === 0) { messageApi.warning('Zone too small'); return; }
                                                        pushHistory();
                                                        setObjects(prev => [...prev, ...newRacks]);
                                                        messageApi.success(`Generated ${newRacks.length} racks`);
                                                    }} style={{ marginTop: 4, fontSize: 10 }}>⚡ Auto-Fill Racks</Button>
                                                </div>
                                            </>
                                        )}
                                        {/* Color picker */}
                                        <div style={{ ...panelSection('#e87722') }}>
                                            <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Color</Text>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                                {COLOR_PRESETS.map(c => (
                                                    <div key={c} onClick={() => handleColorChange(c)}
                                                        style={{
                                                            width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer',
                                                            border: selectedObj.color === c ? `2px solid ${t.text}` : `1px solid ${t.inputBorder}`,
                                                            boxShadow: selectedObj.color === c ? `0 0 8px ${c}60` : 'none',
                                                            transition: 'all 0.15s',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                                                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {/* Size (for zones/walls/racks) */}
                                        {(selectedObj.type === 'zone' || selectedObj.type === 'wall' || selectedObj.type === 'conveyor' || selectedObj.type === 'rack') && (
                                            <div style={{ ...panelSection('#22c55e') }}>
                                                <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Dimensions</Text>
                                                <div style={{ marginTop: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ color: t.textMuted, fontSize: 8, width: 30 }}>W</span>
                                                        <Slider min={1} max={10} value={selectedObj.width} onChange={v => handleResize('width', v)}
                                                            style={{ flex: 1 }} trackStyle={{ background: '#22c55e' }} handleStyle={{ borderColor: '#22c55e' }} />
                                                        <span style={{ color: t.textSecondary, fontSize: 10, width: 16 }}>{selectedObj.width}</span>
                                                    </div>
                                                    {(selectedObj.type === 'zone' || selectedObj.type === 'rack') && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ color: t.textMuted, fontSize: 8, width: 30 }}>D</span>
                                                            <Slider min={1} max={10} value={selectedObj.depth} onChange={v => handleResize('depth', v)}
                                                                style={{ flex: 1 }} trackStyle={{ background: '#22c55e' }} handleStyle={{ borderColor: '#22c55e' }} />
                                                            <span style={{ color: t.textSecondary, fontSize: 10, width: 16 }}>{selectedObj.depth}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {/* Rack levels */}
                                        {selectedObj.type === 'rack' && (
                                            <>
                                            <div style={{ ...panelSection('#e87722') }}>
                                                <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Rack Levels</Text>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                    <Slider min={1} max={6} value={selectedObj.rackLevels || 3} onChange={v => handleRackLevels(v)}
                                                        style={{ flex: 1 }} trackStyle={{ background: '#e87722' }} handleStyle={{ borderColor: '#e87722' }} />
                                                    <span style={{ color: '#e87722', fontSize: 14, fontWeight: 700, width: 16 }}>{selectedObj.rackLevels || 3}</span>
                                                </div>
                                            </div>
                                            {/* WMS Location: Row / Bay */}
                                            <div style={{ ...panelSection('#8b5cf6') }}>
                                                <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>📍 Location</Text>
                                                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ color: t.textMuted, fontSize: 7, fontWeight: 600, marginBottom: 2 }}>ROW</div>
                                                        <input
                                                            value={selectedObj.row || ''}
                                                            placeholder={suggestRow(selectedObj.z)}
                                                            maxLength={2}
                                                            onChange={e => {
                                                                const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                                                                setObjects(prev => prev.map(o => o.id === selectedObj.id ? { ...o, row: val || undefined } : o));
                                                            }}
                                                            style={{
                                                                width: '100%', padding: '4px 6px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                                                textAlign: 'center', fontFamily: 'monospace',
                                                                background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: '#8b5cf6',
                                                                outline: 'none',
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ color: t.textMuted, fontSize: 7, fontWeight: 600, marginBottom: 2 }}>BAY</div>
                                                        <input
                                                            type="number"
                                                            value={selectedObj.bay ?? ''}
                                                            placeholder={String(Math.floor(selectedObj.x) + 1)}
                                                            min={1} max={99}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value);
                                                                setObjects(prev => prev.map(o => o.id === selectedObj.id ? { ...o, bay: isNaN(val) ? undefined : val } : o));
                                                            }}
                                                            style={{
                                                                width: '100%', padding: '4px 6px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                                                textAlign: 'center', fontFamily: 'monospace',
                                                                background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: '#8b5cf6',
                                                                outline: 'none',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Location code preview */}
                                                <div style={{
                                                    marginTop: 6, padding: '4px 8px', borderRadius: 6,
                                                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                }}>
                                                    <span style={{ color: t.textMuted, fontSize: 7, fontWeight: 600 }}>LOCATION</span>
                                                    <span style={{ color: '#c4b5fd', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                                                        {locationCode(
                                                            selectedObj.row || suggestRow(selectedObj.z),
                                                            selectedObj.bay ?? Math.floor(selectedObj.x) + 1,
                                                        )}
                                                    </span>
                                                </div>
                                                {/* Auto-assign button */}
                                                {!selectedObj.row && (
                                                    <div
                                                        onClick={() => {
                                                            const autoRow = suggestRow(selectedObj.z);
                                                            const autoBay = suggestBay(selectedObj.x, objects, autoRow);
                                                            setObjects(prev => prev.map(o =>
                                                                o.id === selectedObj.id ? { ...o, row: autoRow, bay: autoBay } : o
                                                            ));
                                                            messageApi.success(`Assigned: Row ${autoRow}, Bay ${autoBay}`);
                                                        }}
                                                        style={{
                                                            marginTop: 4, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                                                            textAlign: 'center', fontSize: 8, fontWeight: 700,
                                                            background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                                                            color: '#c4b5fd', transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        ⚡ Auto-Assign Row & Bay
                                                    </div>
                                                )}
                                            </div>
                                            {/* Link Inventory Bins */}
                                            <div style={{ ...panelSection('#22c55e') }}>
                                                <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>📦 Inventory Link</Text>
                                                <div style={{ marginTop: 6 }}>
                                                    {selectedObj.linkedBinIds && selectedObj.linkedBinIds.length > 0 ? (
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                                                <div style={{ width: 6, height: 6, borderRadius: 3, background: '#22c55e' }} />
                                                                <span style={{ color: '#22c55e', fontSize: 9, fontWeight: 600 }}>
                                                                    {selectedObj.linkedBinIds.length} bins linked
                                                                </span>
                                                            </div>
                                                            {selectedObj.linkedBinIds.map((binId, i) => (
                                                                <div key={i} style={{
                                                                    fontSize: 8, color: t.textSecondary, fontFamily: 'monospace',
                                                                    padding: '1px 0', borderBottom: `1px solid ${t.cardBg}`,
                                                                }}>
                                                                    L{i + 1}: {binId.slice(0, 12)}…
                                                                </div>
                                                            ))}
                                                            <Button size="small" block
                                                                onClick={() => {
                                                                    const updated = objects.map(o =>
                                                                        o.id === selectedObj.id ? { ...o, linkedBinIds: undefined } : o
                                                                    );
                                                                    setObjects(updated);
                                                                    messageApi.info('Bins unlinked');
                                                                }}
                                                                style={{ marginTop: 4, fontSize: 9, borderRadius: 6, background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                                                                Unlink All
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                                                <div style={{ width: 6, height: 6, borderRadius: 3, background: t.textMuted }} />
                                                                <span style={{ color: t.textMuted, fontSize: 9 }}>No bins linked</span>
                                                            </div>
                                                            <Button size="small" block
                                                                onClick={async () => {
                                                                    try {
                                                                        const binInputs = generateRackBinInputs(selectedObj);
                                                                        const zones = await inventoryService.getZones();
                                                                        const storageZone = zones.find(z => z.zoneType === 'storage' && z.status === 'active') || zones[0];
                                                                        if (!storageZone) {
                                                                            messageApi.warning('No zones found. Create a zone in Warehouses first.');
                                                                            return;
                                                                        }
                                                                        const binIds: string[] = [];
                                                                        for (const input of binInputs) {
                                                                            const bin = await inventoryService.createBin(storageZone.id, input);
                                                                            binIds.push(bin.id);
                                                                        }
                                                                        const updated = objects.map(o =>
                                                                            o.id === selectedObj.id ? { ...o, linkedBinIds: binIds, linkedZoneId: storageZone.id } : o
                                                                        );
                                                                        setObjects(updated);
                                                                        messageApi.success(`${binIds.length} bins auto-generated!`);
                                                                    } catch (err: any) {
                                                                        messageApi.error('Failed: ' + (err?.message || 'Unknown error'));
                                                                    }
                                                                }}
                                                                style={{ fontSize: 9, borderRadius: 6, background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.25)', color: '#86efac', marginBottom: 4 }}>
                                                                ⚡ Auto-Generate Bins
                                                            </Button>
                                                            <Button size="small" block
                                                                onClick={() => {
                                                                    const ids = prompt('Enter bin IDs (comma separated):');
                                                                    if (!ids) return;
                                                                    const binIds = ids.split(',').map(s => s.trim()).filter(Boolean);
                                                                    if (binIds.length === 0) return;
                                                                    const updated = objects.map(o =>
                                                                        o.id === selectedObj.id ? { ...o, linkedBinIds: binIds } : o
                                                                    );
                                                                    setObjects(updated);
                                                                    messageApi.success(`${binIds.length} bins linked manually`);
                                                                }}
                                                                style={{ fontSize: 9, borderRadius: 6, background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>
                                                                🔗 Link Existing Bins
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            </>
                                        )}

                                        <Divider style={{ borderColor: t.panelBorder, margin: '6px 0' }} />

                                        {/* Actions */}
                                        <div style={{ ...panelSection('#3b82f6') }}>
                                            <Text style={{ color: t.textMuted, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Actions</Text>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <Button size="small" icon={<RotateRightOutlined />} onClick={handleRotate}
                                                style={{ flex: 1, background: 'rgba(139,92,246,0.12)', borderColor: 'rgba(139,92,246,0.25)', color: '#c4b5fd', borderRadius: 8 }}>90°</Button>
                                            <Button size="small" icon={<CopyOutlined />} onClick={handleDuplicate}
                                                style={{ flex: 1, background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#93c5fd', borderRadius: 8 }}>Copy</Button>
                                        </div>
                                        {/* D-pad */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, maxWidth: 110, margin: '0 auto' }}>
                                            <div />
                                            <Button size="small" icon={<ArrowUpOutlined />} onClick={() => handleMove(0, -1)}
                                                style={{ background: t.cardBg, border: `1px solid ${t.panelBorder}`, color: t.textSecondary, borderRadius: 8 }} />
                                            <div />
                                            <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => handleMove(-1, 0)}
                                                style={{ background: t.cardBg, border: `1px solid ${t.panelBorder}`, color: t.textSecondary, borderRadius: 8 }} />
                                            <div style={{ width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textFaint, fontSize: 9, background: t.cardBg, border: `1px solid ${t.panelBorder}` }}>
                                                <DragOutlined />
                                            </div>
                                            <Button size="small" icon={<ArrowRightOutlined />} onClick={() => handleMove(1, 0)}
                                                style={{ background: t.cardBg, border: `1px solid ${t.panelBorder}`, color: t.textSecondary, borderRadius: 8 }} />
                                            <div />
                                            <Button size="small" icon={<ArrowDownOutlined />} onClick={() => handleMove(0, 1)}
                                                style={{ background: t.cardBg, border: `1px solid ${t.panelBorder}`, color: t.textSecondary, borderRadius: 8 }} />
                                            <div />
                                        </div>

                                        <Divider style={{ borderColor: t.panelBorder, margin: '4px 0' }} />

                                        {/* Lock + Delete + Auto */}
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <Button size="small"
                                                icon={selectedObj.locked ? <LockOutlined /> : <UnlockOutlined />}
                                                onClick={handleLock}
                                                style={{
                                                    flex: 1, borderRadius: 8,
                                                    background: selectedObj.locked ? 'rgba(239,68,68,0.12)' : t.cardBg,
                                                    borderColor: selectedObj.locked ? 'rgba(239,68,68,0.25)' : t.panelBorder,
                                                    color: selectedObj.locked ? '#fca5a5' : t.textSecondary,
                                                }}>
                                                {selectedObj.locked ? 'Unlock' : 'Lock'}
                                            </Button>
                                            <Popconfirm title="Delete this object?" onConfirm={handleDelete}>
                                                <Button size="small" icon={<DeleteOutlined />} danger
                                                    disabled={selectedObj.locked}
                                                    style={{ flex: 1, borderRadius: 8 }}>Delete</Button>
                                            </Popconfirm>
                                        </div>
                                        {selectedObj.type === 'zone' && (selectedObj.zoneType === 'storage' || selectedObj.zoneType === 'cold') && (
                                            <Button block size="small" icon={<ThunderboltOutlined />}
                                                onClick={handleAutoArrange}
                                                style={{ background: 'rgba(232,119,34,0.12)', borderColor: 'rgba(232,119,34,0.25)', color: '#fdba74', borderRadius: 8 }}>
                                                ⚡ Auto-Fill Racks
                                            </Button>
                                        )}
                                    </Space>
                                </Card>
                            </div>
                        )}
                    

                                {selectedId && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <SettingOutlined /> Properties
                                        </div>
                                        {(() => {
                                            const obj = objects.find(o => o.id === selectedId);
                                            if (!obj) return null;
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                                                        <span style={{ color: t.textMuted }}>Type:</span>
                                                        <span style={{ color: t.text, fontWeight: 600 }}>{obj.type}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                                                        <span style={{ color: t.textMuted }}>Floor Level:</span>
                                                        <span style={{ color: t.text, fontWeight: 600 }}>{obj.floorLevel || 0}</span>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: t.textMuted, fontSize: 10, marginBottom: 4 }}>Label:</div>
                                                        <Input size="small" value={obj.label || ''} onChange={e => {
                                                            setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, label: e.target.value } : o));
                                                        }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ color: t.textMuted, fontSize: 10, marginBottom: 4 }}>Color:</div>
                                                        <ColorPicker size="small" value={obj.color} onChange={(_, hex) => {
                                                            setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, color: hex } : o));
                                                        }} />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ color: t.textMuted, fontSize: 10, marginBottom: 4 }}>Width (m):</div>
                                                            <InputNumber size="small" value={obj.width} onChange={v => {
                                                                if (v) setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, width: v } : o));
                                                            }} style={{ width: '100%' }} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ color: t.textMuted, fontSize: 10, marginBottom: 4 }}>Depth (m):</div>
                                                            <InputNumber size="small" value={obj.depth} onChange={v => {
                                                                if (v) setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, depth: v } : o));
                                                            }} style={{ width: '100%' }} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: t.textMuted, fontSize: 10, marginBottom: 4 }}>Elevation Y (m):</div>
                                                        <InputNumber size="small" value={obj.y || 0} step={0.5} onChange={v => {
                                                            setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, y: v || 0 } : o));
                                                        }} style={{ width: '100%' }} />
                                                    </div>
                                                    {obj.type === 'custom_model' && (
                                                        <div>
                                                            <div style={{ color: t.textMuted, fontSize: 10, marginBottom: 4 }}>Model URL (.gltf / .glb):</div>
                                                            <Input size="small" placeholder="https://..." value={obj.modelUrl || ''} onChange={e => {
                                                                setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, modelUrl: e.target.value } : o));
                                                            }} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Multi-select Alignment Tools */}
                                {selectedIds.length > 1 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: t.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <BlockOutlined /> Align Objects ({selectedIds.length})
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <Button size="small" onClick={() => {
                                                const minX = Math.min(...objects.filter(o => selectedIds.has(o.id)).map(o => o.x));
                                                setObjects(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, x: minX } : o));
                                            }}>Align Left</Button>
                                            <Button size="small" onClick={() => {
                                                const maxX = Math.max(...objects.filter(o => selectedIds.has(o.id)).map(o => o.x));
                                                setObjects(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, x: maxX } : o));
                                            }}>Align Right</Button>
                                            <Button size="small" onClick={() => {
                                                const minZ = Math.min(...objects.filter(o => selectedIds.has(o.id)).map(o => o.z));
                                                setObjects(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, z: minZ } : o));
                                            }}>Align Top</Button>
                                            <Button size="small" onClick={() => {
                                                const maxZ = Math.max(...objects.filter(o => selectedIds.has(o.id)).map(o => o.z));
                                                setObjects(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, z: maxZ } : o));
                                            }}>Align Bottom</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            
                                </GlassPanel>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>
</CMSLayout>
    );
}

// ═══ WMS Activity Feed for 3D Map ═══
function WmsActivityFeed({ isDark, t }: { isDark: boolean; t: ReturnType<typeof makeThemeTokens> }) {
    const [stats, setStats] = React.useState<any>(null);
    const [putaway, setPutaway] = React.useState<any[]>([]);
    const [picks, setPicks] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        (async () => {
            try {
                const [s, pa, pk] = await Promise.all([
                    inventoryService.getWmsStats(),
                    inventoryService.getPutawayTasks('default', 'in_progress'),
                    inventoryService.getPickTasks('default', 'in_progress'),
                ]);
                setStats(s); setPutaway(pa.slice(0, 5)); setPicks(pk.slice(0, 5));
            } catch { /* WMS tables may not exist yet */ }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <div style={{ fontSize: 8, color: t.textMuted, padding: 4 }}>Loading...</div>;
    if (!stats) return <div style={{ fontSize: 8, color: t.textMuted, padding: 4 }}>No WMS data</div>;

    const items = [
        { icon: '📥', label: 'Put-Away', pending: stats.pendingPutaway, active: stats.inProgressPutaway, done: stats.completedPutaway, color: '#10b981' },
        { icon: '📤', label: 'Pick', pending: stats.pendingPick, active: stats.inProgressPick, done: stats.completedPick, color: '#3b82f6' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map(item => (
                <div key={item.label} style={{
                    padding: '4px 6px', borderRadius: 6,
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 600 }}>{item.icon} {item.label}</span>
                        {item.active > 0 && (
                            <span style={{
                                fontSize: 7, padding: '1px 5px', borderRadius: 8,
                                background: `${item.color}20`, color: item.color, fontWeight: 700,
                                animation: 'pulse 2s infinite',
                            }}>● {item.active} active</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 8, color: t.textMuted }}>
                        <span>⏳ {item.pending}</span>
                        <span style={{ color: item.color }}>▶ {item.active}</span>
                        <span style={{ color: '#22c55e' }}>✓ {item.done}</span>
                    </div>
                </div>
            ))}
            {(putaway.length > 0 || picks.length > 0) && (
                <div style={{ marginTop: 2 }}>
                    <div style={{ fontSize: 7, color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>ACTIVE TASKS</div>
                    {[...putaway.map(t => ({ ...t, _type: 'PA' })), ...picks.map(t => ({ ...t, _type: 'PK' }))].slice(0, 5).map((task: any) => (
                        <div key={task.id} style={{
                            padding: '2px 4px', borderRadius: 4, marginBottom: 2, fontSize: 8,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                        }}>
                            <span style={{ color: task._type === 'PA' ? '#10b981' : '#3b82f6', fontWeight: 600 }}>{task._type}</span>
                            <span style={{ fontSize: 7, color: t.textSecondary, flex: 1, marginLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.taskNumber}</span>
                            <span style={{ fontSize: 7, color: t.textMuted }}>{task._type === 'PA' ? task.suggestedBinCode : task.fromBinCode || '—'}</span>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ fontSize: 7, color: t.textMuted, marginTop: 2 }}>
                📦 {stats.totalBinContents} items stored
            </div>
        </div>
    );
}
