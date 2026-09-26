import React, { useState, useEffect } from "react";
import { Row, Col, Card, Typography, InputNumber, Slider, Divider, Alert, Select, Collapse, Table, Statistic, Progress } from "antd";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { WarningOutlined, DollarOutlined, ClockCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const INDUSTRY_PRESETS: Record<string, any> = {
  "Financial Services": { revMin: 9000, prodMin: 25000, sla: 50000, comp: 0, framework: 'None' },
  "Healthcare": { revMin: 5000, prodMin: 15000, sla: 0, comp: 100000, framework: 'HIPAA' },
  "E-Commerce": { revMin: 12000, prodMin: 8000, sla: 20000, comp: 0, framework: 'PCI-DSS' },
  "Manufacturing": { revMin: 7000, prodMin: 20000, sla: 30000, comp: 0, framework: 'None' },
  "Government": { revMin: 2000, prodMin: 10000, sla: 5000, comp: 0, framework: 'None' },
  "Telecom": { revMin: 15000, prodMin: 12000, sla: 75000, comp: 0, framework: 'None' },
};

interface DowntimeCostProps {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

const TIER_DATA: Record<string, number> = {
  'I': 99.671,
  'II': 99.741,
  'III': 99.982,
  'IV': 99.995
};

export function DowntimeCost({ isDark, token, glassStyle }: DowntimeCostProps) {
  const [annualRevenue, setAnnualRevenue] = useState(10000000);
  const [revenueDcDependent, setRevenueDcDependent] = useState(60);
  const [employeesAffected, setEmployeesAffected] = useState(200);
  const [hourlyEmployeeCost, setHourlyEmployeeCost] = useState(50);
  
  const [tierLevel, setTierLevel] = useState<string>('III');
  const [customSlaTarget, setCustomSlaTarget] = useState(99.982);
  
  const [avgRecoveryHours, setAvgRecoveryHours] = useState(4);
  const [incidentsPerYear, setIncidentsPerYear] = useState(2);
  const [penaltyPerHour, setPenaltyPerHour] = useState(10000);
  const [reputationMultiplier, setReputationMultiplier] = useState(1.5);

  const [selectedIndustry, setSelectedIndustry] = useState('Custom');
  const [complianceFramework, setComplianceFramework] = useState('None');
  const [dataRecoveryCostPerTb, setDataRecoveryCostPerTb] = useState(5000);
  const [affectedDataTb, setAffectedDataTb] = useState(10);
  const [recoveryTimeFactor, setRecoveryTimeFactor] = useState(1);
  const [targetAvailability, setTargetAvailability] = useState(99.99);

  useEffect(() => {
    setCustomSlaTarget(TIER_DATA[tierLevel] || 99.982);
  }, [tierLevel]);

  const handleIndustryChange = (val: string) => {
    setSelectedIndustry(val);
    if (INDUSTRY_PRESETS[val]) {
      const p = INDUSTRY_PRESETS[val];
      setAnnualRevenue(p.revMin * 60 * 8760);
      setRevenueDcDependent(100);
      setHourlyEmployeeCost(50);
      setEmployeesAffected((p.prodMin * 60) / 50);
      setPenaltyPerHour(p.sla);
      setComplianceFramework(p.framework);
    }
  };

  const frameworkFines: Record<string, number> = {
    'None': 0, 'SOX': 50000, 'HIPAA': 100000, 'PCI-DSS': 25000, 'GDPR': 200000, 'ISO-27001': 10000
  };
  const regulatoryFinePerHour = frameworkFines[complianceFramework] || 0;

  // Calculations
  const expectedDowntimeHrs = (1 - customSlaTarget / 100) * 8760;
  const revenuePerHour = annualRevenue * (revenueDcDependent / 100) / 8760;
  const costPerHour = revenuePerHour + (employeesAffected * hourlyEmployeeCost) + penaltyPerHour + regulatoryFinePerHour;
  const costPerMinute = costPerHour / 60;
  
  const lostRevenuePerIncident = revenuePerHour * avgRecoveryHours;
  const laborCostPerIncident = employeesAffected * hourlyEmployeeCost * avgRecoveryHours;
  const penaltyPerIncident = penaltyPerHour * avgRecoveryHours;
  const complianceCostPerIncident = regulatoryFinePerHour * avgRecoveryHours;
  const dataRecoveryCost = dataRecoveryCostPerTb * affectedDataTb * recoveryTimeFactor;

  const baseCostPerIncident = lostRevenuePerIncident + laborCostPerIncident + penaltyPerIncident + complianceCostPerIncident + dataRecoveryCost;
  
  const costPerIncident = baseCostPerIncident * reputationMultiplier;
  const reputationCostPerIncident = costPerIncident - baseCostPerIncident;
  
  const annualDowntimeCost = costPerIncident * incidentsPerYear;
  
  const MTBF = 8760 / Math.max(incidentsPerYear, 1);
  const MTTR = avgRecoveryHours;
  const availability = (MTBF / (MTBF + MTTR)) * 100;
  
  const formatCurrency = (val: number) => '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
  
  const chartData = [
    {
      name: "Cost Per Incident",
      "Lost Revenue": lostRevenuePerIncident,
      "Labor Cost": laborCostPerIncident,
      "Penalties": penaltyPerIncident,
      "Compliance": complianceCostPerIncident,
      "Data Recovery": dataRecoveryCost,
      "Reputation Cost": reputationCostPerIncident
    }
  ];

  const cascadeData = [
    { time: '0-5 min', cost: costPerHour * 0.1, fill: '#87d068' },
    { time: '5-15 min', cost: costPerHour * 0.25, fill: '#faad14' },
    { time: '15-60 min', cost: costPerHour, fill: '#ff4d4f' },
    { time: '1-4 hr', cost: costPerHour + penaltyPerHour, fill: '#f5222d' },
    { time: '4-24 hr', cost: costPerHour + penaltyPerHour + regulatoryFinePerHour + (dataRecoveryCost / Math.max(avgRecoveryHours, 1)), fill: '#722ed1' },
    { time: '24+ hr', cost: (costPerHour + penaltyPerHour + regulatoryFinePerHour) * 1.5, fill: '#000000' }
  ];

  const allowedDowntimeMinutes = (1 - targetAvailability / 100) * 8760 * 60;
  const currentEstDowntimeMinutes = avgRecoveryHours * incidentsPerYear * 60;
  const budgetUsedPercent = Math.min((currentEstDowntimeMinutes / allowedDowntimeMinutes) * 100, 100);
  const remainingBudgetMinutes = Math.max(allowedDowntimeMinutes - currentEstDowntimeMinutes, 0);

  const getTierCost = (tierUptime: number) => {
    const dHrs = (1 - tierUptime / 100) * 8760;
    const estimatedCost = costPerHour * dHrs * reputationMultiplier;
    return {
      uptime: tierUptime,
      downtimeHrs: dHrs,
      annualCost: estimatedCost
    };
  };

  const tierTableData = ['I', 'II', 'III', 'IV'].map(t => {
    const tc = getTierCost(TIER_DATA[t]);
    return {
      key: t,
      tier: `Tier ${t}`,
      uptime: `${tc.uptime}%`,
      downtimeHrs: tc.downtimeHrs.toFixed(2) + 'h',
      annualCost: formatCurrency(tc.annualCost)
    };
  });

  const columns = [
    { title: 'Tier', dataIndex: 'tier', key: 'tier' },
    { title: 'Uptime', dataIndex: 'uptime', key: 'uptime' },
    { title: 'Downtime (hrs/yr)', dataIndex: 'downtimeHrs', key: 'downtimeHrs' },
    { title: 'Estimated Annual Cost', dataIndex: 'annualCost', key: 'annualCost' }
  ];

  const textColor = isDark ? "#fff" : "#000";
  const redColor = "#ff4d4f";

  // upgrade logic
  const currentTierIndex = ['I', 'II', 'III', 'IV'].indexOf(tierLevel);
  const nextTier = currentTierIndex < 3 ? ['I', 'II', 'III', 'IV'][currentTierIndex + 1] : null;
  const currentTierEstCost = getTierCost(TIER_DATA[tierLevel]).annualCost;
  const nextTierEstCost = nextTier ? getTierCost(TIER_DATA[nextTier]).annualCost : 0;
  const savings = currentTierEstCost - nextTierEstCost;

  return (
    <motion.div key="downtime-cost" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={10}>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: textColor }}>Industry Preset:</Text>
            <Select style={{ width: "100%", marginTop: 8 }} value={selectedIndustry} onChange={handleIndustryChange}>
              {Object.keys(INDUSTRY_PRESETS).map(ind => <Option key={ind} value={ind}>{ind}</Option>)}
              <Option value="Custom">Custom</Option>
            </Select>
          </div>
          <Collapse defaultActiveKey={['1', '2', '3', '4', '5', '6']} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }}>
            <Panel header="Business Impact" key="1">
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Annual Revenue ($):</Text>
                <InputNumber
                  style={{ width: "100%", marginTop: 8 }}
                  min={0}
                  step={100000}
                  value={annualRevenue}
                  onChange={(val) => setAnnualRevenue(val || 0)}
                  formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Revenue DC Dependent (%): {revenueDcDependent}%</Text>
                <Slider min={0} max={100} value={revenueDcDependent} onChange={setRevenueDcDependent} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Employees Affected:</Text>
                <InputNumber style={{ width: "100%", marginTop: 8 }} min={1} value={employeesAffected} onChange={(val) => setEmployeesAffected(val || 1)} />
              </div>
              <div>
                <Text style={{ color: textColor }}>Hourly Employee Cost ($/hr):</Text>
                <InputNumber style={{ width: "100%", marginTop: 8 }} min={0} value={hourlyEmployeeCost} onChange={(val) => setHourlyEmployeeCost(val || 0)} />
              </div>
            </Panel>
            
            <Panel header="Infrastructure Tier" key="2">
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Tier Level:</Text>
                <Select style={{ width: "100%", marginTop: 8 }} value={tierLevel} onChange={setTierLevel}>
                  <Option value="I">Tier I (99.671%)</Option>
                  <Option value="II">Tier II (99.741%)</Option>
                  <Option value="III">Tier III (99.982%)</Option>
                  <Option value="IV">Tier IV (99.995%)</Option>
                </Select>
              </div>
              <div>
                <Text style={{ color: textColor }}>Custom SLA Target (%):</Text>
                <InputNumber style={{ width: "100%", marginTop: 8 }} min={90} max={100} step={0.001} value={customSlaTarget} onChange={(val) => setCustomSlaTarget(val || 99)} />
              </div>
            </Panel>

            <Panel header="Recovery Parameters" key="3">
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Avg Recovery Hours (MTTR): {avgRecoveryHours}h</Text>
                <Slider min={0.1} max={72} step={0.1} value={avgRecoveryHours} onChange={setAvgRecoveryHours} />
              </div>
              <div>
                <Text style={{ color: textColor }}>Incidents Per Year:</Text>
                <Slider min={0} max={50} value={incidentsPerYear} onChange={setIncidentsPerYear} />
              </div>
            </Panel>

            <Panel header="Penalties & Reputation" key="4">
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>SLA Penalty ($/hr):</Text>
                <InputNumber style={{ width: "100%", marginTop: 8 }} min={0} step={1000} value={penaltyPerHour} onChange={(val) => setPenaltyPerHour(val || 0)} />
              </div>
              <div>
                <Text style={{ color: textColor }}>Reputation Impact Multiplier: {reputationMultiplier}x</Text>
                <Slider min={1} max={5} step={0.1} value={reputationMultiplier} onChange={setReputationMultiplier} />
                <Text type="secondary" style={{ fontSize: 12 }}>Multiplies the direct cost to account for lost future business and reputation damage.</Text>
              </div>
            </Panel>

            <Panel header="Regulatory & Compliance" key="5">
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Compliance Framework:</Text>
                <Select style={{ width: "100%", marginTop: 8 }} value={complianceFramework} onChange={setComplianceFramework}>
                  <Option value="None">None ($0)</Option>
                  <Option value="SOX">SOX ($50K/hr)</Option>
                  <Option value="HIPAA">HIPAA ($100K/hr)</Option>
                  <Option value="PCI-DSS">PCI-DSS ($25K/hr)</Option>
                  <Option value="GDPR">GDPR ($200K/hr)</Option>
                  <Option value="ISO-27001">ISO-27001 ($10K/hr)</Option>
                </Select>
              </div>
            </Panel>

            <Panel header="Data Recovery" key="6">
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Recovery Cost per TB ($):</Text>
                <InputNumber style={{ width: "100%", marginTop: 8 }} min={0} max={50000} step={100} value={dataRecoveryCostPerTb} onChange={(val) => setDataRecoveryCostPerTb(val || 0)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Affected Data (TB):</Text>
                <InputNumber style={{ width: "100%", marginTop: 8 }} min={0} max={1000} value={affectedDataTb} onChange={(val) => setAffectedDataTb(val || 0)} />
              </div>
              <div>
                <Text style={{ color: textColor }}>Recovery Time Factor:</Text>
                <Select style={{ width: "100%", marginTop: 8 }} value={recoveryTimeFactor} onChange={setRecoveryTimeFactor}>
                  <Option value={1}>Hot standby (1x)</Option>
                  <Option value={2}>Warm (2x)</Option>
                  <Option value={4}>Cold (4x)</Option>
                  <Option value={8}>Tape (8x)</Option>
                </Select>
              </div>
            </Panel>
          </Collapse>
        </Col>

        <Col xs={24} lg={14}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            <Alert
              message={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Title level={3} style={{ margin: 0, color: redColor }}>
                    <WarningOutlined style={{ marginRight: 8 }} />
                    Estimated Annual Downtime Cost
                  </Title>
                  <Title level={2} style={{ margin: 0, color: redColor }}>
                    {formatCurrency(annualDowntimeCost)}
                  </Title>
                </div>
              }
              type="error"
              showIcon={false}
              style={{ backgroundColor: isDark ? 'rgba(255, 77, 79, 0.1)' : '#fff2f0', borderColor: redColor, padding: 24 }}
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card style={{ ...glassStyle, borderColor: isDark ? '#333' : '#e8e8e8' }} bodyStyle={{ padding: 16 }}>
                  <Statistic title={<Text style={{ color: textColor }}>Cost / Minute</Text>} value={costPerMinute} precision={0} prefix="$" valueStyle={{ color: redColor }} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card style={{ ...glassStyle, borderColor: isDark ? '#333' : '#e8e8e8' }} bodyStyle={{ padding: 16 }}>
                  <Statistic title={<Text style={{ color: textColor }}>Cost / Hour</Text>} value={costPerHour} precision={0} prefix="$" valueStyle={{ color: redColor }} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card style={{ ...glassStyle, borderColor: isDark ? '#333' : '#e8e8e8' }} bodyStyle={{ padding: 16 }}>
                  <Statistic title={<Text style={{ color: textColor }}>Cost / Incident</Text>} value={costPerIncident} precision={0} prefix="$" valueStyle={{ color: redColor }} />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card style={{ ...glassStyle, borderColor: isDark ? '#333' : '#e8e8e8' }} bodyStyle={{ padding: 16 }}>
                  <Statistic title={<Text style={{ color: textColor }}>MTBF (Hours)</Text>} value={MTBF} precision={1} prefix={<ClockCircleOutlined />} valueStyle={{ color: token.colorPrimary }} />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card style={{ ...glassStyle, borderColor: isDark ? '#333' : '#e8e8e8' }} bodyStyle={{ padding: 16 }}>
                  <Statistic title={<Text style={{ color: textColor }}>Actual Availability</Text>} value={availability} precision={4} suffix="%" prefix={<ThunderboltOutlined />} valueStyle={{ color: availability >= customSlaTarget ? token.colorSuccess : redColor }} />
                </Card>
              </Col>
            </Row>

            <Card title={<Text style={{ color: textColor }}>Cost Breakdown per Incident</Text>} style={{ ...glassStyle }}>
              <div style={{ height: 300, width: "100%" }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#444" : "#e0e0e0"} />
                    <XAxis type="number" tick={{ fill: textColor }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: textColor }} width={120} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderColor: isDark ? '#333' : '#ccc' }} />
                    <Legend />
                    <Bar dataKey="Lost Revenue" stackId="a" fill="#1890ff" />
                    <Bar dataKey="Labor Cost" stackId="a" fill="#faad14" />
                    <Bar dataKey="Penalties" stackId="a" fill="#ff4d4f" />
                    <Bar dataKey="Compliance" stackId="a" fill="#eb2f96" />
                    <Bar dataKey="Data Recovery" stackId="a" fill="#13c2c2" />
                    <Bar dataKey="Reputation Cost" stackId="a" fill="#722ed1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={<Text style={{ color: textColor }}>Cascading Impact Timeline (Cost vs Time)</Text>} style={{ ...glassStyle }}>
              <div style={{ height: 400, width: "100%" }}>
                <ResponsiveContainer>
                  <BarChart data={cascadeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#444" : "#e0e0e0"} />
                    <XAxis dataKey="time" tick={{ fill: textColor }} />
                    <YAxis tick={{ fill: textColor }} width={80} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderColor: isDark ? '#333' : '#ccc' }} />
                    <Bar dataKey="cost">
                      {cascadeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={<Text style={{ color: textColor }}>Annual Downtime Budget</Text>} style={{ ...glassStyle }}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor }}>Target Availability: </Text>
                <Select style={{ width: 150, marginLeft: 8 }} value={targetAvailability} onChange={setTargetAvailability}>
                  <Option value={99.9}>99.9%</Option>
                  <Option value={99.99}>99.99%</Option>
                  <Option value={99.999}>99.999%</Option>
                  <Option value={99.9999}>99.9999%</Option>
                </Select>
              </div>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: textColor }}>Budget Used: {currentEstDowntimeMinutes.toFixed(1)} mins</Text>
                <Text style={{ color: textColor }}>Remaining: {remainingBudgetMinutes.toFixed(1)} mins (of {allowedDowntimeMinutes.toFixed(1)})</Text>
              </div>
              <Progress percent={Math.round(budgetUsedPercent)} status={budgetUsedPercent > 100 ? 'exception' : 'active'} strokeColor={budgetUsedPercent > 100 ? '#ff4d4f' : '#52c41a'} />
            </Card>

            <Card title={<Text style={{ color: textColor }}>Tier Comparison</Text>} style={{ ...glassStyle }}>
              <Table 
                dataSource={tierTableData} 
                columns={columns} 
                pagination={false} 
                rowClassName={(record) => record.key === tierLevel ? (isDark ? 'ant-table-row-selected' : '') : ''} 
                size="small"
              />
            </Card>

            {nextTier && (
              <Card style={{ ...glassStyle, backgroundColor: isDark ? 'rgba(82, 196, 26, 0.1)' : '#f6ffed', borderColor: token.colorSuccess }}>
                <Title level={4} style={{ color: token.colorSuccess, marginTop: 0 }}>
                  ROI of Tier Upgrade (To Tier {nextTier})
                </Title>
                <Text style={{ color: textColor, display: 'block', marginBottom: 16 }}>
                  Upgrading to Tier {nextTier} ({TIER_DATA[nextTier]}% uptime) could save your business approximately:
                </Text>
                <Title level={2} style={{ color: token.colorSuccess, margin: 0 }}>
                  {formatCurrency(savings)} <span style={{ fontSize: 16, fontWeight: 'normal' }}>/ year in prevented downtime</span>
                </Title>
              </Card>
            )}

          </div>
        </Col>
      </Row>
    </motion.div>
  );
}
