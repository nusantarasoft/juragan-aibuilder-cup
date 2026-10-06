'use client';

import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Typography, Slider, InputNumber, Collapse, Tooltip, Statistic, Progress, Divider } from 'antd';
import { InfoCircleOutlined, DashboardOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line, Area, AreaChart } from 'recharts';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface Props {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

export function DcimCalculator({ isDark, token, glassStyle }: Props) {
  const [inputs, setInputs] = useState({
    // DCIM ROI
    totalRacks: 200,
    avgKwPerRack: 7,
    dcimLicensePerRack: 50,
    dcimImplementation: 100000,
    energySavingsPct: 15,
    // Stranded Capacity
    currentPowerUtilPct: 60,
    currentCoolingUtilPct: 55,
    currentSpaceUtilPct: 70,
    // Asset Utilization
    totalServers: 1000,
    avgUtilization: 30,
    targetUtilization: 60,
    // Change Management
    changesPerMonth: 50,
    avgChangeHours: 2,
    hourlyRate: 75,
    // Alarm
    currentAlarmsPerMonth: 500,
    currentMttrMinutes: 45,
    // Energy
    currentPue: 1.6,
    targetPueWithDcim: 1.4,
    electricityRate: 0.10,
    // Staffing
    currentFte: 8,
    fteSalary: 85000,
  });

  const handleInput = (key: string, value: number | null) => {
    if (value !== null) {
      setInputs(prev => ({ ...prev, [key]: value }));
    }
  };

  const calc = useMemo(() => {
    const {
      totalRacks, avgKwPerRack, dcimLicensePerRack, dcimImplementation, energySavingsPct,
      currentPowerUtilPct, currentCoolingUtilPct, currentSpaceUtilPct,
      totalServers, avgUtilization, targetUtilization,
      changesPerMonth, avgChangeHours, hourlyRate,
      currentAlarmsPerMonth, currentMttrMinutes,
      currentPue, targetPueWithDcim, electricityRate,
      currentFte, fteSalary
    } = inputs;

    // 1. DCIM ROI
    const totalDcimCost = (dcimLicensePerRack * totalRacks) + dcimImplementation;
    // Base energy cost directly from racks
    const baseEnergyCost = totalRacks * avgKwPerRack * 8760 * electricityRate;
    const annualEnergySavings = baseEnergyCost * (energySavingsPct / 100);
    const paybackMonths = annualEnergySavings > 0 ? totalDcimCost / (annualEnergySavings / 12) : 0;
    
    // 2. Stranded Capacity
    const strandedPowerKw = totalRacks * avgKwPerRack * (1 - currentPowerUtilPct / 100);
    const strandedCoolingTons = strandedPowerKw * 0.285;
    const strandedRacks = Math.floor(totalRacks * (1 - currentSpaceUtilPct / 100));
    const revenuePotential = strandedRacks * 1500 * 12; // Annual colo revenue potential

    // 3. Asset Utilization
    const serversReducible = totalServers * (1 - avgUtilization / targetUtilization);
    const annualServerSavings = serversReducible * 3000;

    // 4. Change Management
    const currentChangeCost = changesPerMonth * avgChangeHours * hourlyRate * 12;
    const savingsWithDcimChange = currentChangeCost * 0.4;

    // 5. Alarm Reduction
    const newAlarms = currentAlarmsPerMonth * 0.4; // 60% reduction
    const newMttr = currentMttrMinutes * 0.65; // 35% reduction
    const timeSavedPerMonthHours = (currentAlarmsPerMonth * currentMttrMinutes - newAlarms * newMttr) / 60;
    const annualAlarmSavings = timeSavedPerMonthHours * hourlyRate * 12;

    // 6. Energy Savings from Monitoring (PUE)
    const currentAnnualEnergyKwh = totalRacks * avgKwPerRack * currentPue * 8760;
    const targetAnnualEnergyKwh = totalRacks * avgKwPerRack * targetPueWithDcim * 8760;
    const energySavedKwh = currentAnnualEnergyKwh - targetAnnualEnergyKwh;
    const energyPueCostSaved = energySavedKwh * electricityRate;
    const co2SavedTons = energySavedKwh * 0.42 / 1000;

    // 7. Staffing
    const fteSaved = currentFte * 0.2;
    const annualStaffSavings = fteSaved * fteSalary;

    // Summary
    const totalAnnualSavings = annualEnergySavings + annualServerSavings + savingsWithDcimChange + annualAlarmSavings + energyPueCostSaved + annualStaffSavings + revenuePotential;
    const net3YrValue = (totalAnnualSavings * 3) - totalDcimCost;
    const overallRoiPct = ((totalAnnualSavings * 3 - totalDcimCost) / totalDcimCost) * 100;

    return {
      totalDcimCost, annualEnergySavings, paybackMonths,
      strandedPowerKw, strandedCoolingTons, strandedRacks, revenuePotential,
      serversReducible, annualServerSavings,
      currentChangeCost, savingsWithDcimChange,
      newAlarms, newMttr, timeSavedPerMonthHours, annualAlarmSavings,
      currentAnnualEnergyKwh, targetAnnualEnergyKwh, energySavedKwh, energyPueCostSaved, co2SavedTons,
      fteSaved, annualStaffSavings,
      totalAnnualSavings, net3YrValue, overallRoiPct
    };
  }, [inputs]);

  const textColor = isDark ? '#fff' : '#000';
  const chartColors = [token.colorPrimary, token.colorSuccess, token.colorWarning, token.colorError, token.colorInfo];

  const dcimRoiData = [
    { name: '1 Year', cost: calc.totalDcimCost, savings: calc.totalAnnualSavings },
    { name: '3 Years', cost: calc.totalDcimCost, savings: calc.totalAnnualSavings * 3 },
    { name: '5 Years', cost: calc.totalDcimCost, savings: calc.totalAnnualSavings * 5 },
  ];

  const changeData = [
    { name: 'Without DCIM', cost: calc.currentChangeCost },
    { name: 'With DCIM', cost: calc.currentChangeCost - calc.savingsWithDcimChange },
  ];

  const energyData = Array.from({ length: 5 }).map((_, i) => ({
    year: `Year ${i + 1}`,
    current: calc.currentAnnualEnergyKwh,
    optimized: calc.targetAnnualEnergyKwh,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token.padding }}>
      {/* Summary Dashboard */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card style={glassStyle} bordered={false}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={12} md={6}>
              <Statistic title="Total Annual Savings" value={calc.totalAnnualSavings} precision={0} prefix="$" valueStyle={{ color: token.colorSuccess }} />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic title="Total DCIM Investment" value={calc.totalDcimCost} precision={0} prefix="$" valueStyle={{ color: token.colorError }} />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic title="Net 3-Year Value" value={calc.net3YrValue} precision={0} prefix="$" valueStyle={{ color: token.colorSuccess }} />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic title="Overall ROI" value={calc.overallRoiPct} precision={0} suffix="%" valueStyle={{ color: token.colorSuccess }} />
            </Col>
          </Row>
        </Card>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* Left Column: Inputs */}
        <Col xs={24} lg={8}>
          <Card title={<><DashboardOutlined /> Parameters</>} style={glassStyle} bordered={false}>
            <Collapse ghost defaultActiveKey={['1']}>
              <Panel header="DCIM Investment & Core Specs" key="1">
                <div style={{ marginBottom: 16 }}>
                  <Text>Total Racks</Text>
                  <Slider min={10} max={5000} value={inputs.totalRacks} onChange={v => handleInput('totalRacks', v)} />
                  <InputNumber min={10} max={5000} value={inputs.totalRacks} onChange={v => handleInput('totalRacks', v)} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Avg kW per Rack</Text>
                  <InputNumber min={1} max={50} value={inputs.avgKwPerRack} onChange={v => handleInput('avgKwPerRack', v)} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>DCIM License/Rack ($/yr)</Text>
                  <InputNumber min={10} max={500} value={inputs.dcimLicensePerRack} onChange={v => handleInput('dcimLicensePerRack', v)} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Implementation Cost ($)</Text>
                  <InputNumber min={1000} max={1000000} value={inputs.dcimImplementation} onChange={v => handleInput('dcimImplementation', v)} style={{ width: '100%' }} />
                </div>
              </Panel>

              <Panel header="Capacity & Utilization" key="2">
                <div style={{ marginBottom: 16 }}>
                  <Text>Power Utilization (%)</Text>
                  <Slider min={10} max={100} value={inputs.currentPowerUtilPct} onChange={v => handleInput('currentPowerUtilPct', v)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Cooling Utilization (%)</Text>
                  <Slider min={10} max={100} value={inputs.currentCoolingUtilPct} onChange={v => handleInput('currentCoolingUtilPct', v)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Space Utilization (%)</Text>
                  <Slider min={10} max={100} value={inputs.currentSpaceUtilPct} onChange={v => handleInput('currentSpaceUtilPct', v)} />
                </div>
              </Panel>

              <Panel header="Asset & Change Management" key="3">
                <div style={{ marginBottom: 16 }}>
                  <Text>Total Servers</Text>
                  <InputNumber min={100} max={50000} value={inputs.totalServers} onChange={v => handleInput('totalServers', v)} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Avg Server Utilization (%)</Text>
                  <Slider min={5} max={100} value={inputs.avgUtilization} onChange={v => handleInput('avgUtilization', v)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Target Server Utilization (%)</Text>
                  <Slider min={5} max={100} value={inputs.targetUtilization} onChange={v => handleInput('targetUtilization', v)} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Changes per Month</Text>
                  <InputNumber min={1} max={1000} value={inputs.changesPerMonth} onChange={v => handleInput('changesPerMonth', v)} style={{ width: '100%' }} />
                </div>
              </Panel>

              <Panel header="Operations & Energy" key="4">
                <div style={{ marginBottom: 16 }}>
                  <Text>Alarms per Month</Text>
                  <InputNumber min={10} max={10000} value={inputs.currentAlarmsPerMonth} onChange={v => handleInput('currentAlarmsPerMonth', v)} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>MTTR (Minutes)</Text>
                  <InputNumber min={5} max={300} value={inputs.currentMttrMinutes} onChange={v => handleInput('currentMttrMinutes', v)} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Current PUE</Text>
                  <InputNumber min={1.1} max={3.0} step={0.1} value={inputs.currentPue} onChange={v => handleInput('currentPue', v)} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>Target PUE (with DCIM)</Text>
                  <InputNumber min={1.1} max={3.0} step={0.1} value={inputs.targetPueWithDcim} onChange={v => handleInput('targetPueWithDcim', v)} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text>FTE Count</Text>
                  <InputNumber min={1} max={100} value={inputs.currentFte} onChange={v => handleInput('currentFte', v)} style={{ width: '100%' }} />
                </div>
              </Panel>
            </Collapse>
          </Card>
        </Col>

        {/* Right Column: Results */}
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: token.padding }}>
            
            {/* ROI Chart */}
            <Card title="DCIM Cost vs Cumulative Savings" style={glassStyle} bordered={false}>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dcimRoiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
                    <XAxis dataKey="name" stroke={textColor} />
                    <YAxis stroke={textColor} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(val: number) => `$${val.toLocaleString(undefined, {maximumFractionDigits:0})}`} />
                    <Legend />
                    <Bar dataKey="cost" name="DCIM Cost" fill={token.colorError} />
                    <Bar dataKey="savings" name="Cumulative Savings" fill={token.colorSuccess} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col xs={24} sm={8}>
                  <Statistic title="Annual Energy Savings" value={calc.annualEnergySavings} precision={0} prefix="$" />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic title="Payback Period" value={calc.paybackMonths} precision={1} suffix=" Months" />
                </Col>
              </Row>
            </Card>

            {/* Stranded Capacity */}
            <Card title="Stranded Capacity Recovery" style={glassStyle} bordered={false}>
              <Row gutter={[24, 24]}>
                <Col span={16}>
                  <div style={{ marginBottom: 16 }}>
                    <Text>Power Capacity Utilized</Text>
                    <Progress percent={inputs.currentPowerUtilPct} strokeColor={token.colorWarning} />
                    <Text type="secondary">{calc.strandedPowerKw.toFixed(0)} kW Stranded</Text>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Text>Cooling Capacity Utilized</Text>
                    <Progress percent={inputs.currentCoolingUtilPct} strokeColor={token.colorInfo} />
                    <Text type="secondary">{calc.strandedCoolingTons.toFixed(0)} Tons Stranded</Text>
                  </div>
                  <div>
                    <Text>Space Capacity Utilized</Text>
                    <Progress percent={inputs.currentSpaceUtilPct} strokeColor={token.colorSuccess} />
                    <Text type="secondary">{calc.strandedRacks} Racks Stranded</Text>
                  </div>
                </Col>
                <Col xs={24} sm={8} style={{ display: 'flex', alignItems: 'center' }}>
                  <Statistic title="Revenue Potential (Annual)" value={calc.revenuePotential} precision={0} prefix="$" valueStyle={{ color: token.colorPrimary }} />
                </Col>
              </Row>
            </Card>

            {/* Energy Area Chart */}
            <Card title="Energy Consumption Trajectory" style={glassStyle} bordered={false}>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={energyData}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={token.colorWarning} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={token.colorWarning} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={token.colorSuccess} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={token.colorSuccess} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
                    <XAxis dataKey="year" stroke={textColor} />
                    <YAxis stroke={textColor} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <RechartsTooltip formatter={(val: number) => `${(val/1000).toFixed(0)}k kWh`} />
                    <Legend />
                    <Area type="monotone" dataKey="current" name="Without DCIM (kWh)" stroke={token.colorWarning} fillOpacity={1} fill="url(#colorCurrent)" />
                    <Area type="monotone" dataKey="optimized" name="With DCIM (kWh)" stroke={token.colorSuccess} fillOpacity={1} fill="url(#colorOpt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col xs={24} sm={8}>
                  <Statistic title="Annual CO2 Saved" value={calc.co2SavedTons} precision={0} suffix=" Tons" />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic title="Energy Cost Saved" value={calc.energyPueCostSaved} precision={0} prefix="$" />
                </Col>
              </Row>
            </Card>

            {/* Operational Improvements */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="Change Management Savings" style={glassStyle} bordered={false}>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={changeData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#eee'} />
                        <XAxis type="number" stroke={textColor} tickFormatter={v => `$${v}`} />
                        <YAxis dataKey="name" type="category" stroke={textColor} />
                        <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(val: number) => `$${val.toLocaleString()}`} />
                        <Bar dataKey="cost" fill={token.colorPrimary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Incident Response" style={glassStyle} bordered={false}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                      <Statistic title="Alarms (Before/After)" value={`${inputs.currentAlarmsPerMonth} / ${calc.newAlarms.toFixed(0)}`} />
                    </Col>
                    <Col xs={24} lg={12}>
                      <Statistic title="MTTR (Before/After mins)" value={`${inputs.currentMttrMinutes} / ${calc.newMttr.toFixed(0)}`} />
                    </Col>
                    <Col span={24}>
                      <Statistic title="Annual Operations Savings" value={calc.annualAlarmSavings} precision={0} prefix="$" valueStyle={{ color: token.colorSuccess }} />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

          </div>
        </Col>
      </Row>
    </div>
  );
}
