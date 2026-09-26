'use client';

import React, { useState, useMemo } from 'react';
import {
  Card, Row, Col, Typography, Slider, InputNumber, Select, Collapse,
  Tooltip, Statistic, Tag, Table, Progress
} from 'antd';
import { InfoCircleOutlined, ExperimentOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line,
  Area, AreaChart
} from 'recharts';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface Props {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

export function CoolingCalculator({ isDark, token, glassStyle }: Props) {
  // Inputs
  const [itLoadKw, setItLoadKw] = useState(500);
  const [pue, setPue] = useState(1.4);
  const [redundancy, setRedundancy] = useState('N+1');
  const [waterCostPerLiter, setWaterCostPerLiter] = useState(0.003);
  const [supplyTemp, setSupplyTemp] = useState(18);
  const [returnTemp, setReturnTemp] = useState(35);
  const [airflowCfm, setAirflowCfm] = useState(5000);
  const [climateZone, setClimateZone] = useState('Temperate');
  const [electricityRate, setElectricityRate] = useState(0.10);

  const climateZones: Record<string, number> = {
    'Tropical': 0,
    'Temperate': 0.3,
    'Cold': 0.55,
    'Subarctic': 0.75,
  };

  // Calculations
  const coolingLoadKw = itLoadKw * (pue - 1) + itLoadKw * 0.03;
  const coolingTons = (coolingLoadKw * 3412.14) / 12000;
  const coolingBtu = coolingLoadKw * 3412.14;

  const archTypes = [
    { name: 'DX', cop: 3.5, costPerTon: 1500, wue: 0 },
    { name: 'Chilled Water', cop: 5.0, costPerTon: 2500, wue: 1.8 },
    { name: 'Indirect Evap', cop: 12.0, costPerTon: 3000, wue: 2.5 },
    { name: 'Rear Door HX', cop: 6.0, costPerTon: 3500, wue: 0 },
    { name: 'Direct Liquid', cop: 15.0, costPerTon: 5000, wue: 0 },
  ];

  const archComparison = archTypes.map(arch => {
    const annualEnergy = (coolingLoadKw / arch.cop) * 8760;
    const annualCost = annualEnergy * electricityRate;
    const capex = coolingTons * arch.costPerTon;
    const annualWater = annualEnergy * arch.wue;
    return {
      name: arch.name,
      annualEnergy,
      annualCost,
      capex,
      annualWater,
      cop: arch.cop,
      wue: arch.wue
    };
  });

  const selectedArch = archComparison[1]; // default to Chilled Water for detailed stats

  const heatRemovalBtu = airflowCfm * 1.08 * (returnTemp - supplyTemp) * 1.8;
  const heatRemovalKw = heatRemovalBtu / 3412.14;

  const freePct = climateZones[climateZone];
  const freeCoolingHours = 8760 * freePct;
  const freeCoolingSavings = freeCoolingHours * (coolingLoadKw / selectedArch.cop) * electricityRate;

  const getRedundancyMultiplier = (n: number) => {
    if (redundancy === 'N') return n;
    if (redundancy === 'N+1') return n + 1;
    if (redundancy === '2N') return n * 2;
    return n;
  };
  const nominalUnitTons = 50;
  const requiredUnits = Math.ceil(coolingTons / nominalUnitTons);
  const totalInstalledUnits = getRedundancyMultiplier(requiredUnits);
  const totalInstalledTons = totalInstalledUnits * nominalUnitTons;

  const chartColors = [token.colorPrimary, token.colorInfo, token.colorSuccess, token.colorWarning, token.colorError];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Collapse defaultActiveKey={['1', '2']} style={{ ...glassStyle, border: 'none' }}>
            <Panel header="Cooling Load Parameters" key="1">
              <Row gutter={[0, 16]}>
                <Col span={24}>
                  <Text>IT Load (kW)</Text>
                  <Slider min={50} max={10000} step={10} value={itLoadKw} onChange={setItLoadKw} />
                  <InputNumber min={50} max={10000} value={itLoadKw} onChange={(v) => setItLoadKw(v || 500)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Target PUE</Text>
                  <Slider min={1.0} max={2.5} step={0.05} value={pue} onChange={setPue} />
                  <InputNumber min={1.0} max={2.5} step={0.05} value={pue} onChange={(v) => setPue(v || 1.4)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Electricity Rate ($/kWh)</Text>
                  <InputNumber min={0.01} max={0.50} step={0.01} value={electricityRate} onChange={(v) => setElectricityRate(v || 0.1)} style={{ width: '100%' }} />
                </Col>
              </Row>
            </Panel>

            <Panel header="Architecture & Sizing" key="2">
              <Row gutter={[0, 16]}>
                <Col span={24}>
                  <Text>Redundancy Level</Text>
                  <Select value={redundancy} onChange={setRedundancy} style={{ width: '100%' }}>
                    <Select.Option value="N">N</Select.Option>
                    <Select.Option value="N+1">N+1</Select.Option>
                    <Select.Option value="2N">2N</Select.Option>
                  </Select>
                </Col>
                <Col span={24}>
                  <Text>Water Cost ($/Liter)</Text>
                  <InputNumber min={0.001} max={0.1} step={0.001} value={waterCostPerLiter} onChange={(v) => setWaterCostPerLiter(v || 0.003)} style={{ width: '100%' }} />
                </Col>
              </Row>
            </Panel>

            <Panel header="Delta-T Calculator" key="3">
              <Row gutter={[0, 16]}>
                <Col span={24}>
                  <Text>Supply Temp (°C)</Text>
                  <InputNumber value={supplyTemp} onChange={(v) => setSupplyTemp(v || 18)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Return Temp (°C)</Text>
                  <InputNumber value={returnTemp} onChange={(v) => setReturnTemp(v || 35)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Airflow (CFM)</Text>
                  <InputNumber value={airflowCfm} onChange={(v) => setAirflowCfm(v || 5000)} style={{ width: '100%' }} />
                </Col>
              </Row>
            </Panel>

            <Panel header="Free Cooling" key="4">
              <Row gutter={[0, 16]}>
                <Col span={24}>
                  <Text>Climate Zone</Text>
                  <Select value={climateZone} onChange={setClimateZone} style={{ width: '100%' }}>
                    {Object.keys(climateZones).map(zone => (
                      <Select.Option key={zone} value={zone}>{zone}</Select.Option>
                    ))}
                  </Select>
                </Col>
              </Row>
            </Panel>
          </Collapse>
        </Col>

        <Col xs={24} lg={16}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Total Cooling Load" value={coolingLoadKw} precision={0} suffix="kW" valueStyle={{ color: token.colorWarning }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Cooling Capacity" value={coolingTons} precision={1} suffix="Tons" valueStyle={{ color: token.colorInfo }} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={glassStyle} bordered={false}>
                <Statistic title="Heat Load" value={coolingBtu} precision={0} suffix="BTU/hr" valueStyle={{ color: token.colorError }} />
              </Card>
            </Col>

            <Col span={24}>
              <Card title="Architecture Comparison (Energy vs CAPEX)" style={glassStyle} bordered={false}>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={archComparison}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" stroke={token.colorText} />
                      <YAxis yAxisId="left" stroke={token.colorText} label={{ value: 'Energy (kWh/yr)', angle: -90, position: 'insideLeft', fill: token.colorText }} />
                      <YAxis yAxisId="right" orientation="right" stroke={token.colorText} label={{ value: 'CAPEX ($)', angle: 90, position: 'insideRight', fill: token.colorText }} />
                      <RechartsTooltip contentStyle={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorder }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="annualEnergy" name="Annual Energy" fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="capex" name="Est. CAPEX" stroke={token.colorWarning} strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12}>
              <Card title="Redundancy & Capacity" style={glassStyle} bordered={false}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="Required Units" value={requiredUnits} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Installed Units" value={totalInstalledUnits} prefix={<ExperimentOutlined />} />
                  </Col>
                  <Col span={24}>
                    <Statistic title="Installed Capacity" value={totalInstalledTons} precision={1} suffix="Tons" />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} sm={12}>
              <Card title="Delta-T Heat Removal" style={glassStyle} bordered={false}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="Heat Removed (BTU/hr)" value={heatRemovalBtu} precision={0} valueStyle={{ color: token.colorWarning }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Equiv. kW" value={heatRemovalKw} precision={1} valueStyle={{ color: token.colorInfo }} />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} sm={12}>
              <Card title="Water Usage (Chilled Water)" style={glassStyle} bordered={false}>
                <Statistic title="Annual Water Use" value={selectedArch.annualWater} precision={0} suffix="Liters" valueStyle={{ color: token.colorInfo }} />
                <Statistic title="WUE" value={selectedArch.wue} suffix="L/kWh" style={{ marginTop: 16 }} />
              </Card>
            </Col>

            <Col xs={24} sm={12}>
              <Card title="Free Cooling Potential" style={glassStyle} bordered={false}>
                <Statistic title="Annual Free Cooling" value={freeCoolingHours} precision={0} suffix="Hours" valueStyle={{ color: token.colorSuccess }} />
                <Statistic title="Est. Savings" value={freeCoolingSavings} precision={0} prefix="$" style={{ marginTop: 16 }} />
              </Card>
            </Col>

          </Row>
        </Col>
      </Row>
    </motion.div>
  );
}
