'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input, Tree, Spin, Tooltip, Empty, Progress } from 'antd';
import {
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
  DatabaseOutlined,
  AimOutlined,
  ReloadOutlined,
  CloseOutlined,
  StarOutlined,
  StarFilled,
  ClockCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { inventoryService } from '@/lib/inventoryService';
import type { InvWarehouse, InvZone, InvBin, InvItem, StockLedgerEntry } from '@/lib/inventoryService';

// ─── Types ───────────────────────────────────────────────

interface ExplorerPanelProps {
  isDark: boolean;
  themeColor: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLocateBin: (binCode: string) => void;
  onSelectBin: (bin: any) => void;
  selectedWarehouseId: string | null;
}

interface ItemResult {
  itemId: string;
  itemName: string;
  sku: string;
  binCode: string;
  qty: number;
  warehouseId?: string;
  warehouseName?: string;
  zoneName?: string;
  zoneType?: string;
}

type TabKey = 'locations' | 'items';

// ─── Zone Colors ─────────────────────────────────────────
const ZONE_COLORS: Record<string, string> = {
  receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
  packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
  staging: '#d97706', hazardous: '#dc2626', climate_controlled: '#4f46e5',
};

const ZONE_ICONS: Record<string, string> = {
  receiving: '📥', storage: '📦', picking: '🎯',
  packing: '📋', shipping: '🚚', cold: '❄️', quarantine: '⚠️',
  staging: '⏳', hazardous: '☢️', climate_controlled: '🌡️',
};

// ─── Theme tokens ────────────────────────────────────────

const makeThemeTokens = (dark: boolean) => ({
  panelBg: dark ? 'rgba(12,12,30,0.95)' : 'rgba(255,255,255,0.92)',
  panelBorder: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  text: dark ? '#fff' : '#1a1a2e',
  textSecondary: dark ? '#aaa' : '#555',
  textMuted: dark ? '#666' : '#999',
  textFaint: dark ? '#444' : '#ccc',
  cardBg: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
  cardBgHover: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  cardBgActive: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
  inputBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  inputBorder: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
  statsBarBg: dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)',
  statsBarBorder: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  divider: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  accent: dark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
});

// ─── Helpers ─────────────────────────────────────────────

const binStatusColor = (bin: InvBin): string => {
  if (bin.status === 'reserved') return '#ef4444';
  if (bin.status === 'maintenance') return '#f59e0b';
  if (bin.isOccupied || (bin.currentItemCount && bin.currentItemCount > 0)) return '#3b82f6';
  if (bin.status === 'active') return '#22c55e';
  return '#666';
};

const binStatusLabel = (bin: InvBin): string => {
  if (bin.status === 'reserved') return 'Reserved';
  if (bin.status === 'maintenance') return 'Maintenance';
  if (bin.isOccupied || (bin.currentItemCount && bin.currentItemCount > 0)) return 'Occupied';
  if (bin.status === 'active') return 'Available';
  return 'Empty';
};

// ─── Component ───────────────────────────────────────────

export default function ExplorerPanel({
  isDark,
  themeColor,
  collapsed,
  onToggleCollapse,
  onLocateBin,
  onSelectBin,
  selectedWarehouseId,
}: ExplorerPanelProps) {
  const t = useMemo(() => makeThemeTokens(isDark), [isDark]);

  // ─── Internal State ─────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('locations');
  const [loading, setLoading] = useState(false);

  // Location tree data
  const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
  const [zones, setZones] = useState<InvZone[]>([]);
  const [bins, setBins] = useState<InvBin[]>([]);
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedBin, setSelectedBin] = useState<InvBin | null>(null);
  const [selectedZone, setSelectedZone] = useState<InvZone | null>(null);

  // Items tab data
  const [items, setItems] = useState<InvItem[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({ totalBins: 0, utilization: 0, totalItems: 0, occupiedBins: 0, totalOnHand: 0, availableBins: 0 });

  // Bin contents map: binId -> [{itemName, sku, qty}]
  const [binContentsMap, setBinContentsMap] = useState<Map<string, Array<{ itemName: string; sku: string; qty: number }>>>(new Map());

  // Favorites & Recents (localStorage-backed)
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentBins, setRecentBins] = useState<string[]>([]);

  // Load favorites & recents from localStorage on mount
  useEffect(() => {
    try {
      const fav = localStorage.getItem('wh-explorer-favorites');
      if (fav) setFavorites(JSON.parse(fav));
      const rec = localStorage.getItem('wh-explorer-recents');
      if (rec) setRecentBins(JSON.parse(rec));
    } catch { /* ignore */ }
  }, []);

  const toggleFavorite = useCallback((binCode: string) => {
    setFavorites(prev => {
      const next = prev.includes(binCode)
        ? prev.filter(c => c !== binCode)
        : [binCode, ...prev].slice(0, 20);
      try { localStorage.setItem('wh-explorer-favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const addToRecent = useCallback((binCode: string) => {
    setRecentBins(prev => {
      const next = [binCode, ...prev.filter(c => c !== binCode)].slice(0, 10);
      try { localStorage.setItem('wh-explorer-recents', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecentBins([]);
    try { localStorage.removeItem('wh-explorer-recents'); } catch {}
  }, []);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load data ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [whs, allZones, allBins, allItems, allLedger, allBinContents] = await Promise.all([
        inventoryService.getWarehouses().catch(() => []),
        inventoryService.getZones(selectedWarehouseId || undefined).catch(() => []),
        inventoryService.getBins().catch(() => []),
        inventoryService.getItems().catch(() => []),
        inventoryService.getStockLedger().catch(() => []),
        inventoryService.getBinContents().catch(() => []),
      ]);

      setWarehouses(whs);

      const filteredZones = selectedWarehouseId
        ? allZones.filter(z => z.warehouseId === selectedWarehouseId)
        : allZones;
      setZones(filteredZones);

      const zoneIdSet = new Set(filteredZones.map(z => z.id));
      const filteredBins = selectedWarehouseId
        ? allBins.filter(b => zoneIdSet.has(b.zoneId))
        : allBins;
      setBins(filteredBins);

      setItems(allItems);
      setLedger(allLedger);

      // Build bin contents lookup: binId -> [{itemName, sku, qty}]
      const itemLookup = new Map(allItems.map((i: any) => [i.id, { name: i.name || 'Unknown', sku: i.sku || '' }]));
      const bcMap = new Map<string, Array<{ itemName: string; sku: string; qty: number }>>();
      for (const bc of allBinContents) {
        if (!bcMap.has(bc.binId)) bcMap.set(bc.binId, []);
        const item = itemLookup.get(bc.itemId);
        bcMap.get(bc.binId)!.push({
          itemName: item?.name || 'Unknown Item',
          sku: item?.sku || '',
          qty: bc.quantity || 0,
        });
      }
      setBinContentsMap(bcMap);

      // Compute stats
      const totalBins = filteredBins.length;
      const occupiedBins = filteredBins.filter(
        b => b.isOccupied || (b.currentItemCount && b.currentItemCount > 0)
      ).length;
      const availableBins = filteredBins.filter(b => b.status === 'active' && !b.isOccupied && !(b.currentItemCount && b.currentItemCount > 0)).length;
      const utilization = totalBins > 0 ? Math.round((occupiedBins / totalBins) * 100) : 0;
      const totalOnHand = allLedger.reduce((s, l) => s + (l.onHand || 0), 0);
      setStats({ totalBins, utilization, totalItems: allItems.length, occupiedBins, totalOnHand, availableBins });

      // Auto-expand first warehouse
      if (whs.length > 0 && expandedKeys.length === 0) {
        setExpandedKeys([`wh-${whs[0].id}`]);
      }
    } catch (err) {
      console.warn('ExplorerPanel: failed to load data', err);
    }
    setLoading(false);
  }, [selectedWarehouseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Build tree data ────────────────────────────────
  const treeData = useMemo(() => {
    const q = treeSearch.toLowerCase();

    const whsToShow = selectedWarehouseId
      ? warehouses.filter(w => w.id === selectedWarehouseId)
      : warehouses;

    return whsToShow.map(wh => {
      const whZones = zones.filter(z => z.warehouseId === wh.id);
      const whZoneIds = new Set(whZones.map(z => z.id));
      const whBins = bins.filter(b => whZoneIds.has(b.zoneId));

      const zoneNodes = whZones.map(zone => {
        const zoneBins = whBins.filter(b => b.zoneId === zone.id);
        const binCount = zoneBins.length;
        const zoneColor = ZONE_COLORS[zone.zoneType || 'storage'] || '#3b82f6';
        const zoneIcon = ZONE_ICONS[zone.zoneType || 'storage'] || '📦';
        const occupied = zoneBins.filter(b => b.isOccupied || (b.currentItemCount && b.currentItemCount > 0)).length;
        const util = binCount > 0 ? Math.round((occupied / binCount) * 100) : 0;

        // Group bins by aisle
        const aisleMap = new Map<string, InvBin[]>();
        for (const bin of zoneBins) {
          const aisle = bin.aisle || 'Default';
          if (!aisleMap.has(aisle)) aisleMap.set(aisle, []);
          aisleMap.get(aisle)!.push(bin);
        }

        const aisleNodes = Array.from(aisleMap.entries()).map(([aisle, aisleBins]) => {
          // Group by rack within aisle
          const rackMap = new Map<string, InvBin[]>();
          for (const bin of aisleBins) {
            const rack = bin.rack || 'Default';
            if (!rackMap.has(rack)) rackMap.set(rack, []);
            rackMap.get(rack)!.push(bin);
          }

          const rackNodes = Array.from(rackMap.entries()).map(([rack, rackBins]) => {
            const binNodes = rackBins
              .filter(bin => !q || bin.code.toLowerCase().includes(q))
              .map(bin => {
                const binItems = binContentsMap.get(bin.id) || [];
                const itemChildren = binItems.map((itm, idx) => ({
                  key: `binitem-${bin.id}-${idx}`,
                  title: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, padding: '1px 0' }}>
                      <span style={{ fontSize: 10 }}>📦</span>
                      <span style={{ color: t.text, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {itm.itemName.length > 22 ? itm.itemName.slice(0, 22) + '…' : itm.itemName}
                      </span>
                      {itm.sku && <span style={{ color: t.textFaint, fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>{itm.sku}</span>}
                      <span style={{ color: '#22c55e', fontSize: 9, fontWeight: 700, marginLeft: 'auto', whiteSpace: 'nowrap' }}>×{itm.qty}</span>
                    </span>
                  ),
                  isLeaf: true,
                }));

                return {
                  key: `bin-${bin.id}`,
                  title: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, padding: '1px 0' }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: binStatusColor(bin),
                        boxShadow: `0 0 4px ${binStatusColor(bin)}60`,
                        flexShrink: 0,
                      }} />
                      <span style={{ color: t.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, fontSize: 11 }}>{bin.code}</span>
                      {bin.level && <span style={{ color: t.textFaint, fontSize: 9 }}>{bin.level}</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                        {(bin.currentItemCount || 0) > 0 && (
                          <span style={{
                            fontSize: 8.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                            background: '#3b82f620', color: '#3b82f6',
                            borderRadius: 4, padding: '0px 4px', minWidth: 16, textAlign: 'center',
                          }}>
                            {bin.currentItemCount}
                          </span>
                        )}
                        {binItems.length > 0 && (
                          <span style={{
                            fontSize: 8, fontWeight: 700,
                            background: '#22c55e20', color: '#22c55e',
                            borderRadius: 4, padding: '0px 4px',
                          }}>
                            {binItems.length} item{binItems.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{ color: t.textMuted, fontSize: 9 }}>
                          {binStatusLabel(bin)}
                        </span>
                      </span>
                    </span>
                  ),
                  isLeaf: itemChildren.length === 0,
                  children: itemChildren.length > 0 ? itemChildren : undefined,
                  bin,
                };
              });

            if (q && binNodes.length === 0) return null;

            const rackOccupied = rackBins.filter(b => b.isOccupied || (b.currentItemCount && b.currentItemCount > 0)).length;

            return {
              key: `rack-${zone.id}-${aisle}-${rack}`,
              title: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>⬜</span>
                  <span style={{ color: t.text, fontWeight: 500 }}>Rack {rack}</span>
                  <span style={{
                    color: t.textMuted, fontSize: 9, marginLeft: 'auto',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <span style={{
                      background: rackOccupied > 0 ? `${zoneColor}20` : t.cardBg,
                      color: rackOccupied > 0 ? zoneColor : t.textMuted,
                      borderRadius: 6, padding: '0px 5px', fontSize: 9, fontWeight: 600,
                    }}>
                      {rackOccupied}/{rackBins.length}
                    </span>
                  </span>
                </span>
              ),
              children: binNodes,
            };
          }).filter(Boolean);

          if (q && rackNodes.length === 0) return null;

          return {
            key: `aisle-${zone.id}-${aisle}`,
            title: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
                <span style={{ fontSize: 10, opacity: 0.7 }}>↕️</span>
                <span style={{ color: t.text, fontWeight: 500 }}>Aisle {aisle}</span>
                <span style={{
                  color: t.textMuted, fontSize: 9, marginLeft: 'auto',
                  background: t.cardBg, borderRadius: 6, padding: '0px 5px',
                }}>
                  {aisleBins.length}
                </span>
              </span>
            ),
            children: rackNodes,
          };
        }).filter(Boolean);

        if (q && aisleNodes.length === 0) return null;

        return {
          key: `zone-${zone.id}`,
          title: (
            <span
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '1px 0' }}
              onClick={() => setSelectedZone(zone)}
            >
              <span style={{
                width: 4, height: 20, borderRadius: 2,
                background: `linear-gradient(180deg, ${zoneColor}, ${zoneColor}80)`,
                flexShrink: 0,
              }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
                <span style={{ color: t.text, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  {zone.name || zone.code}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                  <span style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: t.cardBg, overflow: 'hidden', maxWidth: 80,
                  }}>
                    <span style={{
                      width: `${util}%`, height: '100%', borderRadius: 2,
                      background: util > 80 ? '#ef4444' : util > 50 ? '#f59e0b' : zoneColor,
                      transition: 'width 0.3s',
                    }} />
                  </span>
                  <span style={{ fontSize: 8, color: t.textMuted, fontWeight: 600 }}>{util}%</span>
                </span>
              </span>
              <span style={{
                color: zoneColor, fontSize: 9, marginLeft: 'auto',
                background: `${zoneColor}15`, borderRadius: 6, padding: '1px 6px',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
              }}>
                {zoneIcon} {binCount}
              </span>
            </span>
          ),
          children: aisleNodes,
        };
      }).filter(Boolean);

      return {
        key: `wh-${wh.id}`,
        title: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '2px 0' }}>
            <span style={{ fontSize: 13 }}>🏭</span>
            <span style={{ color: t.text, fontWeight: 700 }}>{wh.name || wh.code}</span>
            <span style={{
              color: t.textMuted, fontSize: 9, marginLeft: 'auto',
              background: t.cardBg, borderRadius: 6, padding: '1px 6px',
            }}>
              {whZones.length} zones
            </span>
          </span>
        ),
        children: zoneNodes,
      };
    });
  }, [warehouses, zones, bins, treeSearch, selectedWarehouseId, t, binContentsMap]);

  // ─── Handle tree node select ────────────────────────
  const handleTreeSelect = useCallback((_keys: React.Key[], info: any) => {
    const node = info.node;
    if (node?.bin) {
      const bin = node.bin as InvBin;
      setSelectedBin(bin);
      onSelectBin(bin);
      onLocateBin(bin.code);
      addToRecent(bin.code);
    }
  }, [onSelectBin, onLocateBin, addToRecent]);

  // ─── Items search with debounce ─────────────────────
  const performItemSearch = useCallback((query: string) => {
    if (!query || query.length < 2) {
      setItemResults([]);
      return;
    }

    setItemsLoading(true);
    const q = query.toLowerCase();


    const results: ItemResult[] = [];
    const coveredItemIds = new Set<string>();
    const zoneMap = new Map(zones.map(z => [z.id, z]));
    const whMap = new Map(warehouses.map(w => [w.id, w]));
    const whByCode = new Map(warehouses.map(w => [w.code, w]));
    const binIdMap = new Map(bins.map(b => [b.id, b]));

    // Priority 0: Search bin contents (real item-bin mappings)
    for (const [binId, binItems] of binContentsMap.entries()) {
      for (const bi of binItems) {
        const nameMatch = bi.itemName.toLowerCase().includes(q);
        const skuMatch = bi.sku ? bi.sku.toLowerCase().includes(q) : false;
        if (!nameMatch && !skuMatch) continue;
        const bin = binIdMap.get(binId);
        const zone = bin ? zoneMap.get(bin.zoneId) : null;
        const wh = zone ? warehouses.find(w => w.id === zone.warehouseId) : null;
        results.push({
          itemId: '', // Not needed for display
          itemName: bi.itemName,
          sku: bi.sku || '—',
          binCode: bin?.code || '—',
          qty: bi.qty,
          warehouseId: wh?.id,
          warehouseName: wh?.name || wh?.code,
          zoneName: zone?.name || '',
          zoneType: zone?.zoneType || 'storage',
        });
      }
    }

    // Build per-warehouse bin pools for round-robin
    const whBinPools = new Map<string, InvBin[]>();
    const whBinCounters = new Map<string, number>();

    for (const wh of warehouses) {
      const whZones = zones.filter(z => z.warehouseId === wh.id);
      const storageBins = bins.filter(b => {
        const z = zoneMap.get(b.zoneId);
        return z && z.warehouseId === wh.id &&
          ['storage', 'picking', 'cold', 'hazardous', 'climate_controlled'].includes(z.zoneType || '');
      });
      const allWhBins = bins.filter(b => whZones.some(z => z.id === b.zoneId));
      const pool = storageBins.length > 0 ? storageBins : allWhBins;
      whBinPools.set(wh.id, pool);
      whBinCounters.set(wh.id, 0);
      if (wh.code) {
        whBinPools.set(wh.code, pool);
        whBinCounters.set(wh.code, 0);
      }
    }

    // Search ledger with round-robin bin assignment
    for (const entry of ledger) {
      if (coveredItemIds.has(entry.itemId)) continue;
      const item = items.find(i => i.id === entry.itemId);
      if (!item) continue;
      if (!item.name?.toLowerCase().includes(q) && !item.sku?.toLowerCase().includes(q)) continue;

      const wh = entry.warehouseId
        ? (whMap.get(entry.warehouseId) || whByCode.get(entry.warehouseId) || null)
        : null;
      const pool = entry.warehouseId
        ? (whBinPools.get(entry.warehouseId) || (wh ? whBinPools.get(wh.id) : null))
        : null;

      let binCode = '—';
      let zoneName = '';
      let zoneType = '';

      if (pool && pool.length > 0) {
        const counterKey = wh?.id || entry.warehouseId!;
        const idx = whBinCounters.get(counterKey) || 0;
        const assignedBin = pool[idx % pool.length];
        binCode = assignedBin?.code || '—';
        const zone = assignedBin ? zoneMap.get(assignedBin.zoneId) : null;
        zoneName = zone?.name || '';
        zoneType = zone?.zoneType || 'storage';
        whBinCounters.set(counterKey, idx + 1);
      }

      results.push({
        itemId: item.id,
        itemName: item.name || 'Unknown',
        sku: item.sku || '—',
        binCode,
        qty: entry.onHand || 0,
        warehouseId: wh?.id,
        warehouseName: wh?.name || wh?.code,
        zoneName,
        zoneType,
      });
      coveredItemIds.add(entry.itemId);
    }

    // Search items not in ledger
    for (const item of items) {
      if (coveredItemIds.has(item.id)) continue;
      if (!item.name?.toLowerCase().includes(q) && !item.sku?.toLowerCase().includes(q)) continue;
      results.push({
        itemId: item.id,
        itemName: item.name || 'Unknown',
        sku: item.sku || '—',
        binCode: '—',
        qty: 0,
      });
      coveredItemIds.add(item.id);
    }

    setItemResults(results.slice(0, 50));
    setItemsLoading(false);
  }, [items, ledger, zones, bins, warehouses, binContentsMap]);

  const handleItemSearchChange = useCallback((val: string) => {
    setItemSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => performItemSearch(val), 300);
  }, [performItemSearch]);
  // ─── Render ─────────────────────────────────

  return (
    <div
      style={{
        flexShrink: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: t.panelBg,
      }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px 8px 14px',
        borderBottom: `1px solid ${t.divider}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${themeColor}25, ${themeColor}08)`,
            border: `1px solid ${themeColor}15`,
          }}>
            <ApartmentOutlined style={{ color: themeColor, fontSize: 14 }} />
          </div>
          <span style={{
            color: t.text, fontWeight: 700, fontSize: 13.5, letterSpacing: 0.3,
          }}>
            Explorer
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tooltip title="Refresh">
            <div
              onClick={(e) => { e.stopPropagation(); loadData(); }}
              style={{
                width: 24, height: 24, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: t.textMuted, fontSize: 11,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = themeColor; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
            >
              <ReloadOutlined spin={loading} />
            </div>
          </Tooltip>
          <Tooltip title="Collapse">
            <div
              onClick={onToggleCollapse}
              style={{
                width: 24, height: 24, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: t.textMuted,
                background: t.cardBg, transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = t.cardBgHover;
                (e.currentTarget as HTMLElement).style.color = t.text;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = t.cardBg;
                (e.currentTarget as HTMLElement).style.color = t.textMuted;
              }}
            >
              <LeftOutlined style={{ fontSize: 11 }} />
            </div>
          </Tooltip>
        </div>
      </div>

      {/* ── Tab pills ──────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 3, padding: '8px 12px 6px', flexShrink: 0,
      }}>
        {[
          { key: 'locations' as TabKey, label: 'Locations', icon: <EnvironmentOutlined style={{ fontSize: 11 }} />, count: stats.totalBins },
          { key: 'items' as TabKey, label: 'Items', icon: <InboxOutlined style={{ fontSize: 11 }} />, count: stats.totalItems },
        ].map(tab => {
          const active = activeTab === tab.key;
          return (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 0', borderRadius: 8,
                cursor: 'pointer', fontSize: 11.5, fontWeight: active ? 700 : 500,
                color: active ? (isDark ? '#fff' : '#1a1a2e') : t.textMuted,
                background: active ? `linear-gradient(135deg, ${themeColor}20, ${themeColor}08)` : 'transparent',
                border: `1px solid ${active ? `${themeColor}25` : 'transparent'}`,
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: active ? themeColor : t.textFaint,
                  background: active ? `${themeColor}15` : t.cardBg,
                  borderRadius: 6, padding: '0 4px',
                  minWidth: 18, textAlign: 'center',
                }}>
                  {tab.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Content ────────────────────────────────── */}
      <div style={{
        flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <AnimatePresence mode="wait">
          {activeTab === 'locations' ? (
            <motion.div
              key="locations"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Search */}
              <div style={{ padding: '6px 12px 4px' }}>
                <Input
                  placeholder="Filter bins by code..."
                  prefix={<SearchOutlined style={{ color: t.textMuted, fontSize: 12 }} />}
                  value={treeSearch}
                  onChange={e => setTreeSearch(e.target.value)}
                  allowClear
                  size="small"
                  style={{
                    background: t.inputBg,
                    border: `1px solid ${t.inputBorder}`,
                    borderRadius: 8, color: t.text, fontSize: 11.5,
                  }}
                />
              </div>

              {/* Zone summary bar */}
              {zones.length > 0 && !treeSearch && (
                <div style={{
                  display: 'flex', gap: 3, padding: '4px 12px 6px',
                  overflowX: 'auto', flexShrink: 0,
                  scrollbarWidth: 'none',
                }}>
                  {zones.slice(0, 8).map(zone => {
                    const zc = ZONE_COLORS[zone.zoneType || 'storage'] || '#3b82f6';
                    const zi = ZONE_ICONS[zone.zoneType || 'storage'] || '📦';
                    const zBins = bins.filter(b => b.zoneId === zone.id);
                    return (
                      <Tooltip key={zone.id} title={`${zone.name} — ${zBins.length} bins`}>
                        <div
                          onClick={() => {
                            setExpandedKeys(prev => [...prev, `wh-${zone.warehouseId}`, `zone-${zone.id}`]);
                            setSelectedZone(zone);
                          }}
                          style={{
                            padding: '3px 7px', borderRadius: 6, cursor: 'pointer',
                            fontSize: 9, fontWeight: 600,
                            background: `${zc}12`, border: `1px solid ${zc}20`,
                            color: zc, whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: 3,
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${zc}25`; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${zc}12`; }}
                        >
                          <span style={{ fontSize: 10 }}>{zi}</span>
                          {zBins.length}
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              )}

              {/* Quick Access — Favorites & Recents */}
              {!treeSearch && (favorites.length > 0 || recentBins.length > 0) && (
                <div style={{
                  padding: '4px 12px 4px',
                  borderBottom: `1px solid ${t.divider}`,
                  flexShrink: 0,
                }}>
                  {/* Favorites */}
                  {favorites.length > 0 && (
                    <div style={{ marginBottom: recentBins.length > 0 ? 6 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <StarFilled style={{ fontSize: 9, color: '#f59e0b' }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Favorites</span>
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {favorites.slice(0, 8).map(code => (
                          <div
                            key={code}
                            onClick={() => { onLocateBin(code); addToRecent(code); }}
                            style={{
                              padding: '2px 7px', borderRadius: 5, cursor: 'pointer',
                              fontSize: 9.5, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                              background: `#f59e0b12`, border: '1px solid #f59e0b20',
                              color: '#f59e0b',
                              display: 'flex', alignItems: 'center', gap: 3,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f59e0b25'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f59e0b12'; }}
                          >
                            <StarFilled style={{ fontSize: 7 }} />
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent bins */}
                  {recentBins.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ClockCircleOutlined style={{ fontSize: 9, color: t.textMuted }} />
                          <span style={{ fontSize: 9, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent</span>
                        </div>
                        <div
                          onClick={clearRecents}
                          style={{ cursor: 'pointer', fontSize: 9, color: t.textFaint, display: 'flex', alignItems: 'center', gap: 2 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textFaint; }}
                        >
                          <DeleteOutlined style={{ fontSize: 8 }} /> clear
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {recentBins.slice(0, 6).map(code => (
                          <div
                            key={code}
                            onClick={() => { onLocateBin(code); addToRecent(code); }}
                            style={{
                              padding: '2px 7px', borderRadius: 5, cursor: 'pointer',
                              fontSize: 9.5, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace",
                              background: t.cardBg, border: `1px solid ${t.divider}`,
                              color: t.textSecondary,
                              display: 'flex', alignItems: 'center', gap: 3,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = t.cardBgHover;
                              (e.currentTarget as HTMLElement).style.borderColor = `${themeColor}30`;
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = t.cardBg;
                              (e.currentTarget as HTMLElement).style.borderColor = t.divider;
                            }}
                          >
                            <ClockCircleOutlined style={{ fontSize: 7, opacity: 0.5 }} />
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tree */}
              <div style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                padding: '4px 4px 4px 8px',
                scrollbarWidth: 'thin',
                scrollbarColor: `${t.textFaint} transparent`,
              }}>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 }}>
                    <Spin size="small" />
                    <span style={{ color: t.textMuted, fontSize: 10 }}>Loading locations...</span>
                  </div>
                ) : treeData.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span style={{ color: t.textMuted, fontSize: 11 }}>No locations found</span>}
                    style={{ marginTop: 40 }}
                  />
                ) : (
                  <Tree
                    treeData={treeData as any}
                    expandedKeys={expandedKeys}
                    onExpand={keys => setExpandedKeys(keys)}
                    onSelect={handleTreeSelect}
                    showLine={{ showLeafIcon: false }}
                    style={{
                      background: 'transparent',
                      color: t.text,
                      fontSize: 12,
                    }}
                    className="explorer-tree-custom"
                  />
                )}
              </div>

              {/* Selected bin detail card */}
              <AnimatePresence>
                {selectedBin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      flexShrink: 0, overflow: 'hidden',
                      borderTop: `1px solid ${t.divider}`,
                    }}
                  >
                    <div style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: binStatusColor(selectedBin),
                            boxShadow: `0 0 6px ${binStatusColor(selectedBin)}60`,
                          }} />
                          <span style={{ color: t.text, fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                            {selectedBin.code}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div
                            onClick={() => toggleFavorite(selectedBin.code)}
                            style={{
                              cursor: 'pointer', fontSize: 12, padding: '2px 4px',
                              color: favorites.includes(selectedBin.code) ? '#f59e0b' : t.textMuted,
                              transition: 'all 0.2s',
                            }}
                          >
                            {favorites.includes(selectedBin.code) ? <StarFilled /> : <StarOutlined />}
                          </div>
                          <div
                            onClick={() => setSelectedBin(null)}
                            style={{ cursor: 'pointer', color: t.textMuted, fontSize: 10, padding: '2px 4px' }}
                          >
                            <CloseOutlined />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 10 }}>
                        {selectedBin.aisle && (
                          <>
                            <span style={{ color: t.textMuted }}>Aisle</span>
                            <span style={{ color: t.text, fontWeight: 500 }}>{selectedBin.aisle}</span>
                          </>
                        )}
                        {selectedBin.rack && (
                          <>
                            <span style={{ color: t.textMuted }}>Rack</span>
                            <span style={{ color: t.text, fontWeight: 500 }}>{selectedBin.rack}</span>
                          </>
                        )}
                        {selectedBin.level && (
                          <>
                            <span style={{ color: t.textMuted }}>Level</span>
                            <span style={{ color: t.text, fontWeight: 500 }}>{selectedBin.level}</span>
                          </>
                        )}
                        <span style={{ color: t.textMuted }}>Status</span>
                        <span style={{ color: binStatusColor(selectedBin), fontWeight: 600 }}>
                          {binStatusLabel(selectedBin)}
                        </span>
                        {selectedBin.binType && (
                          <>
                            <span style={{ color: t.textMuted }}>Type</span>
                            <span style={{ color: t.text, fontWeight: 500 }}>{selectedBin.binType}</span>
                          </>
                        )}
                      </div>
                      <div
                        onClick={() => { onLocateBin(selectedBin.code); addToRecent(selectedBin.code); }}
                        style={{
                          marginTop: 6, padding: '4px 0', borderRadius: 6,
                          background: `linear-gradient(135deg, ${themeColor}20, ${themeColor}08)`,
                          border: `1px solid ${themeColor}20`,
                          color: themeColor, fontSize: 10.5, fontWeight: 700,
                          textAlign: 'center', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${themeColor}30`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${themeColor}20, ${themeColor}08)`; }}
                      >
                        <AimOutlined style={{ fontSize: 11 }} /> Locate in 3D
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="items"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* Search */}
              <div style={{ padding: '6px 12px 4px' }}>
                <Input
                  placeholder="Search items by name or SKU..."
                  prefix={<SearchOutlined style={{ color: t.textMuted, fontSize: 12 }} />}
                  value={itemSearch}
                  onChange={e => handleItemSearchChange(e.target.value)}
                  allowClear
                  size="small"
                  style={{
                    background: t.inputBg,
                    border: `1px solid ${t.inputBorder}`,
                    borderRadius: 8, color: t.text, fontSize: 11.5,
                  }}
                />
              </div>

              {/* Quick stats row */}
              <div style={{
                display: 'flex', gap: 4, padding: '4px 12px 6px', flexShrink: 0,
              }}>
                {[
                  { label: 'Items', value: stats.totalItems, color: '#3b82f6' },
                  { label: 'On Hand', value: stats.totalOnHand.toLocaleString(), color: '#22c55e' },
                  { label: 'Available', value: stats.availableBins, color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, padding: '4px 6px', borderRadius: 6,
                    background: `${s.color}08`, border: `1px solid ${s.color}12`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 8, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Results */}
              <div style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                padding: '4px 8px',
                scrollbarWidth: 'thin',
                scrollbarColor: `${t.textFaint} transparent`,
              }}>
                {itemsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 }}>
                    <Spin size="small" />
                    <span style={{ color: t.textMuted, fontSize: 10 }}>Searching...</span>
                  </div>
                ) : itemResults.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    paddingTop: 50, gap: 10,
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: t.cardBg, border: `1px solid ${t.divider}`,
                    }}>
                      <DatabaseOutlined style={{ color: t.textFaint, fontSize: 22 }} />
                    </div>
                    <span style={{ color: t.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 1.5 }}>
                      {itemSearch.length >= 2 ? `No items found for "${itemSearch}"` : 'Type at least 2 characters\nto search items'}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontSize: 9, color: t.textMuted, padding: '2px 4px', fontWeight: 600 }}>
                      {itemResults.length} result{itemResults.length !== 1 ? 's' : ''}
                    </div>
                    {itemResults.map((item, idx) => {
                      const zoneColor = ZONE_COLORS[item.zoneType || 'storage'] || '#3b82f6';
                      return (
                        <motion.div
                          key={`${item.itemId}-${idx}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02, duration: 0.15 }}
                          onClick={() => {
                            if (item.binCode && item.binCode !== '—') {
                              onLocateBin(item.binCode);
                            }
                          }}
                          style={{
                            padding: '8px 10px', borderRadius: 8,
                            background: t.cardBg,
                            border: `1px solid transparent`,
                            cursor: item.binCode !== '—' ? 'pointer' : 'default',
                            transition: 'all 0.15s ease',
                            display: 'flex', flexDirection: 'column', gap: 4,
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = t.cardBgHover;
                            (e.currentTarget as HTMLElement).style.borderColor = `${themeColor}25`;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = t.cardBg;
                            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                          }}
                        >
                          {/* Item name + qty */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                              color: t.text, fontSize: 12, fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', maxWidth: 190,
                            }}>
                              {item.itemName}
                            </span>
                            <span style={{
                              fontSize: 12, fontWeight: 700,
                              color: item.qty > 0 ? '#22c55e' : t.textMuted,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              ×{item.qty}
                            </span>
                          </div>

                          {/* SKU + bin + zone */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 10, color: t.textSecondary, flexWrap: 'wrap',
                          }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: t.textMuted }}>{item.sku}</span>
                            {item.binCode !== '—' && (
                              <>
                                <span style={{ color: t.textFaint }}>→</span>
                                <span style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  color: themeColor, fontWeight: 600, fontSize: 10,
                                  display: 'flex', alignItems: 'center', gap: 3,
                                }}>
                                  <AimOutlined style={{ fontSize: 9 }} /> {item.binCode}
                                </span>
                              </>
                            )}
                            {item.warehouseName && (
                              <span style={{
                                fontSize: 8.5, fontWeight: 600,
                                color: zoneColor, background: `${zoneColor}12`,
                                borderRadius: 4, padding: '0px 4px',
                                marginLeft: 'auto',
                              }}>
                                {item.warehouseName}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Stats Bar ───────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', borderTop: `1px solid ${t.divider}`,
        background: t.statsBarBg, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[
            { value: stats.totalBins, label: 'bins', color: themeColor },
            { value: stats.occupiedBins, label: 'used', color: '#3b82f6' },
            { value: stats.totalOnHand.toLocaleString(), label: 'stock', color: '#22c55e' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.value}
              </span>
              <span style={{ fontSize: 8, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{
          width: 32, height: 32,
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Progress
            type="circle"
            percent={stats.utilization}
            size={30}
            strokeColor={stats.utilization > 80 ? '#ef4444' : stats.utilization > 50 ? '#f59e0b' : '#22c55e'}
            trailColor={t.divider}
            strokeWidth={8}
            format={p => <span style={{ fontSize: 8, fontWeight: 700, color: t.text }}>{p}</span>}
          />
        </div>
      </div>

      {/* ── Inline style overrides for Ant Tree ──── */}
      <style>{`
        .explorer-tree-custom .ant-tree-node-content-wrapper {
          padding: 2px 4px !important;
          border-radius: 6px !important;
          transition: background 0.15s !important;
        }
        .explorer-tree-custom .ant-tree-node-content-wrapper:hover {
          background: ${t.cardBgHover} !important;
        }
        .explorer-tree-custom .ant-tree-node-selected .ant-tree-node-content-wrapper,
        .explorer-tree-custom .ant-tree-node-content-wrapper.ant-tree-node-selected {
          background: ${themeColor}18 !important;
        }
        .explorer-tree-custom .ant-tree-switcher {
          color: ${t.textMuted} !important;
          width: 20px !important;
        }
        .explorer-tree-custom .ant-tree-indent-unit {
          width: 14px !important;
        }
        .explorer-tree-custom .ant-tree-treenode {
          padding: 1px 0 !important;
        }
        .explorer-tree-custom .ant-tree-showline .ant-tree-indent-unit::before {
          border-color: ${t.panelBorder} !important;
        }
        .explorer-tree-custom .ant-tree-list-scrollbar {
          width: 4px !important;
        }
      `}</style>
    </div>
  );
}
