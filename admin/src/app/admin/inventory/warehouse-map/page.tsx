"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Input, Drawer, Badge, Spin, Tooltip, Divider, Segmented, message, Popconfirm, Slider, Select, Modal, Upload, ColorPicker, theme as antTheme } from "antd";
import {
    EnvironmentOutlined, ReloadOutlined, AppstoreOutlined,
    EditOutlined, EyeOutlined, DeleteOutlined, RotateRightOutlined,
    SaveOutlined, UndoOutlined, PlusOutlined, DragOutlined,
    ArrowUpOutlined, ArrowDownOutlined, ArrowLeftOutlined, ArrowRightOutlined,
    ClearOutlined, DownloadOutlined, ColumnHeightOutlined, CopyOutlined,
    ImportOutlined, ExportOutlined, AppstoreAddOutlined, RedoOutlined,
    InfoCircleOutlined, BarChartOutlined, LockOutlined, UnlockOutlined,
    ThunderboltOutlined, CameraOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import dynamic from "next/dynamic";
import {
    PlacedObject, PlacedObjectType, BuilderPaletteItem, PALETTE_ITEMS,
    GRID_SIZE, GRID_CELLS, ZONE_TYPE_MAP, TEMPLATES, WarehouseTemplate, ZoneType,
    SavedLayout, BinOccupancy, RackInventory,
    generateId, getDefaultLayout, saveLayout, loadLayout, clearLayout,
    duplicateObject, exportLayoutJSON, importLayoutJSON,
    saveNamedLayout, listLayouts, loadNamedLayout, deleteNamedLayout,
    gridCoordsLabel, autoArrangeRacks, generateRackBinInputs,
} from "./builderState";
import { inventoryService } from '@/lib/inventoryService';
import {
    Route, PRESET_ROUTES, PresetRouteType,
    computePresetRoute, computeRoute,
    getZonesByType, getZoneCenter,
    optimizeStopOrder, getAllZonesAsStops,
    buildGrid,
    type RouteStop,
} from "./pathfinding";

const { Text, Title } = Typography;

// Theme-aware glass styles (generated per-mode)
const makeGlass = (dark: boolean) => dark
    ? { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }
    : { background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14 };

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

type CameraPreset = 'corner' | 'top' | 'front' | 'iso';

export default function WarehouseMapPage() {
    const { themeColor } = usePreferencesStore();
    const [messageApi, ctx] = message.useMessage();
    const { token } = antTheme.useToken();

    // Detect system dark mode from Ant Design theme, allow manual override
    const systemDark = token.colorBgContainer === '#141414' || token.colorBgBase === '#000';
    const [darkOverride, setDarkOverride] = useState<boolean | null>(null);
    const isDark = darkOverride !== null ? darkOverride : systemDark;
    const t = useMemo(() => makeThemeTokens(isDark), [isDark]);
    const glass = useMemo(() => makeGlass(isDark), [isDark]);

    // Builder state
    const [objects, setObjects] = useState<PlacedObject[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [buildMode, setBuildMode] = useState(false);
    const [activePalette, setActivePalette] = useState<BuilderPaletteItem | null>(null);
    const [cameraPreset, setCameraPreset] = useState<CameraPreset>('corner');
    const [history, setHistory] = useState<PlacedObject[][]>([]);
    const [redoHistory, setRedoHistory] = useState<PlacedObject[][]>([]);
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
    const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
    const [routeTab, setRouteTab] = useState<'quick' | 'custom'>('quick');
    const [customStops, setCustomStops] = useState<RouteStop[]>([]);
    const [customRouteName, setCustomRouteName] = useState('Custom Route');
    const CUSTOM_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
    const [showGridOverlay, setShowGridOverlay] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [clipboard, setClipboard] = useState<PlacedObject[]>([]);

    // Inventory data for rack-level tracking
    const [rackInventoryMap, setRackInventoryMap] = useState<Map<string, RackInventory>>(new Map());
    const [highlightBin, setHighlightBin] = useState<string | null>(null);
    const [shelfTooltip, setShelfTooltip] = useState<{ obj: PlacedObject; level: number; bin?: BinOccupancy } | null>(null);

    // Load saved layout on mount (async from backend)
    useEffect(() => {
        (async () => {
            const result = await loadLayout();
            if (result && result.objects && result.objects.length > 0) {
                setObjects(result.objects);
                setActiveLayoutId(result.layoutId);
            } else {
                setObjects(getDefaultLayout());
            }
            const layouts = await listLayouts();
            setSavedLayouts(layouts);
        })();
        // Check URL for ?search= param (from item-locator)
        try {
            const params = new URLSearchParams(window.location.search);
            const searchBin = params.get('search');
            if (searchBin) setHighlightBin(searchBin);
        } catch { /* ignore */ }
    }, []);

    // Fetch inventory bin data and build rackInventoryMap
    useEffect(() => {
        if (objects.length === 0) return;
        (async () => {
            try {
                const bins = await inventoryService.getBins();
                if (!bins || bins.length === 0) return;
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
                                rackBins.push({
                                    binId: bin.id, binCode: bin.code, level: l,
                                    currentItemCount: bin.currentItemCount || 0,
                                    isOccupied: bin.isOccupied || false,
                                    maxWeight: bin.maxWeight || 20,
                                });
                            }
                        }
                    } else {
                        // Auto-match: try matching bin codes by position pattern
                        const expectedCodes = generateRackBinInputs(rack);
                        for (let l = 0; l < levels; l++) {
                            const expected = expectedCodes[l];
                            if (!expected) continue;
                            const bin = bins.find(b => b.code === expected.code);
                            if (bin) {
                                rackBins.push({
                                    binId: bin.id, binCode: bin.code, level: l,
                                    currentItemCount: bin.currentItemCount || 0,
                                    isOccupied: bin.isOccupied || false,
                                    maxWeight: bin.maxWeight || 20,
                                });
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
            } catch (err) {
                console.warn('Could not fetch inventory data for 3D map:', err);
            }
        })();
    }, [objects]);

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
        if (!activePalette) return;
        pushHistory();
        const newObj: PlacedObject = {
            id: generateId(), type: activePalette.type,
            x, z, rotation: 0,
            width: activePalette.defaultWidth, depth: activePalette.defaultDepth,
            zoneType: ZONE_TYPE_MAP[activePalette.label] as any,
            rackLevels: activePalette.type === 'rack' ? 3 : undefined,
            label: activePalette.label, color: activePalette.color,
        };
        setObjects(prev => [...prev, newObj]);
        messageApi.success(`Placed ${activePalette.label}`);
    }, [activePalette, pushHistory, messageApi]);

    // Select object (supports multi-select with Shift)
    const handleSelectObject = useCallback((id: string, shiftKey: boolean = false) => {
        if (activePalette) return; // placing mode — don't select
        if (shiftKey) {
            // Multi-select: toggle this id in selectedIds
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) { next.delete(id); } else { next.add(id); }
                // Also add the current selectedId if there is one
                if (selectedId && selectedId !== id) next.add(selectedId);
                return next;
            });
            setSelectedId(id);
        } else {
            // Single select: clear multi-selection
            setSelectedIds(new Set());
            setSelectedId(prev => prev === id ? null : id);
        }
    }, [activePalette, selectedId]);

    // Delete selected (supports multi-select)
    const handleDelete = useCallback(() => {
        const ids = selectedIds.size > 0 ? selectedIds : (selectedId ? new Set([selectedId]) : new Set<string>());
        if (ids.size === 0) return;
        const hasLocked = objects.some(o => ids.has(o.id) && o.locked);
        if (hasLocked) { messageApi.warning('Some objects are locked'); return; }
        pushHistory();
        setObjects(prev => prev.filter(o => !ids.has(o.id)));
        setSelectedId(null);
        setSelectedIds(new Set());
        messageApi.info(`${ids.size} object${ids.size > 1 ? 's' : ''} deleted`);
    }, [selectedId, selectedIds, objects, pushHistory, messageApi]);

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
        const hasLocked = objects.some(o => ids.has(o.id) && o.locked);
        if (hasLocked) { messageApi.warning('Some objects are locked'); return; }
        pushHistory();
        setObjects(prev => prev.map(o =>
            ids.has(o.id) ? { ...o, x: Math.max(0, o.x + dx), z: Math.max(0, o.z + dz) } : o
        ));
    }, [selectedId, selectedIds, objects, pushHistory, messageApi]);

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
        const id = await saveLayout(objects, activeLayoutId || undefined);
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
        const objsToDup = objects.filter(o => ids.has(o.id));
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
                setClipboard(objects.filter(o => ids.has(o.id)));
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
    }, [buildMode, showHelp, objects, clipboard, selectedId, selectedIds, handleDelete, handleRotate, handleDuplicate, handleUndo, handleRedo, handleMove, pushHistory, messageApi]);

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#22c55e']}>Warehouse Builder</AuroraText>}
            subTitle={<DecryptedText text="Design your warehouse layout — drag, place, and customize like a sim game" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="save" icon={<SaveOutlined />} type="primary" onClick={handleSave}
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderColor: '#22c55e', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}>Save</Button>,
                <Tooltip key="saveas" title="Save as named layout">
                    <Button icon={<PlusOutlined />} onClick={() => { setSaveAsName(''); setSaveAsOpen(true); }}>Save As</Button>
                </Tooltip>,
                <Tooltip key="layouts" title="My saved layouts">
                    <Button icon={<AppstoreOutlined />} onClick={async () => { setSavedLayouts(await listLayouts()); setLayoutManagerOpen(true); }}>
                        Layouts{savedLayouts.length > 0 ? ` (${savedLayouts.length})` : ''}
                    </Button>
                </Tooltip>,
                <Space.Compact key="history">
                    <Tooltip title="Undo (Ctrl+Z)"><Button icon={<UndoOutlined />} onClick={handleUndo} disabled={history.length === 0} /></Tooltip>
                    <Tooltip title="Redo (Ctrl+Y)"><Button icon={<RedoOutlined />} onClick={handleRedo} disabled={redoHistory.length === 0} /></Tooltip>
                </Space.Compact>,
                <Space.Compact key="io">
                    <Tooltip title="Export JSON"><Button icon={<ExportOutlined />} onClick={handleExport} /></Tooltip>
                    <Tooltip title="Import JSON"><Button icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)} /></Tooltip>
                    <Tooltip title="Templates"><Button icon={<AppstoreAddOutlined />} onClick={() => setTemplateModalOpen(true)} /></Tooltip>
                    <Tooltip title="Screenshot"><Button icon={<CameraOutlined />} onClick={handleScreenshot} /></Tooltip>
                </Space.Compact>,
            ]}
        >
            {ctx}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ height: '100%' }}>

                {/* Main content */}
                <div style={{ display: 'flex', gap: 8, height: 'calc(100vh - 180px)', minHeight: 520 }}>
                    {/* Left: Build Palette (only in build mode) */}
                    <AnimatePresence>
                        {buildMode && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 210, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                style={{ flexShrink: 0, overflow: 'hidden' }}
                            >
                                <Card size="small" style={{ ...glass, height: '100%', overflowY: 'auto', color: t.text }}
                                    bodyStyle={{ padding: 10 }}
                                    title={
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 3, height: 14, borderRadius: 2, background: themeColor }} />
                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Object Palette</Text>
                                        </div>
                                    }
                                >
                                    {/* Category tabs */}
                                    <div style={{ display: 'flex', gap: 3, marginBottom: 10, flexWrap: 'wrap' }}>
                                        {['zone', 'storage', 'structure', 'equipment'].map(cat => (
                                            <div key={cat}
                                                onClick={() => setPaletteCategory(cat)}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                                                    background: paletteCategory === cat ? `${themeColor}25` : 'rgba(255,255,255,0.04)',
                                                    border: `1px solid ${paletteCategory === cat ? themeColor : 'rgba(255,255,255,0.06)'}`,
                                                    color: paletteCategory === cat ? themeColor : '#777',
                                                    transition: 'all 0.2s',
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
                                                <motion.div
                                                    key={item.label}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    onClick={() => {
                                                        setActivePalette(isActive ? null : item);
                                                        setSelectedId(null);
                                                    }}
                                                    style={{
                                                        padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                                                        background: isActive ? `${item.color}20` : 'rgba(255,255,255,0.03)',
                                                        border: `1.5px solid ${isActive ? item.color : 'transparent'}`,
                                                        boxShadow: isActive ? `0 0 12px ${item.color}30` : 'none',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    whileHover={{ scale: 1.02, backgroundColor: isActive ? undefined : 'rgba(255,255,255,0.06)' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{
                                                            width: 36, height: 36, borderRadius: 8,
                                                            background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 20, border: `1px solid ${item.color}30`,
                                                        }}>{item.icon}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <Text style={{ color: '#eee', fontSize: 11, fontWeight: 600, display: 'block' }}>{item.label}</Text>
                                                            <Text style={{ color: '#666', fontSize: 8, lineHeight: '1.2' }}>{item.description}</Text>
                                                        </div>
                                                        {isActive && (
                                                            <motion.div
                                                                animate={{ scale: [1, 1.3, 1] }}
                                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                                style={{ width: 6, height: 6, borderRadius: 6, background: item.color }}
                                                            />
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    <Divider style={{ borderColor: '#ffffff10', margin: '10px 0' }} />

                                    {/* Keyboard shortcuts */}
                                    <div style={{ ...panelSection('#555') }}>
                                        <Text style={{ color: '#555', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Shortcuts</Text>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginTop: 4 }}>
                                        {[
                                            ['R', 'Rotate'], ['D', 'Duplicate'], ['Del', 'Remove'], ['Esc', 'Deselect'],
                                            ['⌘Z', 'Undo'], ['⌘Y', 'Redo'], ['↑↓←→', 'Nudge'], ['Click', 'Place'],
                                        ].map(([key, desc]) => (
                                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
                                                <span style={{ fontSize: 7, padding: '1px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: 3, color: '#888', fontFamily: 'monospace', fontWeight: 700 }}>{key}</span>
                                                <span style={{ color: '#555', fontSize: 8 }}>{desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Center: 3D Viewport */}
                    <Card size="small" style={{ ...glass, flex: 1, overflow: 'hidden', padding: 0 }}
                        bodyStyle={{ padding: 0, height: '100%', background: t.viewportBg, borderRadius: 12, position: 'relative' }}>
                        <WarehouseScene
                            objects={objects}
                            selectedId={selectedId}
                            selectedIds={selectedIds}
                            ghostObj={ghostObj}
                            buildMode={buildMode}
                            gridCells={GRID_CELLS}
                            cameraPreset={cameraPreset}
                            onGridClick={handleGridClick}
                            onSelectObject={handleSelectObject}
                            routes={routes}
                            showRoutes={showRoutes}
                            animateRoutes={animateRoutes}
                            showGridOverlay={showGridOverlay}
                            isDark={isDark}
                            rackInventoryMap={rackInventoryMap}
                            highlightBin={highlightBin || undefined}
                            onShelfClick={(obj, level, bin) => setShelfTooltip({ obj, level, bin })}
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
                                                {shelfTooltip.bin.items.map((item, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                                                        <span style={{ color: t.textSecondary }}>{item.name}</span>
                                                        <span style={{ fontWeight: 600 }}>×{item.qty}</span>
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
                        {/* Floating toolbar at top-left */}
                        <div style={{
                            position: 'absolute', top: 10, left: 10,
                            display: 'flex', alignItems: 'center', gap: 6, zIndex: 10,
                        }}>
                            {/* Mode switch */}
                            <div style={{
                                display: 'flex', borderRadius: 10, overflow: 'hidden',
                                border: `1px solid ${t.toolbarBorder}`,
                                background: t.toolbarBg, backdropFilter: 'blur(8px)',
                            }}>
                                {[
                                    { mode: false, icon: <EyeOutlined />, label: 'View', color: '#22c55e' },
                                    { mode: true, icon: <EditOutlined />, label: 'Build', color: '#3b82f6' },
                                ].map(m => (
                                    <div key={m.label}
                                        onClick={() => { setBuildMode(m.mode); setActivePalette(null); setSelectedId(null); }}
                                        style={{
                                            padding: '5px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            background: buildMode === m.mode ? `${m.color}30` : 'transparent',
                                            color: buildMode === m.mode ? m.color : '#666',
                                            borderBottom: buildMode === m.mode ? `2px solid ${m.color}` : '2px solid transparent',
                                            transition: 'all 0.2s',
                                        }}>
                                        {m.icon} {m.label}
                                    </div>
                                ))}
                            </div>

                            {/* Active palette indicator */}
                            <AnimatePresence>
                                {buildMode && activePalette && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -8, scale: 0.9 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -8, scale: 0.9 }}
                                        style={{
                                            padding: '4px 12px', borderRadius: 8,
                                            background: `${activePalette.color}25`, border: `1px solid ${activePalette.color}50`,
                                            backdropFilter: 'blur(8px)',
                                            color: '#fff', fontSize: 10, fontWeight: 600,
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => setActivePalette(null)}
                                    >
                                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                                            {activePalette.icon}
                                        </motion.div>
                                        Placing: {activePalette.label}
                                        <span style={{ color: '#888', fontSize: 8 }}>✕</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Camera presets - right side */}
                        <div style={{
                            position: 'absolute', top: 10, right: 10,
                            display: 'flex', gap: 3, borderRadius: 10, overflow: 'hidden', zIndex: 10,
                            background: t.toolbarBg, backdropFilter: 'blur(8px)',
                            border: `1px solid ${t.toolbarBorder}`, padding: 3,
                        }}>
                            {[
                                { key: 'corner' as CameraPreset, label: '🎥', tip: 'Corner' },
                                { key: 'top' as CameraPreset, label: '⬇️', tip: 'Top' },
                                { key: 'front' as CameraPreset, label: '👤', tip: 'Front' },
                                { key: 'iso' as CameraPreset, label: '◆', tip: 'ISO' },
                            ].map(cp => (
                                <Tooltip key={cp.key} title={cp.tip}>
                                    <div onClick={() => setCameraPreset(cp.key)}
                                        style={{
                                            width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 11, cursor: 'pointer', borderRadius: 6,
                                            background: cameraPreset === cp.key ? `${themeColor}40` : 'transparent',
                                            color: '#fff', transition: 'all 0.2s',
                                            border: cameraPreset === cp.key ? `1px solid ${themeColor}60` : '1px solid transparent',
                                        }}>
                                        {cp.label}
                                    </div>
                                </Tooltip>
                            ))}
                            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />
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
                                        background: 'rgba(255,255,255,0.04)', color: '#888', transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.color = '#93c5fd'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#888'; }}>
                                    📷
                                </div>
                            </Tooltip>
                            <div style={{ width: 1, background: t.panelBorder, margin: '2px 0' }} />
                            <Tooltip title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
                                <div onClick={() => setDarkOverride(prev => prev === null ? !systemDark : !prev)}
                                    style={{
                                        width: 32, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                        background: 'rgba(255,255,255,0.04)', color: '#888', transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; e.currentTarget.style.color = '#fbbf24'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#888'; }}>
                                    {isDark ? '☀️' : '🌙'}
                                </div>
                            </Tooltip>
                        </div>

                        {/* Mini-map */}
                        <div style={{
                            position: 'absolute', bottom: 28, right: 10, zIndex: 5,
                            width: 120, height: 120, borderRadius: 10,
                            background: t.panelBg, border: `1px solid ${t.panelBorder}`,
                            overflow: 'hidden', padding: 5,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        }}>
                            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 6, overflow: 'hidden' }}>
                                {/* Grid pattern background */}
                                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: `${120 / 6}px ${120 / 6}px` }} />
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
                                            borderRadius: 1, border: isSel ? '1.5px solid #fff' : 'none',
                                            boxShadow: isSel ? `0 0 6px ${c}` : 'none',
                                            transition: 'box-shadow 0.3s',
                                        }} />
                                    );
                                })}
                            </div>
                            <div style={{ position: 'absolute', bottom: 2, left: 6, color: '#444', fontSize: 7, fontWeight: 600, letterSpacing: 1 }}>MINIMAP</div>
                        </div>


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
                                        <span onClick={() => setShowHelp(false)} style={{ cursor: 'pointer', color: '#666', fontSize: 16 }}>✕</span>
                                    </div>
                                    <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>BUILD MODE</div>
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
                                    <div style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 8 }}>GENERAL</div>
                                    {[
                                        ['?', 'Toggle this help overlay'],
                                        ['P', 'Screenshot (download PNG)'],
                                        ['Mouse Drag', 'Orbit camera'],
                                        ['Scroll', 'Zoom in/out'],
                                        ['Right Drag', 'Pan camera'],
                                    ].map(([key, desc]) => (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <span style={{ color: '#aaa', fontSize: 11 }}>{desc}</span>
                                            <kbd style={{
                                                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                                borderRadius: 4, padding: '1px 8px', fontSize: 10, fontFamily: 'monospace',
                                                color: '#ddd', fontWeight: 600,
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
                                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: t.textFaint, fontSize: 8 }}>Scroll·Orbit·Right-Pan</span>
                                    <span style={{ color: t.panelBorder }}>│</span>
                                    <span style={{ color: t.statsLabel }}>Score</span>
                                    <span style={{ color: analytics.efficiencyScore > 70 ? '#22c55e' : analytics.efficiencyScore > 40 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{analytics.efficiencyScore}</span>
                                    {buildMode && objects.length > 0 && (
                                        <>
                                            <span style={{ color: t.panelBorder }}>│</span>
                                            <Popconfirm title="Reset to default layout?" onConfirm={handleReset}>
                                                <span style={{ color: '#ef4444', fontSize: 8, cursor: 'pointer', fontWeight: 600 }}>✕ Reset</span>
                                            </Popconfirm>
                                        </>
                                    )}
                                </span>
                                <span onClick={() => setShowHelp(true)} style={{ cursor: 'pointer', color: t.textFaint, fontSize: 10, fontWeight: 700, padding: '0 4px', borderRadius: 3, border: `1px solid ${t.toolbarBorder}` }}>?</span>
                            </div>
                        )}

                        {/* View Mode Analytics Overlay */}
                        {!buildMode && (
                            <div style={{
                                position: 'absolute', top: 48, right: 10, zIndex: 8,
                                padding: 10, borderRadius: 10,
                                background: t.panelBg, backdropFilter: 'blur(8px)',
                                border: `1px solid ${t.panelBorder}`,
                                color: t.text, fontSize: 10, width: 180,
                                maxHeight: 'calc(100% - 48px - 160px)',
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
                                            <span style={{ fontSize: 8, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>EFFICIENCY</span>
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
                                                <div style={{ fontWeight: 600, fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>OCCUPANCY MAP</div>
                                                <div onClick={() => setShowGridOverlay(!showGridOverlay)}
                                                    style={{
                                                        padding: '1px 5px', borderRadius: 3, cursor: 'pointer', fontSize: 7, fontWeight: 700,
                                                        background: showGridOverlay ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                                                        color: showGridOverlay ? '#86efac' : '#555',
                                                        border: `1px solid ${showGridOverlay ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                                        transition: 'all 0.2s',
                                                    }}>
                                                    {showGridOverlay ? '🗺️ 3D ON' : '3D'}
                                                </div>
                                            </div>
                                            <div style={{
                                                width: '100%', aspectRatio: '1', borderRadius: 4, overflow: 'hidden',
                                                border: '1px solid rgba(255,255,255,0.08)',
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
                                                    <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 7, color: '#666' }}>
                                                        <span style={{ width: 5, height: 5, borderRadius: 1, background: x.c, display: 'inline-block', opacity: x.c === '#1a1a2e' ? 0.5 : 0.75 }} />
                                                        {x.l}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══ AI Route Planner Panel (View Mode) ═══ */}
                        {!buildMode && (
                            <div style={{
                                position: 'absolute', bottom: 28, left: 10, zIndex: 6,
                                borderRadius: 12,
                                background: t.panelBg, backdropFilter: 'blur(12px)',
                                border: `1px solid ${t.panelBorder}`,
                                color: t.text, fontSize: 10,
                                overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
                                            <div style={{ color: '#666', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>QUICK ROUTES</div>
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
                                                                background: hasZones ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                                                                border: `1px solid ${hasZones ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'}`,
                                                                opacity: hasZones ? 1 : 0.4,
                                                                transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={e => hasZones && (e.currentTarget.style.background = `${pr.color}15`)}
                                                            onMouseLeave={e => (e.currentTarget.style.background = hasZones ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)')}
                                                        >
                                                            <span style={{ fontSize: 14 }}>{pr.icon}</span>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 700, fontSize: 10, color: hasZones ? '#eee' : '#555' }}>{pr.label}</div>
                                                                <div style={{ fontSize: 8, color: '#666' }}>{pr.description}</div>
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
                                                    <div style={{ color: '#666', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>ADD ZONES TO ROUTE</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                        {getAllZonesAsStops(objects).map((zone, i) => {
                                                            const alreadyAdded = customStops.some(s => s.label === zone.label && s.x === zone.x && s.z === zone.z);
                                                            return (
                                                                <div key={`z-${i}`}
                                                                    onClick={() => !alreadyAdded && setCustomStops(prev => [...prev, zone])}
                                                                    style={{
                                                                        padding: '3px 8px', borderRadius: 6, cursor: alreadyAdded ? 'default' : 'pointer',
                                                                        background: alreadyAdded ? `${zone.color}20` : 'rgba(255,255,255,0.04)',
                                                                        border: `1px solid ${alreadyAdded ? zone.color + '40' : 'rgba(255,255,255,0.06)'}`,
                                                                        color: alreadyAdded ? zone.color : '#aaa',
                                                                        fontSize: 8, fontWeight: 600, opacity: alreadyAdded ? 0.6 : 1,
                                                                        transition: 'all 0.15s',
                                                                    }}
                                                                    onMouseEnter={e => !alreadyAdded && (e.currentTarget.style.background = `${zone.color}15`)}
                                                                    onMouseLeave={e => !alreadyAdded && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                                                >
                                                                    <span style={{ width: 6, height: 6, borderRadius: 3, background: zone.color, display: 'inline-block', marginRight: 4 }} />
                                                                    {zone.label}
                                                                    {alreadyAdded && ' ✓'}
                                                                </div>
                                                            );
                                                        })}
                                                        {getAllZonesAsStops(objects).length === 0 && (
                                                            <div style={{ color: '#555', fontSize: 8, fontStyle: 'italic', padding: 4 }}>No zones placed. Add zones in Build Mode first.</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Stop order */}
                                                {customStops.length > 0 && (
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                            <div style={{ color: '#666', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>STOP ORDER ({customStops.length})</div>
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
                                                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                                                }}>
                                                                    <span style={{
                                                                        width: 16, height: 16, borderRadius: 8, fontSize: 8, fontWeight: 900,
                                                                        background: `${stop.color}30`, color: stop.color, display: 'flex',
                                                                        alignItems: 'center', justifyContent: 'center',
                                                                    }}>{i + 1}</span>
                                                                    <span style={{ flex: 1, fontSize: 9, fontWeight: 600, color: '#ccc' }}>{stop.label}</span>
                                                                    <div style={{ display: 'flex', gap: 2 }}>
                                                                        {i > 0 && (
                                                                            <span onClick={() => { const n = [...customStops]; [n[i-1], n[i]] = [n[i], n[i-1]]; setCustomStops(n); }}
                                                                                style={{ cursor: 'pointer', color: '#555', fontSize: 9, padding: '0 2px' }}>▲</span>
                                                                        )}
                                                                        {i < customStops.length - 1 && (
                                                                            <span onClick={() => { const n = [...customStops]; [n[i], n[i+1]] = [n[i+1], n[i]]; setCustomStops(n); }}
                                                                                style={{ cursor: 'pointer', color: '#555', fontSize: 9, padding: '0 2px' }}>▼</span>
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
                                                    <div style={{ color: '#555', fontSize: 8, fontStyle: 'italic', textAlign: 'center', padding: 4 }}>Add at least 2 zones to compute a route</div>
                                                )}
                                            </div>
                                        )}

                                        {/* Controls */}
                                        {routes.length > 0 && (
                                            <>
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 4 }}>
                                                    <div style={{ color: '#666', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>CONTROLS</div>
                                                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                                        <div onClick={() => setShowRoutes(!showRoutes)}
                                                            style={{
                                                                flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                                                                background: showRoutes ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                                                                border: `1px solid ${showRoutes ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                                color: showRoutes ? '#86efac' : '#666', fontWeight: 600, fontSize: 9,
                                                            }}>
                                                            {showRoutes ? '👁️ Visible' : '🚫 Hidden'}
                                                        </div>
                                                        <div onClick={() => setAnimateRoutes(!animateRoutes)}
                                                            style={{
                                                                flex: 1, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                                                                background: animateRoutes ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                                                                border: `1px solid ${animateRoutes ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                                color: animateRoutes ? '#93c5fd' : '#666', fontWeight: 600, fontSize: 9,
                                                            }}>
                                                            {animateRoutes ? '📦 Animate' : '⏸ Paused'}
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
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                        <div style={{ color: '#666', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>ACTIVE ROUTES ({routes.length})</div>
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
                                                                    <div style={{ color: '#555', fontSize: 6.5, fontWeight: 600 }}>SHORTEST</div>
                                                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#86efac' }}>
                                                                        {Math.min(...routes.map(r => r.metrics.totalDistance)).toFixed(1)}u
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: '#555', fontSize: 6.5, fontWeight: 600 }}>LONGEST</div>
                                                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#fca5a5' }}>
                                                                        {Math.max(...routes.map(r => r.metrics.totalDistance)).toFixed(1)}u
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: '#555', fontSize: 6.5, fontWeight: 600 }}>AVG TIME</div>
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
                                                                    }} style={{ cursor: 'pointer', color: '#666', fontSize: 10, transition: 'color 0.15s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#666'}>⇄</span>
                                                                    {/* Delete route */}
                                                                    <span onClick={() => setRoutes(prev => prev.filter(r => r.id !== route.id))}
                                                                        style={{ cursor: 'pointer', color: '#666', fontSize: 9, transition: 'color 0.15s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                                    onMouseLeave={e => e.currentTarget.style.color = '#666'}>✕</span>
                                                                </div>
                                                            </div>
                                                            {/* Metrics grid */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                                                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px' }}>
                                                                    <div style={{ color: '#555', fontSize: 7, fontWeight: 600 }}>DISTANCE</div>
                                                                    <div style={{ color: '#ccc', fontSize: 11, fontWeight: 700 }}>{route.metrics.totalDistance}u</div>
                                                                </div>
                                                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px' }}>
                                                                    <div style={{ color: '#555', fontSize: 7, fontWeight: 600 }}>EST. TIME</div>
                                                                    <div style={{ color: '#ccc', fontSize: 11, fontWeight: 700 }}>{(route.metrics.totalDistance / 2.2).toFixed(0)}s</div>
                                                                </div>
                                                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px' }}>
                                                                    <div style={{ color: '#555', fontSize: 7, fontWeight: 600 }}>TURNS</div>
                                                                    <div style={{ color: '#ccc', fontSize: 11, fontWeight: 700 }}>{route.metrics.turns}</div>
                                                                </div>
                                                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px' }}>
                                                                    <div style={{ color: '#555', fontSize: 7, fontWeight: 600 }}>STOPS</div>
                                                                    <div style={{ color: '#ccc', fontSize: 11, fontWeight: 700 }}>{route.stops.length}</div>
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
                                                                        {si < route.stops.length - 1 && <span style={{ color: '#444', fontSize: 8 }}>→</span>}
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
                    </Card>

                    {/* Right: Properties panel (when object selected in build mode) */}
                    <AnimatePresence>
                        {buildMode && selectedObj && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 230, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                style={{ flexShrink: 0, overflow: 'hidden' }}
                            >
                                <Card size="small" style={{ ...glass, height: '100%', overflowY: 'auto' }}
                                    bodyStyle={{ padding: 12 }}
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 3, height: 14, borderRadius: 2, background: '#3b82f6' }} />
                                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Properties</Text>
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
                                                    <div style={{ color: '#888', fontSize: 8, marginTop: 1 }}>📍 {gridCoordsLabel(selectedObj.x, selectedObj.z)}</div>
                                                </div>
                                            </div>
                                            <Input size="small" value={selectedObj.label || ''}
                                                onChange={e => handleLabelChange(e.target.value)}
                                                placeholder="Enter label..."
                                                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, borderRadius: 6 }} />
                                        </div>
                                        {/* Position */}
                                        <div style={{ ...panelSection('#666') }}>
                                            <Text style={{ color: '#555', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Position</Text>
                                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                                {[
                                                    { label: 'X', value: selectedObj.x },
                                                    { label: 'Z', value: selectedObj.z },
                                                    { label: 'R', value: `${selectedObj.rotation}°` },
                                                ].map(p => (
                                                    <div key={p.label} style={{
                                                        flex: 1, textAlign: 'center', padding: '4px 0',
                                                        background: 'rgba(255,255,255,0.04)', borderRadius: 6,
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                    }}>
                                                        <div style={{ color: '#555', fontSize: 7, fontWeight: 600 }}>{p.label}</div>
                                                        <div style={{ color: '#ccc', fontSize: 12, fontWeight: 700 }}>{p.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Zone type selector */}
                                        {selectedObj.type === 'zone' && (
                                            <div style={{ ...panelSection('#a855f7') }}>
                                                <Text style={{ color: '#555', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Zone Type</Text>
                                                <Select size="small" value={selectedObj.zoneType || 'storage'}
                                                    onChange={(v: ZoneType) => handleZoneTypeChange(v)}
                                                    style={{ width: '100%', marginTop: 4 }}
                                                    options={ZONE_TYPES.map(z => ({ value: z.value, label: z.label }))}
                                                />
                                            </div>
                                        )}
                                        {/* Color picker */}
                                        <div style={{ ...panelSection('#e87722') }}>
                                            <Text style={{ color: '#555', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Color</Text>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                                {COLOR_PRESETS.map(c => (
                                                    <div key={c} onClick={() => handleColorChange(c)}
                                                        style={{
                                                            width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer',
                                                            border: selectedObj.color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                                                            boxShadow: selectedObj.color === c ? `0 0 8px ${c}60` : 'none',
                                                            transition: 'all 0.15s',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                                                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {/* Size (for zones/walls) */}
                                        {(selectedObj.type === 'zone' || selectedObj.type === 'wall' || selectedObj.type === 'conveyor') && (
                                            <div style={{ ...panelSection('#22c55e') }}>
                                                <Text style={{ color: '#555', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Dimensions</Text>
                                                <div style={{ marginTop: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ color: '#666', fontSize: 8, width: 30 }}>W</span>
                                                        <Slider min={1} max={10} value={selectedObj.width} onChange={v => handleResize('width', v)}
                                                            style={{ flex: 1 }} trackStyle={{ background: '#22c55e' }} handleStyle={{ borderColor: '#22c55e' }} />
                                                        <span style={{ color: '#aaa', fontSize: 10, width: 16 }}>{selectedObj.width}</span>
                                                    </div>
                                                    {selectedObj.type === 'zone' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ color: '#666', fontSize: 8, width: 30 }}>D</span>
                                                            <Slider min={1} max={10} value={selectedObj.depth} onChange={v => handleResize('depth', v)}
                                                                style={{ flex: 1 }} trackStyle={{ background: '#22c55e' }} handleStyle={{ borderColor: '#22c55e' }} />
                                                            <span style={{ color: '#aaa', fontSize: 10, width: 16 }}>{selectedObj.depth}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {/* Rack levels */}
                                        {selectedObj.type === 'rack' && (
                                            <div style={{ ...panelSection('#e87722') }}>
                                                <Text style={{ color: '#555', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Rack Levels</Text>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                    <Slider min={1} max={6} value={selectedObj.rackLevels || 3} onChange={v => handleRackLevels(v)}
                                                        style={{ flex: 1 }} trackStyle={{ background: '#e87722' }} handleStyle={{ borderColor: '#e87722' }} />
                                                    <span style={{ color: '#e87722', fontSize: 14, fontWeight: 700, width: 16 }}>{selectedObj.rackLevels || 3}</span>
                                                </div>
                                            </div>
                                        )}

                                        <Divider style={{ borderColor: '#ffffff08', margin: '6px 0' }} />

                                        {/* Actions */}
                                        <div style={{ ...panelSection('#3b82f6') }}>
                                            <Text style={{ color: '#555', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Actions</Text>
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
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', borderRadius: 8 }} />
                                            <div />
                                            <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => handleMove(-1, 0)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', borderRadius: 8 }} />
                                            <div style={{ width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <DragOutlined />
                                            </div>
                                            <Button size="small" icon={<ArrowRightOutlined />} onClick={() => handleMove(1, 0)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', borderRadius: 8 }} />
                                            <div />
                                            <Button size="small" icon={<ArrowDownOutlined />} onClick={() => handleMove(0, 1)}
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', borderRadius: 8 }} />
                                            <div />
                                        </div>

                                        <Divider style={{ borderColor: '#ffffff06', margin: '4px 0' }} />

                                        {/* Lock + Delete + Auto */}
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <Button size="small"
                                                icon={selectedObj.locked ? <LockOutlined /> : <UnlockOutlined />}
                                                onClick={handleLock}
                                                style={{
                                                    flex: 1, borderRadius: 8,
                                                    background: selectedObj.locked ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)',
                                                    borderColor: selectedObj.locked ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)',
                                                    color: selectedObj.locked ? '#fca5a5' : '#777',
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
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

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
                        <Card key={t.name} size="small" hoverable style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                            onClick={() => handleApplyTemplate(t)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                                    border: '1px solid #e2e8f0',
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
                            <Card key={layout.id} size="small" hoverable style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}>
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
        </CMSLayout>
    );
}
