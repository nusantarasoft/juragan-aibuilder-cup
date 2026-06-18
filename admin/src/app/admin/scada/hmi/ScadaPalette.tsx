"use client";

import { useState } from "react";
import { Input, Collapse, Typography, theme, Tabs } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { HmiElementType } from "@/store/useHmiStore";

const { Text } = Typography;

/* ------------------------------------------------------------------ */
/*  2D palette items                                                   */
/* ------------------------------------------------------------------ */

export const PALETTE_ITEMS_2D: {
  type: HmiElementType;
  name: string;
  icon: string;
}[] = [
  { type: "pump", name: "Pump", icon: "🔄" },
  { type: "valve", name: "Valve", icon: "🔀" },
  { type: "tank", name: "Tank", icon: "🛢" },
  { type: "motor", name: "Motor", icon: "⚙️" },
  { type: "pipe", name: "Pipe", icon: "─" },
  { type: "sensor", name: "Sensor", icon: "📡" },
  { type: "indicator", name: "Indicator", icon: "📊" },
  { type: "label", name: "Label", icon: "🏷️" },
];

/* ------------------------------------------------------------------ */
/*  3D palette items – grouped by category                             */
/* ------------------------------------------------------------------ */

interface PaletteItem3D {
  type: string;
  name: string;
  icon: string;
}

interface Category3D {
  key: string;
  label: string;
  icon: string;
  items: PaletteItem3D[];
}

export const PALETTE_CATEGORIES_3D: Category3D[] = [
  {
    key: "primitives",
    label: "Primitives",
    icon: "🔷",
    items: [
      { type: "box", name: "Box", icon: "🔷" },
      { type: "sphere", name: "Sphere", icon: "🔷" },
      { type: "cylinder", name: "Cylinder", icon: "🔷" },
      { type: "cone", name: "Cone", icon: "🔷" },
      { type: "torus", name: "Torus", icon: "🔷" },
      { type: "plane", name: "Plane", icon: "🔷" },
    ],
  },
  {
    key: "hvac",
    label: "HVAC / MEP",
    icon: "❄️",
    items: [
      { type: "chiller", name: "Chiller", icon: "❄️" },
      { type: "pump", name: "Pump", icon: "❄️" },
      { type: "cooling_tower", name: "Cooling Tower", icon: "❄️" },
      { type: "valve", name: "Valve", icon: "❄️" },
      { type: "ahu", name: "AHU", icon: "❄️" },
      { type: "fcu", name: "FCU", icon: "❄️" },
      { type: "damper", name: "Damper", icon: "❄️" },
      { type: "exhaust_fan", name: "Exhaust Fan", icon: "❄️" },
      { type: "duct", name: "Duct", icon: "❄️" },
    ],
  },
  {
    key: "electrical",
    label: "Electrical",
    icon: "⚡",
    items: [
      { type: "transformer", name: "Transformer", icon: "⚡" },
      { type: "generator", name: "Generator", icon: "⚡" },
      { type: "ups", name: "UPS", icon: "⚡" },
      { type: "ats", name: "ATS", icon: "⚡" },
      { type: "pdu", name: "PDU", icon: "⚡" },
      { type: "switchgear", name: "Switchgear", icon: "⚡" },
      { type: "mcc", name: "MCC", icon: "⚡" },
      { type: "panel", name: "Panel", icon: "⚡" },
    ],
  },
  {
    key: "datacenter",
    label: "Data Center",
    icon: "🖥️",
    items: [
      { type: "server_rack", name: "Server Rack", icon: "🖥️" },
      { type: "cable_tray", name: "Cable Tray", icon: "🖥️" },
      { type: "crac", name: "CRAC", icon: "🖥️" },
      { type: "fire_suppression", name: "Fire Suppression", icon: "🖥️" },
      { type: "access_floor", name: "Access Floor", icon: "🖥️" },
    ],
  },
  {
    key: "building",
    label: "Building",
    icon: "🏗️",
    items: [
      { type: "wall", name: "Wall", icon: "🏗️" },
      { type: "floor", name: "Floor", icon: "🏗️" },
      { type: "column", name: "Column", icon: "🏗️" },
      { type: "door", name: "Door", icon: "🏗️" },
      { type: "stairs", name: "Stairs", icon: "🏗️" },
      { type: "window", name: "Window", icon: "🏗️" },
      { type: "roof", name: "Roof", icon: "🏗️" },
    ],
  },
  {
    key: "piping",
    label: "Piping",
    icon: "🔧",
    items: [
      { type: "pipe", name: "Pipe", icon: "🔧" },
      { type: "elbow", name: "Elbow", icon: "🔧" },
      { type: "tee", name: "Tee", icon: "🔧" },
      { type: "reducer", name: "Reducer", icon: "🔧" },
      { type: "flange", name: "Flange", icon: "🔧" },
    ],
  },
  {
    key: "automation",
    label: "Automation",
    icon: "🤖",
    items: [{ type: "robot", name: "Robot", icon: "🤖" }],
  },
];

/** Flat list of all 3D items (used for search). */
export const PALETTE_ITEMS_3D: PaletteItem3D[] =
  PALETTE_CATEGORIES_3D.flatMap((c) => c.items);

/* ------------------------------------------------------------------ */
/*  Draggable card                                                     */
/* ------------------------------------------------------------------ */

function DraggableCard({
  item,
  onDragStart,
  tokenBorderColor,
  tokenBgHover,
  tokenColorPrimary,
}: {
  item: { type: string; name: string; icon: string };
  onDragStart: (e: React.DragEvent) => void;
  tokenBorderColor: string;
  tokenBgHover: string;
  tokenColorPrimary: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 4px",
        borderRadius: 8,
        border: `1px solid ${hovered ? tokenColorPrimary : tokenBorderColor}`,
        background: hovered ? tokenBgHover : "transparent",
        cursor: "grab",
        transition: "all 0.2s ease",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
      <Text
        style={{
          fontSize: 11,
          marginTop: 4,
          textAlign: "center",
          lineHeight: 1.2,
        }}
        ellipsis
      >
        {item.name}
      </Text>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Two‑column grid helper                                             */
/* ------------------------------------------------------------------ */

function ItemGrid({
  items,
  onDragStart,
  tokenBorderColor,
  tokenBgHover,
  tokenColorPrimary,
}: {
  items: { type: string; name: string; icon: string }[];
  onDragStart: (e: React.DragEvent, type: string) => void;
  tokenBorderColor: string;
  tokenBgHover: string;
  tokenColorPrimary: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}
    >
      {items.map((item) => (
        <DraggableCard
          key={item.type + item.name}
          item={item}
          onDragStart={(e) => onDragStart(e, item.type)}
          tokenBorderColor={tokenBorderColor}
          tokenBgHover={tokenBgHover}
          tokenColorPrimary={tokenColorPrimary}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ScadaPalette() {
  const { token } = theme.useToken();
  const [search, setSearch] = useState("");

  const tokenBorderColor = token.colorBorderSecondary;
  const tokenBgHover = token.controlItemBgHover;
  const tokenColorPrimary = token.colorPrimary;

  const query = search.trim().toLowerCase();

  /* ---------- drag handlers ---------- */

  const onDragStart2D = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("hmi-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDragStart3D = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("scada-3d-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  /* ---------- filtered data ---------- */

  const filtered2D = query
    ? PALETTE_ITEMS_2D.filter((i) => i.name.toLowerCase().includes(query))
    : PALETTE_ITEMS_2D;

  const filteredCategories3D = query
    ? PALETTE_CATEGORIES_3D.map((cat) => ({
        ...cat,
        items: cat.items.filter((i) =>
          i.name.toLowerCase().includes(query),
        ),
      })).filter((cat) => cat.items.length > 0)
    : PALETTE_CATEGORIES_3D;

  const flat3DResults = query
    ? PALETTE_ITEMS_3D.filter((i) => i.name.toLowerCase().includes(query))
    : [];

  /* ---------- 2D tab content ---------- */

  const render2D = () => {
    if (query) {
      if (filtered2D.length === 0) {
        return (
          <Text type="secondary" style={{ padding: 16, display: "block" }}>
            No 2D elements match &quot;{search}&quot;
          </Text>
        );
      }
      return (
        <div style={{ padding: 8 }}>
          <ItemGrid
            items={filtered2D}
            onDragStart={onDragStart2D}
            tokenBorderColor={tokenBorderColor}
            tokenBgHover={tokenBgHover}
            tokenColorPrimary={tokenColorPrimary}
          />
        </div>
      );
    }

    return (
      <Collapse
        defaultActiveKey={["2d-elements"]}
        ghost
        items={[
          {
            key: "2d-elements",
            label: "2D HMI Elements",
            children: (
              <ItemGrid
                items={PALETTE_ITEMS_2D}
                onDragStart={onDragStart2D}
                tokenBorderColor={tokenBorderColor}
                tokenBgHover={tokenBgHover}
                tokenColorPrimary={tokenColorPrimary}
              />
            ),
          },
        ]}
      />
    );
  };

  /* ---------- 3D tab content ---------- */

  const render3D = () => {
    /* When searching, show a flat grid */
    if (query) {
      if (flat3DResults.length === 0) {
        return (
          <Text type="secondary" style={{ padding: 16, display: "block" }}>
            No 3D models match &quot;{search}&quot;
          </Text>
        );
      }
      return (
        <div style={{ padding: 8 }}>
          <ItemGrid
            items={flat3DResults}
            onDragStart={onDragStart3D}
            tokenBorderColor={tokenBorderColor}
            tokenBgHover={tokenBgHover}
            tokenColorPrimary={tokenColorPrimary}
          />
        </div>
      );
    }

    /* Default: accordion categories */
    return (
      <Collapse
        accordion
        ghost
        defaultActiveKey={PALETTE_CATEGORIES_3D[0]?.key}
        items={filteredCategories3D.map((cat) => ({
          key: cat.key,
          label: `${cat.icon} ${cat.label}`,
          children: (
            <ItemGrid
              items={cat.items}
              onDragStart={onDragStart3D}
              tokenBorderColor={tokenBorderColor}
              tokenBgHover={tokenBgHover}
              tokenColorPrimary={tokenColorPrimary}
            />
          ),
        }))}
      />
    );
  };

  /* ---------- render ---------- */

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Search */}
      <div style={{ padding: "8px 8px 0" }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search objects..."
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
        />
      </div>

      {/* Tabs: 2D / 3D */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <Tabs
          defaultActiveKey="2d"
          size="small"
          style={{ padding: "0 8px" }}
          items={[
            {
              key: "2d",
              label: "2D Elements",
              children: render2D(),
            },
            {
              key: "3d",
              label: "3D Models",
              children: render3D(),
            },
          ]}
        />
      </div>
    </div>
  );
}
