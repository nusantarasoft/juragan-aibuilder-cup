import React, { useState, useMemo } from 'react';
import { Select, Slider, InputNumber, Collapse, Tooltip, Card, Row, Col, Typography, Divider, Tag, Radio, Switch as AntSwitch, Statistic, Progress, Table, Alert, Descriptions } from "antd";
import { InfoCircleOutlined, ThunderboltOutlined, WarningOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Area, Line } from "recharts";

const { Text } = Typography;
const { Panel } = Collapse;

interface PowerSizingProps {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

// ===== SERVER TYPE PRESETS (SE WP#3) =====
const SERVER_TYPES: Record<string, { label: string; wattPerUnit: number; unitsPerRack: number; pf: number; desc: string }> = {
  'standard_1u': { label: '1U Standard Server', wattPerUnit: 500, unitsPerRack: 40, pf: 0.95, desc: '~500W each, up to 40 per rack' },
  'standard_2u': { label: '2U Standard Server', wattPerUnit: 750, unitsPerRack: 20, pf: 0.95, desc: '~750W each, up to 20 per rack' },
  'blade': { label: 'Blade Server (8-slot)', wattPerUnit: 4000, unitsPerRack: 4, pf: 0.98, desc: '~4kW per chassis, 4 chassis/rack' },
  'gpu_ai': { label: 'GPU / AI Server', wattPerUnit: 6500, unitsPerRack: 4, pf: 0.98, desc: '~6.5kW each (DGX-like), 4 per rack' },
  'hpc': { label: 'HPC Cluster Node', wattPerUnit: 3000, unitsPerRack: 10, pf: 0.97, desc: '~3kW each, 10 per rack' },
  'storage': { label: 'Storage Array (4U)', wattPerUnit: 1500, unitsPerRack: 8, pf: 0.92, desc: '~1.5kW each, 8 per rack' },
  'network': { label: 'Network / Switching', wattPerUnit: 350, unitsPerRack: 6, pf: 0.90, desc: '~350W each, 6 per rack' },
  'mainframe': { label: 'Mainframe', wattPerUnit: 20000, unitsPerRack: 1, pf: 0.95, desc: '~20kW per frame' },
  'custom': { label: 'Custom (kW per rack)', wattPerUnit: 0, unitsPerRack: 0, pf: 0.95, desc: 'Set kW/rack manually' },
};

// ===== UPTIME TIER DEFINITIONS =====
const TIERS: Record<string, { label: string; redundancy: string; paths: number; uptime: string; desc: string; powerArch: string }> = {
  'I': { label: 'Tier I — Basic', redundancy: 'N', paths: 1, uptime: '99.671%', desc: 'Single path, no redundancy', powerArch: 'Single Path' },
  'II': { label: 'Tier II — Redundant Components', redundancy: 'N+1', paths: 1, uptime: '99.741%', desc: 'Single path + redundant components (UPS, gen)', powerArch: 'Single Path + Redundant' },
  'III': { label: 'Tier III — Concurrently Maintainable', redundancy: 'N+1', paths: 2, uptime: '99.982%', desc: 'Dual power paths, each path N+1', powerArch: 'Dual Path (Active/Passive)' },
  'IV': { label: 'Tier IV — Fault Tolerant', redundancy: '2(N+1)', paths: 2, uptime: '99.995%', desc: 'Fully duplicated systems, 2(N+1)', powerArch: 'System + System (2N+1)' },
};

// ===== CABLE SIZING TABLE =====
const CABLE_TABLE = [
  { maxAmps: 15, gauge: '14 AWG', resistance: 8.28 },
  { maxAmps: 20, gauge: '12 AWG', resistance: 5.21 },
  { maxAmps: 30, gauge: '10 AWG', resistance: 3.28 },
  { maxAmps: 40, gauge: '8 AWG', resistance: 2.06 },
  { maxAmps: 55, gauge: '6 AWG', resistance: 1.30 },
  { maxAmps: 70, gauge: '4 AWG', resistance: 0.81 },
  { maxAmps: 95, gauge: '3 AWG', resistance: 0.64 },
  { maxAmps: 130, gauge: '1 AWG', resistance: 0.40 },
  { maxAmps: 150, gauge: '1/0 AWG', resistance: 0.32 },
  { maxAmps: 200, gauge: '3/0 AWG', resistance: 0.20 },
  { maxAmps: 260, gauge: '4/0 AWG', resistance: 0.16 },
  { maxAmps: 310, gauge: '250 MCM', resistance: 0.14 },
  { maxAmps: 380, gauge: '350 MCM', resistance: 0.10 },
  { maxAmps: 460, gauge: '500 MCM', resistance: 0.07 },
];

// ===== VOLTAGE CONFIGS =====
const VOLTAGE_CONFIGS: Record<string, { label: string; voltage: number; desc: string }> = {
  '208_120': { label: '208/120V 3-Phase (US)', voltage: 208, desc: 'North American standard' },
  '240_120': { label: '240/120V 3-Phase', voltage: 240, desc: 'US alternate' },
  '400_230': { label: '400/230V 3-Phase (EU)', voltage: 400, desc: 'European standard' },
  '415_240': { label: '415/240V 3-Phase (UK/AU)', voltage: 415, desc: 'UK / Australia' },
  '480_277': { label: '480/277V 3-Phase (US HV)', voltage: 480, desc: 'US high voltage' },
};

// Standard frame sizes
const UPS_FRAMES = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 750, 800, 1000, 1100, 1250, 1500, 2000, 2500, 3000];
const GEN_FRAMES = [100, 150, 200, 250, 300, 400, 500, 600, 750, 800, 1000, 1250, 1500, 2000, 2500, 3000, 3250, 4000];
const XFMR_SIZES = [15, 25, 37.5, 50, 75, 100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000];
const PDU_SIZES = [25, 30, 50, 60, 75, 100, 125, 150, 200, 225, 250, 300, 400, 500];
const BREAKER_SIZES = [20, 30, 40, 50, 60, 80, 100, 125, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];

function findNext(sizes: number[], req: number): number {
  for (const s of sizes) if (s >= req) return s;
  return sizes[sizes.length - 1];
}

export function PowerSizing({ isDark, token, glassStyle }: PowerSizingProps) {
  // ===== INPUTS =====
  const [serverType, setServerType] = useState('standard_2u');
  const [numRacks, setNumRacks] = useState(50);
  const [kwPerRack, setKwPerRack] = useState(10);
  const [serversPerRack, setServersPerRack] = useState(20);
  const [diversityFactor, setDiversityFactor] = useState(0.80);
  const [growthMargin, setGrowthMargin] = useState(20);

  const [tier, setTier] = useState('III');
  const [voltageConfig, setVoltageConfig] = useState('208_120');

  const [upsEff, setUpsEff] = useState(95);
  const [pduEff, setPduEff] = useState(97);
  const [xfmrEff, setXfmrEff] = useState(98);
  const [pue, setPue] = useState(1.5);

  const [electricityRate, setElectricityRate] = useState(0.10);
  const [currency, setCurrency] = useState('usd');

  const [genFuelConsumption, setGenFuelConsumption] = useState(250);
  const [genRequiredRuntime, setGenRequiredRuntime] = useState(24);
  const [cableLength, setCableLength] = useState(30);

  // Server type sync
  const srvCfg = SERVER_TYPES[serverType];
  const isCustom = serverType === 'custom';
  const effectiveKwPerRack = isCustom ? kwPerRack : (srvCfg.wattPerUnit * (isCustom ? serversPerRack : srvCfg.unitsPerRack)) / 1000;
  const effectivePf = isCustom ? 0.95 : srvCfg.pf;

  // Tier sync
  const tierCfg = TIERS[tier];
  const numPaths = tierCfg.paths;
  const isRedundant = tier === 'III' || tier === 'IV';
  const is2N = tier === 'IV';

  // Voltage
  const vCfg = VOLTAGE_CONFIGS[voltageConfig];
  const sqrt3 = 1.732;

  // Currency
  const CURR: Record<string, { sym: string; rate: number }> = {
    usd: { sym: '$', rate: 1 }, eur: { sym: '€', rate: 0.92 }, gbp: { sym: '£', rate: 0.79 }, idr: { sym: 'Rp', rate: 15500 },
  };
  const ci = CURR[currency] || CURR.usd;
  const fmtC = (v: number) => `${ci.sym}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v * ci.rate)}`;
  const fmtN = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

  // ===== POWER CALCULATIONS =====
  const nameplateItKw = numRacks * effectiveKwPerRack;
  const effectiveItKw = nameplateItKw * diversityFactor;
  const designItKw = effectiveItKw * (1 + growthMargin / 100);
  const designItKva = effectivePf > 0 ? designItKw / effectivePf : designItKw;

  const totalFacilityKw = designItKw * pue;
  const totalFacilityKva = effectivePf > 0 ? totalFacilityKw / effectivePf : totalFacilityKw;
  const coolingKw = totalFacilityKw - designItKw;

  // Cooling BTU & Tonnage (1 kW = 3412.14 BTU/hr, 1 ton = 12000 BTU/hr)
  const coolingBtu = coolingKw * 3412.14;
  const coolingTons = coolingBtu / 12000;

  // Current calculations
  const facilityAmps = (totalFacilityKva * 1000) / (vCfg.voltage * sqrt3);
  const deratedAmps = facilityAmps / 0.8; // NEC 80%

  // ===== COMPONENT SIZING (per path) =====
  const pathLoad = is2N ? designItKva : designItKva; // each path carries full load
  const upsSizeKva = findNext(UPS_FRAMES, pathLoad / (upsEff / 100));
  const upsPerPath = 1;
  const upsSpare = (tier === 'II' || tier === 'III' || tier === 'IV') ? 1 : 0;
  const upsTotal = (upsPerPath + upsSpare) * numPaths;

  const genSizeKw = findNext(GEN_FRAMES, totalFacilityKw / numPaths);
  const genSpare = (tier === 'II' || tier === 'III' || tier === 'IV') ? 1 : 0;
  const genTotal = (1 + genSpare) * numPaths;

  const xfmrSizeKva = findNext(XFMR_SIZES, totalFacilityKva / numPaths);
  const xfmrTotal = numPaths;

  const racksPerPdu = 20;
  const pduPerPath = Math.ceil(numRacks / racksPerPdu);
  const pduSizeKva = findNext(PDU_SIZES, designItKva / pduPerPath);
  const pduTotal = pduPerPath * numPaths;

  const mainBreakerA = findNext(BREAKER_SIZES, deratedAmps / numPaths);
  const mainBreakerTotal = numPaths;

  // Annual energy & cost
  const annualKwh = totalFacilityKw * 8760;
  const annualCost = annualKwh * electricityRate;

  // Component table
  const compData = [
    { key: 'xfmr', icon: '⚡', component: 'Utility Transformer', size: `${fmtN(xfmrSizeKva)} kVA`, perPath: 1, paths: numPaths, total: xfmrTotal, capacity: `${fmtN(xfmrSizeKva * xfmrTotal)} kVA` },
    { key: 'sw', icon: '🔌', component: 'Main Switchgear / Breaker', size: `${fmtN(mainBreakerA)} A`, perPath: 1, paths: numPaths, total: mainBreakerTotal, capacity: `${fmtN(mainBreakerA)} A × ${mainBreakerTotal}` },
    { key: 'gen', icon: '🔋', component: 'Generator', size: `${fmtN(genSizeKw)} kW`, perPath: 1 + genSpare, paths: numPaths, total: genTotal, capacity: `${fmtN(genSizeKw * genTotal)} kW` },
    { key: 'ups', icon: '🔧', component: 'UPS System', size: `${fmtN(upsSizeKva)} kVA`, perPath: upsPerPath + upsSpare, paths: numPaths, total: upsTotal, capacity: `${fmtN(upsSizeKva * upsTotal)} kVA` },
    { key: 'pdu', icon: '📦', component: 'Floor PDU', size: `${fmtN(pduSizeKva)} kVA`, perPath: pduPerPath, paths: numPaths, total: pduTotal, capacity: `${fmtN(pduSizeKva * pduTotal)} kVA` },
    { key: 'cool', icon: '❄️', component: 'Cooling Capacity', size: `${coolingTons.toFixed(0)} tons`, perPath: '-', paths: '-', total: '-', capacity: `${fmtN(coolingBtu)} BTU/hr` },
  ];

  // Power chain stages
  const stageData = [
    { stage: 'Nameplate IT', kw: nameplateItKw, kva: nameplateItKw / effectivePf, note: `${numRacks} racks × ${effectiveKwPerRack.toFixed(1)} kW` },
    { stage: 'Diversified IT', kw: effectiveItKw, kva: effectiveItKw / effectivePf, note: `× ${diversityFactor} diversity` },
    { stage: 'Design IT (+growth)', kw: designItKw, kva: designItKva, note: `+${growthMargin}% margin` },
    { stage: 'Total Facility (×PUE)', kw: totalFacilityKw, kva: totalFacilityKva, note: `PUE ${pue}` },
    { stage: 'Derated (÷0.8)', kw: totalFacilityKw / 0.8, kva: totalFacilityKva / 0.8, note: 'NEC 80% rule' },
  ];

  // Power breakdown pie
  const breakdownPie = [
    { name: 'IT Load', value: Math.round(designItKw), fill: '#1890ff' },
    { name: 'Cooling', value: Math.round(coolingKw), fill: '#ff7a45' },
    { name: 'UPS Loss', value: Math.round(designItKw * (1 - upsEff / 100)), fill: '#722ed1' },
    { name: 'PDU Loss', value: Math.round(designItKw * (1 - pduEff / 100)), fill: '#faad14' },
    { name: 'Xfmr Loss', value: Math.round(totalFacilityKw * (1 - xfmrEff / 100)), fill: '#13c2c2' },
  ].filter(d => d.value > 0);

  // Rack density curve: how sizing changes with kW/rack
  const densityCurve = [2, 5, 8, 10, 15, 20, 30, 50, 75, 100].map(kw => {
    const itKw = numRacks * kw * diversityFactor * (1 + growthMargin / 100);
    const facKw = itKw * pue;
    return { density: `${kw}`, facility: Math.round(facKw), it: Math.round(itKw), cooling: Math.round(facKw - itKw) };
  });

  // Generator Fuel Sizing
  const fuelRequired = genFuelConsumption * genRequiredRuntime;
  const tankSizeWithMargin = fuelRequired * 1.1; // 10% reserve
  const tankSizeGallons = tankSizeWithMargin * 0.264172;
  const daysOfAutonomy = genRequiredRuntime / 24;
  
  const fuelChartData = [
    { load: '100%', consumption: genFuelConsumption },
    { load: '75%', consumption: genFuelConsumption * 0.75 },
    { load: '50%', consumption: genFuelConsumption * 0.5 },
  ];

  // Cable Sizing
  const totalAmpsCable = (designItKw * 1000) / vCfg.voltage;
  const recommendedCable = CABLE_TABLE.find(c => c.maxAmps >= totalAmpsCable) || CABLE_TABLE[CABLE_TABLE.length - 1];
  const vDrop = (2 * cableLength * totalAmpsCable * recommendedCable.resistance) / 1000;
  const vDropPercent = (vDrop / vCfg.voltage) * 100;
  const vDropPass = vDropPercent <= 3;

  return (
    <motion.div key="power-sizing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <Row gutter={[20, 20]}>
        {/* ===== LEFT: Configuration ===== */}
        <Col xs={24} lg={10}>
          <Card style={{ ...glassStyle, padding: 0 }} bodyStyle={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ThunderboltOutlined style={{ fontSize: 18, color: '#1890ff' }} />
              <Text strong style={{ fontSize: 16 }}>Power Sizing</Text>
              <Tag color="blue" style={{ marginLeft: 'auto', fontSize: 10 }}>SE WP#3</Tag>
            </div>

            <Collapse defaultActiveKey={['server', 'tier', 'efficiency', 'generator', 'cable']} ghost expandIconPosition="end">
              {/* Server Type & IT Load */}
              <Panel header={<Text strong>Server Type & IT Load</Text>} key="server">
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Server / Equipment Type</Text>
                  <Select value={serverType} onChange={(v) => { setServerType(v); if (v !== 'custom') { const c = SERVER_TYPES[v]; setServersPerRack(c.unitsPerRack); } }} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(SERVER_TYPES).map(([k, v]) => ({ value: k, label: v.label }))} />
                  {srvCfg?.desc && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{srvCfg.desc}</Text>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Number of Racks</Text>
                  <Row gutter={8}><Col flex="auto"><Slider min={1} max={1000} value={numRacks} onChange={setNumRacks} /></Col><Col><InputNumber min={1} max={1000} value={numRacks} onChange={v => v && setNumRacks(v)} style={{ width: 80 }} /></Col></Row>
                </div>
                {isCustom && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>kW per Rack (Custom)</Text>
                    <Row gutter={8}><Col flex="auto"><Slider min={1} max={200} value={kwPerRack} onChange={setKwPerRack} /></Col><Col><InputNumber min={1} max={200} value={kwPerRack} onChange={v => v && setKwPerRack(v)} style={{ width: 80 }} /></Col></Row>
                  </div>
                )}
                {!isCustom && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Servers per Rack</Text>
                    <Row gutter={8}><Col flex="auto"><Slider min={1} max={srvCfg.unitsPerRack} value={serversPerRack} onChange={setServersPerRack} /></Col><Col><InputNumber min={1} max={srvCfg.unitsPerRack} value={serversPerRack} onChange={v => v && setServersPerRack(v)} style={{ width: 80 }} /></Col></Row>
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Diversity Factor <Tooltip title="Ratio of actual load to nameplate. IT equipment rarely runs at 100%."><InfoCircleOutlined /></Tooltip></Text>
                  <Row gutter={8}><Col flex="auto"><Slider min={0.4} max={1.0} step={0.05} value={diversityFactor} onChange={setDiversityFactor} /></Col><Col><InputNumber min={0.4} max={1.0} step={0.05} value={diversityFactor} onChange={v => v && setDiversityFactor(v)} style={{ width: 70 }} /></Col></Row>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Growth Margin</Text>
                  <Row gutter={8}><Col flex="auto"><Slider min={0} max={50} value={growthMargin} onChange={setGrowthMargin} /></Col><Col><InputNumber min={0} max={50} value={growthMargin} onChange={v => v !== null && setGrowthMargin(v)} style={{ width: 70 }} addonAfter="%" /></Col></Row>
                </div>
                <Divider style={{ margin: '10px 0' }} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Tag color="blue">{effectiveKwPerRack.toFixed(1)} kW/rack</Tag>
                  <Tag>PF: {effectivePf}</Tag>
                  <Tag color="cyan">Nameplate: {fmtN(nameplateItKw)} kW</Tag>
                </div>
              </Panel>

              {/* Tier & Architecture */}
              <Panel header={<Text strong>Uptime Tier & Architecture</Text>} key="tier">
                <Radio.Group value={tier} onChange={e => setTier(e.target.value)} style={{ width: '100%' }}>
                  {Object.entries(TIERS).map(([k, v]) => (
                    <Radio key={k} value={k} style={{ display: 'block', marginBottom: 10, padding: '6px 0' }}>
                      <Text strong style={{ fontSize: 13 }}>{v.label}</Text>
                      <div style={{ marginLeft: 24 }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{v.desc}</Text>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <Tag style={{ fontSize: 10 }}>{v.powerArch}</Tag>
                          <Tag color="green" style={{ fontSize: 10 }}>{v.uptime} uptime</Tag>
                          <Tag color="blue" style={{ fontSize: 10 }}>{v.redundancy}</Tag>
                        </div>
                      </div>
                    </Radio>
                  ))}
                </Radio.Group>
                <Divider style={{ margin: '10px 0' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Input Voltage</Text>
                  <Select value={voltageConfig} onChange={setVoltageConfig} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(VOLTAGE_CONFIGS).map(([k, v]) => ({ value: k, label: v.label }))} />
                </div>
              </Panel>

              {/* Efficiency & Cost */}
              <Panel header={<Text strong>Efficiency & Cost</Text>} key="efficiency">
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>UPS Efficiency</Text>
                  <Slider min={85} max={99} value={upsEff} onChange={setUpsEff} marks={{ 85: '85%', 92: '92%', 96: '96%', 99: '99%' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>PDU Efficiency</Text>
                  <Slider min={90} max={99} value={pduEff} onChange={setPduEff} marks={{ 90: '90%', 95: '95%', 99: '99%' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Target PUE</Text>
                  <Slider min={1.1} max={2.5} step={0.05} value={pue} onChange={setPue} marks={{ 1.1: '1.1', 1.5: '1.5', 2.0: '2.0', 2.5: '2.5' }} />
                </div>
                <Divider style={{ margin: '10px 0' }} />
                <Row gutter={8}>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Electricity Rate</Text>
                    <InputNumber min={0.01} max={1} step={0.01} value={electricityRate} onChange={v => v && setElectricityRate(v)} style={{ width: '100%', marginTop: 4 }} addonAfter="$/kWh" />
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Currency</Text>
                    <Select value={currency} onChange={setCurrency} style={{ width: '100%', marginTop: 4 }}
                      options={[{ value: 'usd', label: 'USD' }, { value: 'eur', label: 'EUR' }, { value: 'gbp', label: 'GBP' }, { value: 'idr', label: 'IDR' }]} />
                  </Col>
                </Row>
              </Panel>

              {/* Generator Sizing */}
              <Panel header={<Text strong>Generator Sizing</Text>} key="generator">
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Fuel Consumption (L/hr at full load)</Text>
                  <Row gutter={8}>
                    <Col flex="auto"><Slider min={50} max={2000} value={genFuelConsumption} onChange={setGenFuelConsumption} /></Col>
                    <Col><InputNumber min={50} max={2000} value={genFuelConsumption} onChange={v => v && setGenFuelConsumption(v)} style={{ width: 80 }} /></Col>
                  </Row>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Required Runtime</Text>
                  <Select value={genRequiredRuntime} onChange={setGenRequiredRuntime} style={{ width: '100%', marginTop: 4 }}
                    options={[{ value: 8, label: '8 Hours' }, { value: 12, label: '12 Hours' }, { value: 24, label: '24 Hours' }, { value: 48, label: '48 Hours' }, { value: 72, label: '72 Hours' }]} />
                </div>
              </Panel>

              {/* Cable Sizing */}
              <Panel header={<Text strong>Cable Sizing</Text>} key="cable">
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Cable Length (meters)</Text>
                  <Row gutter={8}>
                    <Col flex="auto"><Slider min={1} max={300} value={cableLength} onChange={setCableLength} /></Col>
                    <Col><InputNumber min={1} max={300} value={cableLength} onChange={v => v && setCableLength(v)} style={{ width: 80 }} /></Col>
                  </Row>
                </div>
              </Panel>
            </Collapse>
          </Card>
        </Col>

        {/* ===== RIGHT: Results ===== */}
        <Col xs={24} lg={14}>
          {/* Power Summary */}
          <Card style={{ ...glassStyle, marginBottom: 16 }} bodyStyle={{ padding: '20px' }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6}>
                <Statistic title="Design IT Load" value={fmtN(Math.round(designItKw))} suffix="kW" valueStyle={{ fontSize: 20, fontWeight: 700, color: '#1890ff' }} />
                <Text type="secondary" style={{ fontSize: 11 }}>{fmtN(Math.round(designItKva))} kVA</Text>
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Total Facility" value={fmtN(Math.round(totalFacilityKw))} suffix="kW" valueStyle={{ fontSize: 20, fontWeight: 700, color: '#722ed1' }} />
                <Text type="secondary" style={{ fontSize: 11 }}>{fmtN(Math.round(totalFacilityKva))} kVA</Text>
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Utility Input" value={fmtN(Math.round(deratedAmps))} suffix="A" valueStyle={{ fontSize: 20, fontWeight: 700, color: '#fa8c16' }} />
                <Text type="secondary" style={{ fontSize: 11 }}>{vCfg.voltage}V 3φ (derated)</Text>
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="Cooling" value={`${coolingTons.toFixed(0)}`} suffix="tons" valueStyle={{ fontSize: 20, fontWeight: 700, color: '#ff7a45' }} />
                <Text type="secondary" style={{ fontSize: 11 }}>{fmtN(Math.round(coolingBtu))} BTU/hr</Text>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={[12, 8]}>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Annual Energy</Text><div style={{ fontSize: 14, fontWeight: 600 }}>{(annualKwh / 1e6).toFixed(1)} GWh</div></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Annual Cost</Text><div style={{ fontSize: 14, fontWeight: 600, color: '#52c41a' }}>{fmtC(annualCost)}</div></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Architecture</Text><div style={{ fontSize: 14, fontWeight: 600 }}><Tag color="blue">{tierCfg.powerArch}</Tag></div></Col>
              <Col xs={12} sm={6}><Text type="secondary" style={{ fontSize: 11 }}>Uptime</Text><div style={{ fontSize: 14, fontWeight: 600 }}><Tag color="green">{tierCfg.uptime}</Tag></div></Col>
            </Row>
          </Card>

          {/* Component Sizing Table */}
          <Card size="small" title={<Text strong style={{ fontSize: 14 }}>⚡ Component Sizing — {tierCfg.label}</Text>} style={{ ...glassStyle, marginBottom: 16 }} bodyStyle={{ padding: 0 }}>
            <Table dataSource={compData} pagination={false} size="small" columns={[
              { title: '', dataIndex: 'icon', key: 'icon', width: 30 },
              { title: 'Component', dataIndex: 'component', key: 'c' },
              { title: 'Frame Size', dataIndex: 'size', key: 's', align: 'right' as const },
              { title: 'Per Path', dataIndex: 'perPath', key: 'pp', align: 'center' as const },
              { title: 'Paths', dataIndex: 'paths', key: 'pa', align: 'center' as const, render: (v: any) => <Tag color="blue">{v}</Tag> },
              { title: 'Total Qty', dataIndex: 'total', key: 't', align: 'center' as const, render: (v: any) => typeof v === 'number' ? <Tag color="green">{v}</Tag> : v },
              { title: 'Total Capacity', dataIndex: 'capacity', key: 'cap', align: 'right' as const, render: (t: string) => <Text strong>{t}</Text> },
            ]} />
          </Card>

          {/* Derating + Power Chain */}
          <Card size="small" title={<Text strong style={{ fontSize: 14 }}>Power Chain — Nameplate to Utility</Text>} style={{ ...glassStyle, marginBottom: 16 }} bodyStyle={{ padding: 0 }}>
            <Alert message="NEC 80% Rule: Continuous loads must not exceed 80% of breaker rating (= size at 125% of load)." type="info" showIcon style={{ margin: '8px 12px', fontSize: 12 }} />
            <Table dataSource={stageData.map((s, i) => ({ ...s, key: i }))} pagination={false} size="small" columns={[
              { title: 'Stage', dataIndex: 'stage', key: 'stage', render: (t: string, r: any) => r.key === 4 ? <Text strong style={{ color: '#fa8c16' }}>{t}</Text> : t },
              { title: 'kW', dataIndex: 'kw', key: 'kw', align: 'right' as const, render: (v: number) => fmtN(Math.round(v)) },
              { title: 'kVA', dataIndex: 'kva', key: 'kva', align: 'right' as const, render: (v: number) => fmtN(Math.round(v)) },
              { title: `Amps (${vCfg.voltage}V)`, key: 'amps', align: 'right' as const, render: (_: any, r: any) => fmtN(Math.round((r.kva * 1000) / (vCfg.voltage * sqrt3))) },
              { title: 'Note', dataIndex: 'note', key: 'note', render: (t: string) => <Text type="secondary" style={{ fontSize: 11 }}>{t}</Text> },
            ]} />
          </Card>

          {/* Charts Row */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}>
              <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Facility Power Breakdown</Text>} style={glassStyle} bodyStyle={{ padding: '8px 10px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={breakdownPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3}>
                      {breakdownPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => `${v} kW`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Facility Power vs Rack Density</Text>} style={glassStyle} bodyStyle={{ padding: '8px 10px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={densityCurve}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="density" tick={{ fontSize: 10 }} label={{ value: 'kW/rack', position: 'insideBottom', style: { fontSize: 10 }, offset: -2 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip formatter={(v: number) => `${fmtN(v)} kW`} />
                    <Area type="monotone" dataKey="facility" fill="#722ed120" stroke="#722ed1" strokeWidth={2} name="Total Facility" />
                    <Line type="monotone" dataKey="it" stroke="#1890ff" strokeWidth={2} dot={false} name="IT Load" />
                    <Line type="monotone" dataKey="cooling" stroke="#ff7a45" strokeWidth={1} strokeDasharray="5 3" dot={false} name="Cooling" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Generator Sizing Card */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}>
              <Card size="small" title={<Text strong style={{ fontSize: 13 }}>⛽ Generator Fuel Sizing</Text>} style={glassStyle} bodyStyle={{ padding: '16px' }}>
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Statistic title="Fuel Required" value={fmtN(fuelRequired)} suffix="L" valueStyle={{ fontSize: 18, fontWeight: 600 }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Tank Size (w/ 10% Reserve)" value={fmtN(tankSizeWithMargin)} suffix="L" valueStyle={{ fontSize: 18, fontWeight: 600, color: '#faad14' }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>{fmtN(tankSizeGallons)} Gallons</Text>
                  </Col>
                  <Col span={12}>
                    <Statistic title="Days of Autonomy" value={daysOfAutonomy.toFixed(1)} suffix="Days" valueStyle={{ fontSize: 18, fontWeight: 600 }} />
                  </Col>
                </Row>
                <div style={{ marginTop: 16 }}>
                  <Text strong style={{ fontSize: 12 }}>Fuel Consumption by Load</Text>
                  <ResponsiveContainer width="100%" height={240} style={{ marginTop: 8 }}>
                    <BarChart data={fuelChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="load" type="category" width={60} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(v: number) => `${v.toFixed(0)} L/hr`} />
                      <Bar dataKey="consumption" fill="#faad14" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            
            {/* Cable Sizing Card */}
            <Col xs={24} md={12}>
              <Card size="small" title={<Text strong style={{ fontSize: 13 }}>🔌 Cable Sizing Recommendations</Text>} style={glassStyle} bodyStyle={{ padding: '16px' }}>
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Statistic title="Recommended Gauge" value={recommendedCable.gauge} valueStyle={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>Max Amps: {recommendedCable.maxAmps}A</Text>
                  </Col>
                  <Col span={12}>
                    <Statistic title="Calculated Current" value={fmtN(totalAmpsCable)} suffix="A" valueStyle={{ fontSize: 18, fontWeight: 600 }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Voltage Drop" value={vDropPercent.toFixed(2)} suffix="%" valueStyle={{ fontSize: 18, fontWeight: 600, color: vDropPass ? '#52c41a' : '#ff4d4f' }} />
                    <Tag color={vDropPass ? 'success' : 'error'} style={{ marginTop: 4 }}>
                      {vDropPass ? 'PASS (≤3%)' : 'FAIL (>3%)'}
                    </Tag>
                  </Col>
                </Row>
                
                <div style={{ marginTop: 16 }}>
                  <Collapse ghost size="small">
                    <Panel header={<Text style={{ fontSize: 12 }}>View Cable Gauge Reference Table</Text>} key="1">
                      <Table 
                        dataSource={CABLE_TABLE.map((c, i) => ({ ...c, key: i }))} 
                        pagination={false} 
                        size="small"
                        rowClassName={(record) => record.gauge === recommendedCable.gauge ? 'highlight-row' : ''}
                        scroll={{ y: 150 }}
                        columns={[
                          { title: 'Gauge', dataIndex: 'gauge', width: '50%' },
                          { title: 'Max Amps', dataIndex: 'maxAmps', width: '50%', render: (v) => `${v}A` }
                        ]} 
                      />
                      <style>{`
                        .highlight-row { background-color: ${isDark ? 'rgba(24, 144, 255, 0.2)' : 'rgba(24, 144, 255, 0.1)'}; font-weight: bold; }
                      `}</style>
                    </Panel>
                  </Collapse>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Disclaimer */}
          <div style={{ padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              <InfoCircleOutlined style={{ marginRight: 6 }} />
              Based on Schneider Electric WP#3 methodology & Uptime Institute tier standards. Server presets use typical power consumption values. Cooling: 1 kW = 3,412 BTU/hr, 1 ton = 12,000 BTU/hr. Component sizes rounded to nearest standard frame. Actual sizing should be verified by a licensed PE.
            </Text>
          </div>
        </Col>
      </Row>
    </motion.div>
  );
}
