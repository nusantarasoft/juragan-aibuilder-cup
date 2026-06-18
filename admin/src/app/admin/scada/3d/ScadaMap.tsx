"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useScadaStore, DataCenterSite } from "@/store/useScadaStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Typography, Badge, Space, Card, Tooltip } from "antd";
import { motion, AnimatePresence } from "framer-motion";

const { Text, Title } = Typography;

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */

// SVG viewBox covers lat ≈ -11 to 7, lng ≈ 93 to 122
const VIEW_LNG_MIN = 93;
const VIEW_LNG_MAX = 122;
const VIEW_LAT_MIN = -11;
const VIEW_LAT_MAX = 7;

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 620;

/** Convert geographic lat/lng → SVG x/y. Longitude maps to x, latitude maps
 *  to y (inverted because SVG y grows downward). */
function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - VIEW_LNG_MIN) / (VIEW_LNG_MAX - VIEW_LNG_MIN)) * SVG_WIDTH;
  const y =
    ((VIEW_LAT_MAX - lat) / (VIEW_LAT_MAX - VIEW_LAT_MIN)) * SVG_HEIGHT;
  return { x, y };
}

const STATUS_COLORS: Record<DataCenterSite["status"], string> = {
  healthy: "#00ff88",
  warning: "#ffaa00",
  critical: "#ff3355",
};

const STATUS_LABELS: Record<DataCenterSite["status"], string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
};

/* ═══════════════════════════════════════════════════════════════════════════
   Simplified island paths (polygon points in lat/lng, converted to SVG)
   ═══════════════════════════════════════════════════════════════════════════ */

interface IslandDef {
  name: string;
  coords: [number, number][]; // [lat, lng]
}

const ISLANDS: IslandDef[] = [
  {
    name: "Sumatra",
    coords: [
      [5.5, 95.3],
      [3.7, 98.5],
      [2.0, 99.0],
      [0.5, 101.5],
      [-1.0, 103.5],
      [-2.5, 104.5],
      [-3.5, 105.5],
      [-5.5, 105.0],
      [-5.9, 104.5],
      [-5.5, 103.5],
      [-3.8, 102.5],
      [-2.5, 101.0],
      [-1.0, 100.0],
      [0.8, 99.0],
      [2.5, 97.5],
      [4.0, 96.5],
      [5.5, 95.3],
    ],
  },
  {
    name: "Java",
    coords: [
      [-5.9, 105.3],
      [-6.2, 106.0],
      [-6.7, 107.5],
      [-7.0, 108.5],
      [-7.5, 110.0],
      [-7.8, 111.5],
      [-7.5, 112.5],
      [-7.8, 114.0],
      [-8.2, 114.5],
      [-8.5, 114.0],
      [-8.0, 112.0],
      [-7.8, 110.5],
      [-7.5, 109.0],
      [-7.0, 107.0],
      [-6.5, 106.0],
      [-5.9, 105.3],
    ],
  },
  {
    name: "Kalimantan",
    coords: [
      [4.0, 108.0],
      [4.2, 109.5],
      [3.0, 110.5],
      [2.0, 111.0],
      [1.0, 110.5],
      [0.0, 109.5],
      [-1.0, 110.0],
      [-2.0, 111.0],
      [-3.0, 112.5],
      [-3.8, 114.5],
      [-3.5, 116.0],
      [-2.0, 117.0],
      [-1.0, 117.5],
      [0.5, 118.0],
      [2.0, 118.0],
      [3.5, 117.5],
      [4.5, 117.8],
      [6.0, 118.0],
      [6.5, 117.5],
      [6.8, 116.5],
      [6.0, 116.0],
      [5.5, 115.5],
      [5.0, 115.0],
      [4.8, 114.5],
      [5.0, 113.0],
      [4.5, 111.5],
      [4.0, 110.0],
      [4.0, 108.0],
    ],
  },
  {
    name: "Sulawesi",
    coords: [
      [1.5, 121.0],
      [0.5, 121.5],
      [-0.5, 121.0],
      [-1.0, 120.5],
      [-1.5, 121.0],
      [-2.5, 121.5],
      [-3.5, 121.0],
      [-4.5, 121.5],
      [-5.5, 120.5],
      [-5.0, 119.5],
      [-4.0, 120.0],
      [-3.5, 119.5],
      [-3.0, 118.5],
      [-2.0, 119.0],
      [-1.5, 120.0],
      [-0.5, 120.0],
      [0.0, 120.0],
      [0.5, 120.5],
      [1.5, 121.0],
    ],
  },
  {
    name: "Bali",
    coords: [
      [-8.1, 114.5],
      [-8.2, 115.0],
      [-8.5, 115.5],
      [-8.8, 115.6],
      [-8.8, 115.2],
      [-8.6, 114.8],
      [-8.3, 114.5],
      [-8.1, 114.5],
    ],
  },
  {
    name: "Malay Peninsula",
    coords: [
      [6.5, 100.0],
      [6.0, 100.5],
      [5.0, 100.5],
      [4.5, 101.5],
      [4.0, 102.0],
      [3.0, 103.0],
      [2.5, 103.5],
      [2.0, 103.8],
      [1.5, 104.0],
      [1.2, 103.8],
      [1.3, 103.5],
      [1.8, 103.0],
      [2.5, 102.0],
      [3.5, 101.0],
      [4.5, 100.5],
      [5.5, 100.2],
      [6.5, 100.0],
    ],
  },
  {
    name: "Singapore",
    coords: [
      [1.45, 103.6],
      [1.45, 104.0],
      [1.22, 104.05],
      [1.2, 103.6],
      [1.45, 103.6],
    ],
  },
];

function islandToPoints(island: IslandDef): string {
  return island.coords
    .map(([lat, lng]) => {
      const { x, y } = geoToSvg(lat, lng);
      return `${x},${y}`;
    })
    .join(" ");
}

/* ═══════════════════════════════════════════════════════════════════════════
   Connection lines between all DCs (full mesh topology)
   ═══════════════════════════════════════════════════════════════════════════ */

function buildConnections(sites: DataCenterSite[]) {
  const lines: { from: DataCenterSite; to: DataCenterSite; key: string }[] = [];
  for (let i = 0; i < sites.length; i++) {
    for (let j = i + 1; j < sites.length; j++) {
      lines.push({
        from: sites[i],
        to: sites[j],
        key: `${sites[i].id}-${sites[j].id}`,
      });
    }
  }
  return lines;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CSS keyframes (injected once via <style>)
   ═══════════════════════════════════════════════════════════════════════════ */

const KEYFRAMES = `
@keyframes scada-pulse {
  0%   { r: 6;  opacity: 0.8; }
  50%  { r: 14; opacity: 0.15; }
  100% { r: 22; opacity: 0; }
}
@keyframes scada-pulse-selected {
  0%   { r: 8;  opacity: 0.9; }
  50%  { r: 18; opacity: 0.2; }
  100% { r: 28; opacity: 0; }
}
@keyframes scada-dash {
  to { stroke-dashoffset: -24; }
}
@keyframes scada-glow-breathe {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
@keyframes scada-ring-rotate {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   TooltipCard – shown on marker hover
   ═══════════════════════════════════════════════════════════════════════════ */

interface TooltipCardProps {
  site: DataCenterSite;
  svgX: number;
  svgY: number;
}

const MotionDiv = motion.div;

function TooltipCard({ site, svgX, svgY }: TooltipCardProps) {
  const statusColor = STATUS_COLORS[site.status];
  // Position the card so it doesn't clip outside the SVG area
  const flipX = svgX > SVG_WIDTH * 0.7;
  const flipY = svgY > SVG_HEIGHT * 0.7;

  return (
    <foreignObject
      x={flipX ? svgX - 220 : svgX + 20}
      y={flipY ? svgY - 170 : svgY + 16}
      width={210}
      height={168}
      style={{ overflow: "visible" }}
    >
      <MotionDiv
        initial={{ opacity: 0, scale: 0.85, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(12, 14, 24, 0.92)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${statusColor}44`,
            borderRadius: 10,
            padding: "12px 14px",
            color: "#e0e6f0",
            fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
            fontSize: 11,
            lineHeight: 1.7,
            boxShadow: `0 0 20px ${statusColor}22, 0 4px 24px rgba(0,0,0,0.6)`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: statusColor,
                boxShadow: `0 0 6px ${statusColor}`,
              }}
            />
            {site.name}
          </div>
          <div style={{ color: "#8892a4" }}>{site.location}</div>
          <div
            style={{
              marginTop: 6,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2px 12px",
            }}
          >
            <span style={{ color: "#6b7280" }}>Tier</span>
            <span style={{ color: "#cbd5e1" }}>{site.tier}</span>
            <span style={{ color: "#6b7280" }}>Capacity</span>
            <span style={{ color: "#cbd5e1" }}>{site.capacity}</span>
            <span style={{ color: "#6b7280" }}>PUE</span>
            <span
              style={{
                color: site.pue > 1.6 ? "#ffaa00" : "#00ff88",
                fontWeight: 600,
              }}
            >
              {site.pue.toFixed(2)}
            </span>
            <span style={{ color: "#6b7280" }}>Status</span>
            <span style={{ color: statusColor, fontWeight: 600, textTransform: "uppercase" }}>
              {STATUS_LABELS[site.status]}
            </span>
          </div>
        </div>
      </MotionDiv>
    </foreignObject>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ScadaMap() {
  const { sites, currentSiteId, setSite } = useScadaStore();
  const { themePalette } = usePreferencesStore();
  const { token } = theme.useToken();

  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);

  const connections = useMemo(() => buildConnections(sites), [sites]);

  const sitePositions = useMemo(
    () =>
      sites.map((s) => ({
        site: s,
        ...geoToSvg(s.lat, s.lng),
      })),
    [sites]
  );

  const handleClick = useCallback(
    (siteId: string) => {
      setSite(siteId);
    },
    [setSite]
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "radial-gradient(ellipse at 50% 40%, #0d1117 0%, #060a10 100%)",
        overflow: "hidden",
      }}
    >
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        style={{ display: "block" }}
      >
        <defs>
          {/* ── Grid pattern ────────────────────────────────────── */}
          <pattern
            id="scada-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="0.5"
            />
          </pattern>

          {/* ── Glow filter for markers ─────────────────────────── */}
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#00ff88" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#ffaa00" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#ff3355" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor="#ffffff" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ── Land fill gradient ──────────────────────────────── */}
          <linearGradient id="land-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
          </linearGradient>
        </defs>

        {/* ══ Background grid ════════════════════════════════════ */}
        <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#scada-grid)" />

        {/* ══ Latitude / Longitude reference lines ═══════════════ */}
        {[...Array(7)].map((_, i) => {
          const lat = VIEW_LAT_MAX - i * 3;
          const { y } = geoToSvg(lat, VIEW_LNG_MIN);
          return (
            <g key={`lat-${i}`}>
              <line
                x1={0}
                y1={y}
                x2={SVG_WIDTH}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
                strokeDasharray="4 8"
              />
              <text
                x={8}
                y={y - 4}
                fill="rgba(255,255,255,0.12)"
                fontSize="9"
                fontFamily="monospace"
              >
                {lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`}
              </text>
            </g>
          );
        })}
        {[...Array(10)].map((_, i) => {
          const lng = VIEW_LNG_MIN + i * 3;
          const { x } = geoToSvg(0, lng);
          return (
            <g key={`lng-${i}`}>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={SVG_HEIGHT}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
                strokeDasharray="4 8"
              />
              <text
                x={x + 3}
                y={SVG_HEIGHT - 6}
                fill="rgba(255,255,255,0.12)"
                fontSize="9"
                fontFamily="monospace"
              >
                {lng}°E
              </text>
            </g>
          );
        })}

        {/* ══ Islands ════════════════════════════════════════════ */}
        {ISLANDS.map((island) => (
          <polygon
            key={island.name}
            points={islandToPoints(island)}
            fill="url(#land-fill)"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        ))}

        {/* ══ Connection lines (network topology) ════════════════ */}
        {connections.map(({ from, to, key }) => {
          const a = geoToSvg(from.lat, from.lng);
          const b = geoToSvg(to.lat, to.lng);
          const isActiveConnection =
            from.id === currentSiteId || to.id === currentSiteId;
          return (
            <line
              key={key}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={
                isActiveConnection
                  ? "rgba(100,200,255,0.25)"
                  : "rgba(255,255,255,0.08)"
              }
              strokeWidth={isActiveConnection ? 1.5 : 0.8}
              strokeDasharray="6 6"
              style={{
                animation: "scada-dash 1.5s linear infinite",
              }}
            />
          );
        })}

        {/* ══ Data Center Markers ════════════════════════════════ */}
        {sitePositions.map(({ site, x, y }) => {
          const color = STATUS_COLORS[site.status];
          const isSelected = site.id === currentSiteId;
          const isHovered = site.id === hoveredSiteId;
          const glowFilter =
            site.status === "healthy"
              ? "url(#glow-green)"
              : site.status === "warning"
              ? "url(#glow-amber)"
              : "url(#glow-red)";

          return (
            <g
              key={site.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredSiteId(site.id)}
              onMouseLeave={() => setHoveredSiteId(null)}
              onClick={() => handleClick(site.id)}
            >
              {/* Outer pulse ring 1 */}
              <circle
                cx={x}
                cy={y}
                r={6}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                opacity="0"
                style={{
                  animation: isSelected
                    ? "scada-pulse-selected 2s ease-out infinite"
                    : "scada-pulse 2.5s ease-out infinite",
                  transformOrigin: `${x}px ${y}px`,
                }}
              />
              {/* Outer pulse ring 2 (delayed) */}
              <circle
                cx={x}
                cy={y}
                r={6}
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity="0"
                style={{
                  animation: isSelected
                    ? "scada-pulse-selected 2s ease-out 0.7s infinite"
                    : "scada-pulse 2.5s ease-out 1s infinite",
                  transformOrigin: `${x}px ${y}px`,
                }}
              />

              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity={0.8}
                  style={{
                    animation: "scada-ring-rotate 8s linear infinite",
                    transformOrigin: `${x}px ${y}px`,
                  }}
                />
              )}

              {/* Glow halo */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 10 : isHovered ? 9 : 7}
                fill={`${color}11`}
                filter={isSelected ? "url(#glow-selected)" : glowFilter}
                style={{
                  animation: "scada-glow-breathe 3s ease-in-out infinite",
                }}
              />

              {/* Core dot */}
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 5.5 : isSelected ? 5 : 4}
                fill={color}
                stroke={isSelected ? "#ffffff" : `${color}88`}
                strokeWidth={isSelected ? 2 : 1}
                style={{
                  transition: "r 0.2s ease, stroke-width 0.2s ease",
                  filter: isSelected
                    ? `drop-shadow(0 0 6px ${color})`
                    : undefined,
                }}
              />

              {/* Site label */}
              <text
                x={x}
                y={y - 16}
                textAnchor="middle"
                fill={isSelected ? "#ffffff" : "rgba(255,255,255,0.6)"}
                fontSize={isSelected ? "11" : "10"}
                fontFamily="'Inter', 'SF Pro Display', system-ui, sans-serif"
                fontWeight={isSelected ? 700 : 500}
                style={{
                  textShadow: `0 0 8px ${color}44`,
                  transition: "fill 0.2s ease",
                }}
              >
                {site.name}
              </text>
            </g>
          );
        })}

        {/* ══ Hover tooltip ══════════════════════════════════════ */}
        <AnimatePresence>
          {hoveredSiteId &&
            (() => {
              const match = sitePositions.find(
                (s) => s.site.id === hoveredSiteId
              );
              if (!match) return null;
              return (
                <TooltipCard
                  key={match.site.id}
                  site={match.site}
                  svgX={match.x}
                  svgY={match.y}
                />
              );
            })()}
        </AnimatePresence>

        {/* ══ Title overlay (top-left) ═══════════════════════════ */}
        <foreignObject x={20} y={16} width={280} height={70}>
          <div
            style={{
              pointerEvents: "none",
              fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#e0e6f0",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
                textShadow: "0 0 20px rgba(100,180,255,0.15)",
              }}
            >
              Data Center Network
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                marginTop: 4,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {sites.length} active site{sites.length !== 1 ? "s" : ""} •
              Southeast Asia
            </div>
          </div>
        </foreignObject>

        {/* ══ Legend (bottom-right) ═══════════════════════════════ */}
        <foreignObject x={SVG_WIDTH - 170} y={SVG_HEIGHT - 110} width={155} height={100}>
          <div
            style={{
              background: "rgba(12,14,24,0.75)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: "10px 14px",
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 10,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Status
            </div>
            {(
              ["healthy", "warning", "critical"] as DataCenterSite["status"][]
            ).map((status) => (
              <div
                key={status}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: STATUS_COLORS[status],
                    boxShadow: `0 0 6px ${STATUS_COLORS[status]}66`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "rgba(255,255,255,0.55)" }}>
                  {STATUS_LABELS[status]}
                </span>
              </div>
            ))}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
