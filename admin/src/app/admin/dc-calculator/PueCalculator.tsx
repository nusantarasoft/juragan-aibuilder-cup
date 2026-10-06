import React, { useState } from 'react';
import { Select, Slider, InputNumber, Collapse, Tooltip, Card, Row, Col, Typography, Divider, Tag, Radio, Switch as AntSwitch, Statistic, Progress, Table, Button, Modal, Input, message } from "antd";
import { InfoCircleOutlined, ThunderboltOutlined, DollarOutlined, SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, Area } from "recharts";

const { Text } = Typography;
const { Panel } = Collapse;

interface PueCalcProps {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

// ===== SE WP#154 3-Loss Model: Fixed + Proportional + Square per subsystem =====
// Each subsystem has losses as fraction of IT load at that component
const SUBSYSTEM = {
  ups: {
    'double_conversion': { label: 'Double Conversion (Online)', fixed: 0.015, prop: 0.040, sq: 0.015, desc: 'Standard online UPS, 92-95% efficient' },
    'eco_mode': { label: 'Eco / High Efficiency Mode', fixed: 0.005, prop: 0.010, sq: 0.005, desc: 'Bypass mode, 98-99% efficient' },
    'line_interactive': { label: 'Line Interactive', fixed: 0.010, prop: 0.025, sq: 0.010, desc: 'Mid-range efficiency, 95-97%' },
    'li_ion': { label: 'Li-Ion High Efficiency', fixed: 0.008, prop: 0.018, sq: 0.007, desc: 'Modern Li-Ion UPS, 96-97%' },
    'flywheel': { label: 'Rotary / Flywheel UPS', fixed: 0.020, prop: 0.030, sq: 0.012, desc: 'Rotary UPS with flywheel storage' },
  },
  switchgear: {
    'standard': { label: 'Standard Switchgear', fixed: 0.003, prop: 0.005, sq: 0.002 },
    'high_eff': { label: 'High-Efficiency Switchgear', fixed: 0.002, prop: 0.003, sq: 0.001 },
  },
  generator: {
    'none': { label: 'No Generator Losses', fixed: 0, prop: 0, sq: 0 },
    'standby': { label: 'Standby Generator (parasitic)', fixed: 0.005, prop: 0, sq: 0, desc: 'Block heaters, controls, fuel pumps' },
    'continuous': { label: 'Continuous Duty Generator', fixed: 0.008, prop: 0.003, sq: 0.001 },
  },
  pdu: {
    'transformer': { label: 'Transformer-based PDU', fixed: 0.008, prop: 0.020, sq: 0.010, desc: 'Traditional PDU with step-down transformer' },
    'transformerless': { label: 'Transformerless PDU', fixed: 0.003, prop: 0.008, sq: 0.004, desc: 'SE recommendation: save 2-3% efficiency' },
    'busway': { label: 'Busway Distribution', fixed: 0.005, prop: 0.015, sq: 0.008 },
    'direct': { label: 'Direct Feed / Panelboard', fixed: 0.002, prop: 0.006, sq: 0.003 },
  },
  cooling: {
    'crac_dx': { label: 'CRAC – DX Perimeter', fixed: 0.025, prop: 0.320, sq: 0.060, desc: 'Room-based compressor cooling' },
    'crah_chw': { label: 'CRAH – Chilled Water Perimeter', fixed: 0.018, prop: 0.260, sq: 0.045, desc: 'Central chiller plant with CRAHs' },
    'chiller_vfd': { label: 'Chiller with VFD', fixed: 0.015, prop: 0.200, sq: 0.035, desc: 'Variable-speed drives for partial-load efficiency' },
    'chiller_no_vfd': { label: 'Chiller without VFD', fixed: 0.020, prop: 0.280, sq: 0.050, desc: 'Fixed-speed compressor chiller' },
    'dry_cooler': { label: 'Dry Cooler / Adiabatic', fixed: 0.012, prop: 0.150, sq: 0.025, desc: 'Ambient air reject, no water use' },
    'in_row': { label: 'In-Row / Close-Coupled', fixed: 0.012, prop: 0.200, sq: 0.030, desc: 'Row-level cooling, shorter air paths' },
    'rear_door': { label: 'Rear Door Heat Exchanger', fixed: 0.008, prop: 0.150, sq: 0.020, desc: 'Passive/active rear-door cooling' },
    'dlc': { label: 'Direct Liquid Cooling (DLC)', fixed: 0.005, prop: 0.080, sq: 0.010, desc: 'Cold plates on chips, best for HPC/AI' },
    'indirect_evap': { label: 'Indirect Evaporative', fixed: 0.010, prop: 0.120, sq: 0.018, desc: 'Air-to-air heat exchange with evap assist' },
  },
  lighting: {
    'fluorescent': { label: 'Standard Fluorescent', fixedKw: 5.0, desc: '~2 W/sqft' },
    'led': { label: 'LED Lighting', fixedKw: 2.5, desc: '~1 W/sqft' },
    'led_occ': { label: 'LED + Occupancy Sensors', fixedKw: 1.2, desc: 'SE recommendation' },
    'lights_out': { label: 'Lights-Out DC', fixedKw: 0.3, desc: 'Emergency lighting only' },
  },
};

const CONTAINMENT = {
  'none': { label: 'No Containment', factor: 1.00, desc: 'Open airflow mixing' },
  'cold_aisle': { label: 'Cold Aisle Containment', factor: 0.88, desc: '~12% cooling improvement' },
  'hot_aisle': { label: 'Hot Aisle Containment', factor: 0.83, desc: '~17% cooling improvement' },
  'chimney': { label: 'Rack Chimney Cabinets', factor: 0.90, desc: '~10% improvement' },
  'full_enclosure': { label: 'Full Row Enclosure', factor: 0.80, desc: '~20% improvement' },
};

const ECONOMIZER = {
  'none': { label: 'No Economizer (0 hrs)', hours: 0 },
  '1000': { label: 'Partial Economizer (~1000 hrs)', hours: 1000 },
  '2000': { label: 'Moderate Climate (~2000 hrs)', hours: 2000 },
  '4000': { label: 'Cool Climate (~4000 hrs)', hours: 4000 },
  '6000': { label: 'Cold Climate (~6000 hrs)', hours: 6000 },
  '8000': { label: 'Nordic / Very Cold (~8000 hrs)', hours: 8000 },
};

const REDUNDANCY: Record<string, { label: string; mult: number; desc: string }> = {
  'N': { label: 'N (No Redundancy)', mult: 1.00, desc: 'Single path' },
  'N+1': { label: 'N+1', mult: 1.06, desc: 'One extra component' },
  '2N': { label: '2N (Fully Redundant)', mult: 1.14, desc: 'Dual path' },
  '2(N+1)': { label: '2(N+1)', mult: 1.20, desc: 'Dual path + spare per path' },
};

export function PueCalculator({ isDark, token, glassStyle }: PueCalcProps) {
  // ===== INPUTS =====
  const [itCapacityKw, setItCapacityKw] = useState(1000);
  const [itLoadKw, setItLoadKw] = useState(500);
  const [electricityRate, setElectricityRate] = useState(0.10); // $/kWh
  const [currency, setCurrency] = useState('usd');

  const [upsType, setUpsType] = useState('double_conversion');
  const [switchgearType, setSwitchgearType] = useState('standard');
  const [generatorType, setGeneratorType] = useState('standby');
  const [pduType, setPduType] = useState('transformer');
  const [redundancy, setRedundancy] = useState('N+1');

  const [coolingType, setCoolingType] = useState('crah_chw');
  const [containment, setContainment] = useState('none');
  const [economizerHrs, setEconomizerHrs] = useState('none');
  const [coolingRedundancy, setCoolingRedundancy] = useState('N+1');

  const [lightingType, setLightingType] = useState('led');
  const [auxLoadKw, setAuxLoadKw] = useState(10);

  // New Scenario State
  const [scenarioModalVisible, setScenarioModalVisible] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [targetPue, setTargetPue] = useState<number | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('dc-pue-scenarios');
    if (saved) {
      try { setScenarios(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const handleSaveScenario = () => {
    if (!scenarioName) {
      message.error('Please enter a scenario name');
      return;
    }
    const newScenario = {
      id: Date.now(),
      name: scenarioName,
      date: new Date().toLocaleDateString(),
      pue: pue.toFixed(3),
      itLoadKw,
      totalFacilityKw: totalFacility,
    };
    const newScenarios = [newScenario, ...scenarios].slice(0, 10);
    setScenarios(newScenarios);
    localStorage.setItem('dc-pue-scenarios', JSON.stringify(newScenarios));
    setScenarioModalVisible(false);
    setScenarioName('');
    message.success('Scenario saved successfully');
  };

  const deleteScenario = (id: number) => {
    const newScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(newScenarios);
    localStorage.setItem('dc-pue-scenarios', JSON.stringify(newScenarios));
  };

  // Currency
  const CURR: Record<string, { sym: string; rate: number }> = {
    usd: { sym: '$', rate: 1 }, eur: { sym: '€', rate: 0.92 }, gbp: { sym: '£', rate: 0.79 }, sgd: { sym: 'S$', rate: 1.35 },
  };
  const ci = CURR[currency] || CURR.usd;
  const fmtCurr = (v: number) => `${ci.sym}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v * ci.rate)}`;
  const fmtKw = (v: number) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v)} kW`;

  // ===== CALCULATIONS =====
  const loadRatio = itCapacityKw > 0 ? Math.min(itLoadKw / itCapacityKw, 1) : 0;
  const redMult = REDUNDANCY[redundancy]?.mult || 1.06;
  const coolRedMult = REDUNDANCY[coolingRedundancy]?.mult || 1.06;
  const containFactor = (CONTAINMENT as any)[containment]?.factor || 1.0;
  const econHrs = (ECONOMIZER as any)[economizerHrs]?.hours || 0;
  const econFraction = econHrs / 8760; // fraction of year using economizer (reduces cooling by ~60% during those hours)
  const econReduction = econFraction * 0.60; // cooling savings during economizer hours

  const calcLoss = (cfg: any, load: number, mult: number) => {
    if (!cfg || cfg.fixedKw !== undefined) return 0;
    return (cfg.fixed + cfg.prop * load + cfg.sq * load * load) * itLoadKw * mult;
  };

  // Power subsystem losses
  const ups = (SUBSYSTEM.ups as any)[upsType];
  const sw = (SUBSYSTEM.switchgear as any)[switchgearType];
  const gen = (SUBSYSTEM.generator as any)[generatorType];
  const pdu = (SUBSYSTEM.pdu as any)[pduType];
  const cool = (SUBSYSTEM.cooling as any)[coolingType];
  const light = (SUBSYSTEM.lighting as any)[lightingType];

  const upsLossKw = calcLoss(ups, loadRatio, redMult);
  const swLossKw = calcLoss(sw, loadRatio, redMult);
  const genLossKw = calcLoss(gen, loadRatio, 1);
  const pduLossKw = calcLoss(pdu, loadRatio, 1);
  const rawCoolingKw = calcLoss(cool, loadRatio, coolRedMult);
  const coolingKw = rawCoolingKw * containFactor * (1 - econReduction);
  const lightKw = light?.fixedKw || 2.5;

  const powerLossTotal = upsLossKw + swLossKw + genLossKw + pduLossKw;
  const totalOverhead = powerLossTotal + coolingKw + lightKw + auxLoadKw;
  const totalFacility = itLoadKw + totalOverhead;
  const pue = itLoadKw > 0 ? totalFacility / itLoadKw : 1;
  const dcie = pue > 0 ? (1 / pue) * 100 : 0;

  // Annual energy & cost
  const annualItKwh = itLoadKw * 8760;
  const annualTotalKwh = totalFacility * 8760;
  const annualWasteKwh = totalOverhead * 8760;
  const annualCost = annualTotalKwh * electricityRate;
  const annualItCost = annualItKwh * electricityRate;
  const annualWasteCost = annualWasteKwh * electricityRate;

  // Savings calculations
  const effectiveTargetPue = targetPue !== null ? targetPue : Math.max(1.0, parseFloat((pue - 0.1).toFixed(3)));
  const energySavedKwh = annualTotalKwh - (annualItKwh * effectiveTargetPue);
  const costSaved = energySavedKwh * electricityRate;
  const co2Saved = (energySavedKwh * 0.42) / 1000;

  const savingsChartData = [
    { name: 'Current PUE', energy: Math.round(annualTotalKwh / 1000), fill: '#ff4d4f' },
    { name: 'Target PUE', energy: Math.round((annualItKwh * effectiveTargetPue) / 1000), fill: '#52c41a' },
  ];

  // PUE rating
  const getRating = (p: number) => {
    if (p < 1.2) return { grade: 'A+', color: '#52c41a', label: 'Best-in-Class' };
    if (p < 1.4) return { grade: 'A', color: '#73d13d', label: 'Excellent' };
    if (p < 1.6) return { grade: 'B', color: '#faad14', label: 'Good' };
    if (p < 1.8) return { grade: 'C', color: '#fa8c16', label: 'Average' };
    if (p < 2.0) return { grade: 'D', color: '#ff4d4f', label: 'Below Average' };
    return { grade: 'F', color: '#cf1322', label: 'Poor' };
  };
  const rating = getRating(pue);

  // Subsystem breakdown for pie/bar
  const breakdownData = [
    { name: 'UPS', kw: upsLossKw, fill: '#1890ff' },
    { name: 'Switchgear', kw: swLossKw, fill: '#36cfc9' },
    { name: 'Generator', kw: genLossKw, fill: '#ffc53d' },
    { name: 'PDU', kw: pduLossKw, fill: '#722ed1' },
    { name: 'Cooling', kw: coolingKw, fill: '#ff7a45' },
    { name: 'Lighting', kw: lightKw, fill: '#fadb14' },
    { name: 'Auxiliary', kw: auxLoadKw, fill: '#13c2c2' },
  ].filter(d => d.kw > 0.1).map(d => ({ ...d, kw: Math.round(d.kw * 10) / 10, cost: Math.round(d.kw * 8760 * electricityRate) }));

  // PUE & DCiE vs Load curve (10% to 100%)
  const loadCurve = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(pct => {
    const lr = pct / 100;
    const il = itCapacityKw * lr;
    const u = calcLossAt(ups, lr, il, redMult);
    const s = calcLossAt(sw, lr, il, redMult);
    const g = calcLossAt(gen, lr, il, 1);
    const p = calcLossAt(pdu, lr, il, 1);
    const cRaw = calcLossAt(cool, lr, il, coolRedMult);
    const c = cRaw * containFactor * (1 - econReduction);
    const total = il + u + s + g + p + c + lightKw + auxLoadKw;
    const puev = il > 0 ? total / il : 99;
    const dciev = puev > 0 ? (1 / puev) * 100 : 0;
    return { load: `${pct}%`, pue: parseFloat(puev.toFixed(3)), dcie: parseFloat(dciev.toFixed(1)), overhead: Math.round(u + s + g + p + c + lightKw + auxLoadKw) };
  });

  function calcLossAt(cfg: any, lr: number, il: number, mult: number) {
    if (!cfg || cfg.fixedKw !== undefined) return 0;
    return (cfg.fixed + cfg.prop * lr + cfg.sq * lr * lr) * il * mult;
  }

  // Summary table
  const summaryRows = [
    { key: 'it', category: 'IT Equipment Load', kw: itLoadKw, pct: 100, annual: annualItKwh },
    ...breakdownData.map(d => ({ key: d.name, category: d.name + ' Loss', kw: d.kw, pct: itLoadKw > 0 ? (d.kw / itLoadKw * 100) : 0, annual: d.kw * 8760 })),
    { key: 'total', category: 'TOTAL FACILITY', kw: totalFacility, pct: pue * 100, annual: annualTotalKwh },
  ];

  const summaryColumns = [
    { title: 'Category', dataIndex: 'category', key: 'category', render: (t: string, r: any) => r.key === 'total' ? <Text strong>{t}</Text> : t },
    { title: 'Power (kW)', dataIndex: 'kw', key: 'kw', render: (v: number) => fmtKw(v), align: 'right' as const },
    { title: '% of IT', dataIndex: 'pct', key: 'pct', render: (v: number) => `${v.toFixed(1)}%`, align: 'right' as const },
    { title: 'Annual (kWh)', dataIndex: 'annual', key: 'annual', render: (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v), align: 'right' as const },
    { title: 'Annual Cost', key: 'cost', render: (_: any, r: any) => fmtCurr(r.annual * electricityRate), align: 'right' as const },
  ];

  return (
    <motion.div key="pue-calc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <Row gutter={[20, 20]}>
        {/* ===== LEFT: Configuration ===== */}
        <Col xs={24} lg={10}>
          <Card style={{ ...glassStyle, padding: 0 }} bodyStyle={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ThunderboltOutlined style={{ fontSize: 18, color: '#52c41a' }} />
              <Text strong style={{ fontSize: 16 }}>PUE Configuration</Text>
              <Tag color="green" style={{ marginLeft: 'auto', fontSize: 10 }}>SE WP#154</Tag>
            </div>

            <Collapse defaultActiveKey={['load', 'power', 'cooling']} ghost expandIconPosition="end">
              {/* Capacity & Load */}
              <Panel header={<Text strong>Capacity & Load</Text>} key="load">
                <div style={{ marginBottom: 14 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Design IT Capacity (kW)</Text>
                  <Row gutter={8}><Col flex="auto"><Slider min={50} max={50000} step={50} value={itCapacityKw} onChange={setItCapacityKw} /></Col><Col><InputNumber min={50} max={50000} step={50} value={itCapacityKw} onChange={v => v && setItCapacityKw(v)} style={{ width: 90 }} /></Col></Row>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Actual IT Load (kW)</Text>
                  <Row gutter={8}><Col flex="auto"><Slider min={10} max={itCapacityKw} step={10} value={Math.min(itLoadKw, itCapacityKw)} onChange={setItLoadKw} /></Col><Col><InputNumber min={10} max={itCapacityKw} step={10} value={itLoadKw} onChange={v => v && setItLoadKw(v)} style={{ width: 90 }} /></Col></Row>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Tag color="blue">Load: {(loadRatio * 100).toFixed(0)}%</Tag>
                  <Tag color="cyan">IT: {fmtKw(itLoadKw)}</Tag>
                  <Tag>Capacity: {fmtKw(itCapacityKw)}</Tag>
                </div>
              </Panel>

              {/* Power Infrastructure */}
              <Panel header={<Text strong>Power Infrastructure</Text>} key="power">
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>UPS Type</Text>
                  <Select value={upsType} onChange={setUpsType} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(SUBSYSTEM.ups).map(([k, v]) => ({ value: k, label: v.label }))} />
                  {ups?.desc && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{ups.desc}</Text>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Power Distribution (PDU)</Text>
                  <Select value={pduType} onChange={setPduType} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(SUBSYSTEM.pdu).map(([k, v]) => ({ value: k, label: v.label }))} />
                  {pdu?.desc && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{pdu.desc}</Text>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Switchgear</Text>
                  <Select value={switchgearType} onChange={setSwitchgearType} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(SUBSYSTEM.switchgear).map(([k, v]) => ({ value: k, label: v.label }))} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Generator Parasitic Load</Text>
                  <Select value={generatorType} onChange={setGeneratorType} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(SUBSYSTEM.generator).map(([k, v]) => ({ value: k, label: v.label }))} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Power Redundancy</Text>
                  <Radio.Group value={redundancy} onChange={e => setRedundancy(e.target.value)} style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(REDUNDANCY).map(([k, v]) => <Radio.Button key={k} value={k}>{v.label.split(' ')[0]}</Radio.Button>)}
                  </Radio.Group>
                </div>
              </Panel>

              {/* Cooling */}
              <Panel header={<Text strong>Cooling Architecture</Text>} key="cooling">
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Cooling Type</Text>
                  <Select value={coolingType} onChange={setCoolingType} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(SUBSYSTEM.cooling).map(([k, v]) => ({ value: k, label: v.label }))} />
                  {cool?.desc && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{cool.desc}</Text>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Air Containment</Text>
                  <Select value={containment} onChange={setContainment} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(CONTAINMENT).map(([k, v]) => ({ value: k, label: v.label }))} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Economizer Hours / Year</Text>
                  <Select value={economizerHrs} onChange={setEconomizerHrs} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(ECONOMIZER).map(([k, v]) => ({ value: k, label: v.label }))} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Cooling Redundancy</Text>
                  <Radio.Group value={coolingRedundancy} onChange={e => setCoolingRedundancy(e.target.value)} style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.entries(REDUNDANCY).map(([k, v]) => <Radio.Button key={k} value={k}>{v.label.split(' ')[0]}</Radio.Button>)}
                  </Radio.Group>
                </div>
              </Panel>

              {/* Lighting & Aux */}
              <Panel header={<Text strong>Lighting & Auxiliary</Text>} key="aux">
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Lighting</Text>
                  <Select value={lightingType} onChange={setLightingType} style={{ width: '100%', marginTop: 4 }}
                    options={Object.entries(SUBSYSTEM.lighting).map(([k, v]) => ({ value: k, label: v.label }))} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Additional Auxiliary Load (kW)</Text>
                  <InputNumber min={0} max={200} step={1} value={auxLoadKw} onChange={v => v !== null && setAuxLoadKw(v)} style={{ width: '100%', marginTop: 4 }} />
                </div>
              </Panel>

              {/* Electricity Cost */}
              <Panel header={<Text strong>Electricity & Currency</Text>} key="cost">
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Electricity Rate ($/kWh)</Text>
                  <InputNumber min={0.01} max={1.0} step={0.01} value={electricityRate} onChange={v => v !== null && setElectricityRate(v)} style={{ width: '100%', marginTop: 4 }} addonAfter="$/kWh" />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Display Currency</Text>
                  <Select value={currency} onChange={setCurrency} style={{ width: '100%', marginTop: 4 }}
                    options={[
                      { value: 'usd', label: 'USD ($)' }, { value: 'eur', label: 'EUR (€)' },
                      { value: 'gbp', label: 'GBP (£)' }, { value: 'sgd', label: 'SGD (S$)' },
                    ]} />
                </div>
              </Panel>
            </Collapse>
          </Card>
        </Col>

        {/* ===== RIGHT: Results ===== */}
        <Col xs={24} lg={14}>
          {/* PUE Banner */}
          <Card style={{ ...glassStyle, textAlign: 'center', marginBottom: 16 }} bodyStyle={{ padding: '20px' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={7}>
                <Progress type="dashboard" percent={Math.min(dcie, 100)} strokeColor={rating.color}
                  trailColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  format={() => (<div><div style={{ fontSize: 30, fontWeight: 800, color: rating.color, lineHeight: 1 }}>{pue.toFixed(3)}</div><div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>PUE</div></div>)}
                  size={140} strokeWidth={8} />
                <div style={{ marginTop: 12 }}>
                  <Button type="primary" icon={<SaveOutlined />} size="small" onClick={() => setScenarioModalVisible(true)}>
                    Save Scenario
                  </Button>
                </div>
              </Col>
              <Col xs={24} md={17}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Tag style={{ fontSize: 18, fontWeight: 800, padding: '4px 14px', borderRadius: 8, background: `${rating.color}20`, color: rating.color, border: `1px solid ${rating.color}40` }}>{rating.grade}</Tag>
                    <Text strong style={{ fontSize: 15 }}>{rating.label}</Text>
                    <Tag style={{ marginLeft: 'auto' }}>DCiE: {dcie.toFixed(1)}%</Tag>
                  </div>
                  <Row gutter={[12, 8]}>
                    <Col xs={12} sm={6}><Statistic title="IT Load" value={fmtKw(itLoadKw)} valueStyle={{ fontSize: 15, color: '#1890ff' }} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Total Facility" value={fmtKw(totalFacility)} valueStyle={{ fontSize: 15 }} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Overhead" value={fmtKw(totalOverhead)} valueStyle={{ fontSize: 15, color: '#ff4d4f' }} /></Col>
                    <Col xs={12} sm={6}><Statistic title="Load Ratio" value={`${(loadRatio * 100).toFixed(0)}%`} valueStyle={{ fontSize: 15 }} /></Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Annual Energy & Cost */}
          <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
            {[
              { title: 'Annual Energy', val: `${(annualTotalKwh / 1000).toFixed(0)} MWh`, color: '#722ed1' },
              { title: 'Annual Cost', val: fmtCurr(annualCost), color: '#1890ff' },
              { title: 'Waste Energy', val: `${(annualWasteKwh / 1000).toFixed(0)} MWh`, color: '#ff4d4f' },
              { title: 'Waste Cost', val: fmtCurr(annualWasteCost), color: '#fa8c16' },
            ].map(m => (
              <Col xs={12} md={6} key={m.title}>
                <Card size="small" style={{ ...glassStyle, textAlign: 'center' }} bodyStyle={{ padding: 10 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{m.title}</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: m.color, marginTop: 2 }}>{m.val}</div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Breakdown: Pie + Progress bars */}
          <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}>
              <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Overhead Breakdown</Text>} style={glassStyle} bodyStyle={{ padding: '8px 10px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={breakdownData} dataKey="kw" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                      {breakdownData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => `${v} kW`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Loss Detail & Annual Cost</Text>} style={glassStyle} bodyStyle={{ padding: '8px 10px' }}>
                {breakdownData.map(d => {
                  const pct = totalOverhead > 0 ? (d.kw / totalOverhead * 100) : 0;
                  return (
                    <div key={d.name} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                        <Text style={{ fontSize: 11 }}>{d.name}</Text>
                        <Text strong style={{ fontSize: 11 }}>{d.kw} kW · {fmtCurr(d.cost)}/yr</Text>
                      </div>
                      <Progress percent={pct} showInfo={false} strokeColor={d.fill} size="small" trailColor={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'} />
                    </div>
                  );
                })}
              </Card>
            </Col>
          </Row>

          {/* PUE & DCiE vs Load Curve */}
          <Card size="small" title={<Text strong style={{ fontSize: 13 }}>PUE & DCiE vs IT Load % (3-Loss Model)</Text>} style={{ ...glassStyle, marginBottom: 16 }} bodyStyle={{ padding: '8px 10px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={loadCurve}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="load" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="pue" domain={[1, 'auto']} tick={{ fontSize: 11 }} label={{ value: 'PUE', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                <YAxis yAxisId="dcie" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'DCiE %', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
                <RechartsTooltip />
                <Area yAxisId="pue" type="monotone" dataKey="overhead" fill={isDark ? 'rgba(255,77,79,0.15)' : 'rgba(255,77,79,0.1)'} stroke="#ff4d4f" strokeWidth={1} name="Overhead kW" />
                <Line yAxisId="pue" type="monotone" dataKey="pue" stroke="#1890ff" strokeWidth={3} dot={{ r: 3 }} name="PUE" />
                <Line yAxisId="dcie" type="monotone" dataKey="dcie" stroke="#52c41a" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} name="DCiE %" />
              </ComposedChart>
            </ResponsiveContainer>
            <Text type="secondary" style={{ fontSize: 11 }}><InfoCircleOutlined /> Fixed losses dominate at low loads → higher PUE. Efficiency improves as load increases toward design capacity.</Text>
          </Card>

          {/* Summary Table */}
          <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Energy & Cost Summary</Text>} style={{ ...glassStyle, marginBottom: 16 }} bodyStyle={{ padding: 0 }}>
            <Table dataSource={summaryRows} columns={summaryColumns} pagination={false} size="small"
              rowClassName={(r) => r.key === 'total' ? 'ant-table-row-selected' : ''}
              style={{ fontSize: 12 }} />
          </Card>

          {/* Annual Energy Savings Calculator */}
          <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Annual Energy Savings Calculator</Text>} style={{ ...glassStyle, marginBottom: 16 }} bodyStyle={{ padding: '12px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Target PUE</Text>
                  <InputNumber min={1.0} max={parseFloat(pue.toFixed(3))} step={0.01} value={effectiveTargetPue} onChange={v => setTargetPue(v)} style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Electricity Rate ($/kWh)</Text>
                  <InputNumber min={0.01} max={0.50} step={0.01} value={electricityRate} onChange={v => v !== null && setElectricityRate(v)} style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div style={{ padding: '8px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa', borderRadius: 8 }}>
                  <Statistic title="Energy Saved" value={energySavedKwh / 1000} precision={0} suffix="MWh/yr" valueStyle={{ color: '#52c41a', fontSize: 16 }} />
                  <Statistic title="Cost Saved" value={costSaved} precision={0} prefix={ci.sym} suffix="/yr" valueStyle={{ color: '#1890ff', fontSize: 16 }} style={{ marginTop: 8 }} />
                  <Statistic title="CO₂ Avoided" value={co2Saved} precision={1} suffix="tonnes/yr" valueStyle={{ color: '#722ed1', fontSize: 16 }} style={{ marginTop: 8 }} />
                </div>
              </Col>
              <Col xs={24} md={16}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={savingsChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Annual Energy (MWh)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                    <RechartsTooltip formatter={(v: number) => [`${v} MWh`, 'Energy']} />
                    <Bar dataKey="energy" radius={[4, 4, 0, 0]}>
                      {savingsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Col>
            </Row>
          </Card>

          {/* Saved Scenarios */}
          {scenarios.length > 0 && (
            <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Saved Scenarios</Text>} style={{ ...glassStyle, marginBottom: 16 }} bodyStyle={{ padding: 0 }}>
              <Table 
                dataSource={scenarios} 
                rowKey="id" 
                pagination={false} 
                size="small"
                style={{ fontSize: 12 }}
                columns={[
                  { title: 'Name', dataIndex: 'name', key: 'name' },
                  { title: 'Date', dataIndex: 'date', key: 'date' },
                  { title: 'PUE', dataIndex: 'pue', key: 'pue', render: (v) => <Text strong style={{ color: '#1890ff' }}>{v}</Text> },
                  { title: 'IT Load', dataIndex: 'itLoadKw', key: 'itLoadKw', render: (v) => `${v} kW` },
                  { title: 'Facility', dataIndex: 'totalFacilityKw', key: 'totalFacilityKw', render: (v) => `${Math.round(v)} kW` },
                  { title: 'Action', key: 'action', render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => deleteScenario(r.id)} /> }
                ]}
              />
            </Card>
          )}

          <Modal title="Save Scenario" open={scenarioModalVisible} onOk={handleSaveScenario} onCancel={() => setScenarioModalVisible(false)} okText="Save">
            <div style={{ marginBottom: 16 }}>
              <Text>Current PUE: <Text strong>{pue.toFixed(3)}</Text></Text>
              <br />
              <Text>IT Load: <Text strong>{itLoadKw} kW</Text></Text>
            </div>
            <Input placeholder="Enter scenario name (e.g., 'Baseline', 'Add Containment')" value={scenarioName} onChange={e => setScenarioName(e.target.value)} onPressEnter={handleSaveScenario} />
          </Modal>

          {/* Disclaimer */}
          <div style={{ padding: '10px 14px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              <InfoCircleOutlined style={{ marginRight: 6 }} />
              Based on Schneider Electric White Paper #154 methodology. Models fixed, proportional, and square losses per subsystem. Includes switchgear, generator parasitic loads, economizer hours, and containment adjustments. Results are estimates — actual PUE depends on climate, equipment age, and operational practices.
            </Text>
          </div>
        </Col>
      </Row>
    </motion.div>
  );
}
