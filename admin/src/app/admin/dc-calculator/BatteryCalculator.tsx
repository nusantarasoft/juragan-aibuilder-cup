'use client'

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Slider, InputNumber, Select, Collapse, Statistic } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { motion } from 'framer-motion';

const { Text } = Typography;
const { Panel } = Collapse;

interface Props {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

export function BatteryCalculator({ isDark, token, glassStyle }: Props) {
  // 1. TCO Comparison Inputs
  const [itLoadKw, setItLoadKw] = useState<number>(500);
  const [runtimeMinutes, setRuntimeMinutes] = useState<number>(10);
  const [analysisPeriod, setAnalysisPeriod] = useState<number>(10);

  // 2. Battery string sizing Inputs
  const [systemVoltage, setSystemVoltage] = useState<number>(480);
  const [vrlaCellVoltage] = useState<number>(2.0);
  const [liIonCellVoltage] = useState<number>(3.7);
  
  // 5. Temperature derating Inputs
  const [ambientTemp, setAmbientTemp] = useState<number>(25);

  // 6. Battery monitoring ROI Inputs
  const [monitoringCostPerCell, setMonitoringCostPerCell] = useState<number>(15);
  const [predictedFailureReduction, setPredictedFailureReduction] = useState<number>(40);

  // Calculations
  const batterySizeKwh = itLoadKw * (runtimeMinutes / 60);
  const vrlaCostPerKwh = 150;
  const liIonCostPerKwh = 350;

  // TCO Calculations
  const vrlaReplacements = Math.floor(analysisPeriod / 5);
  const liIonReplacements = Math.floor(analysisPeriod / 15);

  const vrlaInitialCost = batterySizeKwh * vrlaCostPerKwh;
  const liIonInitialCost = batterySizeKwh * liIonCostPerKwh;

  const vrlaReplacementCost = vrlaReplacements * vrlaInitialCost;
  const liIonReplacementCost = liIonReplacements * liIonInitialCost;

  const vrlaTco = vrlaInitialCost + vrlaReplacementCost;
  const liIonTco = liIonInitialCost + liIonReplacementCost;

  const tcoData = [
    { name: 'Initial Cost', VRLA: vrlaInitialCost, 'Li-ion': liIonInitialCost },
    { name: 'Replacement Cost', VRLA: vrlaReplacementCost, 'Li-ion': liIonReplacementCost },
    { name: 'Total TCO', VRLA: vrlaTco, 'Li-ion': liIonTco }
  ];

  // String Sizing Calculations
  const vrlaCells = Math.ceil(systemVoltage / vrlaCellVoltage);
  const liIonCells = Math.ceil(systemVoltage / liIonCellVoltage);

  // Replacement Cycle Data
  const cycleData = Array.from({ length: analysisPeriod + 1 }, (_, i) => {
    let vrlaCumCost = vrlaInitialCost + Math.floor(i / 5) * vrlaInitialCost;
    let liIonCumCost = liIonInitialCost + Math.floor(i / 15) * liIonInitialCost;
    return { year: i, VRLA: vrlaCumCost, 'Li-ion': liIonCumCost };
  });

  // Weight and Footprint
  const vrlaWeight = batterySizeKwh * 30; // 30kg/kWh
  const liIonWeight = batterySizeKwh * 8; // 8kg/kWh
  const vrlaFootprint = batterySizeKwh * 0.05; // 0.05m2/kWh
  const liIonFootprint = batterySizeKwh * 0.015; // 0.015m2/kWh

  const physicalData = [
    { name: 'Weight (kg)', VRLA: vrlaWeight, 'Li-ion': liIonWeight },
    { name: 'Footprint (m²)', VRLA: vrlaFootprint * 1000, 'Li-ion': liIonFootprint * 1000 } // scaled up footprint slightly for visual comparison 
  ];

  // Temperature Derating
  const tempData = Array.from({ length: 31 }, (_, i) => {
    const temp = 15 + i;
    const vrlaLifeMult = temp > 25 ? Math.pow(0.5, (temp - 25) / 10) : 1;
    const liIonCap = temp > 25 ? Math.max(0, 100 - (temp - 25) * 2) : 100;
    return { temp, 'VRLA Life %': vrlaLifeMult * 100, 'Li-ion Capacity %': liIonCap };
  });

  // Monitoring ROI
  const totalCells = vrlaCells * 40; // Approx total cells for 500kW runtime
  const totalMonitoringCost = totalCells * monitoringCostPerCell;
  const avoidedCost = vrlaReplacementCost * (predictedFailureReduction / 100);
  const paybackMonths = avoidedCost > 0 ? (totalMonitoringCost / avoidedCost) * 12 * analysisPeriod : 0;

  // Recycling Cost
  const vrlaRecycling = vrlaWeight * 0.15;
  const liIonRecycling = liIonWeight * 1.50;

  const chartColors = {
    vrla: token.colorWarning || '#faad14',
    liIon: token.colorPrimary || '#1890ff',
    text: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Collapse defaultActiveKey={['1', '2', '3']} style={glassStyle}>
            <Panel header="TCO Parameters" key="1">
              <div style={{ marginBottom: 16 }}>
                <Text>IT Load (kW)</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={itLoadKw} onChange={(v) => setItLoadKw(v || 500)} min={10} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text>Runtime (Minutes): {runtimeMinutes}</Text>
                <Slider min={5} max={30} value={runtimeMinutes} onChange={setRuntimeMinutes} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text>Analysis Period</Text>
                <Select style={{ width: '100%', marginTop: 8 }} value={analysisPeriod} onChange={setAnalysisPeriod}>
                  <Select.Option value={10}>10 Years</Select.Option>
                  <Select.Option value={15}>15 Years</Select.Option>
                  <Select.Option value={20}>20 Years</Select.Option>
                </Select>
              </div>
            </Panel>
            
            <Panel header="System Specs & Strings" key="2">
              <div style={{ marginBottom: 16 }}>
                <Text>System Voltage</Text>
                <Select style={{ width: '100%', marginTop: 8 }} value={systemVoltage} onChange={setSystemVoltage}>
                  <Select.Option value={48}>48V</Select.Option>
                  <Select.Option value={240}>240V</Select.Option>
                  <Select.Option value={480}>480V</Select.Option>
                </Select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text>Ambient Temperature (°C): {ambientTemp}</Text>
                <Slider min={15} max={45} value={ambientTemp} onChange={setAmbientTemp} />
              </div>
            </Panel>
            
            <Panel header="Monitoring ROI" key="3">
              <div style={{ marginBottom: 16 }}>
                <Text>Cost per Cell ($)</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={monitoringCostPerCell} onChange={(v) => setMonitoringCostPerCell(v || 15)} min={1} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text>Failure Reduction (%)</Text>
                <Slider min={0} max={100} value={predictedFailureReduction} onChange={setPredictedFailureReduction} />
              </div>
            </Panel>
          </Collapse>
        </Col>

        <Col xs={24} lg={16}>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="Li-ion vs VRLA Total Cost of Ownership (TCO)" style={glassStyle} bordered={false}>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tcoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#ccc'} />
                      <XAxis dataKey="name" stroke={chartColors.text} />
                      <YAxis stroke={chartColors.text} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#141414' : '#fff', color: chartColors.text }} />
                      <Legend />
                      <Bar dataKey="VRLA" fill={chartColors.vrla} />
                      <Bar dataKey="Li-ion" fill={chartColors.liIon} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Replacement Cycle (Cumulative Cost)" style={{ ...glassStyle, height: '100%' }} bordered={false}>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cycleData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#ccc'} />
                      <XAxis dataKey="year" stroke={chartColors.text} />
                      <YAxis stroke={chartColors.text} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#141414' : '#fff', color: chartColors.text }} />
                      <Legend />
                      <Line type="stepAfter" dataKey="VRLA" stroke={chartColors.vrla} strokeWidth={2} dot={{r: 4}} />
                      <Line type="stepAfter" dataKey="Li-ion" stroke={chartColors.liIon} strokeWidth={2} dot={{r: 4}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Weight & Footprint Comparison" style={{ ...glassStyle, height: '100%' }} bordered={false}>
                 <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={physicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#ccc'} />
                      <XAxis type="number" stroke={chartColors.text} />
                      <YAxis dataKey="name" type="category" stroke={chartColors.text} width={100} />
                      <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#141414' : '#fff', color: chartColors.text }} />
                      <Legend />
                      <Bar dataKey="VRLA" fill={chartColors.vrla} />
                      <Bar dataKey="Li-ion" fill={chartColors.liIon} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            
            <Col span={24}>
              <Card title="Temperature Derating Effect" style={glassStyle} bordered={false}>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tempData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#ccc'} />
                      <XAxis dataKey="temp" stroke={chartColors.text} label={{ value: 'Temp (°C)', position: 'insideBottomRight', offset: -5, fill: chartColors.text }} />
                      <YAxis stroke={chartColors.text} />
                      <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#141414' : '#fff', color: chartColors.text }} />
                      <Legend />
                      <Line type="monotone" dataKey="VRLA Life %" stroke={chartColors.vrla} strokeWidth={2} />
                      <Line type="monotone" dataKey="Li-ion Capacity %" stroke={chartColors.liIon} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Total Cells (VRLA / Li-ion)" value={`${vrlaCells} / ${liIonCells}`} />
              </Card>
            </Col>
            
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Total Monitoring Cost" value={`$${totalMonitoringCost.toLocaleString()}`} />
                <Text type="secondary">Payback: {paybackMonths.toFixed(1)} months</Text>
              </Card>
            </Col>
            
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Recycling Cost (VRLA / Li-ion)" value={`$${vrlaRecycling.toLocaleString()} / $${liIonRecycling.toLocaleString()}`} />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </motion.div>
  );
}
