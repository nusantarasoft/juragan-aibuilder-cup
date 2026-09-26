import React, { useState } from "react";
import { 
  Row, Col, Card, Typography, InputNumber, Slider, 
  Collapse, Select, Table, Badge, Statistic, Radio, Switch 
} from "antd";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, Cell 
} from "recharts";
import { motion } from "framer-motion";
import { RocketOutlined, DollarOutlined, ClockCircleOutlined, WarningOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface MigrationCostProps {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

export function MigrationCost({ isDark, token, glassStyle }: MigrationCostProps) {
  // Source & Target
  const [sourceType, setSourceType] = useState<string>("onprem");
  const [targetType, setTargetType] = useState<string>("colocation");

  // Current Environment
  const [currentRacks, setCurrentRacks] = useState<number>(40);
  const [currentServers, setCurrentServers] = useState<number>(200);
  const [storageVolumeTB, setStorageVolumeTB] = useState<number>(100);
  const [networkDevices, setNetworkDevices] = useState<number>(30);

  // Migration Scope
  const [applicationCount, setApplicationCount] = useState<number>(50);
  const [complexitySimple, setComplexitySimple] = useState<number>(40);
  const [complexityMedium, setComplexityMedium] = useState<number>(40);
  const [complexityComplex, setComplexityComplex] = useState<number>(20);

  // Cost Parameters
  const [migrationMonths, setMigrationMonths] = useState<number>(6);
  const [migrationFTE, setMigrationFTE] = useState<number>(5);
  const [fteHourlyCost, setFteHourlyCost] = useState<number>(100);
  const [dataBandwidthGbps, setDataBandwidthGbps] = useState<number>(1);
  const [parallelRunMonths, setParallelRunMonths] = useState<number>(3);
  const [currentMonthlyOpex, setCurrentMonthlyOpex] = useState<number>(50000);
  const [targetMonthlyOpex, setTargetMonthlyOpex] = useState<number>(35000);
  const [decommissionCost, setDecommissionCost] = useState<number>(25000);

  // 1. Cloud credit offset
  const [cloudProvider, setCloudProvider] = useState<string>("None");
  const [cloudCreditAmount, setCloudCreditAmount] = useState<number>(0);
  const [creditDuration, setCreditDuration] = useState<number>(12);

  // 2. 7-R strategy
  const [migrationStrategy, setMigrationStrategy] = useState<string>("replatform");

  // 3. Physical transport
  const [physicalServers, setPhysicalServers] = useState<number>(0);
  const [shippingDistanceKm, setShippingDistanceKm] = useState<number>(0);
  const [requiresSpecialTransport, setRequiresSpecialTransport] = useState<boolean>(false);

  // 4. Migration timeline
  const [migrationDurationWeeks, setMigrationDurationWeeks] = useState<number>(12);

  // Format Helpers
  const formatCurrency = (val: number) => '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(val);

  // Handle complexity sliders
  const handleComplexityChange = (type: 'simple' | 'medium' | 'complex', val: number | null) => {
    if (val === null) return;
    
    if (type === 'simple') {
      let remain = 100 - val;
      let ratio = complexityMedium + complexityComplex > 0 
        ? complexityMedium / (complexityMedium + complexityComplex) 
        : 0.5;
      setComplexitySimple(val);
      setComplexityMedium(Math.round(remain * ratio));
      setComplexityComplex(Math.round(remain * (1 - ratio)));
    } else if (type === 'medium') {
      let remain = 100 - val;
      let ratio = complexitySimple + complexityComplex > 0 
        ? complexitySimple / (complexitySimple + complexityComplex) 
        : 0.5;
      setComplexityMedium(val);
      setComplexitySimple(Math.round(remain * ratio));
      setComplexityComplex(Math.round(remain * (1 - ratio)));
    } else {
      let remain = 100 - val;
      let ratio = complexitySimple + complexityMedium > 0 
        ? complexitySimple / (complexitySimple + complexityMedium) 
        : 0.5;
      setComplexityComplex(val);
      setComplexitySimple(Math.round(remain * ratio));
      setComplexityMedium(Math.round(remain * (1 - ratio)));
    }
  };

  // Calculations
  const laborCost = migrationFTE * fteHourlyCost * 160 * migrationMonths;
  
  // 7-R Strategy Options
  const strategyOptions: Record<string, { label: string, mult: number, risk: string, riskColor: string }> = {
    rehost: { label: 'Rehost (Lift & Shift)', mult: 0.8, risk: 'Low', riskColor: token.colorSuccess },
    replatform: { label: 'Replatform', mult: 1.0, risk: 'Medium', riskColor: '#faad14' },
    repurchase: { label: 'Repurchase (SaaS)', mult: 0.6, risk: 'Low', riskColor: token.colorSuccess },
    refactor: { label: 'Refactor', mult: 1.8, risk: 'High', riskColor: token.colorError },
    retire: { label: 'Retire', mult: 0.1, risk: 'None', riskColor: token.colorInfo },
    retain: { label: 'Retain', mult: 0.3, risk: 'Low', riskColor: token.colorSuccess },
    relocate: { label: 'Relocate', mult: 0.5, risk: 'Medium', riskColor: '#faad14' },
  };
  const selectedStrategy = strategyOptions[migrationStrategy] || strategyOptions.replatform;
  const strategyMultiplier = selectedStrategy.mult;

  const costPerApp = (complexitySimple / 100 * 2000) + (complexityMedium / 100 * 8000) + (complexityComplex / 100 * 25000);
  const appMigrationCost = applicationCount * costPerApp * strategyMultiplier;
  
  // Storage in GB = storageVolumeTB * 1000
  // Bandwidth in GB/s = dataBandwidthGbps * 0.125
  const dataTransferTimeHrs = (storageVolumeTB * 1000) / (dataBandwidthGbps * 0.125 * 3600);
  const dataTransferCost = storageVolumeTB * 50;
  
  // Transport Cost
  const baseTransportCost = physicalServers * 500;
  const distanceSurcharge = shippingDistanceKm * 2;
  const specialMult = requiresSpecialTransport ? 2.5 : 1;
  const transportCost = (baseTransportCost + distanceSurcharge) * specialMult;
  
  const hardwareDecomCost = (currentRacks * 500) + decommissionCost;
  const parallelRunCost = parallelRunMonths * currentMonthlyOpex;
  const planningCost = laborCost * 0.15;
  const testingCost = laborCost * 0.25;
  
  const totalMigrationCost = laborCost + appMigrationCost + dataTransferCost + hardwareDecomCost + parallelRunCost + planningCost + testingCost + transportCost;
  
  // Cloud Credit Offset
  const monthlyCredit = creditDuration > 0 ? cloudCreditAmount / creditDuration : 0;
  const netMonthlyCost = targetMonthlyOpex - monthlyCredit;

  const monthlySavings = currentMonthlyOpex - netMonthlyCost;
  const annualSavings = monthlySavings * 12;
  const paybackMonths = monthlySavings > 0 ? totalMigrationCost / monthlySavings : Infinity;
  
  const tco3yrCurrent = currentMonthlyOpex * 36;
  const tco3yrMigrated = totalMigrationCost + (targetMonthlyOpex * (36 - migrationMonths - parallelRunMonths)) + (currentMonthlyOpex * (migrationMonths + parallelRunMonths));
  
  const rawRiskScore = 
    (complexityComplex >= 30 ? 3 : complexityComplex >= 15 ? 2 : 1) + 
    (applicationCount > 100 ? 2 : applicationCount > 50 ? 1 : 0) + 
    (migrationMonths > 12 ? 1 : 0);
  
  let riskLevel = "Low";
  let riskColor = token.colorSuccess;
  if (rawRiskScore >= 5) {
    riskLevel = "Critical";
    riskColor = token.colorError;
  } else if (rawRiskScore >= 4) {
    riskLevel = "High";
    riskColor = token.colorWarning;
  } else if (rawRiskScore >= 3) {
    riskLevel = "Medium";
    riskColor = "#faad14";
  }

  // Charts Data
  const phaseData = [
    { name: 'Planning', value: planningCost },
    { name: 'Labor', value: laborCost },
    { name: 'App Migration', value: appMigrationCost },
    { name: 'Data Transfer', value: dataTransferCost },
    { name: 'Transport', value: transportCost },
    { name: 'Parallel Run', value: parallelRunCost },
    { name: 'Testing', value: testingCost },
    { name: 'Decommission', value: hardwareDecomCost }
  ].sort((a, b) => b.value - a.value);

  const tcoData = [
    { name: '3-Year TCO', Current: tco3yrCurrent, Migrated: tco3yrMigrated }
  ];

  // Table Data
  const tableData = [
    { key: '1', category: 'Planning & Assessment', cost: planningCost, desc: 'Initial discovery and strategy' },
    { key: '2', category: 'Core Labor Effort', cost: laborCost, desc: `${migrationFTE} FTEs for ${migrationMonths} months` },
    { key: '3', category: 'Application Migration', cost: appMigrationCost, desc: `${applicationCount} apps based on complexity (${selectedStrategy.label})` },
    { key: '4', category: 'Data Transfer', cost: dataTransferCost, desc: `${storageVolumeTB} TB migration` },
    { key: '5', category: 'Testing & Validation', cost: testingCost, desc: 'QA and UAT' },
    { key: '6', category: 'Parallel Operations', cost: parallelRunCost, desc: `${parallelRunMonths} months dual runtime` },
    { key: '7', category: 'Decommissioning', cost: hardwareDecomCost, desc: 'Tear down and disposal' },
    { key: '8', category: 'Physical Transport', cost: transportCost, desc: 'Logistics and shipping for physical servers' }
  ];

  const columns = [
    { title: 'Category', dataIndex: 'category', key: 'category', render: (text: string) => <Text strong>{text}</Text> },
    { title: 'Description', dataIndex: 'desc', key: 'desc' },
    { title: 'Cost', dataIndex: 'cost', key: 'cost', render: (val: number) => formatCurrency(val), align: 'right' as const }
  ];

  // Gantt Chart Data (Conceptual horizontal stacked)
  const ganttTimelineData = [
    { 
      name: 'Timeline', 
      Planning: migrationDurationWeeks * 0.10, 
      Assessment: migrationDurationWeeks * 0.15, 
      'Migration Execution': migrationDurationWeeks * 0.40, 
      'Testing & Validation': migrationDurationWeeks * 0.20, 
      'Cutover & Go-Live': migrationDurationWeeks * 0.10, 
      'Post-Migration Support': migrationDurationWeeks * 0.05 
    }
  ];

  const COLORS = [token.colorPrimary, token.colorInfo, token.colorSuccess, token.colorWarning, token.colorError, '#722ed1', '#eb2f96'];

  return (
    <motion.div 
      key="migration-cost" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      transition={{ duration: 0.3 }}
    >
      <Row gutter={[16, 16]}>
        {/* LEFT COLUMN: Inputs */}
        <Col xs={24} lg={10}>
          <Collapse defaultActiveKey={['1', '2', '3', '4', '5', '6', '7']} style={glassStyle}>
            
            <Panel header={<Text strong>Source & Target</Text>} key="1">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text>Source Type</Text>
                  <Select 
                    value={sourceType} 
                    onChange={setSourceType} 
                    style={{ width: '100%' }}
                    options={[
                      { value: 'onprem', label: 'On-Premises' },
                      { value: 'colo', label: 'Colocation' },
                      { value: 'legacy', label: 'Legacy DC' }
                    ]}
                  />
                </Col>
                <Col span={12}>
                  <Text>Target Type</Text>
                  <Select 
                    value={targetType} 
                    onChange={setTargetType} 
                    style={{ width: '100%' }}
                    options={[
                      { value: 'colocation', label: 'Colocation' },
                      { value: 'cloud', label: 'Public Cloud' },
                      { value: 'hybrid', label: 'Hybrid' },
                      { value: 'new_build', label: 'New Build DC' }
                    ]}
                  />
                </Col>
              </Row>
            </Panel>

            <Panel header={<Text strong>Current Environment</Text>} key="2">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text>Current Racks</Text>
                  <InputNumber min={1} max={500} value={currentRacks} onChange={(val) => setCurrentRacks(val || 40)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Current Servers</Text>
                  <InputNumber min={1} max={5000} value={currentServers} onChange={(val) => setCurrentServers(val || 200)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Storage Volume (TB)</Text>
                  <InputNumber min={1} max={10000} value={storageVolumeTB} onChange={(val) => setStorageVolumeTB(val || 100)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Network Devices</Text>
                  <InputNumber min={1} max={500} value={networkDevices} onChange={(val) => setNetworkDevices(val || 30)} style={{ width: '100%' }} />
                </Col>
              </Row>
            </Panel>

            <Panel header={<Text strong>Migration Scope & Complexity</Text>} key="3">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text>Total Applications</Text>
                  <InputNumber min={1} max={1000} value={applicationCount} onChange={(val) => setApplicationCount(val || 50)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Data Bandwidth (Gbps)</Text>
                  <InputNumber min={0.1} max={100} step={0.1} value={dataBandwidthGbps} onChange={(val) => setDataBandwidthGbps(val || 1)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Simple Apps: {complexitySimple}%</Text>
                  <Slider min={0} max={100} value={complexitySimple} onChange={(val) => handleComplexityChange('simple', val)} />
                </Col>
                <Col span={24}>
                  <Text>Medium Apps: {complexityMedium}%</Text>
                  <Slider min={0} max={100} value={complexityMedium} onChange={(val) => handleComplexityChange('medium', val)} />
                </Col>
                <Col span={24}>
                  <Text>Complex Apps: {complexityComplex}%</Text>
                  <Slider min={0} max={100} value={complexityComplex} onChange={(val) => handleComplexityChange('complex', val)} />
                </Col>
              </Row>
            </Panel>

            <Panel header={<Text strong>Cost & Labor Parameters</Text>} key="4">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text>Migration Months</Text>
                  <InputNumber min={1} max={24} value={migrationMonths} onChange={(val) => setMigrationMonths(val || 6)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Parallel Run (Months)</Text>
                  <InputNumber min={0} max={12} value={parallelRunMonths} onChange={(val) => setParallelRunMonths(val || 3)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Migration FTEs</Text>
                  <InputNumber min={1} max={20} value={migrationFTE} onChange={(val) => setMigrationFTE(val || 5)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>FTE Hourly Rate ($)</Text>
                  <InputNumber min={10} max={500} value={fteHourlyCost} onChange={(val) => setFteHourlyCost(val || 100)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Current Monthly Opex ($)</Text>
                  <InputNumber min={0} value={currentMonthlyOpex} onChange={(val) => setCurrentMonthlyOpex(val || 50000)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Target Monthly Opex ($)</Text>
                  <InputNumber min={0} value={targetMonthlyOpex} onChange={(val) => setTargetMonthlyOpex(val || 35000)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text>Decommission Cost ($)</Text>
                  <InputNumber min={0} value={decommissionCost} onChange={(val) => setDecommissionCost(val || 25000)} style={{ width: '100%' }} />
                </Col>
              </Row>
            </Panel>

            <Panel header={<Text strong>Cloud Credit Offset</Text>} key="5">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text>Cloud Provider</Text>
                  <Select 
                    value={cloudProvider} 
                    onChange={setCloudProvider} 
                    style={{ width: '100%' }}
                    options={[
                      { value: 'None', label: 'None' },
                      { value: 'AWS', label: 'AWS' },
                      { value: 'Azure', label: 'Azure' },
                      { value: 'GCP', label: 'GCP' },
                      { value: 'Oracle', label: 'Oracle' }
                    ]}
                  />
                </Col>
                <Col span={12}>
                  <Text>Credit Amount ($)</Text>
                  <InputNumber min={0} max={5000000} value={cloudCreditAmount} onChange={(val) => setCloudCreditAmount(val || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Credit Duration (Months)</Text>
                  <InputNumber min={1} max={60} value={creditDuration} onChange={(val) => setCreditDuration(val || 12)} style={{ width: '100%' }} />
                </Col>
              </Row>
            </Panel>

            <Panel header={<Text strong>Migration Strategy & Timeline</Text>} key="6">
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Text style={{ display: 'block', marginBottom: 8 }}>7-R Strategy Selection</Text>
                  <Radio.Group onChange={(e) => setMigrationStrategy(e.target.value)} value={migrationStrategy}>
                    <Row gutter={[8, 8]}>
                      {Object.entries(strategyOptions).map(([key, opt]) => (
                        <Col span={12} key={key}>
                          <Radio value={key}>{opt.label} ({opt.mult}x)</Radio>
                        </Col>
                      ))}
                    </Row>
                  </Radio.Group>
                </Col>
                <Col span={24}>
                  <Text>Migration Duration (Weeks)</Text>
                  <InputNumber min={1} max={104} value={migrationDurationWeeks} onChange={(val) => setMigrationDurationWeeks(val || 12)} style={{ width: '100%' }} />
                </Col>
              </Row>
            </Panel>

            <Panel header={<Text strong>Physical Transport / Logistics</Text>} key="7">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text>Physical Servers</Text>
                  <InputNumber min={0} max={10000} value={physicalServers} onChange={(val) => setPhysicalServers(val || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                  <Text>Shipping Distance (km)</Text>
                  <InputNumber min={0} max={20000} value={shippingDistanceKm} onChange={(val) => setShippingDistanceKm(val || 0)} style={{ width: '100%' }} />
                </Col>
                <Col span={24}>
                  <Text style={{ marginRight: 8 }}>Requires Special Transport?</Text>
                  <Switch checked={requiresSpecialTransport} onChange={setRequiresSpecialTransport} />
                </Col>
              </Row>
            </Panel>
            
          </Collapse>
        </Col>

        {/* RIGHT COLUMN: Outputs */}
        <Col xs={24} lg={14}>
          <Card style={{ ...glassStyle, marginBottom: 16, backgroundColor: isDark ? 'rgba(23,125,220,0.2)' : 'rgba(24,144,255,0.1)' }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Title level={3} style={{ margin: 0 }}>
                  <RocketOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                  Migration Estimator
                </Title>
                <Text type="secondary">Total Estimated Cost to Migrate</Text>
              </Col>
              <Col style={{ textAlign: 'right' }}>
                <Title level={2} style={{ margin: 0, color: token.colorPrimary }}>{formatCurrency(totalMigrationCost)}</Title>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={8}>
              <Card style={glassStyle} size="small">
                <Statistic title="Total Cost" value={totalMigrationCost} formatter={(v) => formatCurrency(Number(v))} prefix={<DollarOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card style={glassStyle} size="small">
                <Statistic title="Annual Savings" value={annualSavings} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ color: annualSavings > 0 ? token.colorSuccess : token.colorError }} />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card style={glassStyle} size="small">
                <Statistic title="Payback Period" value={isFinite(paybackMonths) ? paybackMonths : 0} suffix="mo" precision={1} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card style={glassStyle} size="small">
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Risk Score</Text>
                <Badge color={riskColor} text={<Text strong style={{ fontSize: 16 }}>{riskLevel}</Text>} />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card style={glassStyle} size="small">
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Strategy Risk</Text>
                <Badge color={selectedStrategy.riskColor} text={<Text strong style={{ fontSize: 16 }}>{selectedStrategy.risk}</Text>} />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card style={glassStyle} size="small">
                <Statistic title="Cloud Credits Applied" value={cloudCreditAmount} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ color: token.colorSuccess }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{formatCurrency(monthlyCredit)}/mo offset</Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Migration Cost Breakdown" style={glassStyle} size="small">
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={phaseData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#444" : "#ccc"} horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} stroke={isDark ? "#aaa" : "#666"} />
                      <YAxis dataKey="name" type="category" stroke={isDark ? "#aaa" : "#666"} width={90} tick={{ fontSize: 11 }} />
                      <RechartsTooltip 
                        formatter={(val: number) => formatCurrency(val)} 
                        contentStyle={{ backgroundColor: isDark ? '#333' : '#fff' }} 
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {phaseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="3-Year TCO Comparison" style={glassStyle} size="small">
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tcoData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#444" : "#ccc"} vertical={false} />
                      <XAxis dataKey="name" stroke={isDark ? "#aaa" : "#666"} />
                      <YAxis tickFormatter={(v) => `$${v / 1000}k`} stroke={isDark ? "#aaa" : "#666"} />
                      <RechartsTooltip 
                        formatter={(val: number) => formatCurrency(val)} 
                        contentStyle={{ backgroundColor: isDark ? '#333' : '#fff' }} 
                      />
                      <Legend />
                      <Bar dataKey="Current" fill={token.colorError} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Migrated" fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Card title="Migration Phase Timeline (Weeks)" style={{ ...glassStyle, marginTop: 16 }} size="small">
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ganttTimelineData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" hide />
                  <RechartsTooltip formatter={(val: number) => `${formatNumber(val)} weeks`} />
                  <Bar dataKey="Planning" stackId="a" fill={COLORS[0]} radius={[4, 0, 0, 4]} />
                  <Bar dataKey="Assessment" stackId="a" fill={COLORS[1]} />
                  <Bar dataKey="Migration Execution" stackId="a" fill={COLORS[2]} />
                  <Bar dataKey="Testing & Validation" stackId="a" fill={COLORS[3]} />
                  <Bar dataKey="Cutover & Go-Live" stackId="a" fill={COLORS[4]} />
                  <Bar dataKey="Post-Migration Support" stackId="a" fill={COLORS[5]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
              <Text><Badge color={COLORS[0]} text="Planning" /></Text>
              <Text><Badge color={COLORS[1]} text="Assessment" /></Text>
              <Text><Badge color={COLORS[2]} text="Migration Execution" /></Text>
              <Text><Badge color={COLORS[3]} text="Testing & Validation" /></Text>
              <Text><Badge color={COLORS[4]} text="Cutover" /></Text>
              <Text><Badge color={COLORS[5]} text="Support" /></Text>
            </div>
          </Card>

          <Card title="Detailed Cost Breakdown" style={{ ...glassStyle, marginTop: 16 }} size="small">
            <Table 
              dataSource={tableData} 
              columns={columns} 
              pagination={false} 
              size="small"
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}><Text strong>Total Expected Cost</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><Text strong type="success">{formatCurrency(totalMigrationCost)}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
          
          <Card style={{ ...glassStyle, marginTop: 16 }} size="small">
            <Row align="middle">
              <Col xs={4} sm={2} style={{ textAlign: 'center' }}>
                <WarningOutlined style={{ fontSize: 24, color: token.colorWarning }} />
              </Col>
              <Col xs={20} sm={22}>
                <Text strong>Data Transfer Estimate: </Text>
                <Text>
                  Moving {formatNumber(storageVolumeTB)} TB over a {dataBandwidthGbps} Gbps link will take approximately <Text strong>{formatNumber(dataTransferTimeHrs)}</Text> hours 
                  ({formatNumber(dataTransferTimeHrs / 24)} days) of continuous transfer, assuming 100% utilization.
                </Text>
              </Col>
            </Row>
          </Card>

        </Col>
      </Row>
    </motion.div>
  );
}
