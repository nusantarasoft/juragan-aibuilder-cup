import React, { useState, useMemo } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  InputNumber, 
  Slider, 
  Space, 
  Divider, 
  Collapse, 
  Table,
  Select,
  Tooltip as AntTooltip,
  Progress
} from "antd";
import { 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { motion } from "framer-motion";
import { 
  DollarOutlined, 
  ThunderboltOutlined, 
  TeamOutlined, 
  ToolOutlined,
  InfoCircleOutlined,
  ExperimentOutlined
} from "@ant-design/icons";

const { Text, Title } = Typography;
const { Panel } = Collapse;

export interface OpExCalculatorProps {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff7300', '#d0ed57', '#a4de6c', '#8dd1e1'];

export const OpExCalculator: React.FC<OpExCalculatorProps> = ({ isDark, token, glassStyle }) => {
  // Local state for all inputs
  const [itLoad, setItLoad] = useState<number>(500);
  const [pue, setPue] = useState<number>(1.5);
  const [electricityRate, setElectricityRate] = useState<number>(0.10);
  
  const [staffFacility, setStaffFacility] = useState<number>(4);
  const [staffNetwork, setStaffNetwork] = useState<number>(3);
  const [staffSecurity, setStaffSecurity] = useState<number>(2);
  const [staffManagement, setStaffManagement] = useState<number>(1);
  
  const [salaryFacility, setSalaryFacility] = useState<number>(65000);
  const [salaryNetwork, setSalaryNetwork] = useState<number>(85000);
  const [salarySecurity, setSalarySecurity] = useState<number>(55000);
  const [salaryManagement, setSalaryManagement] = useState<number>(110000);
  
  const [maintenancePct, setMaintenancePct] = useState<number>(8);
  const [estimatedCapex, setEstimatedCapex] = useState<number>(5000000);
  
  const [annualInsurance, setAnnualInsurance] = useState<number>(50000);
  const [annualPropertyTax, setAnnualPropertyTax] = useState<number>(30000);
  const [internetCost, setInternetCost] = useState<number>(5000); // monthly
  const [softwareLicenses, setSoftwareLicenses] = useState<number>(25000); // annual
  
  const [evalYears, setEvalYears] = useState<number>(5);
  const [inflationRate, setInflationRate] = useState<number>(3); // percentage

  const [currency, setCurrency] = useState<string>('usd');
  const [waterUsageRate, setWaterUsageRate] = useState<number>(1.8);
  const [waterCostPerLiter, setWaterCostPerLiter] = useState<number>(0.003);
  const [benefitsMultiplier, setBenefitsMultiplier] = useState<number>(1.30);
  const [consumablesRate, setConsumablesRate] = useState<number>(15);

  const CURR = { 
    usd: { sym: '$', rate: 1 }, 
    eur: { sym: '€', rate: 0.92 }, 
    gbp: { sym: '£', rate: 0.79 }, 
    idr: { sym: 'Rp', rate: 15500 } 
  };

  // Formatter
  const fmtCurr = (val: number) => {
    const c = CURR[currency as keyof typeof CURR];
    return c.sym + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val * c.rate);
  };

  // Derived values
  const { 
    annualPowerCost, 
    annualStaffing, 
    annualMaintenance, 
    annualInternet, 
    totalAnnualOpex, 
    monthlyOpex, 
    costPerKwMonth,
    totalStaff,
    powerPct,
    pieData,
    projectionData,
    tableData
  } = useMemo(() => {
    // Current year costs
    const annualPowerCost = itLoad * pue * 8760 * electricityRate;
    const annualStaffFacility = staffFacility * salaryFacility;
    const annualStaffNetwork = staffNetwork * salaryNetwork;
    const annualStaffSecurity = staffSecurity * salarySecurity;
    const annualStaffManagement = staffManagement * salaryManagement;
    const annualStaffing = (annualStaffFacility + annualStaffNetwork + annualStaffSecurity + annualStaffManagement) * benefitsMultiplier;
    
    const annualMaintenance = (estimatedCapex * maintenancePct) / 100;
    const annualInternet = internetCost * 12;
    
    const annualWaterLiters = itLoad * pue * 8760 * waterUsageRate;
    const annualWaterCost = annualWaterLiters * waterCostPerLiter;
    const annualConsumables = annualMaintenance * (consumablesRate / 100);

    const totalAnnualOpex = annualPowerCost + annualStaffing + annualMaintenance + annualInsurance + annualPropertyTax + annualInternet + softwareLicenses + annualWaterCost + annualConsumables;
    
    const monthlyOpex = totalAnnualOpex / 12;
    const costPerKwMonth = itLoad > 0 ? monthlyOpex / itLoad : 0;
    const totalStaff = staffFacility + staffNetwork + staffSecurity + staffManagement;
    const powerPct = totalAnnualOpex > 0 ? (annualPowerCost / totalAnnualOpex) * 100 : 0;

    // Pie chart data
    const pieData = [
      { name: 'Power', value: annualPowerCost },
      { name: 'Staffing', value: annualStaffing },
      { name: 'Maintenance', value: annualMaintenance },
      { name: 'Water', value: annualWaterCost },
      { name: 'Consumables', value: annualConsumables },
      { name: 'Insurance', value: annualInsurance },
      { name: 'Tax', value: annualPropertyTax },
      { name: 'Internet', value: annualInternet },
      { name: 'Software', value: softwareLicenses }
    ].filter(d => d.value > 0);

    // Multi-year projection
    const projectionData = [];
    const tableData = [];
    
    for (let year = 1; year <= evalYears; year++) {
      const inflationMultiplier = Math.pow(1 + inflationRate / 100, year - 1);
      
      const pData = {
        year: `Year ${year}`,
        Power: annualPowerCost * inflationMultiplier,
        Staffing: annualStaffing * inflationMultiplier,
        Maintenance: annualMaintenance * inflationMultiplier,
        Water: annualWaterCost * inflationMultiplier,
        Consumables: annualConsumables * inflationMultiplier,
        Insurance: annualInsurance * inflationMultiplier,
        Tax: annualPropertyTax * inflationMultiplier,
        Internet: annualInternet * inflationMultiplier,
        Software: softwareLicenses * inflationMultiplier,
      };
      
      const totalForYear = (Object.values(pData) as (string | number)[]).reduce<number>((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
      
      projectionData.push(pData);
      
      tableData.push({
        key: year,
        year: `Year ${year}`,
        power: fmtCurr(pData.Power),
        staffing: fmtCurr(pData.Staffing),
        maintenance: fmtCurr(pData.Maintenance),
        others: fmtCurr(pData.Insurance + pData.Tax + pData.Internet + pData.Software + pData.Water + pData.Consumables),
        total: fmtCurr(totalForYear)
      });
    }

    return {
      annualPowerCost,
      annualStaffing,
      annualMaintenance,
      annualInternet,
      totalAnnualOpex,
      monthlyOpex,
      costPerKwMonth,
      totalStaff,
      powerPct,
      pieData,
      projectionData,
      tableData
    };
  }, [
    itLoad, pue, electricityRate, 
    staffFacility, staffNetwork, staffSecurity, staffManagement,
    salaryFacility, salaryNetwork, salarySecurity, salaryManagement,
    maintenancePct, estimatedCapex,
    annualInsurance, annualPropertyTax, internetCost, softwareLicenses,
    evalYears, inflationRate, currency, waterUsageRate, waterCostPerLiter, benefitsMultiplier, consumablesRate
  ]);

  const columns = [
    { title: 'Year', dataIndex: 'year', key: 'year' },
    { title: 'Power', dataIndex: 'power', key: 'power', align: 'right' as const },
    { title: 'Staffing', dataIndex: 'staffing', key: 'staffing', align: 'right' as const },
    { title: 'Maintenance', dataIndex: 'maintenance', key: 'maintenance', align: 'right' as const },
    { title: 'Others', dataIndex: 'others', key: 'others', align: 'right' as const },
    { title: 'Total OpEx', dataIndex: 'total', key: 'total', align: 'right' as const, render: (text: string) => <strong>{text}</strong> },
  ];

  const tooltipFormatter = (value: number) => [fmtCurr(value), ''];

  return (
    <motion.div 
      key="opex-calculator" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      transition={{ duration: 0.3 }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Collapse defaultActiveKey={['power', 'staffing', 'maintenance', 'projection']} style={{ background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', borderColor: isDark ? '#303030' : '#d9d9d9' }}>
            <Panel header={<Text strong><ThunderboltOutlined /> Power Costs</Text>} key="power">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>IT Load (kW)</Text>
                    <InputNumber min={100} max={100000} value={itLoad} onChange={v => setItLoad(v || 0)} />
                  </div>
                  <Slider min={100} max={10000} step={100} value={itLoad} onChange={v => setItLoad(v)} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>PUE</Text>
                    <InputNumber min={1.1} max={3.0} step={0.1} value={pue} onChange={v => setPue(v || 1.1)} />
                  </div>
                  <Slider min={1.1} max={3.0} step={0.05} value={pue} onChange={v => setPue(v)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>Electricity Rate ({CURR[currency as keyof typeof CURR].sym}/kWh)</Text>
                  <Space>
                    <Select value={currency} onChange={setCurrency} style={{ width: 80 }}>
                      <Select.Option value="usd">USD</Select.Option>
                      <Select.Option value="eur">EUR</Select.Option>
                      <Select.Option value="gbp">GBP</Select.Option>
                      <Select.Option value="idr">IDR</Select.Option>
                    </Select>
                    <InputNumber min={0.01} max={0.50} step={0.01} value={electricityRate} onChange={v => setElectricityRate(v || 0.01)} />
                  </Space>
                </div>
              </Space>
            </Panel>
            
            <Panel header={<Text strong><TeamOutlined /> Staffing</Text>} key="staffing">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text type="secondary">Headcount & Avg Annual Salary</Text>
                
                <Row gutter={8} align="middle">
                  <Col span={8}><Text>Facility</Text></Col>
                  <Col span={6}><InputNumber min={0} max={50} value={staffFacility} onChange={v => setStaffFacility(v || 0)} style={{ width: '100%' }} /></Col>
                  <Col span={10}>
                    <InputNumber 
                      min={0} value={salaryFacility} onChange={v => setSalaryFacility(v || 0)} 
                      formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      style={{ width: '100%' }} 
                    />
                  </Col>
                </Row>
                
                <Row gutter={8} align="middle">
                  <Col span={8}><Text>Network/IT</Text></Col>
                  <Col span={6}><InputNumber min={0} max={50} value={staffNetwork} onChange={v => setStaffNetwork(v || 0)} style={{ width: '100%' }} /></Col>
                  <Col span={10}>
                    <InputNumber 
                      min={0} value={salaryNetwork} onChange={v => setSalaryNetwork(v || 0)} 
                      formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      style={{ width: '100%' }} 
                    />
                  </Col>
                </Row>
                
                <Row gutter={8} align="middle">
                  <Col span={8}><Text>Security</Text></Col>
                  <Col span={6}><InputNumber min={0} max={20} value={staffSecurity} onChange={v => setStaffSecurity(v || 0)} style={{ width: '100%' }} /></Col>
                  <Col span={10}>
                    <InputNumber 
                      min={0} value={salarySecurity} onChange={v => setSalarySecurity(v || 0)} 
                      formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      style={{ width: '100%' }} 
                    />
                  </Col>
                </Row>

                <Row gutter={8} align="middle">
                  <Col span={8}><Text>Management</Text></Col>
                  <Col span={6}><InputNumber min={0} max={10} value={staffManagement} onChange={v => setStaffManagement(v || 0)} style={{ width: '100%' }} /></Col>
                  <Col span={10}>
                    <InputNumber 
                      min={0} value={salaryManagement} onChange={v => setSalaryManagement(v || 0)} 
                      formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      style={{ width: '100%' }} 
                    />
                  </Col>
                </Row>
                
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>
                    Benefits Multiplier 
                    <AntTooltip title="Includes health insurance, retirement, payroll taxes">
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </AntTooltip>
                  </Text>
                  <InputNumber min={1.0} max={1.5} step={0.05} value={benefitsMultiplier} onChange={v => setBenefitsMultiplier(v || 1.0)} />
                </div>
              </Space>
            </Panel>
            
            <Panel header={<Text strong><ToolOutlined /> Maintenance & Other Costs</Text>} key="maintenance">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>Est. CapEx Basis ($)</Text>
                    <InputNumber 
                      min={0} value={estimatedCapex} onChange={v => setEstimatedCapex(v || 0)}
                      formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      style={{ width: '50%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Maintenance (% of CapEx)</Text>
                    <InputNumber min={1} max={30} step={0.5} value={maintenancePct} onChange={v => setMaintenancePct(v || 1)} />
                  </div>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>Annual Insurance</Text>
                  <InputNumber 
                    min={0} value={annualInsurance} onChange={v => setAnnualInsurance(v || 0)}
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>Annual Property Tax</Text>
                  <InputNumber 
                    min={0} value={annualPropertyTax} onChange={v => setAnnualPropertyTax(v || 0)}
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>Monthly Internet Cost</Text>
                  <InputNumber 
                    min={0} value={internetCost} onChange={v => setInternetCost(v || 0)}
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>Annual Software Licenses</Text>
                  <InputNumber 
                    min={0} value={softwareLicenses} onChange={v => setSoftwareLicenses(v || 0)}
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
                </div>
              </Space>
            </Panel>
            
            <Panel header={<Text strong><ExperimentOutlined /> Water & Consumables</Text>} key="water_consumables">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Water Usage Rate (L/kWh)</Text>
                    <InputNumber min={0} max={5} step={0.1} value={waterUsageRate} onChange={v => setWaterUsageRate(v || 0)} />
                  </div>
                  <Slider min={0} max={5} step={0.1} value={waterUsageRate} onChange={v => setWaterUsageRate(v)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>Water Cost ({CURR[currency as keyof typeof CURR].sym}/Liter)</Text>
                  <InputNumber min={0} max={0.05} step={0.001} value={waterCostPerLiter} onChange={v => setWaterCostPerLiter(v || 0)} />
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>
                    Consumables Rate (% of Maint.)
                    <AntTooltip title="Fuel polishing, filters, refrigerant recharge, cleaning supplies">
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </AntTooltip>
                  </Text>
                  <InputNumber min={0} max={40} step={1} value={consumablesRate} onChange={v => setConsumablesRate(v || 0)} />
                </div>
              </Space>
            </Panel>
            
            <Panel header={<Text strong><DollarOutlined /> Projection Settings</Text>} key="projection">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Evaluation Period (Years)</Text>
                    <InputNumber min={1} max={20} value={evalYears} onChange={v => setEvalYears(v || 1)} />
                  </div>
                  <Slider min={1} max={10} value={evalYears} onChange={v => setEvalYears(v)} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Annual Inflation Rate (%)</Text>
                    <InputNumber min={0} max={15} step={0.5} value={inflationRate} onChange={v => setInflationRate(v || 0)} />
                  </div>
                  <Slider min={0} max={10} step={0.5} value={inflationRate} onChange={v => setInflationRate(v)} />
                </div>
              </Space>
            </Panel>
          </Collapse>
        </Col>
        
        <Col xs={24} lg={14}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card style={glassStyle} bodyStyle={{ padding: 24 }}>
              <Row align="middle" justify="center" style={{ textAlign: 'center' }}>
                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 16 }}>Total Annual OpEx</Text>
                  <Title level={1} style={{ margin: '8px 0', color: token.colorPrimary }}>
                    {fmtCurr(totalAnnualOpex)}
                  </Title>
                  <Text type="secondary">
                    Monthly: <Text strong style={{ color: isDark ? 'white' : 'black' }}>{fmtCurr(monthlyOpex)}</Text>
                  </Text>
                </Col>
              </Row>
              <Divider style={{ margin: '24px 0 16px' }} />
              <Row gutter={16} justify="space-around">
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Cost / kW / Month</Text>
                    <br />
                    <Title level={4} style={{ margin: 0 }}>{fmtCurr(costPerKwMonth)}</Title>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Total Staff Headcount</Text>
                    <br />
                    <Title level={4} style={{ margin: 0 }}>{totalStaff}</Title>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Power % of OpEx</Text>
                    <br />
                    <Title level={4} style={{ margin: 0 }}>{powerPct.toFixed(1)}%</Title>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card style={glassStyle} bodyStyle={{ padding: 16 }}>
              <Text strong>OpEx Benchmark (vs Industry Avg)</Text>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary">Low: {fmtCurr(80)}/kW</Text>
                  <Text type="secondary">Avg: {fmtCurr(120)}/kW</Text>
                  <Text type="secondary">High: {fmtCurr(180)}/kW</Text>
                </div>
                <Progress 
                  percent={Math.min((costPerKwMonth / 200) * 100, 100)} 
                  showInfo={false} 
                  strokeColor={
                    costPerKwMonth < 120 ? '#52c41a' : 
                    costPerKwMonth <= 180 ? '#faad14' : '#ff4d4f'
                  } 
                />
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <Text type={costPerKwMonth > 180 ? 'danger' : undefined} strong>
                    Your OpEx: {fmtCurr(costPerKwMonth)} / kW / Month
                  </Text>
                </div>
              </div>
            </Card>

            <Card style={glassStyle} title="OpEx Breakdown">
              <Row>
                <Col xs={24} md={12}>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={tooltipFormatter} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <Space direction="vertical" style={{ width: '100%', justifyContent: 'center', display: 'flex', height: '100%' }}>
                    {pieData.map((item, index) => (
                      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                          <Text>{item.name}</Text>
                        </Space>
                        <Text strong>{fmtCurr(item.value)}</Text>
                      </div>
                    ))}
                  </Space>
                </Col>
              </Row>
            </Card>

            <Card style={glassStyle} title={`${evalYears}-Year OpEx Projection (w/ ${inflationRate}% Inflation)`}>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={projectionData}
                    margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="year" stroke={token.colorTextSecondary} />
                    <YAxis tickFormatter={(v) => {
                      const c = CURR[currency as keyof typeof CURR];
                      return c.sym + ((v * c.rate)/1000000).toFixed(1) + 'M';
                    }} stroke={token.colorTextSecondary} />
                    <Tooltip formatter={tooltipFormatter} contentStyle={{ backgroundColor: isDark ? '#141414' : '#fff' }} />
                    <Legend />
                    <Area type="monotone" dataKey="Power" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} />
                    <Area type="monotone" dataKey="Staffing" stackId="1" stroke={COLORS[1]} fill={COLORS[1]} />
                    <Area type="monotone" dataKey="Maintenance" stackId="1" stroke={COLORS[2]} fill={COLORS[2]} />
                    <Area type="monotone" dataKey="Water" stackId="1" stroke={COLORS[3]} fill={COLORS[3]} />
                    <Area type="monotone" dataKey="Consumables" stackId="1" stroke={COLORS[4]} fill={COLORS[4]} />
                    <Area type="monotone" dataKey="Insurance" stackId="1" stroke={COLORS[5]} fill={COLORS[5]} />
                    <Area type="monotone" dataKey="Tax" stackId="1" stroke={COLORS[6]} fill={COLORS[6]} />
                    <Area type="monotone" dataKey="Internet" stackId="1" stroke={COLORS[7]} fill={COLORS[7]} />
                    <Area type="monotone" dataKey="Software" stackId="1" stroke={COLORS[8]} fill={COLORS[8]} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card style={glassStyle} title="Yearly Details" bodyStyle={{ padding: 0 }}>
              <Table 
                dataSource={tableData} 
                columns={columns} 
                pagination={false}
                size="small"
                scroll={{ x: true }}
              />
            </Card>
          </Space>
        </Col>
      </Row>
    </motion.div>
  );
};
