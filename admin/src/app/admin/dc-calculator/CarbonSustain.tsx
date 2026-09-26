import React, { useState } from 'react';
import {
  Card,
  Col,
  Row,
  InputNumber,
  Slider,
  Typography,
  Collapse,
  Select,
  Tag,
  Statistic,
  Progress,
  Space,
  Divider
} from 'antd';
import {
  EnvironmentOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  RiseOutlined
} from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';

const { Text, Title } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

export interface CarbonSustainProps {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

const gridPresets = [
  { label: 'US Average (400)', value: 400 },
  { label: 'EU Average (250)', value: 250 },
  { label: 'Nordic (25)', value: 25 },
  { label: 'Asia Average (550)', value: 550 },
  { label: 'India (700)', value: 700 },
  { label: 'Custom', value: 0 }
];

export const CarbonSustain: React.FC<CarbonSustainProps> = ({ isDark, token, glassStyle }) => {
  const [itLoad, setItLoad] = useState<number>(500);
  const [pue, setPue] = useState<number>(1.5);
  
  const [presetGrid, setPresetGrid] = useState<number>(400);
  const [customGrid, setCustomGrid] = useState<number>(400);
  const gridIntensity = presetGrid === 0 ? customGrid : presetGrid;

  const [renewablePct, setRenewablePct] = useState<number>(20);
  const [coolingType, setCoolingType] = useState<string>('air');
  const [carbonOffsetPrice, setCarbonOffsetPrice] = useState<number>(30);
  
  const [targetPue, setTargetPue] = useState<number>(1.2);
  const [targetRenewable, setTargetRenewable] = useState<number>(80);
  
  const [waterUsage, setWaterUsage] = useState<number>(1.8);

  const [genDieselLitersPerHour, setGenDieselLitersPerHour] = useState<number>(50);
  const [genRunHoursPerYear, setGenRunHoursPerYear] = useState<number>(100);
  const [refrigerantLeakRate, setRefrigerantLeakRate] = useState<number>(5);
  const [refrigerantGwp, setRefrigerantGwp] = useState<number>(1430);
  const [refrigerantCharge, setRefrigerantCharge] = useState<number>(500);

  const [embodiedCarbonPerMw, setEmbodiedCarbonPerMw] = useState<number>(1500);
  
  const [waterCostPerLiter, setWaterCostPerLiter] = useState<number>(0.003);

  const [baselineYear, setBaselineYear] = useState<number>(2020);
  const [baselineEmissions, setBaselineEmissions] = useState<number | null>(null);

  const formatCurrency = (val: number) => '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number, decimals: number = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(val);

  // Calculations
  const totalPowerMW = (itLoad * pue) / 1000;
  const annualEnergyMWh = totalPowerMW * 8760;
  const itEnergyMWh = (itLoad / 1000) * 8760;
  
  const gridEmissions = (annualEnergyMWh * 1000 * gridIntensity) / 1000000;
  const netEmissions = gridEmissions * (1 - renewablePct / 100);
  
  const scope1Diesel = genDieselLitersPerHour * genRunHoursPerYear * 2.68;
  const scope1Refrigerant = refrigerantCharge * (refrigerantLeakRate / 100) * refrigerantGwp / 1000;
  const totalScope1 = (scope1Diesel / 1000) + scope1Refrigerant;

  const totalScope3 = (itLoad / 1000) * embodiedCarbonPerMw;
  const scope3Annual = totalScope3 / 15;

  const totalScope1And2 = totalScope1 + netEmissions;
  const totalEmissions = totalScope1And2 + scope3Annual;

  const carbonOffsetCost = totalEmissions * carbonOffsetPrice;
  
  const WUE = waterUsage * (pue - 1);
  const annualWaterUsage = WUE * annualEnergyMWh * 1000;
  const annualWaterCost = annualWaterUsage * waterCostPerLiter;
  
  const targetTotalPowerMW = (itLoad * targetPue) / 1000;
  const targetAnnualEnergyMWh = targetTotalPowerMW * 8760;
  const targetGridEmissions = (targetAnnualEnergyMWh * 1000 * gridIntensity) / 1000000;
  const targetEmissions = targetGridEmissions * (1 - targetRenewable / 100);
  const emissionsReduction = totalEmissions - targetEmissions;

  const defaultBaselineEmissions = totalScope1And2 * 1.2;
  const actualBaselineEmissions = baselineEmissions ?? defaultBaselineEmissions;
  const currentYear = new Date().getFullYear();
  const yearsSinceBaseline = Math.max(0, currentYear - baselineYear);
  const requiredReductionPct = yearsSinceBaseline * 4.2;
  const requiredEmissions = actualBaselineEmissions * (1 - requiredReductionPct / 100);
  const isOnTrack = totalScope1And2 <= requiredEmissions;

  const cue = itEnergyMWh > 0 ? totalScope1And2 / itEnergyMWh : 0;

  const getCueRating = (val: number) => {
    if (val < 0.2) return 'A+';
    if (val < 0.5) return 'A';
    if (val < 1.0) return 'B';
    if (val < 1.5) return 'C';
    return 'D';
  };
  const cueRating = getCueRating(cue);

  const getEfficiencyRating = (val: number) => {
    if (val < 1.2) return 'A+';
    if (val < 1.4) return 'A';
    if (val < 1.6) return 'B';
    if (val < 1.8) return 'C';
    if (val < 2.0) return 'D';
    return 'F';
  };
  
  const getEfficiencyColor = (rating: string) => {
    switch(rating) {
      case 'A+': return '#52c41a';
      case 'A': return '#7cb305';
      case 'B': return '#d4b106';
      case 'C': return '#fa8c16';
      case 'D': return '#f5222d';
      default: return '#cf1322';
    }
  };

  const rating = getEfficiencyRating(pue);

  // Charts data
  const emissionsSourcesData = [
    { name: 'IT Load', value: (itLoad / 1000) * 8760 * 1000 * gridIntensity / 1000000 * (1 - renewablePct / 100) },
    { name: 'Cooling/Other', value: ((itLoad * (pue - 1)) / 1000) * 8760 * 1000 * gridIntensity / 1000000 * (1 - renewablePct / 100) },
    { name: 'Scope 1', value: totalScope1 },
    { name: 'Scope 3 (Ann.)', value: scope3Annual }
  ];

  const sensitivityData = [0, 25, 50, 75, 100].map(pct => ({
    name: `${pct}%`,
    Emissions: (gridEmissions * (1 - pct / 100)) + totalScope1 + scope3Annual
  }));

  const COLORS = ['#52c41a', '#faad14', '#1890ff', '#722ed1'];
  const textColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)';

  return (
    <motion.div key="carbon-sustain" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Collapse defaultActiveKey={['1', '2', '3', '4', '5']} style={glassStyle}>
            <Panel header="Energy Profile" key="1">
              <Row gutter={[8, 16]}>
                <Col span={24}>
                  <Text>IT Load (kW)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={100}
                    max={100000}
                    value={itLoad}
                    onChange={(val) => setItLoad(val || 500)}
                  />
                </Col>
                <Col span={24}>
                  <Text>PUE ({pue})</Text>
                  <Slider
                    min={1.1}
                    max={3.0}
                    step={0.01}
                    value={pue}
                    onChange={(val) => setPue(val)}
                  />
                </Col>
                <Col span={24}>
                  <Text>Grid Carbon Intensity</Text>
                  <Select
                    style={{ width: '100%', marginBottom: presetGrid === 0 ? 8 : 0 }}
                    value={presetGrid}
                    onChange={(val) => setPresetGrid(val)}
                  >
                    {gridPresets.map(preset => (
                      <Option key={preset.label} value={preset.value}>{preset.label}</Option>
                    ))}
                  </Select>
                  {presetGrid === 0 && (
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      addonAfter="gCO₂/kWh"
                      value={customGrid}
                      onChange={(val) => setCustomGrid(val || 0)}
                    />
                  )}
                </Col>
              </Row>
            </Panel>
            
            <Panel header="Carbon Metrics" key="2">
              <Row gutter={[8, 16]}>
                <Col span={24}>
                  <Text>Renewable Energy %</Text>
                  <Slider
                    min={0}
                    max={100}
                    value={renewablePct}
                    onChange={(val) => setRenewablePct(val)}
                  />
                </Col>
                <Col span={24}>
                  <Text>Carbon Offset Price ($/tonne)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    value={carbonOffsetPrice}
                    onChange={(val) => setCarbonOffsetPrice(val || 0)}
                  />
                </Col>
              </Row>
            </Panel>
            
            <Panel header="Sustainability Targets" key="3">
              <Row gutter={[8, 16]}>
                <Col span={24}>
                  <Text>Target PUE ({targetPue})</Text>
                  <Slider
                    min={1.0}
                    max={2.0}
                    step={0.01}
                    value={targetPue}
                    onChange={(val) => setTargetPue(val)}
                  />
                </Col>
                <Col span={24}>
                  <Text>Target Renewable %</Text>
                  <Slider
                    min={0}
                    max={100}
                    value={targetRenewable}
                    onChange={(val) => setTargetRenewable(val)}
                  />
                </Col>
              </Row>
            </Panel>
            
            <Panel header="Water Usage & Cooling" key="4">
              <Row gutter={[8, 16]}>
                <Col span={24}>
                  <Text>Cooling Type</Text>
                  <Select style={{ width: '100%' }} value={coolingType} onChange={(val) => setCoolingType(val)}>
                    <Option value="air">Air Cooling</Option>
                    <Option value="liquid">Liquid Cooling</Option>
                    <Option value="hybrid">Hybrid</Option>
                  </Select>
                </Col>
                <Col span={24}>
                  <Text>Base Water Usage (L/kWh)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={0.1}
                    value={waterUsage}
                    onChange={(val) => setWaterUsage(val || 1.8)}
                  />
                </Col>
                <Col span={24}>
                  <Text>Water Cost ($/L)</Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={0.05}
                    step={0.001}
                    value={waterCostPerLiter}
                    onChange={(val) => setWaterCostPerLiter(val || 0)}
                  />
                </Col>
              </Row>
            </Panel>
            
            <Panel header="Scope 1 — Direct Emissions" key="5">
              <Row gutter={[8, 16]}>
                <Col xs={24} lg={12}>
                  <Text>Gen Diesel (L/hr)</Text>
                  <InputNumber style={{ width: '100%' }} min={0} max={500} value={genDieselLitersPerHour} onChange={(v) => setGenDieselLitersPerHour(v || 0)} />
                </Col>
                <Col xs={24} lg={12}>
                  <Text>Gen Run (hrs/yr)</Text>
                  <InputNumber style={{ width: '100%' }} min={0} max={2000} value={genRunHoursPerYear} onChange={(v) => setGenRunHoursPerYear(v || 0)} />
                </Col>
                <Col span={24}>
                  <Text>Refrigerant GWP</Text>
                  <Select style={{ width: '100%' }} value={refrigerantGwp} onChange={(val) => setRefrigerantGwp(val)}>
                    <Option value={2088}>R-410A (2088)</Option>
                    <Option value={1430}>R-134a (1430)</Option>
                    <Option value={675}>R-32 (675)</Option>
                    <Option value={7}>R-1234ze (7)</Option>
                    <Option value={1}>CO2/R-744 (1)</Option>
                  </Select>
                </Col>
                <Col xs={24} lg={12}>
                  <Text>Ref Leak Rate (%)</Text>
                  <InputNumber style={{ width: '100%' }} min={0} max={25} value={refrigerantLeakRate} onChange={(v) => setRefrigerantLeakRate(v || 0)} />
                </Col>
                <Col xs={24} lg={12}>
                  <Text>Ref Charge (kg)</Text>
                  <InputNumber style={{ width: '100%' }} min={0} max={5000} value={refrigerantCharge} onChange={(v) => setRefrigerantCharge(v || 0)} />
                </Col>
                <Divider style={{ margin: '8px 0' }} />
                <Col span={24}>
                  <Text strong>Scope 3 Embodied Carbon</Text>
                </Col>
                <Col span={24}>
                  <Text>Embodied (tonnes/MW)</Text>
                  <InputNumber style={{ width: '100%' }} min={500} max={5000} value={embodiedCarbonPerMw} onChange={(v) => setEmbodiedCarbonPerMw(v || 0)} />
                </Col>
              </Row>
            </Panel>
          </Collapse>
        </Col>

        <Col xs={24} lg={14}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            
            <Card style={{ ...glassStyle, backgroundColor: isDark ? 'rgba(82, 196, 26, 0.1)' : 'rgba(82, 196, 26, 0.15)', borderColor: '#52c41a' }}>
              <Row align="middle" justify="space-between">
                <Col>
                  <Title level={3} style={{ color: '#52c41a', margin: 0 }}>
                    <EnvironmentOutlined style={{ marginRight: 8 }} />
                    Annual CO₂ Emissions
                  </Title>
                  <Text style={{ fontSize: 16 }}>{formatNumber(totalEmissions, 0)} Tonnes / Year</Text>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                  <Text type="secondary">Carbon Offset Cost</Text>
                  <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                    {formatCurrency(carbonOffsetCost)} / yr
                  </Title>
                </Col>
              </Row>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={12} sm={12} md={6}>
                <Card style={glassStyle} size="small">
                  <Statistic
                    title="PUE Rating"
                    value={pue.toFixed(2)}
                    prefix={<DashboardOutlined />}
                    valueStyle={{ color: token.colorText }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Card style={glassStyle} size="small">
                  <Statistic
                    title="CUE Rating"
                    value={cue.toFixed(2)}
                    suffix={cueRating}
                    prefix={<DashboardOutlined />}
                    valueStyle={{ color: getEfficiencyColor(cueRating) }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Card style={glassStyle} size="small">
                  <Statistic
                    title="PUE Grade"
                    value={rating}
                    valueStyle={{ color: getEfficiencyColor(rating), fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Card style={glassStyle} size="small">
                  <Statistic
                    title="Energy (MWh/yr)"
                    value={annualEnergyMWh}
                    formatter={(val) => formatNumber(val as number, 0)}
                    prefix={<ThunderboltOutlined />}
                    valueStyle={{ color: token.colorText, fontSize: 18 }}
                  />
                </Card>
              </Col>
            </Row>
            
            <Card style={glassStyle} title="PUE Goal Tracker">
              <Row align="middle" gutter={16}>
                <Col span={4} style={{ textAlign: 'center' }}>
                  <Text type="secondary">Current</Text><br/>
                  <Text strong>{pue.toFixed(2)}</Text>
                </Col>
                <Col span={16}>
                  <Progress 
                    percent={100} 
                    success={{ percent: (1.0 / pue) * 100, strokeColor: '#52c41a' }}
                    strokeColor="#faad14"
                    showInfo={false}
                  />
                </Col>
                <Col span={4} style={{ textAlign: 'center' }}>
                  <Text type="secondary">Ideal</Text><br/>
                  <Text strong>1.00</Text>
                </Col>
              </Row>
            </Card>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card style={glassStyle} title="Emissions Sources" size="small">
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={emissionsSourcesData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {emissionsSourcesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatNumber(value, 0) + ' Tonnes', 'Emissions']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card style={glassStyle} title="Renewable Sensitivity" size="small">
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sensitivityData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#ccc'} />
                        <XAxis dataKey="name" stroke={textColor} tick={{ fontSize: 12 }} />
                        <YAxis stroke={textColor} tick={{ fontSize: 12 }} tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'} />
                        <Tooltip formatter={(value: number) => [formatNumber(value, 0) + ' Tonnes', 'Emissions']} />
                        <Bar dataKey="Emissions" fill="#52c41a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
            </Row>

            <Card style={glassStyle}>
              <Row gutter={16}>
                <Col xs={24} lg={12}>
                  <Card size="small" type="inner" title="Current vs Target" headStyle={{ color: '#52c41a' }}>
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Text type="secondary">Current Emissions</Text>
                      <Text strong>{formatNumber(totalEmissions, 0)} t</Text>
                    </Row>
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Text type="secondary">Target Emissions</Text>
                      <Text strong style={{ color: '#52c41a' }}>{formatNumber(targetEmissions, 0)} t</Text>
                    </Row>
                    <Divider style={{ margin: '8px 0' }} />
                    <Row justify="space-between">
                      <Text strong>Potential Reduction</Text>
                      <Text strong style={{ color: '#52c41a' }}>
                        <RiseOutlined /> {formatNumber(emissionsReduction, 0)} t
                      </Text>
                    </Row>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card size="small" type="inner" title="Water & Resources" headStyle={{ color: '#1890ff' }}>
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Text type="secondary">Est. WUE</Text>
                      <Text strong>{WUE.toFixed(2)} L/kWh</Text>
                    </Row>
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Text type="secondary">Annual Water</Text>
                      <Text strong>{formatNumber(annualWaterUsage, 0)} L</Text>
                    </Row>
                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                      <Text type="secondary">Annual Water Cost</Text>
                      <Text strong>{formatCurrency(annualWaterCost)}</Text>
                    </Row>
                    <Divider style={{ margin: '8px 0' }} />
                    <Row justify="space-between">
                      <Text strong>Cooling Type</Text>
                      <Tag color="blue" style={{ margin: 0 }}>
                        {coolingType.toUpperCase()}
                      </Tag>
                    </Row>
                  </Card>
                </Col>
              </Row>
            </Card>

            <Card style={glassStyle} title="Science-Based Target (SBTi) 1.5°C Alignment">
              <Row align="middle" gutter={16}>
                <Col xs={24} lg={12}>
                  <Row justify="space-between" style={{ marginBottom: 8 }}>
                    <Text type="secondary">Baseline Year ({baselineYear})</Text>
                    <Text strong>{formatNumber(actualBaselineEmissions, 0)} t</Text>
                  </Row>
                  <Row justify="space-between" style={{ marginBottom: 8 }}>
                    <Text type="secondary">Required Target (4.2%/yr reduction)</Text>
                    <Text strong>{formatNumber(requiredEmissions, 0)} t</Text>
                  </Row>
                  <Row justify="space-between">
                    <Text type="secondary">Current Total (Scope 1+2)</Text>
                    <Text strong style={{ color: isOnTrack ? '#52c41a' : '#f5222d' }}>{formatNumber(totalScope1And2, 0)} t</Text>
                  </Row>
                </Col>
                <Col xs={24} lg={12} style={{ textAlign: 'center' }}>
                  <Statistic 
                    title="Trajectory Status"
                    value={isOnTrack ? "On Track" : "Off Track"}
                    valueStyle={{ color: isOnTrack ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary" style={{ marginRight: 8 }}>Baseline Inputs: </Text>
                    <InputNumber size="small" value={baselineYear} onChange={(v) => setBaselineYear(v || 2020)} style={{ width: 80, marginRight: 8 }} />
                    <InputNumber size="small" value={baselineEmissions ?? undefined} onChange={(v) => setBaselineEmissions(v)} placeholder="Default" style={{ width: 100 }} />
                  </div>
                </Col>
              </Row>
            </Card>

          </Space>
        </Col>
      </Row>
    </motion.div>
  );
};
