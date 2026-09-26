"use client";

import React, { useState, useMemo, useEffect } from 'react';
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Select, Slider, InputNumber, Table, Collapse, Tooltip, Card, Row, Col, Typography, Divider, Tag, Segmented, Radio, Switch as AntSwitch, Button, Statistic, Modal, Input, message, Progress, Empty, List } from "antd";
import { InfoCircleOutlined, DollarOutlined, CaretRightOutlined, ArrowUpOutlined, ArrowDownOutlined, SaveOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined, CheckCircleOutlined, LineChartOutlined, CalculatorOutlined, FundOutlined, SwapOutlined, ThunderboltOutlined, DownloadOutlined, MenuFoldOutlined, MenuUnfoldOutlined, CloudOutlined, ApiOutlined, SafetyCertificateOutlined, DashboardOutlined, ExperimentOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, ComposedChart } from "recharts";
import { OpExCalculator } from './OpExCalculator';
import { CarbonSustain } from './CarbonSustain';
import { CapacityPlanning } from './CapacityPlanning';
import { DowntimeCost } from './DowntimeCost';
import { MigrationCost } from './MigrationCost';
import { PowerChainDiagram } from './PowerChainDiagram';
import { PueCalculator } from './PueCalculator';
import { PowerSizing } from './PowerSizing';
import { CoolingCalculator } from './CoolingCalculator';
import { BatteryCalculator } from './BatteryCalculator';
import { NetworkCalculator } from './NetworkCalculator';
import { SlaCalculator } from './SlaCalculator';
import { DcimCalculator } from './DcimCalculator';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const TIER_MULTIPLIERS: Record<string, number> = { "I": 1.0, "II": 1.35, "III": 1.7, "IV": 2.2 };
const PUE_BY_TIER: Record<string, number> = { "I": 2.0, "II": 1.8, "III": 1.5, "IV": 1.3 };

const BASE_COSTS = {
  engineering: [
    { key: 'eng', desc: 'Engineering', mat: 2500, lab: 1500 },
    { key: 'permits', desc: 'Permits and Approvals', mat: 1000, lab: 500 },
    { key: 'demo', desc: 'Demolition & Outside Preparation', mat: 3000, lab: 4000 },
  ],
  power: [
    { key: 'util', desc: 'Utility Improvements', mat: 5000, lab: 3000 },
    { key: 'msg', desc: 'Main Switch Gear', mat: 8000, lab: 2000 },
    { key: 'ts', desc: 'Transfer Switches', mat: 4000, lab: 1500 },
    { key: 'ups', desc: 'UPS Systems', mat: 12000, lab: 3000 },
    { key: 'tvss', desc: 'TVSS System', mat: 1500, lab: 500 },
    { key: 'gen', desc: 'Generators with Enclosures', mat: 15000, lab: 5000 },
    { key: 'conduit', desc: 'Conduit and Cabling for Generators', mat: 3000, lab: 4000 },
    { key: 'lighting', desc: 'Data Center Lighting', mat: 800, lab: 1200 },
    { key: 'lightning', desc: 'Lightning Protection', mat: 500, lab: 800 },
    { key: 'pdu', desc: "Room PDU's", mat: 3500, lab: 1000 },
  ],
  hvac: [
    { key: 'hvac', desc: 'HVAC', mat: 20000, lab: 8000 },
    { key: 'floor', desc: 'Raised Floor', mat: 4000, lab: 3000 },
    { key: 'drain', desc: 'Condensate Drains', mat: 500, lab: 800 },
    { key: 'leak', desc: 'Leak Detection', mat: 1200, lab: 600 },
    { key: 'fire', desc: 'Fire Suppression', mat: 6000, lab: 2000 },
  ],
  sec: [
    { key: 'fms', desc: 'Facility Management System', mat: 3000, lab: 1500 },
    { key: 'cctv', desc: 'CCTV System', mat: 2000, lab: 1000 },
    { key: 'access', desc: 'Building Access System', mat: 2500, lab: 1200 },
  ],
  net: [
    { key: 'core', desc: 'Core Network Equipment', mat: 8000, lab: 2000 },
  ]
};

const BASE_COSTS_PER_KW = {
    ups: 800,
    electrical: 400,
    cooling_air_dx: 500,
    cooling_chilled_water: 700,
    cooling_indirect_evap: 600,
    cooling_liquid_cdu: 900,
    it_space: 300,
    building_new: 500,
    building_existing: 200,
    building_prefab: 375,
};

export default function DCCalculatorPage() {
  const { token } = theme.useToken();
  const { themeColor } = usePreferencesStore();
  const isDark = token.colorBgContainer === '#141414';
  
  const glassStyle = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(16px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
    borderRadius: 16,
  };

  const [activeTab, setActiveTab] = useState('Build vs Buy');

  // ===================== TAB 1: Build vs Buy States =====================
  const [tier, setTier] = useState<string>("III");
  const [staffed, setStaffed] = useState<string>("No");
  const [cabinets, setCabinets] = useState<number>(10);
  const [totalKw, setTotalKw] = useState<number>(10);
  const [evalPeriod, setEvalPeriod] = useState<number>(3);
  const [powerPercent, setPowerPercent] = useState<number>(90);
  const [costKwh, setCostKwh] = useState<number>(11);
  const [internetMbps, setInternetMbps] = useState<number>(10);
  // NEW: Colo detail pricing
  const [coloCrossConnects, setColoCrossConnects] = useState<number>(4);
  const [coloCrossConnectCost, setColoCrossConnectCost] = useState<number>(200);
  const [coloRemoteHands, setColoRemoteHands] = useState<number>(5);
  const [coloRemoteHandsCost, setColoRemoteHandsCost] = useState<number>(150);
  const [coloNrcSetupFee, setColoNrcSetupFee] = useState<number>(10000);
  const [powerEscalation, setPowerEscalation] = useState<number>(3);

  const resetTab1 = () => {
    setTier("III");
    setStaffed("No");
    setCabinets(10);
    setTotalKw(10);
    setEvalPeriod(3);
    setPowerPercent(90);
    setCostKwh(11);
    setInternetMbps(10);
    setColoCrossConnects(4); setColoCrossConnectCost(200);
    setColoRemoteHands(5); setColoRemoteHandsCost(150);
    setColoNrcSetupFee(10000); setPowerEscalation(3);
  };

  // ===================== TAB 2: CapEx Estimator States =====================
  const [itLoadKw, setItLoadKw] = useState(1000);
  const [powerRedundancy, setPowerRedundancy] = useState('N+1');
  const [coolingRedundancy, setCoolingRedundancy] = useState('N+1');
  const [coolingArch, setCoolingArch] = useState('air_dx');
  const [containment, setContainment] = useState('none');
  const [upsTopology, setUpsTopology] = useState('standalone');
  const [distribution, setDistribution] = useState('centralized');
  const [buildingType, setBuildingType] = useState('new');
  const [raisedFloor, setRaisedFloor] = useState(false);
  const [droppedCeiling, setDroppedCeiling] = useState(false);
  const [region, setRegion] = useState('na');
  // NEW: Contingency, land, grid, phasing
  const [contingencyRate, setContingencyRate] = useState(10);
  const [landCost, setLandCost] = useState(0);
  const [gridConnectionCost, setGridConnectionCost] = useState(0);
  const [isPhased, setIsPhased] = useState(false);
  const [phase1Pct, setPhase1Pct] = useState(60);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  const resetTab2 = () => {
    setItLoadKw(1000);
    setPowerRedundancy('N+1');
    setCoolingRedundancy('N+1');
    setCoolingArch('air_dx');
    setContainment('none');
    setUpsTopology('standalone');
    setDistribution('centralized');
    setBuildingType('new');
    setRaisedFloor(false);
    setDroppedCeiling(false);
    setRegion('na');
    setContingencyRate(10); setLandCost(0); setGridConnectionCost(0);
    setIsPhased(false); setPhase1Pct(60);
  };

  // ===================== TAB 3: ROI & Payback States =====================
  const [roiInitialInvestment, setRoiInitialInvestment] = useState<number>(3000000);
  const [roiAnnualRevenue, setRoiAnnualRevenue] = useState<number>(1200000);
  const [roiAnnualOpCost, setRoiAnnualOpCost] = useState<number>(400000);
  const [roiDiscountRate, setRoiDiscountRate] = useState<number>(10);
  const [roiAnalysisPeriod, setRoiAnalysisPeriod] = useState<number>(10);
  // NEW: Depreciation, refresh, financing, tax
  const [roiDepreciation, setRoiDepreciation] = useState<string>('straight_15');
  const [roiRefreshYear, setRoiRefreshYear] = useState<number>(5);
  const [roiRefreshCost, setRoiRefreshCost] = useState<number>(500000);
  const [roiDebtPct, setRoiDebtPct] = useState<number>(0);
  const [roiInterestRate, setRoiInterestRate] = useState<number>(6);
  const [roiLoanTerm, setRoiLoanTerm] = useState<number>(10);
  const [roiTaxRate, setRoiTaxRate] = useState<number>(25);

  // ===================== TAB 4: Scenario Compare States =====================
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('dc-calculator-scenarios');
    if (stored) {
      setSavedScenarios(JSON.parse(stored));
    }
  }, [activeTab]); // Refresh when changing tabs

  // ===================== TAB 5: ROM Estimator States (SE-style) =====================
  const [romNumRacks, setRomNumRacks] = useState(50);
  const [romKwPerRack, setRomKwPerRack] = useState(10);
  const [romRedundancy, setRomRedundancy] = useState<string>('N+1');
  const [romCooling, setRomCooling] = useState<string>('crah_perimeter');
  const [romPowerDist, setRomPowerDist] = useState<string>('rpp');
  const [romBuilding, setRomBuilding] = useState<string>('new_build');
  const [romSeismic, setRomSeismic] = useState<string>('low');
  const [romContainment, setRomContainment] = useState<string>('cold_aisle');
  const [romRaisedFloor, setRomRaisedFloor] = useState(true);
  const [romDroppedCeiling, setRomDroppedCeiling] = useState(false);
  const [romEconomizer, setRomEconomizer] = useState(false);
  const [romCoreShell, setRomCoreShell] = useState(true);
  const [romCurrency, setRomCurrency] = useState<string>('usd');

  const resetTab5 = () => {
    setRomNumRacks(50);
    setRomKwPerRack(10);
    setRomRedundancy('N+1');
    setRomCooling('crah_perimeter');
    setRomPowerDist('rpp');
    setRomBuilding('new_build');
    setRomSeismic('low');
    setRomContainment('cold_aisle');
    setRomRaisedFloor(true);
    setRomDroppedCeiling(false);
    setRomEconomizer(false);
    setRomCoreShell(true);
    setRomCurrency('usd');
  };

  // ===================== TAB 1: Calculations =====================
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const tierMult = TIER_MULTIPLIERS[tier] || 1;
  const sqft = cabinets * 30;
  const wpsqft = sqft > 0 ? (totalKw * 1000) / sqft : 0;

  const calcSectionCost = (items: any[]) => {
    return items.map(item => ({
      ...item,
      matTotal: item.mat * cabinets * tierMult,
      labTotal: item.lab * cabinets * tierMult,
      total: (item.mat + item.lab) * cabinets * tierMult,
    }));
  };

  const engItems = calcSectionCost(BASE_COSTS.engineering);
  const powerItems = calcSectionCost(BASE_COSTS.power);
  const hvacItems = calcSectionCost(BASE_COSTS.hvac);
  const secItems = calcSectionCost(BASE_COSTS.sec);
  const netItems = calcSectionCost(BASE_COSTS.net);

  const sumSection = (items: any[]) => items.reduce((acc, curr) => acc + curr.total, 0);

  const engTotal = sumSection(engItems);
  const powerTotal = sumSection(powerItems);
  const hvacTotal = sumSection(hvacItems);
  const secTotal = sumSection(secItems);
  const netTotal = sumSection(netItems);

  const totalConstruction = engTotal + powerTotal + hvacTotal + secTotal + netTotal;

  const evalMonths = evalPeriod * 12;
  const fteCostPerYear = 85000;
  
  const buildFloorSpace = sqft * 2.5 * evalMonths;
  // NEW: Power cost with annual escalation
  const buildElectricityCosts = Array.from({ length: evalPeriod }, (_, y) => {
    const escalatedRate = (costKwh / 100) * Math.pow(1 + powerEscalation / 100, y);
    return totalKw * (powerPercent / 100) * (PUE_BY_TIER[tier] || 1.5) * escalatedRate * 8760;
  });
  const buildElectricity = buildElectricityCosts.reduce((a, b) => a + b, 0);
  const buildElecMaint = powerTotal * 0.03 * evalPeriod;
  const buildHvacMaint = hvacTotal * 0.05 * evalPeriod;
  const buildOtherMaint = totalConstruction * 0.01 * evalPeriod;
  const buildStaff = staffed === "No" ? 5 * fteCostPerYear * evalPeriod : 0;
  const buildInternet = internetMbps * 8 * evalMonths * 2;

  const totalBuildTco = totalConstruction + buildFloorSpace + buildElectricity + buildElecMaint + buildHvacMaint + buildOtherMaint + buildStaff + buildInternet;

  // NEW: Detailed colo pricing
  const coloFloorSpace = cabinets * 1200 * evalMonths * tierMult * 0.6;
  const coloCrossConnectTotal = coloCrossConnects * coloCrossConnectCost * evalMonths;
  const coloRemoteHandsTotal = coloRemoteHands * coloRemoteHandsCost * evalMonths;
  const coloInternet = internetMbps * 5 * evalMonths;
  // Power cost in colo with escalation
  const coloElectricityCosts = Array.from({ length: evalPeriod }, (_, y) => {
    const escalatedRate = (costKwh / 100) * Math.pow(1 + powerEscalation / 100, y) * 1.15; // colo 15% markup
    return totalKw * (powerPercent / 100) * escalatedRate * 8760;
  });
  const coloElectricity = coloElectricityCosts.reduce((a, b) => a + b, 0);
  const totalColoTco = coloFloorSpace + coloCrossConnectTotal + coloRemoteHandsTotal + coloInternet + coloElectricity + coloNrcSetupFee;

  const getMeterColor = (val: number) => {
    if (val < 80) return "#1890ff";
    if (val < 150) return "#52c41a";
    if (val < 200) return "#faad14";
    return "#ff4d4f";
  };

  const buildCostColumns = [
    { title: 'DESCRIPTION', dataIndex: 'desc', key: 'desc' },
    { title: 'MATERIAL COST', dataIndex: 'matTotal', key: 'matTotal', render: (val: number) => formatCurrency(val), align: 'right' as const },
    { title: 'LABOR COST', dataIndex: 'labTotal', key: 'labTotal', render: (val: number) => formatCurrency(val), align: 'right' as const },
    { title: 'TOTAL', dataIndex: 'total', key: 'total', render: (val: number) => <strong>{formatCurrency(val)}</strong>, align: 'right' as const },
  ];

  const renderSectionTable = (items: any[], total: number) => (
    <>
      <Table 
        dataSource={items} 
        columns={buildCostColumns} 
        pagination={false} 
        size="small"
        rowKey="key"
        style={{ marginBottom: 16 }}
      />
      <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 16, padding: '8px 16px', background: isDark ? '#1f1f1f' : '#f0f2f5', borderRadius: 8 }}>
        SUBTOTAL: {formatCurrency(total)}
      </div>
    </>
  );

  const yearlyData = Array.from({ length: evalPeriod }, (_, i) => {
    const yr = i + 1;
    const buildYearly = (totalConstruction / evalPeriod) + buildFloorSpace / evalPeriod + (buildElectricityCosts[i] || 0) + buildElecMaint / evalPeriod + buildHvacMaint / evalPeriod + buildOtherMaint / evalPeriod + buildStaff / evalPeriod + buildInternet / evalPeriod;
    const coloYearly = coloFloorSpace / evalPeriod + coloCrossConnectTotal / evalPeriod + coloRemoteHandsTotal / evalPeriod + coloInternet / evalPeriod + (coloElectricityCosts[i] || 0) + (i === 0 ? coloNrcSetupFee : 0);
    return {
      year: `Year ${yr}`,
      build: Math.round(Array.from({ length: yr }, (_, j) => {
        const bYr = (totalConstruction / evalPeriod) + buildFloorSpace / evalPeriod + (buildElectricityCosts[j] || 0) + buildElecMaint / evalPeriod + buildHvacMaint / evalPeriod + buildOtherMaint / evalPeriod + buildStaff / evalPeriod + buildInternet / evalPeriod;
        return bYr;
      }).reduce((a, b) => a + b, 0)),
      colo: Math.round(Array.from({ length: yr }, (_, j) => {
        const cYr = coloFloorSpace / evalPeriod + coloCrossConnectTotal / evalPeriod + coloRemoteHandsTotal / evalPeriod + coloInternet / evalPeriod + (coloElectricityCosts[j] || 0) + (j === 0 ? coloNrcSetupFee : 0);
        return cYr;
      }).reduce((a, b) => a + b, 0)),
    };
  });

  // NEW: Break-even year detection
  const breakEvenYear = yearlyData.findIndex((d, i) => i > 0 && yearlyData[i-1].build > yearlyData[i-1].colo && d.build <= d.colo) + 1 || (totalBuildTco < totalColoTco ? evalPeriod : 0);

  const savings = Math.abs(totalBuildTco - totalColoTco);
  const savingsPercent = ((savings / Math.max(totalBuildTco, totalColoTco)) * 100).toFixed(1);
  const winner = totalBuildTco < totalColoTco ? 'Building Your Own' : 'Colocation';

  // ===================== TAB 2: Calculations =====================
  const getPowerRedundancyMult = (pr = powerRedundancy) => {
    switch(pr) {
      case 'N': return { ups: 1.0, electrical: 1.0 };
      case 'N+1': return { ups: 1.2, electrical: 1.15 };
      case '2N': return { ups: 1.75, electrical: 1.5 };
      case '2(N+1)': return { ups: 2.0, electrical: 1.7 };
      default: return { ups: 1.0, electrical: 1.0 };
    }
  };

  const getCoolingRedundancyMult = () => {
    switch(coolingRedundancy) {
      case 'N': return 1.0;
      case 'N+1': 
        if(coolingArch === 'air_dx') return 1.25;
        if(coolingArch === 'chilled_water') return 1.2;
        if(coolingArch === 'indirect_evap') return 1.2;
        if(coolingArch === 'liquid_cdu') return 1.15;
        return 1.0;
      case '2N': 
        if(coolingArch === 'air_dx') return 1.8;
        if(coolingArch === 'chilled_water') return 1.7;
        if(coolingArch === 'indirect_evap') return 1.65;
        if(coolingArch === 'liquid_cdu') return 1.55;
        return 1.0;
      default: return 1.0;
    }
  };

  const getContainmentDiscount = () => {
    if(containment === 'hot_aisle') return 0.90;
    if(containment === 'cold_aisle') return 0.88;
    return 1.0;
  };

  const getUpsTopologyMult = () => upsTopology === 'modular' ? 1.15 : 1.0;
  const getDistributionMult = () => distribution === 'distributed' ? 1.1 : 1.0;
  const getRegionMult = () => {
    if(region === 'eu') return 1.15;
    if(region === 'apac') return 0.85;
    if(region === 'mea') return 0.90;
    return 1.0;
  };

  const prm = getPowerRedundancyMult();
  const crm = getCoolingRedundancyMult();
  const rm = getRegionMult();

  const getCoolingBaseCost = (arch: string) => {
    if(arch === 'chilled_water') return BASE_COSTS_PER_KW.cooling_chilled_water;
    if(arch === 'indirect_evap') return BASE_COSTS_PER_KW.cooling_indirect_evap;
    if(arch === 'liquid_cdu') return BASE_COSTS_PER_KW.cooling_liquid_cdu;
    return BASE_COSTS_PER_KW.cooling_air_dx;
  };
  const coolingBaseCost = getCoolingBaseCost(coolingArch);

  const upsCost = itLoadKw * BASE_COSTS_PER_KW.ups * prm.ups * getUpsTopologyMult() * rm;
  const electricalCost = itLoadKw * BASE_COSTS_PER_KW.electrical * prm.electrical * getDistributionMult() * rm;
  const coolingCost = itLoadKw * coolingBaseCost * crm * getContainmentDiscount() * rm;
  const itSpaceCost = itLoadKw * BASE_COSTS_PER_KW.it_space * rm;

  let buildingBase = BASE_COSTS_PER_KW.building_new;
  if(buildingType === 'existing') buildingBase = BASE_COSTS_PER_KW.building_existing;
  if(buildingType === 'prefab') buildingBase = BASE_COSTS_PER_KW.building_prefab;
  let buildingMult = 1.0;
  if(raisedFloor) buildingMult += 0.05;
  if(droppedCeiling) buildingMult += 0.03;
  const buildingCost = itLoadKw * buildingBase * buildingMult * rm;

  const capexSubtotal = upsCost + electricalCost + coolingCost + itSpaceCost + buildingCost;
  const designCost = capexSubtotal * 0.15;
  // NEW: Contingency, land, grid
  const contingencyCost = capexSubtotal * (contingencyRate / 100);
  const infraSubtotal = capexSubtotal + designCost + contingencyCost + landCost + gridConnectionCost;
  const totalCapex = isPhased ? infraSubtotal * (phase1Pct / 100) : infraSubtotal;
  const phase2Capex = isPhased ? infraSubtotal * ((100 - phase1Pct) / 100) : 0;
  const costPerKw = totalCapex / itLoadKw;

  // Initialize ROI Tab investment with calculated CapEx on first load if it wasn't modified
  useEffect(() => {
    if (roiInitialInvestment === 3000000) {
      setRoiInitialInvestment(Math.round(totalCapex));
    }
  }, [totalCapex]);

  const capexBreakdown = [
    { name: 'UPS & Power', value: upsCost, color: '#6366f1' },
    { name: 'Electrical', value: electricalCost, color: '#8b5cf6' },
    { name: 'Cooling', value: coolingCost, color: '#06b6d4' },
    { name: 'IT Space', value: itSpaceCost, color: '#10b981' },
    { name: 'Building', value: buildingCost, color: '#f59e0b' },
    { name: 'Design & Install', value: designCost, color: '#ef4444' },
    { name: 'Contingency', value: contingencyCost, color: '#f97316' },
    ...(landCost > 0 ? [{ name: 'Land / Site', value: landCost, color: '#84cc16' }] : []),
    ...(gridConnectionCost > 0 ? [{ name: 'Grid Connection', value: gridConnectionCost, color: '#14b8a6' }] : []),
  ].filter(d => d.value > 0);

  const calcCostPerKwForPR = (pr: string) => {
    const p = getPowerRedundancyMult(pr);
    const u = itLoadKw * BASE_COSTS_PER_KW.ups * p.ups * getUpsTopologyMult() * rm;
    const e = itLoadKw * BASE_COSTS_PER_KW.electrical * p.electrical * getDistributionMult() * rm;
    const s = u + e + coolingCost + itSpaceCost + buildingCost;
    const d = s * 0.15;
    return (s + d) / itLoadKw;
  };

  const calcCostPerKwForCoolingArch = (arch: string) => {
    const cBase = getCoolingBaseCost(arch);
    const cCost = itLoadKw * cBase * crm * getContainmentDiscount() * rm;
    const s = upsCost + electricalCost + cCost + itSpaceCost + buildingCost;
    const d = s * 0.15;
    return (s + d) / itLoadKw;
  };

  const prLevels = ['N', 'N+1', '2N', '2(N+1)'];
  const currentIdx = prLevels.indexOf(powerRedundancy);
  const prevLevel = currentIdx > 0 ? prLevels[currentIdx - 1] : null;
  const nextLevel = currentIdx < prLevels.length - 1 ? prLevels[currentIdx + 1] : null;

  const coolingArchOptions = ['air_dx', 'chilled_water', 'indirect_evap', 'liquid_cdu'];

  const saveScenario = () => {
    if (!scenarioName) {
      message.error('Please enter a scenario name');
      return;
    }
    const scenario = {
      id: Date.now(),
      name: scenarioName,
      createdAt: new Date().toISOString(),
      params: { itLoadKw, powerRedundancy, coolingRedundancy, coolingArch, containment, upsTopology, distribution, buildingType, raisedFloor, droppedCeiling, region },
      totalCapex,
      costPerKw,
      breakdown: capexBreakdown
    };
    const stored = localStorage.getItem('dc-calculator-scenarios');
    const scenarios = stored ? JSON.parse(stored) : [];
    scenarios.push(scenario);
    localStorage.setItem('dc-calculator-scenarios', JSON.stringify(scenarios));
    setSavedScenarios(scenarios);
    message.success('Scenario saved successfully!');
    setIsModalOpen(false);
    setScenarioName('');
  };

  const deleteScenario = (id: number) => {
    const updated = savedScenarios.filter(s => s.id !== id);
    localStorage.setItem('dc-calculator-scenarios', JSON.stringify(updated));
    setSavedScenarios(updated);
    setSelectedScenarioIds(selectedScenarioIds.filter(selectedId => selectedId !== id));
    message.success('Scenario deleted');
  };

  const scaleData = [100, 250, 500, 1000, 2000, 5000, itLoadKw].filter((v, i, a) => a.indexOf(v) === i && v <= itLoadKw).sort((a, b) => a - b).map(load => {
    const calcForLoad = (ld: number) => {
      const u = ld * BASE_COSTS_PER_KW.ups * prm.ups * getUpsTopologyMult() * rm;
      const e = ld * BASE_COSTS_PER_KW.electrical * prm.electrical * getDistributionMult() * rm;
      const c = ld * coolingBaseCost * crm * getContainmentDiscount() * rm;
      const it = ld * BASE_COSTS_PER_KW.it_space * rm;
      const b = ld * buildingBase * buildingMult * rm;
      const sub = u + e + c + it + b;
      return sub + sub * 0.15;
    };
    return { load: `${load} kW`, total: Math.round(calcForLoad(load)), perKw: Math.round(calcForLoad(load) / load) };
  });

  // ===================== TAB 3: Calculations =====================
  const annualNetCashFlow = roiAnnualRevenue - roiAnnualOpCost;

  // NEW: Depreciation calculation
  const getDepreciationYears = () => {
    if (roiDepreciation === 'straight_5') return 5;
    if (roiDepreciation === 'straight_15') return 15;
    if (roiDepreciation === 'straight_39') return 39;
    return 15;
  };
  const depYears = getDepreciationYears();
  const annualDepreciation = roiInitialInvestment / depYears;

  // NEW: Debt financing
  const debtAmount = roiInitialInvestment * (roiDebtPct / 100);
  const equityAmount = roiInitialInvestment - debtAmount;
  const annualDebtService = roiDebtPct > 0 && roiLoanTerm > 0
    ? debtAmount * (roiInterestRate / 100 / 12 * Math.pow(1 + roiInterestRate / 100 / 12, roiLoanTerm * 12)) / (Math.pow(1 + roiInterestRate / 100 / 12, roiLoanTerm * 12) - 1) * 12
    : 0;
  const annualInterest = debtAmount * (roiInterestRate / 100);

  // Simple metrics (unchanged interface)
  const simplePayback = annualNetCashFlow > 0 ? roiInitialInvestment / annualNetCashFlow : Infinity;
  const simpleRoi = annualNetCashFlow > 0 ? ((annualNetCashFlow * roiAnalysisPeriod - roiInitialInvestment) / roiInitialInvestment * 100) : 0;

  let npv = -equityAmount;
  for (let y = 1; y <= roiAnalysisPeriod; y++) {
    const refresh = (y === roiRefreshYear) ? roiRefreshCost : 0;
    const yearCf = annualNetCashFlow - annualDebtService - refresh;
    npv += yearCf / Math.pow(1 + roiDiscountRate / 100, y);
  }

  const calcIRR = () => {
    let rate = 0.1;
    for (let iter = 0; iter < 100; iter++) {
      let npvCalc = -equityAmount;
      let dnpv = 0;
      for (let y = 1; y <= roiAnalysisPeriod; y++) {
        const refresh = (y === roiRefreshYear) ? roiRefreshCost : 0;
        const yearCf = annualNetCashFlow - annualDebtService - refresh;
        const factor = Math.pow(1 + rate, y);
        npvCalc += yearCf / factor;
        dnpv -= y * yearCf / (factor * (1 + rate));
      }
      if (Math.abs(npvCalc) < 1) break;
      if (dnpv === 0) break;
      rate = rate - npvCalc / dnpv;
    }
    return rate * 100;
  };
  const irr = annualNetCashFlow > 0 ? calcIRR() : 0;

  // NEW: Enhanced cash flow data with depreciation, tax, after-tax
  const cashFlowData = [{ year: 'Year 0', cashFlow: -equityAmount, cumulative: -equityAmount, afterTax: -equityAmount, depreciation: 0, taxSaved: 0 }];
  let cumulative = -equityAmount;
  for (let y = 1; y <= roiAnalysisPeriod; y++) {
    const refresh = (y === roiRefreshYear) ? roiRefreshCost : 0;
    const grossCf = annualNetCashFlow - refresh;
    const debtSvc = annualDebtService;
    const depn = y <= depYears ? annualDepreciation : 0;
    const taxableIncome = grossCf - depn - annualInterest;
    const taxPaid = Math.max(0, taxableIncome * (roiTaxRate / 100));
    const afterTaxCf = grossCf - debtSvc - taxPaid;
    cumulative += afterTaxCf;
    cashFlowData.push({ year: `Year ${y}`, cashFlow: grossCf, cumulative, afterTax: afterTaxCf, depreciation: depn, taxSaved: Math.round(depn * roiTaxRate / 100) });
  }

  // ===================== TAB 4: Calculations =====================
  const selectedScenariosData = savedScenarios.filter(s => selectedScenarioIds.includes(s.id));
  
  const getRadarData = () => {
    if (selectedScenariosData.length === 0) return [];
    
    // Normalize metrics 0-100
    const maxCostPerKw = Math.max(...selectedScenariosData.map(s => s.costPerKw), 1);
    const maxLoad = Math.max(...selectedScenariosData.map(s => s.params.itLoadKw), 1);

    const redundancyScore = (pr: string) => {
      const idx = prLevels.indexOf(pr);
      return idx >= 0 ? (idx + 1) * 25 : 50;
    };
    const coolingScore = (arch: string) => {
      const idx = coolingArchOptions.indexOf(arch);
      return idx >= 0 ? (idx + 1) * 25 : 50;
    };
    const regionScore = (r: string) => {
      if(r === 'apac') return 100;
      if(r === 'mea') return 80;
      if(r === 'na') return 60;
      return 40;
    };
    const buildingScore = (b: string) => {
      if(b === 'existing') return 100;
      if(b === 'prefab') return 80;
      return 60;
    };

    const axes = ['Cost Efficiency', 'Power Level', 'Redundancy', 'Cooling Grade', 'Region Value', 'Building Score'];
    const data: any[] = axes.map(metric => ({ metric }));

    selectedScenariosData.forEach(scenario => {
      const { params, costPerKw } = scenario;
      data[0][scenario.name] = 100 - ((costPerKw / maxCostPerKw) * 100);
      data[1][scenario.name] = (params.itLoadKw / maxLoad) * 100;
      data[2][scenario.name] = redundancyScore(params.powerRedundancy);
      data[3][scenario.name] = coolingScore(params.coolingArch);
      data[4][scenario.name] = regionScore(params.region);
      data[5][scenario.name] = buildingScore(params.buildingType);
    });
    
    return data;
  };

  const getWinner = () => {
    if (selectedScenariosData.length < 2) return null;
    return selectedScenariosData.reduce((prev, curr) => prev.totalCapex < curr.totalCapex ? prev : curr);
  };
  const winnerScenario = getWinner();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: isDark ? '#1f1f1f' : '#fff', padding: 12, border: '1px solid #d9d9d9', borderRadius: 8 }}>
          <Text strong>{payload[0].payload.name || payload[0].payload.year || payload[0].payload.load}</Text>
          <div style={{ marginTop: 8 }}>
            {payload.map((p: any, i: number) => (
              <div key={i}>
                <span style={{ color: p.color || p.fill }}>● </span>
                {p.name}: {p.name.includes('perKw') || p.name.includes('per') ? formatCurrency(p.value) + '/kW' : formatCurrency(p.value)}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96'];

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dc-sidebar-collapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('dc-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const TAB_GROUPS = [
    { label: 'Financial', color: '#6366f1', icon: <DollarOutlined />, tabs: ['Build vs Buy', 'CapEx Estimator', 'ROI & Payback', 'OpEx'] },
    { label: 'Infrastructure', color: '#10b981', icon: <FundOutlined />, tabs: ['ROM Estimator', 'Carbon & PUE', 'PUE Calculator', 'Power Sizing', 'Power Chain', 'Capacity Plan', 'Cooling', 'Battery & UPS'] },
    { label: 'Operations', color: '#f59e0b', icon: <SwapOutlined />, tabs: ['Scenario Compare', 'Downtime Cost', 'Migration', 'SLA & Availability', 'DCIM Value'] },
    { label: 'Network', color: '#06b6d4', icon: <ApiOutlined />, tabs: ['Network & Connectivity'] },
  ];

  const TAB_ICONS: Record<string, React.ReactNode> = {
    'Build vs Buy': <SwapOutlined />,
    'CapEx Estimator': <CalculatorOutlined />,
    'ROI & Payback': <FundOutlined />,
    'OpEx': <DollarOutlined />,
    'ROM Estimator': <CalculatorOutlined />,
    'Carbon & PUE': <LineChartOutlined />,
    'Power Chain': <FundOutlined />,
    'Capacity Plan': <LineChartOutlined />,
    'Scenario Compare': <SwapOutlined />,
    'Downtime Cost': <InfoCircleOutlined />,
    'Migration': <ArrowUpOutlined />,
    'PUE Calculator': <ThunderboltOutlined />,
    'Power Sizing': <CalculatorOutlined />,
    'Cooling': <ExperimentOutlined />,
    'Battery & UPS': <ThunderboltOutlined />,
    'Network & Connectivity': <ApiOutlined />,
    'SLA & Availability': <SafetyCertificateOutlined />,
    'DCIM Value': <DashboardOutlined />,
  };

  const activeGroup = TAB_GROUPS.find(g => g.tabs.includes(activeTab));

  return (
    <CMSLayout
      title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Data Center Calculator</AuroraText>}
      subTitle={<DecryptedText text="Comprehensive Cost, Architecture & Operations Estimator" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
    >
      <div style={{ display: 'flex', gap: 20, minHeight: 600 }}>

        {/* ===== OUTER MENU (Left Sidebar) ===== */}
        <motion.div
          animate={{ width: sidebarCollapsed ? 56 : 220 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{
            minWidth: sidebarCollapsed ? 56 : 220, flexShrink: 0,
            background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            padding: '8px 0',
            display: 'flex', flexDirection: 'column', gap: 2,
            alignSelf: 'flex-start',
            boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Collapse Toggle */}
          <div
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-end',
              padding: sidebarCollapsed ? '4px 0 8px' : '4px 12px 8px',
              cursor: 'pointer', color: token.colorTextSecondary,
              fontSize: 14, transition: 'all 0.15s',
            }}
          >
            {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          {TAB_GROUPS.map((group) => {
            const isGroupActive = activeGroup?.label === group.label;
            return (
              <div key={group.label}>
                {/* Group Header */}
                {sidebarCollapsed ? (
                  <Tooltip title={group.label} placement="right">
                    <div style={{
                      padding: '8px 0', display: 'flex', justifyContent: 'center',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: isGroupActive ? `${group.color}25` : `${group.color}10`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: group.color, fontSize: 13,
                        transition: 'all 0.15s',
                      }}>
                        {group.icon}
                      </div>
                    </div>
                  </Tooltip>
                ) : (
                  <div style={{
                    padding: '10px 16px 6px',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: `${group.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: group.color, fontSize: 11,
                    }}>
                      {group.icon}
                    </div>
                    <Text style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                      color: isGroupActive ? group.color : token.colorTextSecondary,
                    }}>
                      {group.label}
                    </Text>
                  </div>
                )}

                {/* Inner Menu Items */}
                {group.tabs.map(tab => {
                  const isActive = activeTab === tab;
                  const tabIcon = (
                    <span style={{
                      fontSize: sidebarCollapsed ? 15 : 12,
                      opacity: isActive ? 1 : 0.5,
                      color: isActive ? group.color : 'inherit',
                      transition: 'all 0.15s ease',
                    }}>
                      {TAB_ICONS[tab]}
                    </span>
                  );

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={tab} title={tab} placement="right">
                        <motion.div
                          onClick={() => setActiveTab(tab)}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '8px 0',
                            cursor: 'pointer',
                            background: isActive ? (isDark ? `${group.color}15` : `${group.color}08`) : 'transparent',
                            borderRight: isActive ? `3px solid ${group.color}` : '3px solid transparent',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {tabIcon}
                        </motion.div>
                      </Tooltip>
                    );
                  }

                  return (
                    <motion.div
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 16px 7px 24px',
                        cursor: 'pointer',
                        position: 'relative',
                        fontSize: 13, whiteSpace: 'nowrap',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? (isDark ? '#fff' : token.colorText) : token.colorTextSecondary,
                        background: isActive
                          ? (isDark ? `${group.color}15` : `${group.color}08`)
                          : 'transparent',
                        borderRight: isActive ? `3px solid ${group.color}` : '3px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }
                      }}
                    >
                      {tabIcon}
                      <span>{tab}</span>
                    </motion.div>
                  );
                })}

                {/* Divider between groups */}
                <div style={{
                  height: 1, margin: sidebarCollapsed ? '4px 8px' : '6px 16px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                }} />
              </div>
            );
          })}
        </motion.div>

        {/* ===== CONTENT AREA ===== */}
        <div style={{ flex: 1, minWidth: 0 }}>

        {/* Tab Content */}

        <AnimatePresence mode="wait">
          {activeTab === 'Build vs Buy' && (
            <motion.div
              key="buildvsbuy"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button type="dashed" icon={<ReloadOutlined />} onClick={resetTab1}>
                  Reset to Defaults
                </Button>
              </div>

              <Card style={{ ...glassStyle, marginBottom: 24 }}>
                <Row gutter={24} align="middle">
                  <Col xs={24} md={12}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Text strong>Data Center Tier:</Text>
                      <Select value={tier} onChange={setTier} style={{ width: 120 }}>
                        <Select.Option value="I">Tier I</Select.Option>
                        <Select.Option value="II">Tier II</Select.Option>
                        <Select.Option value="III">Tier III</Select.Option>
                        <Select.Option value="IV">Tier IV</Select.Option>
                      </Select>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
                      <Text strong>Currently Staffed 24x7x365:</Text>
                      <Select value={staffed} onChange={setStaffed} style={{ width: 100 }}>
                        <Select.Option value="Yes">Yes</Select.Option>
                        <Select.Option value="No">No</Select.Option>
                      </Select>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <Card title="Capacity & Requirements" style={{ ...glassStyle, height: '100%' }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Number of Cabinets <Tooltip title="Enter how many cabinets you need."><InfoCircleOutlined style={{ color: token.colorPrimary }} /></Tooltip></Text>
                        <InputNumber min={10} max={500} value={cabinets} onChange={(val) => setCabinets(val || 10)} />
                      </div>
                      <Slider min={10} max={500} value={cabinets} onChange={setCabinets} />
                    </div>
                    
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Total kW of Redundant Power <Tooltip title="kW calculated by nameplate power / 1000 or amps × volts / 1000"><InfoCircleOutlined style={{ color: token.colorPrimary }} /></Tooltip></Text>
                        <InputNumber min={10} max={5000} value={totalKw} onChange={(val) => setTotalKw(val || 10)} />
                      </div>
                      <Slider min={10} max={5000} value={totalKw} onChange={setTotalKw} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Evaluation Period in Years <Tooltip title="5 years average, equipment refresh starts year 6"><InfoCircleOutlined style={{ color: token.colorPrimary }} /></Tooltip></Text>
                        <InputNumber min={1} max={10} value={evalPeriod} onChange={(val) => setEvalPeriod(val || 3)} />
                      </div>
                      <Slider min={1} max={10} value={evalPeriod} onChange={setEvalPeriod} />
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card title="Operating Parameters" style={{ ...glassStyle, height: '100%' }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>% of Available Power Consumed <Tooltip title="Average enterprise DC operates at 60%"><InfoCircleOutlined style={{ color: token.colorPrimary }} /></Tooltip></Text>
                        <InputNumber min={10} max={100} value={powerPercent} onChange={(val) => setPowerPercent(val || 90)} addonAfter="%" />
                      </div>
                      <Slider min={10} max={100} value={powerPercent} onChange={setPowerPercent} />
                    </div>
                    
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Cost Per kWh in Cents <Tooltip title="US average in 2024 was $0.12"><InfoCircleOutlined style={{ color: token.colorPrimary }} /></Tooltip></Text>
                        <InputNumber min={1} max={30} value={costKwh} onChange={(val) => setCostKwh(val || 11)} addonAfter="¢" />
                      </div>
                      <Slider min={1} max={30} value={costKwh} onChange={setCostKwh} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Internet Connection in Mbps <Tooltip title="Required bandwidth"><InfoCircleOutlined style={{ color: token.colorPrimary }} /></Tooltip></Text>
                        <InputNumber min={10} max={10000} value={internetMbps} onChange={(val) => setInternetMbps(val || 10)} addonAfter="Mbps" />
                      </div>
                      <Slider min={10} max={10000} value={internetMbps} onChange={setInternetMbps} />
                    </div>

                    <Divider style={{ margin: '12px 0', fontSize: 13 }}>Colo Detail Pricing</Divider>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Cross-Connects (qty)</Text>
                        <InputNumber min={0} max={50} value={coloCrossConnects} onChange={v => setColoCrossConnects(v || 0)} style={{ width: '100%', marginTop: 4 }} />
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Cost/Connect/Mo</Text>
                        <InputNumber min={0} max={1000} value={coloCrossConnectCost} onChange={v => setColoCrossConnectCost(v || 0)} style={{ width: '100%', marginTop: 4 }} prefix="$" />
                      </Col>
                    </Row>
                    <Row gutter={12} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Remote Hands (hrs/mo)</Text>
                        <InputNumber min={0} max={100} value={coloRemoteHands} onChange={v => setColoRemoteHands(v || 0)} style={{ width: '100%', marginTop: 4 }} />
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Rate/hr</Text>
                        <InputNumber min={0} max={500} value={coloRemoteHandsCost} onChange={v => setColoRemoteHandsCost(v || 0)} style={{ width: '100%', marginTop: 4 }} prefix="$" />
                      </Col>
                    </Row>
                    <Row gutter={12} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>NRC Setup Fee (one-time)</Text>
                        <InputNumber min={0} max={200000} step={1000} value={coloNrcSetupFee} onChange={v => setColoNrcSetupFee(v || 0)} style={{ width: '100%', marginTop: 4 }} prefix="$" />
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Power Escalation (%/yr) <Tooltip title="Annual electricity price increase"><InfoCircleOutlined /></Tooltip></Text>
                        <InputNumber min={0} max={15} step={0.5} value={powerEscalation} onChange={v => setPowerEscalation(v ?? 3)} style={{ width: '100%', marginTop: 4 }} addonAfter="%" />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>

              <Card style={{ ...glassStyle, marginTop: 24, marginBottom: 24 }}>
                <Title level={4} style={{ marginTop: 0 }}>Power Density Meter (Watts per Sq.Ft.)</Title>
                <div style={{ position: 'relative', height: 24, background: 'linear-gradient(to right, #1890ff 25%, #52c41a 25% 50%, #faad14 50% 75%, #ff4d4f 75%)', borderRadius: 12, marginBottom: 8 }}>
                  <div style={{ 
                    position: 'absolute', 
                    left: `${Math.min(100, (wpsqft / 250) * 100)}%`, 
                    top: -8, 
                    bottom: -8, 
                    width: 4, 
                    background: token.colorText, 
                    borderRadius: 2,
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                    transition: 'left 0.3s ease'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: token.colorTextSecondary, fontSize: 12 }}>
                  <span>Low (&lt;80)</span>
                  <span>Average (80-150)</span>
                  <span>Medium (150-200)</span>
                  <span>High (200+)</span>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: getMeterColor(wpsqft) }}>
                    {wpsqft.toFixed(1)} W/Sq.Ft.
                  </Text>
                </div>
              </Card>

              <Row gutter={24} style={{ marginBottom: 32 }}>
                <Col xs={24} md={11}>
                  <Card style={{ ...glassStyle, textAlign: 'center', height: '100%', borderColor: totalBuildTco < totalColoTco ? '#52c41a' : undefined }}>
                    <Title level={4}>BUILD YOUR OWN</Title>
                    <div style={{ fontSize: 48, fontWeight: 'bold', color: totalBuildTco <= totalColoTco ? '#52c41a' : token.colorText }}>
                      {formatCurrency(totalBuildTco)}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} md={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Title level={2} style={{ margin: 0, opacity: 0.5 }}>VS</Title>
                </Col>
                <Col xs={24} md={11}>
                  <Card style={{ ...glassStyle, textAlign: 'center', height: '100%', borderColor: totalColoTco < totalBuildTco ? '#52c41a' : undefined }}>
                    <Title level={4}>TIER {tier} COLOCATION</Title>
                    <div style={{ fontSize: 48, fontWeight: 'bold', color: totalColoTco <= totalBuildTco ? '#52c41a' : token.colorText }}>
                      {formatCurrency(totalColoTco)}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Title level={3} style={{ marginBottom: 16 }}>Construction Cost Breakdown</Title>
              <Collapse 
                defaultActiveKey={['1']} 
                style={{ ...glassStyle, marginBottom: 32 }}
                expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
              >
                <Panel header={<Text strong>SECTION A: ENGINEERING & PREPARATION</Text>} key="1">
                  {renderSectionTable(engItems, engTotal)}
                </Panel>
                <Panel header={<Text strong>SECTION B: POWER</Text>} key="2">
                  {renderSectionTable(powerItems, powerTotal)}
                </Panel>
                <Panel header={<Text strong>SECTION C: ENVIRONMENTAL CONTROLS</Text>} key="3">
                  {renderSectionTable(hvacItems, hvacTotal)}
                </Panel>
                <Panel header={<Text strong>SECTION D: SECURITY & MONITORING</Text>} key="4">
                  {renderSectionTable(secItems, secTotal)}
                </Panel>
                <Panel header={<Text strong>SECTION E: NETWORK</Text>} key="5">
                  {renderSectionTable(netItems, netTotal)}
                </Panel>
              </Collapse>
              
              <div style={{ textAlign: 'right', marginBottom: 40 }}>
                <Title level={4} style={{ display: 'inline-block', marginRight: 16 }}>TOTAL CONSTRUCTION COST:</Title>
                <Title level={2} style={{ display: 'inline-block', margin: 0, color: token.colorPrimary }}>{formatCurrency(totalConstruction)}</Title>
              </div>

              <Title level={3} style={{ marginBottom: 16 }}>Total Cost of Ownership Comparison</Title>
              <Card style={{ ...glassStyle, marginBottom: 24 }}>
                <Table 
                  pagination={false}
                  columns={[
                    { title: 'DESCRIPTION', dataIndex: 'desc', key: 'desc' },
                    { title: 'BUILD YOUR OWN', dataIndex: 'build', key: 'build', render: (val) => val === 0 ? '-' : formatCurrency(val), align: 'right' as const },
                    { title: `TIER ${tier} COLOCATION`, dataIndex: 'colo', key: 'colo', render: (val) => val === 0 ? '-' : formatCurrency(val), align: 'right' as const },
                  ]}
                  dataSource={[
                    { key: 't1', desc: 'Construction Cost', build: totalConstruction, colo: 0 },
                    { key: 't2', desc: 'Floor Space', build: buildFloorSpace, colo: coloFloorSpace },
                    { key: 't3', desc: 'Electricity', build: buildElectricity, colo: 0 },
                    { key: 't4', desc: 'Electrical Maintenance', build: buildElecMaint, colo: 0 },
                    { key: 't5', desc: 'HVAC Maintenance', build: buildHvacMaint, colo: 0 },
                    { key: 't6', desc: 'Other Systems Maintenance', build: buildOtherMaint, colo: 0 },
                    { key: 't7', desc: '24x7x365 Staff', build: buildStaff, colo: 0 },
                    { key: 't8', desc: 'Redundant Internet Circuits', build: buildInternet, colo: coloInternet },
                  ]}
                  summary={() => (
                    <Table.Summary.Row style={{ background: isDark ? '#1f1f1f' : '#fafafa', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0}>GRAND TOTAL ({evalPeriod} YEARS)</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <span style={{ color: totalBuildTco <= totalColoTco ? '#52c41a' : undefined, fontSize: 16 }}>
                          {formatCurrency(totalBuildTco)}
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <span style={{ color: totalColoTco <= totalBuildTco ? '#52c41a' : undefined, fontSize: 16 }}>
                          {formatCurrency(totalColoTco)}
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>

              {/* NEW TAB 1 FEATURES */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Card style={{ ...glassStyle, display: 'inline-block', padding: '16px 32px' }}>
                  <Text strong style={{ fontSize: 18 }}>
                    You save <span style={{ color: '#52c41a' }}>{formatCurrency(savings)}</span> ({savingsPercent}%) by choosing {winner}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Tag color="success" icon={<CheckCircleOutlined />}>Recommended Choice</Tag>
                  </div>
                </Card>
              </div>

              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card size="small" style={glassStyle}>
                    <Statistic title="Monthly Build Cost" value={totalBuildTco / evalMonths} precision={0} prefix="$" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={glassStyle}>
                    <Statistic title="Monthly Colo Cost" value={totalColoTco / evalMonths} precision={0} prefix="$" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={glassStyle}>
                    <Statistic title="Build Cost / Cabinet" value={totalBuildTco / cabinets} precision={0} prefix="$" />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={glassStyle}>
                    <Statistic title="Colo Cost / Cabinet" value={totalColoTco / cabinets} precision={0} prefix="$" />
                  </Card>
                </Col>
              </Row>

              {/* NEW: Break-even & Colo detail */}
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card size="small" style={glassStyle}>
                    <Statistic title="Break-Even Year" value={breakEvenYear > 0 ? `Year ${breakEvenYear}` : 'N/A'} valueStyle={{ color: breakEvenYear > 0 ? '#1890ff' : '#999', fontSize: 18 }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={glassStyle}>
                    <Statistic title="Power Escalation" value={powerEscalation} suffix="%/yr" valueStyle={{ fontSize: 18 }} />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={glassStyle}>
                    <Statistic title="Colo Cross-Connects" value={coloCrossConnectTotal} precision={0} prefix="$" valueStyle={{ fontSize: 18 }} />
                    <Text type="secondary" style={{ fontSize: 10 }}>{coloCrossConnects} × ${coloCrossConnectCost}/mo × {evalMonths}mo</Text>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={glassStyle}>
                    <Statistic title="Colo Remote Hands" value={coloRemoteHandsTotal} precision={0} prefix="$" valueStyle={{ fontSize: 18 }} />
                    <Text type="secondary" style={{ fontSize: 10 }}>{coloRemoteHands}h × ${coloRemoteHandsCost}/hr × {evalMonths}mo</Text>
                  </Card>
                </Col>
              </Row>

              <Card title="Yearly Cumulative Cost Timeline" style={{ ...glassStyle, marginBottom: 24 }}>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                      <XAxis dataKey="year" stroke={isDark ? "#888" : "#333"} />
                      <YAxis stroke={isDark ? "#888" : "#333"} tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="build" name="Build Your Own" stroke="#1890ff" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="colo" name="Colocation" stroke="#52c41a" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

            </motion.div>
          )}

          {activeTab === 'CapEx Estimator' && (
            <motion.div
              key="capex"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button type="dashed" icon={<ReloadOutlined />} onClick={resetTab2}>
                  Reset to Defaults
                </Button>
              </div>

              <Row gutter={24}>
                <Col xs={24} lg={10}>
                  <Card style={{ ...glassStyle, height: '100%', marginBottom: 24 }} title="Infrastructure Configuration">
                    <Collapse defaultActiveKey={['1']} style={{ background: 'transparent' }}>
                      <Panel header="IT Load" key="1">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text>IT Load (kW)</Text>
                          <InputNumber min={50} max={50000} value={itLoadKw} onChange={(v) => setItLoadKw(v || 1000)} />
                        </div>
                        <Slider min={50} max={50000} value={itLoadKw} onChange={setItLoadKw} />
                      </Panel>

                      <Panel header="Redundancy" key="2">
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Power Redundancy</Text>
                          <Radio.Group value={powerRedundancy} onChange={(e) => setPowerRedundancy(e.target.value)}>
                            <Radio.Button value="N">N</Radio.Button>
                            <Radio.Button value="N+1">N+1</Radio.Button>
                            <Radio.Button value="2N">2N</Radio.Button>
                            <Radio.Button value="2(N+1)">2(N+1)</Radio.Button>
                          </Radio.Group>
                        </div>
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Cooling Redundancy</Text>
                          <Radio.Group value={coolingRedundancy} onChange={(e) => setCoolingRedundancy(e.target.value)}>
                            <Radio.Button value="N">N</Radio.Button>
                            <Radio.Button value="N+1">N+1</Radio.Button>
                            <Radio.Button value="2N">2N</Radio.Button>
                          </Radio.Group>
                        </div>
                      </Panel>

                      <Panel header="Cooling" key="3">
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Cooling Architecture</Text>
                          <Select value={coolingArch} onChange={setCoolingArch} style={{ width: '100%' }}>
                            <Select.Option value="air_dx">Air DX</Select.Option>
                            <Select.Option value="chilled_water">Chilled Water</Select.Option>
                            <Select.Option value="indirect_evap">Indirect Evaporative</Select.Option>
                            <Select.Option value="liquid_cdu">Liquid CDU</Select.Option>
                          </Select>
                        </div>
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Containment</Text>
                          <Select value={containment} onChange={setContainment} style={{ width: '100%' }}>
                            <Select.Option value="none">None</Select.Option>
                            <Select.Option value="hot_aisle">Hot Aisle</Select.Option>
                            <Select.Option value="cold_aisle">Cold Aisle</Select.Option>
                          </Select>
                        </div>
                      </Panel>

                      <Panel header="Power Distribution" key="4">
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>UPS Topology</Text>
                          <Select value={upsTopology} onChange={setUpsTopology} style={{ width: '100%' }}>
                            <Select.Option value="standalone">Standalone</Select.Option>
                            <Select.Option value="modular">Modular</Select.Option>
                          </Select>
                        </div>
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Distribution</Text>
                          <Select value={distribution} onChange={setDistribution} style={{ width: '100%' }}>
                            <Select.Option value="centralized">Centralized</Select.Option>
                            <Select.Option value="distributed">Distributed</Select.Option>
                          </Select>
                        </div>
                      </Panel>

                      <Panel header="Facility & Location" key="5">
                        <div style={{ marginBottom: 16 }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Building Type</Text>
                          <Select value={buildingType} onChange={setBuildingType} style={{ width: '100%' }}>
                            <Select.Option value="new">New Build</Select.Option>
                            <Select.Option value="existing">Existing Retrofit</Select.Option>
                            <Select.Option value="prefab">Prefabricated/Modular</Select.Option>
                          </Select>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                          <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Raised Floor</Text>
                            <AntSwitch checked={raisedFloor} onChange={setRaisedFloor} />
                          </div>
                          <div>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Dropped Ceiling</Text>
                            <AntSwitch checked={droppedCeiling} onChange={setDroppedCeiling} />
                          </div>
                        </div>
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Region</Text>
                          <Select value={region} onChange={setRegion} style={{ width: '100%' }}>
                            <Select.Option value="na">North America (1.0x)</Select.Option>
                            <Select.Option value="eu">Europe (+15%)</Select.Option>
                            <Select.Option value="apac">APAC (-15%)</Select.Option>
                            <Select.Option value="mea">MEA (-10%)</Select.Option>
                          </Select>
                        </div>
                      </Panel>
                      <Panel header="Additional Costs & Phasing" key="additional">
                        <div style={{ marginBottom: 12 }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Contingency Reserve <Tooltip title="Standard 5-15% for unexpected costs"><InfoCircleOutlined /></Tooltip></Text>
                          <Slider min={0} max={25} value={contingencyRate} onChange={setContingencyRate} marks={{ 0: '0%', 5: '5%', 10: '10%', 15: '15%', 25: '25%' }} />
                        </div>
                        <Row gutter={12} style={{ marginBottom: 12 }}>
                          <Col span={12}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Land / Site Cost</Text>
                            <InputNumber min={0} max={50000000} step={100000} value={landCost} onChange={v => setLandCost(v || 0)} style={{ width: '100%' }} prefix="$" />
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Grid Connection</Text>
                            <InputNumber min={0} max={20000000} step={100000} value={gridConnectionCost} onChange={v => setGridConnectionCost(v || 0)} style={{ width: '100%' }} prefix="$" />
                          </Col>
                        </Row>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isPhased ? 12 : 0 }}>
                          <Text strong>Phased Deployment</Text>
                          <AntSwitch checked={isPhased} onChange={setIsPhased} />
                          {isPhased && <Tag color="blue">Phase 1: {phase1Pct}% | Phase 2: {100 - phase1Pct}%</Tag>}
                        </div>
                        {isPhased && (
                          <Slider min={30} max={90} value={phase1Pct} onChange={setPhase1Pct} marks={{ 30: '30%', 50: '50%', 60: '60%', 80: '80%', 90: '90%' }} />
                        )}
                      </Panel>
                    </Collapse>
                  </Card>
                </Col>

                <Col xs={24} lg={14}>
                  <Card style={{ ...glassStyle, height: '100%' }} title="Results Dashboard">
                    
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col xs={24} md={12} xl={8}>
                        <div style={{ padding: 16, background: 'rgba(82, 196, 26, 0.1)', borderRadius: 12, border: '1px solid rgba(82, 196, 26, 0.3)' }}>
                          <Statistic 
                            title="Total CapEx Estimator" 
                            value={totalCapex} 
                            precision={0} 
                            prefix={<DollarOutlined />} 
                            valueStyle={{ color: '#52c41a', fontSize: '1.5rem', fontWeight: 'bold' }}
                          />
                        </div>
                      </Col>
                      <Col xs={24} md={12} xl={8}>
                        <div style={{ padding: 16, background: 'rgba(24, 144, 255, 0.1)', borderRadius: 12, border: '1px solid rgba(24, 144, 255, 0.3)' }}>
                          <Statistic 
                            title="Cost per kW" 
                            value={costPerKw} 
                            precision={0} 
                            prefix={<DollarOutlined />} 
                            valueStyle={{ color: '#1890ff', fontSize: '1.5rem', fontWeight: 'bold' }}
                          />
                        </div>
                      </Col>
                      <Col xs={24} md={12} xl={8}>
                        <div style={{ padding: 16, background: 'rgba(250, 173, 20, 0.1)', borderRadius: 12, border: '1px solid rgba(250, 173, 20, 0.3)' }}>
                          <Statistic 
                            title="Cost per Watt" 
                            value={costPerKw / 1000} 
                            precision={2} 
                            prefix={<DollarOutlined />} 
                            valueStyle={{ color: '#faad14', fontSize: '1.5rem', fontWeight: 'bold' }}
                          />
                        </div>
                      </Col>
                    </Row>

                    {/* NEW: Contingency & Phase Tags */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                      <Tag color="orange">Contingency: {contingencyRate}% ({formatCurrency(contingencyCost)})</Tag>
                      {landCost > 0 && <Tag color="green">Land: {formatCurrency(landCost)}</Tag>}
                      {gridConnectionCost > 0 && <Tag color="cyan">Grid: {formatCurrency(gridConnectionCost)}</Tag>}
                      {isPhased && <Tag color="blue">Phase 1: {formatCurrency(totalCapex)} | Phase 2: {formatCurrency(phase2Capex)}</Tag>}
                    </div>
                    <Row gutter={[24, 24]}>
                      <Col span={24}>
                        <Title level={5}>Cost Breakdown (Bar)</Title>
                        <div style={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={capexBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
                              <YAxis dataKey="name" type="category" width={100} />
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {capexBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Col>
                      <Col span={24}>
                        <Title level={5}>Cost Distribution (Pie)</Title>
                        <div style={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={capexBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {capexBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </Col>
                    </Row>

                    <Divider />

                    <Title level={5}>Cumulative Cost by IT Load</Title>
                    <div style={{ height: 300, marginBottom: 24 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={scaleData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="load" stroke={isDark ? "#888" : "#333"} />
                          <YAxis yAxisId="left" tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} stroke={isDark ? "#888" : "#333"} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `$${val}`} stroke="#82ca9d" />
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend />
                          <Area yAxisId="left" type="monotone" dataKey="total" name="Total CapEx" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
                          <Line yAxisId="right" type="monotone" dataKey="perKw" name="Cost / kW" stroke="#82ca9d" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <Divider />
                    
                    <Title level={5}>Sensitivity Analysis: Power Redundancy</Title>
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      {prevLevel && (
                        <Col xs={24} sm={8}>
                          <Card size="small" style={{ background: isDark ? '#1f1f1f' : '#f5f5f5' }}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>If downgraded to {prevLevel}:</Text>
                            <Text strong style={{ fontSize: 16 }}>{formatCurrency(calcCostPerKwForPR(prevLevel))} / kW</Text>
                            <div style={{ color: '#52c41a', fontSize: 12 }}><ArrowDownOutlined /> Lower Cost</div>
                          </Card>
                        </Col>
                      )}
                      <Col xs={24} sm={prevLevel && nextLevel ? 8 : 12}>
                        <Card size="small" style={{ border: '1px solid #1890ff', background: 'rgba(24,144,255,0.05)' }}>
                          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Current ({powerRedundancy}):</Text>
                          <Text strong style={{ fontSize: 16 }}>{formatCurrency(costPerKw)} / kW</Text>
                          <div style={{ color: '#1890ff', fontSize: 12 }}>Baseline</div>
                        </Card>
                      </Col>
                      {nextLevel && (
                        <Col xs={24} sm={8}>
                          <Card size="small" style={{ background: isDark ? '#1f1f1f' : '#f5f5f5' }}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>If upgraded to {nextLevel}:</Text>
                            <Text strong style={{ fontSize: 16 }}>{formatCurrency(calcCostPerKwForPR(nextLevel))} / kW</Text>
                            <div style={{ color: '#ff4d4f', fontSize: 12 }}><ArrowUpOutlined /> Higher Cost</div>
                          </Card>
                        </Col>
                      )}
                    </Row>

                    <Title level={5}>Sensitivity Analysis: Cooling Architecture</Title>
                    <Row gutter={16}>
                      {coolingArchOptions.map(arch => {
                        if (arch === coolingArch) {
                          return (
                            <Col xs={24} sm={12} md={6} key={arch}>
                              <Card size="small" style={{ border: '1px solid #1890ff', background: 'rgba(24,144,255,0.05)' }}>
                                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{arch.replace('_', ' ').toUpperCase()}</Text>
                                <Text strong style={{ fontSize: 14 }}>{formatCurrency(costPerKw)}/kW</Text>
                                <div style={{ color: '#1890ff', fontSize: 11 }}>Baseline</div>
                              </Card>
                            </Col>
                          );
                        } else {
                          const val = calcCostPerKwForCoolingArch(arch);
                          const isHigher = val > costPerKw;
                          return (
                            <Col xs={24} sm={12} md={6} key={arch}>
                              <Card size="small" style={{ background: isDark ? '#1f1f1f' : '#f5f5f5' }}>
                                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>{arch.replace('_', ' ').toUpperCase()}</Text>
                                <Text strong style={{ fontSize: 14 }}>{formatCurrency(val)}/kW</Text>
                                <div style={{ color: isHigher ? '#ff4d4f' : '#52c41a', fontSize: 11 }}>
                                  {isHigher ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {isHigher ? 'Higher' : 'Lower'}
                                </div>
                              </Card>
                            </Col>
                          );
                        }
                      })}
                    </Row>

                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                      <Button type="primary" icon={<SaveOutlined />} onClick={() => setIsModalOpen(true)}>
                        Save Scenario
                      </Button>
                    </div>

                  </Card>

                  {/* Scenario Manager Panel */}
                  <Card title="Saved Scenarios" style={{ ...glassStyle, marginTop: 24 }}>
                    {savedScenarios.length > 0 ? (
                      <List
                        itemLayout="horizontal"
                        dataSource={savedScenarios}
                        renderItem={item => (
                          <List.Item
                            actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteScenario(item.id)} />]}
                          >
                            <List.Item.Meta
                              title={<Text strong>{item.name}</Text>}
                              description={new Date(item.createdAt).toLocaleDateString()}
                            />
                            <div style={{ textAlign: 'right' }}>
                              <div><Text strong>{formatCurrency(item.totalCapex)}</Text></div>
                              <div><Text type="secondary">{formatCurrency(item.costPerKw)}/kW</Text></div>
                            </div>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description="No saved scenarios" />
                    )}
                  </Card>
                </Col>
              </Row>
            </motion.div>
          )}

          {activeTab === 'ROI & Payback' && (
            <motion.div
              key="roi"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Row gutter={24}>
                <Col xs={24} lg={10}>
                  <Card title="Investment Parameters" style={{ ...glassStyle, height: '100%' }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Initial Investment ($)</Text>
                        <InputNumber min={0} max={100000000} value={roiInitialInvestment} onChange={(v) => setRoiInitialInvestment(v || 0)} style={{ width: 150 }} />
                      </div>
                      <Slider min={0} max={20000000} value={roiInitialInvestment} onChange={setRoiInitialInvestment} />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Annual Revenue / Savings ($)</Text>
                        <InputNumber min={0} max={50000000} value={roiAnnualRevenue} onChange={(v) => setRoiAnnualRevenue(v || 0)} style={{ width: 150 }} />
                      </div>
                      <Slider min={0} max={5000000} value={roiAnnualRevenue} onChange={setRoiAnnualRevenue} />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Annual Operating Cost ($)</Text>
                        <InputNumber min={0} max={50000000} value={roiAnnualOpCost} onChange={(v) => setRoiAnnualOpCost(v || 0)} style={{ width: 150 }} />
                      </div>
                      <Slider min={0} max={5000000} value={roiAnnualOpCost} onChange={setRoiAnnualOpCost} />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Discount Rate (%)</Text>
                        <InputNumber min={1} max={25} value={roiDiscountRate} onChange={(v) => setRoiDiscountRate(v || 10)} style={{ width: 100 }} addonAfter="%" />
                      </div>
                      <Slider min={1} max={25} value={roiDiscountRate} onChange={setRoiDiscountRate} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Analysis Period (Years)</Text>
                        <InputNumber min={1} max={20} value={roiAnalysisPeriod} onChange={(v) => setRoiAnalysisPeriod(v || 10)} style={{ width: 100 }} />
                      </div>
                      <Slider min={1} max={20} value={roiAnalysisPeriod} onChange={setRoiAnalysisPeriod} />
                    </div>

                    <Divider style={{ margin: '12px 0', fontSize: 12 }}>Depreciation & Tax</Divider>
                    <Row gutter={12} style={{ marginBottom: 8 }}>
                      <Col span={14}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Depreciation Schedule</Text>
                        <Select value={roiDepreciation} onChange={setRoiDepreciation} style={{ width: '100%', marginTop: 4 }} size="small"
                          options={[{ value: 'straight_5', label: 'Straight-Line 5yr' }, { value: 'straight_15', label: 'Straight-Line 15yr' }, { value: 'straight_39', label: 'Straight-Line 39yr' }]} />
                      </Col>
                      <Col span={10}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Tax Rate</Text>
                        <InputNumber min={0} max={50} value={roiTaxRate} onChange={v => setRoiTaxRate(v ?? 25)} style={{ width: '100%', marginTop: 4 }} size="small" addonAfter="%" />
                      </Col>
                    </Row>
                    <Row gutter={12} style={{ marginBottom: 8 }}>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Refresh Year <Tooltip title="Battery/server mid-life replacement"><InfoCircleOutlined /></Tooltip></Text>
                        <InputNumber min={1} max={20} value={roiRefreshYear} onChange={v => setRoiRefreshYear(v ?? 5)} style={{ width: '100%', marginTop: 4 }} size="small" />
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Refresh Cost</Text>
                        <InputNumber min={0} max={50000000} step={50000} value={roiRefreshCost} onChange={v => setRoiRefreshCost(v ?? 0)} style={{ width: '100%', marginTop: 4 }} size="small" prefix="$" />
                      </Col>
                    </Row>

                    <Divider style={{ margin: '12px 0', fontSize: 12 }}>Debt Financing</Divider>
                    <Row gutter={12} style={{ marginBottom: 8 }}>
                      <Col xs={24} sm={8}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Debt %</Text>
                        <InputNumber min={0} max={100} value={roiDebtPct} onChange={v => setRoiDebtPct(v ?? 0)} style={{ width: '100%', marginTop: 4 }} size="small" addonAfter="%" />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Interest Rate</Text>
                        <InputNumber min={0} max={25} step={0.5} value={roiInterestRate} onChange={v => setRoiInterestRate(v ?? 6)} style={{ width: '100%', marginTop: 4 }} size="small" addonAfter="%" />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Text type="secondary" style={{ fontSize: 11 }}>Loan Term (yr)</Text>
                        <InputNumber min={1} max={30} value={roiLoanTerm} onChange={v => setRoiLoanTerm(v ?? 10)} style={{ width: '100%', marginTop: 4 }} size="small" />
                      </Col>
                    </Row>
                    {roiDebtPct > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        <Tag color="blue">Equity: {formatCurrency(equityAmount)}</Tag>
                        <Tag color="orange">Debt: {formatCurrency(debtAmount)}</Tag>
                        <Tag>Annual Debt Service: {formatCurrency(annualDebtService)}</Tag>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                  <Card title="Financial Analysis" style={{ ...glassStyle, height: '100%' }}>
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                      <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ background: 'rgba(250, 173, 20, 0.1)', border: '1px solid rgba(250, 173, 20, 0.3)' }}>
                          <Statistic title="Payback Period" value={simplePayback === Infinity ? 'Never' : simplePayback} precision={1} suffix="years" valueStyle={{ color: '#faad14' }} />
                          <Progress percent={simplePayback === Infinity ? 0 : Math.min(100, (simplePayback / roiAnalysisPeriod) * 100)} showInfo={false} strokeColor="#faad14" />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ background: npv >= 0 ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)', border: `1px solid ${npv >= 0 ? 'rgba(82, 196, 26, 0.3)' : 'rgba(255, 77, 79, 0.3)'}` }}>
                          <Statistic title="NPV" value={npv} precision={0} prefix="$" valueStyle={{ color: npv >= 0 ? '#52c41a' : '#ff4d4f' }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ background: irr > roiDiscountRate ? 'rgba(82, 196, 26, 0.1)' : 'rgba(250, 173, 20, 0.1)', border: `1px solid ${irr > roiDiscountRate ? 'rgba(82, 196, 26, 0.3)' : 'rgba(250, 173, 20, 0.3)'}` }}>
                          <Statistic title="IRR" value={irr} precision={1} suffix="%" valueStyle={{ color: irr > roiDiscountRate ? '#52c41a' : '#faad14' }} />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card size="small" style={{ background: simpleRoi >= 0 ? 'rgba(24, 144, 255, 0.1)' : 'rgba(255, 77, 79, 0.1)', border: `1px solid ${simpleRoi >= 0 ? 'rgba(24, 144, 255, 0.3)' : 'rgba(255, 77, 79, 0.3)'}` }}>
                          <Statistic title="ROI" value={simpleRoi} precision={1} suffix="%" valueStyle={{ color: simpleRoi >= 0 ? '#1890ff' : '#ff4d4f' }} />
                        </Card>
                      </Col>
                    </Row>

                    {/* NEW: Depreciation & Financing Row */}
                    <Row gutter={12} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12} md={6}><Card size="small" style={glassStyle}><Statistic title="Depreciation/yr" value={annualDepreciation} precision={0} prefix="$" valueStyle={{ fontSize: 14 }} /><Text type="secondary" style={{ fontSize: 10 }}>{depYears}-yr schedule</Text></Card></Col>
                      <Col xs={24} sm={12} md={6}><Card size="small" style={glassStyle}><Statistic title="Tax Shield/yr" value={Math.round(annualDepreciation * roiTaxRate / 100)} precision={0} prefix="$" valueStyle={{ fontSize: 14, color: '#52c41a' }} /><Text type="secondary" style={{ fontSize: 10 }}>{roiTaxRate}% rate</Text></Card></Col>
                      <Col xs={24} sm={12} md={6}><Card size="small" style={glassStyle}><Statistic title="Debt Service/yr" value={annualDebtService} precision={0} prefix="$" valueStyle={{ fontSize: 14, color: roiDebtPct > 0 ? '#fa8c16' : '#999' }} /><Text type="secondary" style={{ fontSize: 10 }}>{roiDebtPct}% debt</Text></Card></Col>
                      <Col xs={24} sm={12} md={6}><Card size="small" style={glassStyle}><Statistic title="Yr1 After-Tax CF" value={cashFlowData.length > 1 ? cashFlowData[1].afterTax : 0} precision={0} prefix="$" valueStyle={{ fontSize: 14, color: (cashFlowData.length > 1 && cashFlowData[1].afterTax >= 0) ? '#52c41a' : '#ff4d4f' }} /></Card></Col>
                    </Row>

                    <Title level={5}>Cash Flow Waterfall</Title>
                    <div style={{ height: 400, marginBottom: 24 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={cashFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                          <XAxis dataKey="year" stroke={isDark ? "#888" : "#333"} />
                          <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} stroke={isDark ? "#888" : "#333"} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="cashFlow" name="Gross Cash Flow">
                            {cashFlowData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.cashFlow >= 0 ? '#52c41a' : '#ff4d4f'} />
                            ))}
                          </Bar>
                          <Line type="monotone" dataKey="cumulative" name="Cumulative (After-Tax)" stroke="#1890ff" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="afterTax" name="After-Tax CF" stroke="#722ed1" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <Card style={{ background: isDark ? '#1f1f1f' : '#f0f2f5', border: 'none' }}>
                      <Text style={{ fontSize: 16 }}>
                        With an initial investment of <strong style={{ color: '#1890ff' }}>{formatCurrency(roiInitialInvestment)}</strong>, generating <strong style={{ color: '#52c41a' }}>{formatCurrency(annualNetCashFlow)}</strong> in annual net cash flow, your investment pays back in <strong style={{ color: '#faad14' }}>{simplePayback.toFixed(1)} years</strong> with an NPV of <strong style={{ color: npv >= 0 ? '#52c41a' : '#ff4d4f' }}>{formatCurrency(npv)}</strong> at a {roiDiscountRate}% discount rate.
                      </Text>
                    </Card>

                  </Card>
                </Col>
              </Row>
            </motion.div>
          )}

          {activeTab === 'Scenario Compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {savedScenarios.length === 0 ? (
                <Card style={{ ...glassStyle, textAlign: 'center', padding: '40px 20px' }}>
                  <Empty description={<span style={{ color: token.colorText }}>No saved scenarios. Go to CapEx Estimator tab to save scenarios.</span>} />
                </Card>
              ) : (
                <Row gutter={24}>
                  <Col span={24}>
                    <Card title="Select Scenarios to Compare" style={{ ...glassStyle, marginBottom: 24 }}>
                      <Select
                        mode="multiple"
                        placeholder="Select 2 to 4 scenarios"
                        value={selectedScenarioIds}
                        onChange={(val) => {
                          if (val.length <= 4) setSelectedScenarioIds(val);
                          else message.warning('You can compare up to 4 scenarios.');
                        }}
                        style={{ width: '100%' }}
                        size="large"
                        options={savedScenarios.map(s => ({ label: s.name, value: s.id }))}
                      />
                    </Card>
                  </Col>

                  {selectedScenariosData.length > 0 && (
                    <Col span={24}>
                      <Card style={{ ...glassStyle, marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <Title level={4} style={{ margin: 0 }}>Comparison Matrix</Title>
                          {selectedScenariosData.length >= 2 && winnerScenario && (
                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>
                              Lowest CapEx: {winnerScenario.name}
                            </Tag>
                          )}
                        </div>
                        <Table
                          pagination={false}
                          scroll={{ x: true }}
                          columns={[
                            { title: 'Parameter', dataIndex: 'parameter', key: 'parameter', fixed: 'left', width: 200 },
                            ...selectedScenariosData.map(s => ({
                              title: s.name,
                              dataIndex: `s_${s.id}`,
                              key: `s_${s.id}`,
                              align: 'center' as const
                            }))
                          ]}
                          dataSource={[
                            {
                              key: '1',
                              parameter: <Text strong>IT Load</Text>,
                              ...selectedScenariosData.reduce((acc, s) => ({ ...acc, [`s_${s.id}`]: `${s.params.itLoadKw} kW` }), {})
                            },
                            {
                              key: '2',
                              parameter: <Text strong>Power Redundancy</Text>,
                              ...selectedScenariosData.reduce((acc, s) => ({ ...acc, [`s_${s.id}`]: s.params.powerRedundancy }), {})
                            },
                            {
                              key: '3',
                              parameter: <Text strong>Cooling Architecture</Text>,
                              ...selectedScenariosData.reduce((acc, s) => ({ ...acc, [`s_${s.id}`]: s.params.coolingArch.replace('_', ' ').toUpperCase() }), {})
                            },
                            {
                              key: '4',
                              parameter: <Text strong>Containment</Text>,
                              ...selectedScenariosData.reduce((acc, s) => ({ ...acc, [`s_${s.id}`]: s.params.containment.replace('_', ' ').toUpperCase() }), {})
                            },
                            {
                              key: '5',
                              parameter: <Text strong>Region</Text>,
                              ...selectedScenariosData.reduce((acc, s) => ({ ...acc, [`s_${s.id}`]: s.params.region.toUpperCase() }), {})
                            },
                            {
                              key: '6',
                              parameter: <Text strong style={{ color: '#52c41a' }}>Total CapEx</Text>,
                              ...selectedScenariosData.reduce((acc, s) => ({ ...acc, [`s_${s.id}`]: <Text strong style={{ color: '#52c41a' }}>{formatCurrency(s.totalCapex)}</Text> }), {})
                            },
                            {
                              key: '7',
                              parameter: <Text strong style={{ color: '#1890ff' }}>Cost/kW</Text>,
                              ...selectedScenariosData.reduce((acc, s) => ({ ...acc, [`s_${s.id}`]: <Text strong style={{ color: '#1890ff' }}>{formatCurrency(s.costPerKw)}/kW</Text> }), {})
                            }
                          ]}
                        />
                      </Card>
                    </Col>
                  )}

                  {selectedScenariosData.length > 0 && (
                    <Col xs={24} lg={12}>
                      <Card title="Multi-Axis Analysis" style={{ ...glassStyle, height: '100%' }}>
                        <div style={{ height: 400 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                              <PolarGrid stroke={isDark ? "#444" : "#ccc"} />
                              <PolarAngleAxis dataKey="metric" tick={{ fill: isDark ? "#fff" : "#333", fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Legend />
                              {selectedScenariosData.map((s, i) => (
                                <Radar key={s.id} name={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} />
                              ))}
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </Col>
                  )}

                  {selectedScenariosData.length > 0 && (
                    <Col xs={24} lg={12}>
                      <Card title="Cost Breakdown Comparison" style={{ ...glassStyle, height: '100%' }}>
                        <div style={{ height: 400 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={capexBreakdown.map((b, i) => {
                                const obj: any = { name: b.name };
                                selectedScenariosData.forEach((s) => {
                                  obj[s.name] = s.breakdown[i].value;
                                });
                                return obj;
                              })}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#eee"} />
                              <XAxis dataKey="name" stroke={isDark ? "#888" : "#333"} />
                              <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} stroke={isDark ? "#888" : "#333"} />
                              <RechartsTooltip content={<CustomTooltip />} />
                              <Legend />
                              {selectedScenariosData.map((s, i) => (
                                <Bar key={s.id} dataKey={s.name} name={s.name} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </Col>
                  )}

                  {/* NEW: Cross-calc metric summary */}
                  {selectedScenariosData.length >= 2 && (
                    <Col span={24}>
                      <Card title="Cross-Calculator Metrics" style={{ ...glassStyle, marginBottom: 24 }}>
                        <Row gutter={16}>
                          {selectedScenariosData.map((s, i) => {
                            const annualPower = s.params.itLoadKw * 8760 * (PUE_BY_TIER['III'] || 1.5) * 0.10; // $0.10/kWh estimate
                            const tco10yr = s.totalCapex + annualPower * 10;
                            const co2 = s.params.itLoadKw * 8760 * 0.42 / 1000; // tonnes/yr @ US avg grid factor
                            return (
                              <Col xs={24} sm={12} lg={24 / Math.min(selectedScenariosData.length, 4)} key={s.id}>
                                <Card size="small" style={{ ...glassStyle, borderTop: `3px solid ${COLORS[i % COLORS.length]}` }}>
                                  <Text strong style={{ color: COLORS[i % COLORS.length] }}>{s.name}</Text>
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                      <Text type="secondary">10-yr TCO</Text>
                                      <Text strong>{formatCurrency(tco10yr)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                      <Text type="secondary">Annual Power</Text>
                                      <Text>{formatCurrency(annualPower)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                      <Text type="secondary">CO₂ (t/yr)</Text>
                                      <Text>{co2.toFixed(0)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                      <Text type="secondary">$/kW</Text>
                                      <Text strong>{formatCurrency(s.costPerKw)}</Text>
                                    </div>
                                  </div>
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>
                      </Card>
                    </Col>
                  )}

                  {/* NEW: Delta indicators */}
                  {selectedScenariosData.length >= 2 && (
                    <Col span={24}>
                      <Card title="Delta Analysis (vs Lowest CapEx)" style={{ ...glassStyle, marginBottom: 24 }}>
                        <Table
                          pagination={false}
                          size="small"
                          columns={[
                            { title: 'Scenario', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
                            { title: 'Total CapEx', dataIndex: 'capex', key: 'capex', align: 'right' as const },
                            { title: 'Cost/kW', dataIndex: 'perKw', key: 'perKw', align: 'right' as const },
                            { title: 'Delta ($)', dataIndex: 'delta', key: 'delta', align: 'right' as const, render: (v: number) => <Text style={{ color: v === 0 ? '#52c41a' : '#ff4d4f' }}>{v === 0 ? '—' : `+${formatCurrency(v)}`}</Text> },
                            { title: 'Delta (%)', dataIndex: 'deltaPct', key: 'deltaPct', align: 'right' as const, render: (v: number) => <Tag color={v === 0 ? 'success' : v < 15 ? 'warning' : 'error'}>{v === 0 ? 'Lowest' : `+${v.toFixed(1)}%`}</Tag> },
                          ]}
                          dataSource={(() => {
                            const minCapex = Math.min(...selectedScenariosData.map(s => s.totalCapex));
                            return selectedScenariosData.map(s => ({
                              key: s.id,
                              name: s.name,
                              capex: formatCurrency(s.totalCapex),
                              perKw: formatCurrency(s.costPerKw) + '/kW',
                              delta: s.totalCapex - minCapex,
                              deltaPct: minCapex > 0 ? ((s.totalCapex - minCapex) / minCapex * 100) : 0,
                            }));
                          })()}
                        />
                      </Card>
                    </Col>
                  )}

                  {/* NEW: Export buttons */}
                  {selectedScenariosData.length > 0 && (
                    <Col span={24} style={{ textAlign: 'right', marginBottom: 24 }}>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          const rows = [
                            ['Scenario', 'IT Load (kW)', 'Power Redundancy', 'Cooling', 'Region', 'Total CapEx', 'Cost/kW'],
                            ...selectedScenariosData.map(s => [
                              s.name, s.params.itLoadKw, s.params.powerRedundancy, s.params.coolingArch,
                              s.params.region, Math.round(s.totalCapex), Math.round(s.costPerKw)
                            ])
                          ];
                          const csv = rows.map(r => r.join(',')).join('\n');
                          navigator.clipboard.writeText(csv).then(() => message.success('CSV copied to clipboard!'));
                        }}
                        style={{ marginRight: 8 }}
                      >
                        Copy as CSV
                      </Button>
                    </Col>
                  )}
                </Row>
              )}
            </motion.div>
          )}

          {activeTab === 'ROM Estimator' && (
            <motion.div
              key="rom"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {(() => {
                // SE-style cost constants ($/watt methodology)
                const ROM_EQUIPMENT: Record<string, Record<string, number>> = {
                  ups: { 'N': 0.30, 'N+1': 0.38, '2N': 0.55, '2(N+1)': 0.68 },
                  switchgear: { 'N': 0.12, 'N+1': 0.15, '2N': 0.22, '2(N+1)': 0.28 },
                  generator: { 'N': 0.15, 'N+1': 0.20, '2N': 0.30, '2(N+1)': 0.38 },
                  transfer_switch: { 'N': 0.05, 'N+1': 0.07, '2N': 0.10, '2(N+1)': 0.13 },
                  pdu: { rpp: 0.08, busway: 0.12, panelboard: 0.06 },
                  cooling: { crac_perimeter: 0.32, crah_perimeter: 0.35, in_row: 0.42, rear_door_hx: 0.55, chilled_water: 0.50, direct_liquid: 0.70, indirect_evap: 0.45 },
                  containment: { none: 0, cold_aisle: 0.03, hot_aisle: 0.04 },
                  racks_per_unit: 120,  // $ per rack
                  monitoring: { base: 0.06 },
                  fire_suppression: { base: 0.04 },
                };
                const ROM_DESIGN_INSTALL_RATE = 0.35;
                const ROM_BUILDING_RATES: Record<string, number> = {
                  new_build: 0.45, retrofit: 0.25, prefab_modular: 0.35, shell_only: 0.15,
                };
                const ROM_SEISMIC: Record<string, number> = { low: 1.0, moderate: 1.08, high: 1.18 };
                const ROM_CURRENCY: Record<string, { symbol: string; rate: number }> = {
                  usd: { symbol: '$', rate: 1.0 }, eur: { symbol: '€', rate: 0.92 }, gbp: { symbol: '£', rate: 0.79 }, sgd: { symbol: 'S$', rate: 1.35 },
                };

                const romItLoad = romNumRacks * romKwPerRack;
                const totalWatts = romItLoad * 1000;
                const seismicMult = ROM_SEISMIC[romSeismic] || 1.0;
                const currInfo = ROM_CURRENCY[romCurrency] || ROM_CURRENCY.usd;

                // High density multiplier: >15 kW/rack = 1.15x, >30 kW/rack = 1.35x
                const densityMult = romKwPerRack > 30 ? 1.35 : romKwPerRack > 15 ? 1.15 : 1.0;
                const densityLabel = romKwPerRack > 30 ? 'AI/HPC' : romKwPerRack > 15 ? 'High Density' : 'Standard';

                // Compute sqft (120 sqft per rack, typical)
                const totalSqft = romNumRacks * 120;
                const wattsPerSqft = totalSqft > 0 ? Math.round(totalWatts / totalSqft) : 0;

                // Equipment costs
                const upsEquip = (ROM_EQUIPMENT.ups[romRedundancy] || 0.38) * totalWatts * densityMult;
                const switchgearEquip = (ROM_EQUIPMENT.switchgear[romRedundancy] || 0.15) * totalWatts;
                const generatorEquip = (ROM_EQUIPMENT.generator[romRedundancy] || 0.20) * totalWatts;
                const transferEquip = (ROM_EQUIPMENT.transfer_switch[romRedundancy] || 0.07) * totalWatts;
                const pduEquip = (ROM_EQUIPMENT.pdu[romPowerDist] || 0.08) * totalWatts;
                const coolingEquip = (ROM_EQUIPMENT.cooling[romCooling] || 0.35) * totalWatts * densityMult;
                const economizerCost = romEconomizer ? 0.06 * totalWatts : 0;
                const containEquip = (ROM_EQUIPMENT.containment[romContainment] || 0) * totalWatts;
                const rackEquip = romNumRacks * ROM_EQUIPMENT.racks_per_unit;
                const monitorEquip = ROM_EQUIPMENT.monitoring.base * totalWatts;
                const fireEquip = ROM_EQUIPMENT.fire_suppression.base * totalWatts;
                const raisedFloorCost = romRaisedFloor ? 0.04 * totalWatts : 0;

                const totalEquipmentUsd = (upsEquip + switchgearEquip + generatorEquip + transferEquip + pduEquip + coolingEquip + economizerCost + containEquip + rackEquip + monitorEquip + fireEquip + raisedFloorCost) * seismicMult;

                // Design & Installation
                const totalDesignInstallUsd = totalEquipmentUsd * ROM_DESIGN_INSTALL_RATE;

                // Space & Building
                const buildingRate = ROM_BUILDING_RATES[romBuilding] || 0.45;
                const ceilingAddon = romDroppedCeiling ? 0.03 : 0;
                const coreShellBase = romCoreShell ? buildingRate + ceilingAddon : 0;
                const totalBuildingUsd = coreShellBase * totalWatts * seismicMult;

                const grandTotalUsd = totalEquipmentUsd + totalDesignInstallUsd + totalBuildingUsd;
                
                // Convert values to selected currency
                const grandTotal = grandTotalUsd * currInfo.rate;
                const totalEquipment = totalEquipmentUsd * currInfo.rate;
                const totalDesignInstall = totalDesignInstallUsd * currInfo.rate;
                const totalBuilding = totalBuildingUsd * currInfo.rate;

                const romLow = grandTotal * 0.80;
                const romHigh = grandTotal * 1.20;
                const costPerWatt = totalWatts > 0 ? grandTotal / totalWatts : 0;
                const costPerKwRom = romItLoad > 0 ? grandTotal / romItLoad : 0;
                const costPerSqft = totalSqft > 0 ? grandTotal / totalSqft : 0;
                const costPerRack = romNumRacks > 0 ? grandTotal / romNumRacks : 0;

                const fmtCurr = (val: number) => `${currInfo.symbol}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val)}`;

                const equipmentBreakdown = [
                  { name: 'UPS Systems', value: upsEquip * seismicMult * currInfo.rate, color: '#6366f1' },
                  { name: 'Switchgear', value: switchgearEquip * seismicMult * currInfo.rate, color: '#8b5cf6' },
                  { name: 'Generators', value: generatorEquip * seismicMult * currInfo.rate, color: '#a78bfa' },
                  { name: 'Transfer Switches', value: transferEquip * seismicMult * currInfo.rate, color: '#c4b5fd' },
                  { name: 'PDU / Distribution', value: pduEquip * seismicMult * currInfo.rate, color: '#06b6d4' },
                  { name: 'Cooling', value: coolingEquip * seismicMult * currInfo.rate, color: '#22d3ee' },
                  { name: 'Economizer', value: economizerCost * seismicMult * currInfo.rate, color: '#38bdf8' },
                  { name: 'Containment', value: containEquip * seismicMult * currInfo.rate, color: '#67e8f9' },
                  { name: 'Racks & Cabinets', value: rackEquip * seismicMult * currInfo.rate, color: '#10b981' },
                  { name: 'Monitoring (BMS/DCIM)', value: monitorEquip * seismicMult * currInfo.rate, color: '#34d399' },
                  { name: 'Fire Suppression', value: fireEquip * seismicMult * currInfo.rate, color: '#f59e0b' },
                  { name: 'Raised Floor', value: raisedFloorCost * seismicMult * currInfo.rate, color: '#fb923c' },
                ];

                const stackedData = [
                  { category: 'Equipment', value: totalEquipment, color: '#6366f1' },
                  { category: 'Design & Install', value: totalDesignInstall, color: '#f59e0b' },
                  { category: 'Space & Building', value: totalBuilding, color: '#10b981' },
                ];

                const coolingSensitivity = Object.entries(ROM_EQUIPMENT.cooling).map(([key, rate]) => {
                  const cUsd = rate * totalWatts * densityMult * seismicMult;
                  const eqUsd = (totalEquipmentUsd - coolingEquip * seismicMult) + cUsd;
                  const diUsd = eqUsd * ROM_DESIGN_INSTALL_RATE;
                  const totalUsdSensitivity = eqUsd + diUsd + totalBuildingUsd;
                  const totalLocal = totalUsdSensitivity * currInfo.rate;
                  return { 
                    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
                    total: totalLocal, 
                    perWatt: +(totalLocal / totalWatts).toFixed(2), 
                    isCurrent: key === romCooling 
                  };
                });

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                      <Button icon={<ReloadOutlined />} onClick={resetTab5} type="text">Reset</Button>
                    </div>

                    <Row gutter={24}>
                      <Col xs={24} lg={10}>
                        <Card style={{ ...glassStyle, height: '100%' }} title={<><CalculatorOutlined /> ROM Configuration</>}>
                          <Collapse defaultActiveKey={['1','2','3','4','5']} style={{ background: 'transparent' }}>
                            <Panel header="Capacity & Density" key="1">
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text>Number of Racks</Text>
                                <InputNumber min={1} max={500} value={romNumRacks} onChange={(v) => setRomNumRacks(v || 50)} />
                              </div>
                              <Slider min={1} max={500} value={romNumRacks} onChange={setRomNumRacks} />
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, marginTop: 16 }}>
                                <Text>kW per Rack</Text>
                                <InputNumber min={1} max={100} value={romKwPerRack} onChange={(v) => setRomKwPerRack(v || 10)} />
                              </div>
                              <Slider min={1} max={100} value={romKwPerRack} onChange={setRomKwPerRack} />

                              <div style={{ marginTop: 16, padding: 12, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <Text type="secondary">Total IT Load</Text>
                                  <Text strong>{romItLoad} kW</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <Text type="secondary">Density Profile</Text>
                                  <Text strong>{densityLabel}</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Text type="secondary">Est. W/sqft</Text>
                                  <Text strong>{wattsPerSqft} W/sqft</Text>
                                </div>
                              </div>
                            </Panel>

                            <Panel header="Power Infrastructure" key="2">
                              <div style={{ marginBottom: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Power Redundancy</Text>
                                <Radio.Group value={romRedundancy} onChange={(e) => setRomRedundancy(e.target.value)}>
                                  <Radio.Button value="N">N</Radio.Button>
                                  <Radio.Button value="N+1">N+1</Radio.Button>
                                  <Radio.Button value="2N">2N</Radio.Button>
                                  <Radio.Button value="2(N+1)">2(N+1)</Radio.Button>
                                </Radio.Group>
                              </div>
                              <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Power Distribution</Text>
                                <Select value={romPowerDist} onChange={setRomPowerDist} style={{ width: '100%' }}>
                                  <Select.Option value="rpp">RPP (Remote Power Panel)</Select.Option>
                                  <Select.Option value="busway">Busway</Select.Option>
                                  <Select.Option value="panelboard">Panelboard</Select.Option>
                                </Select>
                              </div>
                            </Panel>

                            <Panel header="Cooling Architecture" key="3">
                              <div style={{ marginBottom: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Cooling Type</Text>
                                <Select value={romCooling} onChange={setRomCooling} style={{ width: '100%' }}>
                                  <Select.Option value="crac_perimeter">CRAC (Perimeter DX)</Select.Option>
                                  <Select.Option value="crah_perimeter">CRAH (Perimeter Chilled Water)</Select.Option>
                                  <Select.Option value="in_row">In-Row Cooling</Select.Option>
                                  <Select.Option value="rear_door_hx">Rear Door Heat Exchanger</Select.Option>
                                  <Select.Option value="chilled_water">Chilled Water Plant</Select.Option>
                                  <Select.Option value="direct_liquid">Direct Liquid Cooling (DLC)</Select.Option>
                                  <Select.Option value="indirect_evap">Indirect Air Evaporative</Select.Option>
                                </Select>
                              </div>
                              <div style={{ marginBottom: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Containment</Text>
                                <Radio.Group value={romContainment} onChange={(e) => setRomContainment(e.target.value)}>
                                  <Radio.Button value="none">None</Radio.Button>
                                  <Radio.Button value="cold_aisle">Cold Aisle</Radio.Button>
                                  <Radio.Button value="hot_aisle">Hot Aisle</Radio.Button>
                                </Radio.Group>
                              </div>
                              <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Economizer</Text>
                                <AntSwitch checked={romEconomizer} onChange={setRomEconomizer} />
                              </div>
                            </Panel>

                            <Panel header="Site & Building" key="4">
                              <div style={{ marginBottom: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Building Type</Text>
                                <Select value={romBuilding} onChange={setRomBuilding} style={{ width: '100%' }}>
                                  <Select.Option value="new_build">Purpose-Built (New)</Select.Option>
                                  <Select.Option value="retrofit">Existing Retrofit</Select.Option>
                                  <Select.Option value="prefab_modular">Prefabricated / Modular</Select.Option>
                                  <Select.Option value="shell_only">Shell & Core Only</Select.Option>
                                </Select>
                              </div>
                              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                                <div>
                                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Core & Shell Included</Text>
                                  <AntSwitch checked={romCoreShell} onChange={setRomCoreShell} />
                                </div>
                                <div>
                                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Raised Floor</Text>
                                  <AntSwitch checked={romRaisedFloor} onChange={setRomRaisedFloor} />
                                </div>
                                <div>
                                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Dropped Ceiling</Text>
                                  <AntSwitch checked={romDroppedCeiling} onChange={setRomDroppedCeiling} />
                                </div>
                              </div>
                              <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Seismic Zone</Text>
                                <Radio.Group value={romSeismic} onChange={(e) => setRomSeismic(e.target.value)}>
                                  <Radio.Button value="low">Low</Radio.Button>
                                  <Radio.Button value="moderate">Moderate</Radio.Button>
                                  <Radio.Button value="high">High</Radio.Button>
                                </Radio.Group>
                              </div>
                            </Panel>

                            <Panel header="Regional Settings" key="5">
                              <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Currency</Text>
                                <Select value={romCurrency} onChange={setRomCurrency} style={{ width: '100%' }}>
                                  <Select.Option value="usd">USD ($)</Select.Option>
                                  <Select.Option value="eur">EUR (€)</Select.Option>
                                  <Select.Option value="gbp">GBP (£)</Select.Option>
                                  <Select.Option value="sgd">SGD (S$)</Select.Option>
                                </Select>
                              </div>
                            </Panel>
                          </Collapse>
                        </Card>
                      </Col>

                      <Col xs={24} lg={14}>
                        <Card style={{ ...glassStyle, height: '100%' }} title="ROM Results Dashboard">
                          <div style={{ padding: 16, marginBottom: 24, background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.3)', textAlign: 'center' }}>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Rough Order of Magnitude (±20%)</Text>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 14, color: token.colorTextSecondary }}>{fmtCurr(romLow)}</Text>
                              <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366f1' }}>{fmtCurr(grandTotal)}</Text>
                              <Text style={{ fontSize: 14, color: token.colorTextSecondary }}>{fmtCurr(romHigh)}</Text>
                            </div>
                          </div>

                          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                            <Col xs={24} md={12} xl={8}>
                              <div style={{ padding: 12, background: 'rgba(82,196,26,0.1)', borderRadius: 12, border: '1px solid rgba(82,196,26,0.3)' }}>
                                <Statistic title="Cost per Watt" value={costPerWatt} precision={2} prefix={currInfo.symbol} suffix="/W" valueStyle={{ color: '#52c41a', fontWeight: 'bold' }} />
                              </div>
                            </Col>
                            <Col xs={24} md={12} xl={8}>
                              <div style={{ padding: 12, background: 'rgba(24,144,255,0.1)', borderRadius: 12, border: '1px solid rgba(24,144,255,0.3)' }}>
                                <Statistic title="Cost per kW" value={costPerKwRom} precision={0} prefix={currInfo.symbol} suffix="/kW" valueStyle={{ color: '#1890ff', fontWeight: 'bold' }} />
                              </div>
                            </Col>
                            <Col xs={24} md={12} xl={8}>
                              <div style={{ padding: 12, background: 'rgba(245,158,11,0.1)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)' }}>
                                <Statistic title="Cost per Rack" value={costPerRack} precision={0} prefix={currInfo.symbol} suffix="/Rack" valueStyle={{ color: '#f59e0b', fontWeight: 'bold' }} />
                              </div>
                            </Col>
                            <Col xs={24} md={12} xl={8}>
                              <div style={{ padding: 12, background: 'rgba(139,92,246,0.1)', borderRadius: 12, border: '1px solid rgba(139,92,246,0.3)' }}>
                                <Statistic title="Cost per sqft" value={costPerSqft} precision={0} prefix={currInfo.symbol} suffix="/sqft" valueStyle={{ color: '#8b5cf6', fontWeight: 'bold' }} />
                              </div>
                            </Col>
                            <Col xs={24} md={12} xl={8}>
                              <div style={{ padding: 12, background: 'rgba(6,182,212,0.1)', borderRadius: 12, border: '1px solid rgba(6,182,212,0.3)' }}>
                                <Statistic title="Total IT Load" value={romItLoad} suffix="kW" valueStyle={{ color: '#06b6d4', fontWeight: 'bold' }} />
                              </div>
                            </Col>
                            <Col xs={24} md={12} xl={8}>
                              <div style={{ padding: 12, background: 'rgba(236,72,153,0.1)', borderRadius: 12, border: '1px solid rgba(236,72,153,0.3)' }}>
                                <Statistic title="Total Floor Space" value={totalSqft} suffix="sqft" valueStyle={{ color: '#ec4899', fontWeight: 'bold' }} />
                              </div>
                            </Col>
                          </Row>

                          <Title level={5}>Cost Breakdown by Category</Title>
                          <div style={{ height: 300, marginBottom: 24 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stackedData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={(val) => `${currInfo.symbol}${(val / 1000000).toFixed(1)}M`} />
                                <YAxis dataKey="category" type="category" width={130} />
                                <RechartsTooltip formatter={(val: number) => fmtCurr(val)} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                  {stackedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <Title level={5}>Equipment Detail</Title>
                          <Row gutter={24}>
                            <Col span={24}>
                              <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={equipmentBreakdown.filter(e => e.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                                      {equipmentBreakdown.filter(e => e.value > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(val: number) => fmtCurr(val)} />
                                    <Legend layout="horizontal" verticalAlign="bottom" />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </Col>
                            <Col span={24}>
                              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                                {equipmentBreakdown.filter(e => e.value > 0).map((item) => (
                                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                                      <Text>{item.name}</Text>
                                    </div>
                                    <Text strong>{fmtCurr(item.value)}</Text>
                                  </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 4 }}>
                                  <Text strong>Total Equipment</Text>
                                  <Text strong style={{ color: '#6366f1' }}>{fmtCurr(totalEquipment)}</Text>
                                </div>
                              </div>
                            </Col>
                          </Row>

                          <Divider />

                          <Title level={5}>Sensitivity: Cooling Architecture</Title>
                          <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={coolingSensitivity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(val) => `${currInfo.symbol}${(val / 1000000).toFixed(1)}M`} />
                                <RechartsTooltip formatter={(val: number, name: string) => name === 'total' ? fmtCurr(val as number) : `${currInfo.symbol}${val}/W`} />
                                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                                  {coolingSensitivity.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#6366f1' : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <Card size="small" style={{ marginTop: 16, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 12 }}>
                            <Table
                              pagination={false}
                              size="small"
                              dataSource={[
                                { key: '1', item: 'Equipment (Power, Cooling, Racks, Safety)', cost: fmtCurr(totalEquipment), pct: `${((totalEquipment / grandTotal) * 100).toFixed(1)}%` },
                                { key: '2', item: 'Design & Installation', cost: fmtCurr(totalDesignInstall), pct: `${((totalDesignInstall / grandTotal) * 100).toFixed(1)}%` },
                                { key: '3', item: 'Space & Building', cost: fmtCurr(totalBuilding), pct: `${((totalBuilding / grandTotal) * 100).toFixed(1)}%` },
                              ]}
                              columns={[
                                { title: 'Cost Category', dataIndex: 'item', key: 'item' },
                                { title: 'Estimated Cost', dataIndex: 'cost', key: 'cost', align: 'right' as const },
                                { title: '% of Total', dataIndex: 'pct', key: 'pct', align: 'right' as const },
                              ]}
                              summary={() => (
                                <Table.Summary.Row style={{ background: isDark ? '#1f1f1f' : '#fafafa', fontWeight: 'bold' }}>
                                  <Table.Summary.Cell index={0}>ROM TOTAL</Table.Summary.Cell>
                                  <Table.Summary.Cell index={1} align="right"><span style={{ color: '#6366f1', fontSize: 16 }}>{fmtCurr(grandTotal)}</span></Table.Summary.Cell>
                                  <Table.Summary.Cell index={2} align="right">100%</Table.Summary.Cell>
                                </Table.Summary.Row>
                              )}
                            />
                            <div style={{ marginTop: 12, padding: '8px 12px', background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                <InfoCircleOutlined style={{ marginRight: 6 }} />
                                ROM estimates are ±20% accurate, based on industry-standard $/watt methodology derived from equipment supplier quotes and construction cost data. Actual costs vary by location, vendor, and project specifics.
                              </Text>
                            </div>
                          </Card>
                        </Card>
                      </Col>
                    </Row>
                  </>
                );
              })()}
            </motion.div>
          )}
          {activeTab === 'OpEx' && (
            <OpExCalculator isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Carbon & PUE' && (
            <CarbonSustain isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Capacity Plan' && (
            <CapacityPlanning isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Downtime Cost' && (
            <DowntimeCost isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Migration' && (
            <MigrationCost isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Power Chain' && (
            <PowerChainDiagram isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'PUE Calculator' && (
            <PueCalculator isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Power Sizing' && (
            <PowerSizing isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Cooling' && (
            <CoolingCalculator isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Battery & UPS' && (
            <BatteryCalculator isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'Network & Connectivity' && (
            <NetworkCalculator isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'SLA & Availability' && (
            <SlaCalculator isDark={isDark} token={token} glassStyle={glassStyle} />
          )}

          {activeTab === 'DCIM Value' && (
            <DcimCalculator isDark={isDark} token={token} glassStyle={glassStyle} />
          )}
        </AnimatePresence>

        </div> {/* end content area */}
      </div> {/* end flex row (sidebar + content) */}

        <Modal
          title="Save CapEx Scenario"
          open={isModalOpen}
          onOk={saveScenario}
          onCancel={() => setIsModalOpen(false)}
          okText="Save"
        >
          <div style={{ padding: '24px 0' }}>
            <Text strong>Scenario Name:</Text>
            <Input 
              placeholder="e.g., London Hub - Phase 1" 
              value={scenarioName} 
              onChange={e => setScenarioName(e.target.value)} 
              style={{ marginTop: 8 }}
            />
          </div>
        </Modal>
    </CMSLayout>
  );
}
