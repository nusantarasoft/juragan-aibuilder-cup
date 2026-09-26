'use client';

import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Typography, Slider, InputNumber, Select, Collapse, Tooltip, Statistic, Tag, Table, Progress, Button, Input, Space, Divider } from 'antd';
import { InfoCircleOutlined, SafetyCertificateOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend, ComposedChart, Area } from 'recharts';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

interface Props {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

export function SlaCalculator({ isDark, token, glassStyle }: Props) {
  // 1. Uptime tier calculator
  const [targetAvailability, setTargetAvailability] = useState<number>(0.9999);

  // 2. Component availability
  const [systemComponents, setSystemComponents] = useState<any[]>([
    { id: '1', name: 'Utility Power', availability: 0.999, quantity: 1, config: 'Series' },
    { id: '2', name: 'Generator', availability: 0.995, quantity: 2, config: 'Parallel' },
    { id: '3', name: 'UPS', availability: 0.9999, quantity: 2, config: 'Parallel' },
    { id: '4', name: 'PDU', availability: 0.9999, quantity: 2, config: 'Parallel' },
    { id: '5', name: 'Network Switch', availability: 0.9999, quantity: 2, config: 'Parallel' },
  ]);

  // 3. MTBF/MTTR analysis
  const [mtbfHours, setMtbfHours] = useState<number>(50000);
  const [mttrHours, setMttrHours] = useState<number>(4);
  const [componentCount, setComponentCount] = useState<number>(100);

  // 4. SLA penalty calculator
  const [contractValue, setContractValue] = useState<number>(50000);
  const [penaltyStructure, setPenaltyStructure] = useState<string>('Tiered');

  // 5. Availability improvement ROI
  const [currentAvail, setCurrentAvail] = useState<number>(0.999);
  const [targetAvail, setTargetAvail] = useState<number>(0.9999);
  const [improvementCost, setImprovementCost] = useState<number>(500000);
  const [revenuePerHour, setRevenuePerHour] = useState<number>(10000);

  // 6. Incident cost accumulator
  const [incidents, setIncidents] = useState<any[]>([
    { id: '1', date: '2023-05-12', duration: 120, cost: 20000 },
    { id: '2', date: '2023-08-21', duration: 45, cost: 7500 },
  ]);

  // --- Calculations ---

  // 1. Uptime Tier
  const downtimeMinutesYear = (1 - targetAvailability) * 525960;
  const downtimeHoursYear = downtimeMinutesYear / 60;
  const downtimeMinutesMonth = downtimeMinutesYear / 12;
  const downtimeMinutesWeek = downtimeMinutesYear / 52;
  
  const getTier = (avail: number) => {
    if (avail >= 0.99995) return { name: 'Tier IV', color: 'purple' };
    if (avail >= 0.99982) return { name: 'Tier III', color: 'gold' };
    if (avail >= 0.99741) return { name: 'Tier II', color: 'cyan' };
    if (avail >= 0.99671) return { name: 'Tier I', color: 'blue' };
    return { name: 'None', color: 'default' };
  };
  const tierInfo = getTier(targetAvailability);

  // 2. Component Availability
  const calcSystemAvailability = () => {
    let avail = 1;
    systemComponents.forEach(c => {
      let subAvail = c.availability;
      if (c.config === 'Parallel' && c.quantity > 1) {
        subAvail = 1 - Math.pow(1 - c.availability, c.quantity);
      }
      avail *= subAvail;
    });
    return avail;
  };
  const systemAvailability = calcSystemAvailability();
  const sysDowntimeMinsYear = (1 - systemAvailability) * 525960;
  const sysTier = getTier(systemAvailability);

  // 3. MTBF / MTTR
  const compAvail = mtbfHours / (mtbfHours + mttrHours);
  const systemMtbf = mtbfHours / componentCount;
  const annualFailures = 8760 / systemMtbf;
  const annualDowntimeHours = annualFailures * mttrHours;
  
  const mttrChartData = [0.5, 1, 2, 4, 8, 12, 24].map(mttr => ({
    mttr: `${mttr}h`,
    downtime: (8760 / systemMtbf) * mttr
  }));

  // 4. SLA Penalties
  const penaltyData = [1, 4, 8, 24].map(duration => {
    let amount = 0;
    if (penaltyStructure === 'Linear 10%/hr') {
      amount = Math.min(contractValue * 0.1 * duration, contractValue);
    } else if (penaltyStructure === 'Capped at 30%') {
      amount = Math.min(contractValue * 0.1 * duration, contractValue * 0.3);
    } else { // Tiered
      if (duration <= 1) amount = contractValue * 0.05;
      else if (duration <= 4) amount = contractValue * 0.1;
      else if (duration <= 8) amount = contractValue * 0.2;
      else amount = contractValue * 0.3;
    }
    return { key: duration, duration: `${duration} hr`, penalty: amount, pct: ((amount / contractValue) * 100).toFixed(1) + '%' };
  });

  const penaltyColumns = [
    { title: 'Outage Duration', dataIndex: 'duration', key: 'duration' },
    { title: 'Penalty Amount', dataIndex: 'penalty', key: 'penalty', render: (val: number) => `$${val.toLocaleString()}` },
    { title: '% of Monthly Contract', dataIndex: 'pct', key: 'pct' },
  ];

  // 5. ROI
  const curDowntimeHrs = (1 - currentAvail) * 8760;
  const tgtDowntimeHrs = (1 - targetAvail) * 8760;
  const savedHrs = curDowntimeHrs - tgtDowntimeHrs;
  const savedRevenueYear = savedHrs * revenuePerHour;
  const paybackMonths = savedRevenueYear > 0 ? improvementCost / (savedRevenueYear / 12) : 0;

  const roiChartData = [
    { name: 'Current', downtime: curDowntimeHrs, cost: curDowntimeHrs * revenuePerHour },
    { name: 'Target', downtime: tgtDowntimeHrs, cost: tgtDowntimeHrs * revenuePerHour },
  ];

  // 6. Risk Matrix
  const riskData = [
    { key: '1', risk: 'Utility Power Failure', prob: 'High', impact: 50000, score: 3 },
    { key: '2', risk: 'Cooling System Failure', prob: 'Medium', impact: 75000, score: 2 },
    { key: '3', risk: 'Network Outage', prob: 'High', impact: 100000, score: 3 },
    { key: '4', risk: 'Human Error', prob: 'Low', impact: 25000, score: 1 },
  ];

  const riskColumns = [
    { title: 'Risk Event', dataIndex: 'risk', key: 'risk' },
    { title: 'Probability', dataIndex: 'prob', key: 'prob', render: (val: string) => <Tag color={val === 'High' ? 'red' : val === 'Medium' ? 'orange' : 'green'}>{val}</Tag> },
    { title: 'Impact ($)', dataIndex: 'impact', key: 'impact', render: (val: number) => `$${val.toLocaleString()}` },
    { title: 'Risk Score', dataIndex: 'score', key: 'score', sorter: (a: any, b: any) => a.score - b.score },
  ];

  // 7. Incidents
  const totalIncidentDuration = incidents.reduce((acc, curr) => acc + curr.duration, 0);
  const totalIncidentCost = incidents.reduce((acc, curr) => acc + curr.cost, 0);
  const incidentBudgetMins = downtimeMinutesYear; // Budget based on target avail

  const headerStyle = { color: token.colorTextHeading };
  const cardBodyStyle = { padding: '16px' };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Row gutter={[16, 16]}>
        {/* LEFT COLUMN: INPUTS */}
        <Col xs={24} lg={8}>
          <Collapse defaultActiveKey={['1', '2']} style={glassStyle}>
            <Panel header="Target Availability & SLA" key="1">
              <div style={{ marginBottom: 16 }}>
                <Text style={headerStyle}>Target Availability</Text>
                <Select value={targetAvailability} onChange={setTargetAvailability} style={{ width: '100%', marginTop: 8 }}>
                  <Option value={0.99}>99.0% (Two Nines)</Option>
                  <Option value={0.999}>99.9% (Three Nines)</Option>
                  <Option value={0.9995}>99.95% (Three Nines Five)</Option>
                  <Option value={0.9999}>99.99% (Four Nines)</Option>
                  <Option value={0.99999}>99.999% (Five Nines)</Option>
                  <Option value={0.999999}>99.9999% (Six Nines)</Option>
                </Select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text style={headerStyle}>Monthly Contract Value ($)</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={contractValue} onChange={val => setContractValue(val || 0)} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </div>
              <div>
                <Text style={headerStyle}>Penalty Structure</Text>
                <Select value={penaltyStructure} onChange={setPenaltyStructure} style={{ width: '100%', marginTop: 8 }}>
                  <Option value="Linear 10%/hr">Linear 10%/hr</Option>
                  <Option value="Tiered">Tiered (5%/10%/20%/30%)</Option>
                  <Option value="Capped at 30%">Capped at 30%</Option>
                </Select>
              </div>
            </Panel>

            <Panel header="System Components (Reliability Block)" key="2">
              {systemComponents.map((comp, idx) => (
                <div key={comp.id} style={{ marginBottom: 12, padding: 8, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius }}>
                  <Row gutter={8}>
                    <Col xs={24} lg={12}><Input value={comp.name} onChange={e => { const newC = [...systemComponents]; newC[idx].name = e.target.value; setSystemComponents(newC); }} /></Col>
                    <Col xs={24} lg={12}><Select value={comp.config} onChange={v => { const newC = [...systemComponents]; newC[idx].config = v; setSystemComponents(newC); }} style={{ width: '100%' }}>
                      <Option value="Series">Series</Option>
                      <Option value="Parallel">Parallel</Option>
                    </Select></Col>
                  </Row>
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col xs={24} lg={12}><InputNumber addonBefore="Avail" style={{ width: '100%' }} value={comp.availability} step={0.001} min={0} max={1} onChange={v => { const newC = [...systemComponents]; newC[idx].availability = v || 0; setSystemComponents(newC); }} /></Col>
                    <Col xs={24} sm={8}><InputNumber addonBefore="Qty" style={{ width: '100%' }} value={comp.quantity} min={1} onChange={v => { const newC = [...systemComponents]; newC[idx].quantity = v || 1; setSystemComponents(newC); }} /></Col>
                    <Col span={4}><Button danger icon={<DeleteOutlined />} onClick={() => setSystemComponents(systemComponents.filter(c => c.id !== comp.id))} /></Col>
                  </Row>
                </div>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setSystemComponents([...systemComponents, { id: Date.now().toString(), name: 'New Component', availability: 0.999, quantity: 1, config: 'Series' }])}>Add Component</Button>
            </Panel>

            <Panel header="MTBF / MTTR Parameters" key="3">
              <div style={{ marginBottom: 16 }}>
                <Text style={headerStyle}>Average MTBF (Hours)</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={mtbfHours} onChange={val => setMtbfHours(val || 50000)} min={1000} max={500000} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text style={headerStyle}>Average MTTR (Hours)</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={mttrHours} onChange={val => setMttrHours(val || 4)} min={0.5} max={72} step={0.5} />
              </div>
              <div>
                <Text style={headerStyle}>Number of Components</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={componentCount} onChange={val => setComponentCount(val || 100)} min={1} />
              </div>
            </Panel>

            <Panel header="ROI & Improvement" key="4">
              <div style={{ marginBottom: 16 }}>
                <Text style={headerStyle}>Current Availability</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={currentAvail} onChange={v => setCurrentAvail(v || 0.99)} step={0.001} max={1} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text style={headerStyle}>Target Availability</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={targetAvail} onChange={v => setTargetAvail(v || 0.9999)} step={0.001} max={1} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text style={headerStyle}>Improvement Cost ($)</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={improvementCost} onChange={v => setImprovementCost(v || 0)} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </div>
              <div>
                <Text style={headerStyle}>Downtime Cost per Hour ($)</Text>
                <InputNumber style={{ width: '100%', marginTop: 8 }} value={revenuePerHour} onChange={v => setRevenuePerHour(v || 0)} formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </div>
            </Panel>
          </Collapse>
        </Col>

        {/* RIGHT COLUMN: RESULTS */}
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. Uptime Tier & System Reliability */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card style={glassStyle} bodyStyle={cardBodyStyle} title="Target SLA Analysis">
                  <Row gutter={16}>
                    <Col xs={24} lg={12}><Statistic title="Target Availability" value={(targetAvailability * 100).toFixed(4) + '%'} /></Col>
                    <Col xs={24} lg={12}><Statistic title="Mapped Tier" value={tierInfo.name} valueStyle={{ color: tierInfo.color }} /></Col>
                  </Row>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col xs={24} sm={8}><Statistic title="Allowed Downtime / Yr" value={downtimeHoursYear.toFixed(1)} suffix="hrs" valueStyle={{ fontSize: 16 }} /></Col>
                    <Col xs={24} sm={8}><Statistic title="Per Month" value={downtimeMinutesMonth.toFixed(1)} suffix="min" valueStyle={{ fontSize: 16 }} /></Col>
                    <Col xs={24} sm={8}><Statistic title="Per Week" value={downtimeMinutesWeek.toFixed(1)} suffix="min" valueStyle={{ fontSize: 16 }} /></Col>
                  </Row>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card style={glassStyle} bodyStyle={cardBodyStyle} title="System Block Reliability">
                  <Row gutter={16}>
                    <Col xs={24} lg={12}><Statistic title="Calculated System Avail." value={(systemAvailability * 100).toFixed(5) + '%'} valueStyle={{ color: systemAvailability >= targetAvailability ? token.colorSuccess : token.colorError }} /></Col>
                    <Col xs={24} lg={12}><Statistic title="Estimated Tier" value={sysTier.name} valueStyle={{ color: sysTier.color }} /></Col>
                  </Row>
                  <Divider style={{ margin: '12px 0' }} />
                  <Row gutter={16}>
                    <Col xs={24} lg={12}><Statistic title="Expected Downtime / Yr" value={(sysDowntimeMinsYear / 60).toFixed(1)} suffix="hrs" valueStyle={{ fontSize: 16 }} /></Col>
                    <Col xs={24} lg={12}>
                      {systemAvailability >= targetAvailability ? 
                        <Tag color="success" style={{ marginTop: 24 }}><SafetyCertificateOutlined /> Meets Target SLA</Tag> : 
                        <Tag color="error" style={{ marginTop: 24 }}>Below Target SLA</Tag>
                      }
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* 3. MTBF / MTTR & 4. SLA Penalties */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card style={glassStyle} bodyStyle={cardBodyStyle} title="MTBF / MTTR Analysis">
                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={8}><Statistic title="Sys MTBF" value={(systemMtbf / 1000).toFixed(1)} suffix="k hrs" valueStyle={{ fontSize: 14 }} /></Col>
                    <Col xs={24} sm={8}><Statistic title="Annual Fails" value={annualFailures.toFixed(1)} valueStyle={{ fontSize: 14 }} /></Col>
                    <Col xs={24} sm={8}><Statistic title="Exp. Downtime" value={annualDowntimeHours.toFixed(1)} suffix="hrs" valueStyle={{ fontSize: 14 }} /></Col>
                  </Row>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mttrChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
                        <XAxis dataKey="mttr" stroke={token.colorTextSecondary} fontSize={12} />
                        <YAxis stroke={token.colorTextSecondary} fontSize={12} width={30} />
                        <RechartsTooltip contentStyle={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorder, color: token.colorText }} />
                        <Bar dataKey="downtime" name="Annual Downtime (Hrs)" fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card style={glassStyle} bodyStyle={cardBodyStyle} title="SLA Penalty Schedule">
                  <Table dataSource={penaltyData} columns={penaltyColumns} pagination={false} size="small" />
                </Card>
              </Col>
            </Row>

            {/* 5. ROI & 6. Risk */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card style={glassStyle} bodyStyle={cardBodyStyle} title="Upgrade ROI (Downtime vs Target)">
                  <Row gutter={8} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={12}><Statistic title="Annual Savings" value={`$${savedRevenueYear.toLocaleString(undefined, {maximumFractionDigits:0})}`} valueStyle={{ color: token.colorSuccess, fontSize: 16 }} /></Col>
                    <Col xs={24} lg={12}><Statistic title="Payback Period" value={paybackMonths.toFixed(1)} suffix="mos" valueStyle={{ fontSize: 16 }} /></Col>
                  </Row>
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roiChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
                        <XAxis dataKey="name" stroke={token.colorTextSecondary} />
                        <YAxis stroke={token.colorTextSecondary} width={50} />
                        <RechartsTooltip contentStyle={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorder, color: token.colorText }} />
                        <Bar dataKey="downtime" name="Downtime (Hrs)" fill={token.colorWarning} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card style={glassStyle} bodyStyle={cardBodyStyle} title="Risk Matrix">
                  <Table dataSource={riskData} columns={riskColumns} pagination={false} size="small" />
                </Card>
              </Col>
            </Row>

            {/* 7. Incidents Accumulator */}
            <Card style={glassStyle} bodyStyle={cardBodyStyle} title="YTD Incident Budget & Accumulator">
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Statistic title="Total Incident Duration" value={totalIncidentDuration} suffix="mins" />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic title="Total Incident Cost" value={`$${totalIncidentCost.toLocaleString()}`} />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic title="Allowed SLA Downtime" value={downtimeMinutesYear.toFixed(0)} suffix="mins" />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Text>Downtime Budget Used</Text>
                <Progress percent={parseFloat(((totalIncidentDuration / downtimeMinutesYear) * 100).toFixed(1))} status={totalIncidentDuration > downtimeMinutesYear ? 'exception' : 'active'} strokeColor={totalIncidentDuration > downtimeMinutesYear ? token.colorError : token.colorPrimary} />
              </div>
            </Card>

          </div>
        </Col>
      </Row>
    </motion.div>
  );
}
