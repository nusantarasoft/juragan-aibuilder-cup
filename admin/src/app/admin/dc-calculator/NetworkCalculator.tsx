'use client';

import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Typography, Slider, InputNumber, Select, Collapse, Tooltip, Statistic, Tag, Table, Progress } from 'antd';
import { InfoCircleOutlined, ApiOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface Props {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

export function NetworkCalculator({ isDark, token, glassStyle }: Props) {
  // 1. Port density
  const [totalRacks, setTotalRacks] = useState<number>(100);
  const [portsPerRack, setPortsPerRack] = useState<number>(48);
  const [architecture, setArchitecture] = useState<string>('ToR');

  // 2. Bandwidth capacity planning
  const [currentBandwidth, setCurrentBandwidth] = useState<number>(100);
  const [monthlyGrowthPct, setMonthlyGrowthPct] = useState<number>(5);
  const [maxCapacity, setMaxCapacity] = useState<number>(1000);
  const [planningMonths, setPlanningMonths] = useState<number>(36);

  // 3. Cross-connect & circuit cost
  const [numCrossConnects, setNumCrossConnects] = useState<number>(10);
  const [costPerCrossConnect, setCostPerCrossConnect] = useState<number>(300);
  const [numCircuits, setNumCircuits] = useState<number>(2);
  const [circuitCostPerMonth, setCircuitCostPerMonth] = useState<number>(5000);

  // 4. Latency budget calculator
  const [fiberDistanceKm, setFiberDistanceKm] = useState<number>(50);
  const [switchHops, setSwitchHops] = useState<number>(3);
  const [processingLatencyUs, setProcessingLatencyUs] = useState<number>(50);

  // 5. Cable pathway fill calculator
  const [trayWidthMm, setTrayWidthMm] = useState<number>(300);
  const [cablesPerRack, setCablesPerRack] = useState<number>(6);
  const [cableDiameterMm, setCableDiameterMm] = useState<number>(7);

  // 6. Dark fiber vs lit services TCO
  const dfInitial = 15000;
  const dfMonthly = 500;
  const dfMaint = 100;
  const litInitial = 0;
  const litMonthly = 3000;

  // 7. Network redundancy cost
  const [redundancy, setRedundancy] = useState<string>('Dual Diverse');

  const chartTextColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.65)';
  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96'];

  // --- Calculations ---

  // 1. Port density
  const portData = useMemo(() => {
    const totalPorts = totalRacks * portsPerRack;
    let switchesNeeded = 0;
    if (architecture === 'ToR') {
      switchesNeeded = totalRacks;
    } else if (architecture === 'EoR') {
      switchesNeeded = Math.ceil(totalPorts / 48); // Assuming 48 port switches for EoR
    } else if (architecture === 'Spine-Leaf') {
      switchesNeeded = totalRacks + 2; // Rough estimate: 1 leaf per rack + 2 spines minimum
    }
    const uplinkPorts = switchesNeeded * 4;
    return { totalPorts, switchesNeeded, uplinkPorts };
  }, [totalRacks, portsPerRack, architecture]);

  // 2. Bandwidth projection
  const bandwidthData = useMemo(() => {
    let data = [];
    let current = currentBandwidth;
    let runway = -1;
    for (let i = 0; i <= planningMonths; i++) {
      data.push({
        month: i,
        bandwidth: Math.round(current * 100) / 100,
        max: maxCapacity
      });
      if (current >= maxCapacity && runway === -1) {
        runway = i;
      }
      current = current * (1 + monthlyGrowthPct / 100);
    }
    return { data, runway };
  }, [currentBandwidth, monthlyGrowthPct, maxCapacity, planningMonths]);

  // 7. Network redundancy multiplier
  const redundancyMultiplier = useMemo(() => {
    if (redundancy === 'Single Path') return 1;
    if (redundancy === 'Dual Diverse') return 2.2;
    if (redundancy === 'Ring') return 1.8;
    return 1;
  }, [redundancy]);

  const availabilityImprovement = useMemo(() => {
    if (redundancy === 'Single Path') return '99.9%';
    if (redundancy === 'Dual Diverse') return '99.999%';
    if (redundancy === 'Ring') return '99.99%';
    return '99.9%';
  }, [redundancy]);

  // 3. Costs
  const costData = useMemo(() => {
    const ccMonthly = numCrossConnects * costPerCrossConnect;
    const circMonthly = numCircuits * circuitCostPerMonth * redundancyMultiplier;
    const monthlyCost = ccMonthly + circMonthly;
    const annualCost = monthlyCost * 12;
    const tco3yr = annualCost * 3;
    
    const breakdown = [
      { name: 'Cross Connects', value: ccMonthly },
      { name: 'Circuits', value: circMonthly }
    ];

    return { monthlyCost, annualCost, tco3yr, breakdown, ccMonthly, circMonthly };
  }, [numCrossConnects, costPerCrossConnect, numCircuits, circuitCostPerMonth, redundancyMultiplier]);

  // 4. Latency
  const latencyData = useMemo(() => {
    const fiberLatency = fiberDistanceKm * 4.9;
    const switchLatency = switchHops * 5;
    const totalLatency = fiberLatency + switchLatency + processingLatencyUs;
    
    let grade = 'Poor';
    let gradeColor = 'red';
    const totalMs = totalLatency / 1000; // convert µs to ms
    
    if (totalMs < 1) {
      grade = 'Excellent';
      gradeColor = 'green';
    } else if (totalMs < 5) {
      grade = 'Good';
      gradeColor = 'lime';
    } else if (totalMs < 10) {
      grade = 'Acceptable';
      gradeColor = 'orange';
    }

    const data = [
      { name: 'Latency (µs)', Fiber: fiberLatency, Switch: switchLatency, Processing: processingLatencyUs }
    ];

    return { totalLatency, grade, gradeColor, data, totalMs };
  }, [fiberDistanceKm, switchHops, processingLatencyUs]);

  // 5. Cable Fill
  const fillData = useMemo(() => {
    const totalCables = totalRacks * cablesPerRack;
    const radiusMm = cableDiameterMm / 2;
    const singleArea = Math.PI * (radiusMm * radiusMm);
    const totalCableArea = singleArea * totalCables;
    
    const trayDepthMm = 100; // assumed
    const singleTrayArea = trayWidthMm * trayDepthMm;
    const maxSignalArea = singleTrayArea * 0.50; // 50% signal fill NEC
    
    const traysNeeded = Math.ceil(totalCableArea / maxSignalArea);
    
    const actualTrayArea = traysNeeded > 0 ? (singleTrayArea * traysNeeded) : singleTrayArea;
    const fillPct = (totalCableArea / actualTrayArea) * 100;

    return { totalCables, fillPct, traysNeeded };
  }, [totalRacks, cablesPerRack, cableDiameterMm, trayWidthMm]);

  // 6. Dark Fiber vs Lit Services
  const dfLitData = useMemo(() => {
    let data = [];
    let breakEven = -1;
    for (let month = 0; month <= 60; month++) {
      const dfCost = dfInitial + ((dfMonthly + dfMaint) * month);
      const litCost = litInitial + (litMonthly * month);
      data.push({
        month,
        'Dark Fiber': dfCost,
        'Lit Services': litCost
      });
      if (litCost >= dfCost && breakEven === -1 && month > 0) {
        breakEven = month;
      }
    }
    
    const df5yr = dfInitial + ((dfMonthly + dfMaint) * 60);
    const lit5yr = litInitial + (litMonthly * 60);
    
    return { data, breakEven, df5yr, lit5yr };
  }, [dfInitial, dfMonthly, dfMaint, litInitial, litMonthly]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Row gutter={[24, 24]}>
        {/* INPUTS COLUMN */}
        <Col xs={24} lg={8}>
          <Collapse defaultActiveKey={['1', '2']} style={glassStyle} className={isDark ? 'ant-collapse-dark' : ''}>
            <Panel header="Port Density & Architecture" key="1">
              <Row gutter={[8, 16]}>
                <Col span={24}>
                  <Text>Total Racks</Text>
                  <Slider min={1} max={2000} value={totalRacks} onChange={setTotalRacks} />
                  <InputNumber min={1} max={2000} value={totalRacks} onChange={(v) => setTotalRacks(v || 100)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Ports per Rack</Text>
                  <Select value={portsPerRack} onChange={setPortsPerRack} style={{ width: '100%' }}>
                    <Select.Option value={24}>24 Ports</Select.Option>
                    <Select.Option value={48}>48 Ports</Select.Option>
                    <Select.Option value={96}>96 Ports</Select.Option>
                  </Select>
                </Col>
                <Col span={24}>
                  <Text>Architecture</Text>
                  <Select value={architecture} onChange={setArchitecture} style={{ width: '100%' }}>
                    <Select.Option value="ToR">Top of Rack (ToR)</Select.Option>
                    <Select.Option value="EoR">End of Row (EoR)</Select.Option>
                    <Select.Option value="Spine-Leaf">Spine-Leaf</Select.Option>
                  </Select>
                </Col>
              </Row>
            </Panel>

            <Panel header="Bandwidth Capacity Planning" key="2">
              <Row gutter={[8, 16]}>
                <Col span={24}>
                  <Text>Current Bandwidth (Gbps)</Text>
                  <InputNumber min={1} value={currentBandwidth} onChange={(v) => setCurrentBandwidth(v || 100)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Monthly Growth (%)</Text>
                  <InputNumber min={0} max={100} value={monthlyGrowthPct} onChange={(v) => setMonthlyGrowthPct(v || 5)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Max Capacity (Gbps)</Text>
                  <InputNumber min={10} value={maxCapacity} onChange={(v) => setMaxCapacity(v || 1000)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Planning Months</Text>
                  <Slider min={6} max={120} value={planningMonths} onChange={setPlanningMonths} />
                </Col>
              </Row>
            </Panel>

            <Panel header="Costs & Circuits" key="3">
              <Row gutter={[8, 16]}>
                <Col span={24}>
                  <Text>Cross Connects</Text>
                  <InputNumber min={0} value={numCrossConnects} onChange={(v) => setNumCrossConnects(v || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Cross Connect Cost ($/mo)</Text>
                  <InputNumber min={0} value={costPerCrossConnect} onChange={(v) => setCostPerCrossConnect(v || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Number of Circuits</Text>
                  <InputNumber min={0} value={numCircuits} onChange={(v) => setNumCircuits(v || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Circuit Cost ($/mo)</Text>
                  <InputNumber min={0} value={circuitCostPerMonth} onChange={(v) => setCircuitCostPerMonth(v || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Redundancy Level</Text>
                  <Select value={redundancy} onChange={setRedundancy} style={{ width: '100%' }}>
                    <Select.Option value="Single Path">Single Path (1x cost)</Select.Option>
                    <Select.Option value="Ring">Ring (1.8x cost)</Select.Option>
                    <Select.Option value="Dual Diverse">Dual Diverse (2.2x cost)</Select.Option>
                  </Select>
                </Col>
              </Row>
            </Panel>

            <Panel header="Latency & Cabling" key="4">
              <Row gutter={[8, 16]}>
                <Col span={24}>
                  <Text>Fiber Distance (km)</Text>
                  <InputNumber min={0} value={fiberDistanceKm} onChange={(v) => setFiberDistanceKm(v || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Switch Hops</Text>
                  <InputNumber min={0} value={switchHops} onChange={(v) => setSwitchHops(v || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Processing Latency (µs)</Text>
                  <InputNumber min={0} value={processingLatencyUs} onChange={(v) => setProcessingLatencyUs(v || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Tray Width (mm)</Text>
                  <Select value={trayWidthMm} onChange={setTrayWidthMm} style={{ width: '100%' }}>
                    <Select.Option value={150}>150mm</Select.Option>
                    <Select.Option value={300}>300mm</Select.Option>
                    <Select.Option value={450}>450mm</Select.Option>
                    <Select.Option value={600}>600mm</Select.Option>
                  </Select>
                </Col>
                <Col span={24}>
                  <Text>Cables per Rack</Text>
                  <InputNumber min={1} value={cablesPerRack} onChange={(v) => setCablesPerRack(v || 1)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Cable Diameter (mm)</Text>
                  <InputNumber min={1} value={cableDiameterMm} onChange={(v) => setCableDiameterMm(v || 1)} style={{ width: '100%' }} />
                </Col>
              </Row>
            </Panel>
          </Collapse>
        </Col>

        {/* RESULTS COLUMN */}
        <Col xs={24} lg={16}>
          <Row gutter={[16, 16]}>
            {/* Port & Architecture Stats */}
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Total Ports" value={portData.totalPorts} prefix={<ApiOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Switches Needed" value={portData.switchesNeeded} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Uplink Ports" value={portData.uplinkPorts} />
              </Card>
            </Col>

            {/* Bandwidth Chart */}
            <Col span={24}>
              <Card style={glassStyle} bordered={false} title="Bandwidth Capacity Planning">
                {bandwidthData.runway !== -1 ? (
                  <Tag color="error" style={{ marginBottom: 16 }}>Capacity hit in {bandwidthData.runway} months</Tag>
                ) : (
                  <Tag color="success" style={{ marginBottom: 16 }}>Sufficient capacity for {planningMonths} months</Tag>
                )}
                <div style={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer>
                    <AreaChart data={bandwidthData.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBandwidth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                      <XAxis dataKey="month" stroke={chartTextColor} />
                      <YAxis stroke={chartTextColor} />
                      <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#141414' : '#fff', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="bandwidth" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorBandwidth)" name="Projected Bandwidth (Gbps)" />
                      <Line type="step" dataKey="max" stroke={COLORS[3]} strokeWidth={2} dot={false} name="Max Capacity" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            {/* Costs & Latency */}
            <Col xs={24} lg={12}>
              <Card style={glassStyle} bordered={false} title="Monthly Connectivity Cost">
                <Statistic title="Redundancy Level" value={redundancy} valueStyle={{ fontSize: 16 }} suffix={`(Avail: ${availabilityImprovement})`} style={{ marginBottom: 16 }} />
                <div style={{ height: 250 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={costData.breakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {costData.breakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Title level={4} style={{ textAlign: 'center', marginTop: 16 }}>
                  Total: ${costData.monthlyCost.toLocaleString()}/mo
                </Title>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card style={glassStyle} bordered={false} title="Latency Budget">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Statistic title="Total Latency" value={latencyData.totalMs} precision={2} suffix="ms" />
                  <div>
                    <Text type="secondary">Grade</Text><br/>
                    <Tag color={latencyData.gradeColor} style={{ marginTop: 4 }}>{latencyData.grade}</Tag>
                  </div>
                </div>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={latencyData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                      <XAxis type="number" stroke={chartTextColor} />
                      <YAxis dataKey="name" type="category" stroke={chartTextColor} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="Fiber" stackId="a" fill={COLORS[0]} />
                      <Bar dataKey="Switch" stackId="a" fill={COLORS[1]} />
                      <Bar dataKey="Processing" stackId="a" fill={COLORS[2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            {/* Cable Fill & TCO */}
            <Col xs={24} lg={12}>
              <Card style={glassStyle} bordered={false} title="Cable Pathway Fill (NEC 392)">
                <Statistic title="Trays Needed" value={fillData.traysNeeded} suffix={`x ${trayWidthMm}mm`} />
                <div style={{ marginTop: 24 }}>
                  <Text>Tray Fill Capacity (Max 50% for signal)</Text>
                  <Progress percent={Math.round(fillData.fillPct)} status={fillData.fillPct > 50 ? 'exception' : 'active'} />
                </div>
                <Paragraph style={{ marginTop: 16 }} type="secondary">
                  Based on {fillData.totalCables} cables at {cableDiameterMm}mm diameter.
                </Paragraph>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card style={glassStyle} bordered={false} title="Dark Fiber vs Lit Services (5yr TCO)">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Dark Fiber 5yr: <b>${dfLitData.df5yr.toLocaleString()}</b></Text>
                  <Text>Lit Services 5yr: <b>${dfLitData.lit5yr.toLocaleString()}</b></Text>
                </div>
                {dfLitData.breakEven !== -1 && (
                  <Tag color="processing" style={{ marginBottom: 16 }}>Break-even at month {dfLitData.breakEven}</Tag>
                )}
                <div style={{ height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={dfLitData.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                      <XAxis dataKey="month" stroke={chartTextColor} />
                      <YAxis stroke={chartTextColor} hide />
                      <RechartsTooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="Dark Fiber" stroke={COLORS[0]} dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="Lit Services" stroke={COLORS[3]} dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

          </Row>
        </Col>
      </Row>
    </motion.div>
  );
}
