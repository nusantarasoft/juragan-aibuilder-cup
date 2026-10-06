import React, { useState, useMemo } from 'react';
import { Card, Col, Row, Typography, InputNumber, Slider, Collapse, Progress, Table, Alert, Statistic, Space, Button } from 'antd';
import { WarningOutlined, CalendarOutlined, DollarOutlined, ThunderboltOutlined, DashboardOutlined, LineChartOutlined, AlertOutlined, SafetyCertificateOutlined, CloudOutlined, ApiOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface CapacityPlanningProps {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

export const CapacityPlanning: React.FC<CapacityPlanningProps> = ({ isDark, token, glassStyle }) => {
  // Inputs
  const [currentRacks, setCurrentRacks] = useState<number>(30);
  const [totalRackCapacity, setTotalRackCapacity] = useState<number>(100);
  const [currentItLoad, setCurrentItLoad] = useState<number>(300);
  const [maxPowerCapacity, setMaxPowerCapacity] = useState<number>(1000);
  
  const [currentCoolingTons, setCurrentCoolingTons] = useState<number>(100);
  const [maxCoolingCapacity, setMaxCoolingCapacity] = useState<number>(200);

  const [currentPorts, setCurrentPorts] = useState<number>(500);
  const [maxPorts, setMaxPorts] = useState<number>(2000);

  const [plannedAdditions, setPlannedAdditions] = useState<{ month: number; racks: number; kwPerRack: number }[]>([]);
  const [addMonth, setAddMonth] = useState<number>(12);
  const [addRacks, setAddRacks] = useState<number>(10);
  const [addKw, setAddKw] = useState<number>(5);
  
  const [monthlyRackGrowth, setMonthlyRackGrowth] = useState<number>(2);
  const [monthlyPowerGrowth, setMonthlyPowerGrowth] = useState<number>(2.5);
  const [monthlyCoolingGrowth, setMonthlyCoolingGrowth] = useState<number>(2.5);
  const [monthlyPortGrowth, setMonthlyPortGrowth] = useState<number>(2);
  
  const [expansionLeadTime, setExpansionLeadTime] = useState<number>(6);
  const [expansionCostPerRack, setExpansionCostPerRack] = useState<number>(15000);
  const [expansionCostPerKw, setExpansionCostPerKw] = useState<number>(2000);
  const [planningHorizon, setPlanningHorizon] = useState<number>(60);

  // Calculations
  const formatCurrency = (val: number) => '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);

  const rackUtilization = (currentRacks / totalRackCapacity) * 100;
  const powerUtilization = (currentItLoad / maxPowerCapacity) * 100;
  const coolingUtilization = (currentCoolingTons / maxCoolingCapacity) * 100;
  const portUtilization = (currentPorts / maxPorts) * 100;

  const {
    projectionData,
    rackRunway,
    powerRunway,
    coolingRunway,
    portRunway,
    criticalRunway,
    doubleGrowthCriticalRunway,
    orderDate,
    expansionCost,
    milestones,
    heatmapData
  } = useMemo(() => {
    let rRunway = planningHorizon;
    let pRunway = planningHorizon;
    let cRunway = planningHorizon;
    let poRunway = planningHorizon;
    let dRunwayRack = planningHorizon;
    let dRunwayPower = planningHorizon;
    
    const data = [];
    const hData = [];
    
    // Milestones tracking
    let reached75 = false;
    let reached85 = false;
    let reached100 = false;
    const ms = [];

    let currentProjectedRacks = currentRacks;
    let currentProjectedPower = currentItLoad;
    let currentProjectedCooling = currentCoolingTons;
    let currentProjectedPorts = currentPorts;

    // Track baseline for double growth
    let pRacks2x = currentRacks;
    let pPower2x = currentItLoad;

    for (let month = 0; month <= planningHorizon; month++) {
      if (month > 0) {
        currentProjectedRacks = currentProjectedRacks * (1 + monthlyRackGrowth / 100);
        currentProjectedPower = currentProjectedPower * (1 + monthlyPowerGrowth / 100);
        currentProjectedCooling = currentProjectedCooling * (1 + monthlyCoolingGrowth / 100);
        currentProjectedPorts = currentProjectedPorts * (1 + monthlyPortGrowth / 100);

        pRacks2x = pRacks2x * (1 + (monthlyRackGrowth*2) / 100);
        pPower2x = pPower2x * (1 + (monthlyPowerGrowth*2) / 100);
      }

      const additions = plannedAdditions.filter(a => a.month === month);
      for (const add of additions) {
        currentProjectedRacks += add.racks;
        currentProjectedPower += (add.racks * add.kwPerRack);
        
        pRacks2x += add.racks;
        pPower2x += (add.racks * add.kwPerRack);
      }
      
      const rackUtil = (currentProjectedRacks / totalRackCapacity) * 100;
      const powerUtil = (currentProjectedPower / maxPowerCapacity) * 100;
      const coolingUtil = (currentProjectedCooling / maxCoolingCapacity) * 100;
      const portUtil = (currentProjectedPorts / maxPorts) * 100;
      
      const maxUtil = Math.max(rackUtil, powerUtil, coolingUtil, portUtil);
      
      let status: 'Green' | 'Yellow' | 'Red' = 'Green';
      if (maxUtil >= 85) status = 'Red';
      else if (maxUtil >= 75) status = 'Yellow';

      data.push({
        month: `Month ${month}`,
        monthIndex: month,
        rackUtil: Math.min(rackUtil, 100),
        powerUtil: Math.min(powerUtil, 100),
        coolingUtil: Math.min(coolingUtil, 100),
        portUtil: Math.min(portUtil, 100),
        racks: Math.round(currentProjectedRacks),
        power: Math.round(currentProjectedPower),
        cooling: Math.round(currentProjectedCooling),
        ports: Math.round(currentProjectedPorts)
      });

      hData.push({
        key: month.toString(),
        month: month,
        rackUtil: rackUtil.toFixed(1),
        powerUtil: powerUtil.toFixed(1),
        coolingUtil: coolingUtil.toFixed(1),
        portUtil: portUtil.toFixed(1),
        status: status,
      });
      
      if (rackUtil >= 100 && rRunway === planningHorizon) rRunway = month;
      if (powerUtil >= 100 && pRunway === planningHorizon) pRunway = month;
      if (coolingUtil >= 100 && cRunway === planningHorizon) cRunway = month;
      if (portUtil >= 100 && poRunway === planningHorizon) poRunway = month;
      
      // Double growth
      if ((pRacks2x / totalRackCapacity) * 100 >= 100 && dRunwayRack === planningHorizon) dRunwayRack = month;
      if ((pPower2x / maxPowerCapacity) * 100 >= 100 && dRunwayPower === planningHorizon) dRunwayPower = month;

      // Track milestones
      if (maxUtil >= 75 && !reached75) {
        reached75 = true;
        ms.push({ key: '75', event: '75% Capacity Reached', month, action: 'Begin preliminary planning' });
      }
      if (maxUtil >= 85 && !reached85) {
        reached85 = true;
        ms.push({ key: '85', event: '85% Capacity Reached', month, action: 'Secure funding & finalize design' });
      }
      if (maxUtil >= 100 && !reached100) {
        reached100 = true;
        ms.push({ key: '100', event: '100% Capacity Exhausted', month, action: 'Facility full' });
      }
    }

    const critRunway = Math.min(rRunway, pRunway, cRunway, poRunway);
    const dCRunway = Math.min(dRunwayRack, dRunwayPower);
    const oDate = critRunway - expansionLeadTime;
    const eCost = (totalRackCapacity * 0.5 * expansionCostPerRack) + (maxPowerCapacity * 0.5 * expansionCostPerKw);

    return {
      projectionData: data,
      rackRunway: rRunway,
      powerRunway: pRunway,
      coolingRunway: cRunway,
      portRunway: poRunway,
      criticalRunway: critRunway,
      doubleGrowthCriticalRunway: dCRunway,
      orderDate: oDate,
      expansionCost: eCost,
      milestones: ms,
      heatmapData: hData
    };
  }, [
    currentRacks, totalRackCapacity, currentItLoad, maxPowerCapacity, 
    currentCoolingTons, maxCoolingCapacity, currentPorts, maxPorts,
    monthlyRackGrowth, monthlyPowerGrowth, monthlyCoolingGrowth, monthlyPortGrowth,
    planningHorizon, expansionLeadTime, expansionCostPerRack, expansionCostPerKw,
    plannedAdditions
  ]);

  const getAlertProps = () => {
    if (orderDate <= 0) return { type: 'error' as const, message: `⚠️ URGENT: Order expansion immediately! (Lead time exceeds runway)`, color: token.colorError };
    if (orderDate < 6) return { type: 'error' as const, message: `⚠️ Order expansion in ${orderDate} months`, color: token.colorError };
    if (orderDate < 12) return { type: 'warning' as const, message: `⚠️ Order expansion in ${orderDate} months`, color: token.colorWarning };
    return { type: 'success' as const, message: `✅ Order expansion in ${orderDate} months`, color: token.colorSuccess };
  };
  const alertProps = getAlertProps();

  const getRunwayColor = (runway: number) => {
    if (runway < 12) return token.colorError;
    if (runway < 24) return token.colorWarning;
    return token.colorSuccess;
  };

  const columns = [
    { title: 'Event', dataIndex: 'event', key: 'event' },
    { title: 'Month', dataIndex: 'month', key: 'month', render: (val: number) => `Month ${val}` },
    { title: 'Recommendation', dataIndex: 'action', key: 'action' },
  ];

  const renderCell = (val: string) => {
    const num = parseFloat(val);
    const bg = num >= 85 ? '#ff4d4f33' : num >= 75 ? '#faad1433' : 'transparent';
    const color = num >= 85 ? token.colorError : num >= 75 ? token.colorWarning : token.colorText;
    return <div style={{ backgroundColor: bg, padding: '4px 8px', borderRadius: 4, color, textAlign: 'center' as const }}>{val}%</div>;
  };

  const heatmapColumns = [
    { title: 'Month', dataIndex: 'month', key: 'month' },
    { title: 'Rack %', dataIndex: 'rackUtil', key: 'rackUtil', render: renderCell },
    { title: 'Power %', dataIndex: 'powerUtil', key: 'powerUtil', render: renderCell },
    { title: 'Cooling %', dataIndex: 'coolingUtil', key: 'coolingUtil', render: renderCell },
    { title: 'Network %', dataIndex: 'portUtil', key: 'portUtil', render: renderCell },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status: string) => {
        const icon = status === 'Red' ? '🔴' : status === 'Yellow' ? '🟡' : '🟢';
        return <span>{icon} {status}</span>;
      }
    },
  ];

  return (
    <motion.div key="capacity-planning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <Row gutter={[16, 16]}>
        {/* Left Column: Inputs */}
        <Col xs={24} lg={10}>
          <Collapse defaultActiveKey={['1', '2', '3']} style={glassStyle}>
            <Panel header={<span><DashboardOutlined /> Current Capacity</span>} key="1">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Current Racks</Text>
                    <Text strong>{currentRacks}</Text>
                  </div>
                  <Slider min={1} max={500} value={currentRacks} onChange={setCurrentRacks} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Total Rack Capacity</Text>
                    <Text strong>{totalRackCapacity}</Text>
                  </div>
                  <Slider min={1} max={1000} value={totalRackCapacity} onChange={setTotalRackCapacity} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Current IT Load (kW)</Text>
                    <Text strong>{currentItLoad}</Text>
                  </div>
                  <Slider min={10} max={100000} value={currentItLoad} onChange={setCurrentItLoad} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Max Power Capacity (kW)</Text>
                    <Text strong>{maxPowerCapacity}</Text>
                  </div>
                  <Slider min={10} max={200000} value={maxPowerCapacity} onChange={setMaxPowerCapacity} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Current Cooling (Tons)</Text>
                    <Text strong>{currentCoolingTons}</Text>
                  </div>
                  <Slider min={1} max={5000} value={currentCoolingTons} onChange={setCurrentCoolingTons} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Max Cooling Capacity</Text>
                    <Text strong>{maxCoolingCapacity}</Text>
                  </div>
                  <Slider min={1} max={10000} value={maxCoolingCapacity} onChange={setMaxCoolingCapacity} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Current Network Ports</Text>
                    <Text strong>{currentPorts}</Text>
                  </div>
                  <Slider min={1} max={50000} value={currentPorts} onChange={setCurrentPorts} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Max Network Ports</Text>
                    <Text strong>{maxPorts}</Text>
                  </div>
                  <Slider min={1} max={100000} value={maxPorts} onChange={setMaxPorts} />
                </div>
              </Space>
            </Panel>

            <Panel header={<span><LineChartOutlined /> Growth Rates</span>} key="2">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Monthly Rack Growth (%)</Text>
                    <Text strong>{monthlyRackGrowth}%</Text>
                  </div>
                  <Slider min={0} max={10} step={0.1} value={monthlyRackGrowth} onChange={setMonthlyRackGrowth} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Monthly Power Growth (%)</Text>
                    <Text strong>{monthlyPowerGrowth}%</Text>
                  </div>
                  <Slider min={0} max={10} step={0.1} value={monthlyPowerGrowth} onChange={setMonthlyPowerGrowth} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Monthly Cooling Growth (%)</Text>
                    <Text strong>{monthlyCoolingGrowth}%</Text>
                  </div>
                  <Slider min={0} max={10} step={0.1} value={monthlyCoolingGrowth} onChange={setMonthlyCoolingGrowth} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Monthly Port Growth (%)</Text>
                    <Text strong>{monthlyPortGrowth}%</Text>
                  </div>
                  <Slider min={0} max={10} step={0.1} value={monthlyPortGrowth} onChange={setMonthlyPortGrowth} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>Planning Horizon (months)</Text>
                  </div>
                  <InputNumber style={{ width: '100%' }} min={12} max={120} value={planningHorizon} onChange={(val) => setPlanningHorizon(val || 60)} />
                </div>
              </Space>
            </Panel>

            <Panel header={<span><DollarOutlined /> Expansion Parameters</span>} key="3">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>Expansion Lead Time (months)</Text>
                  </div>
                  <InputNumber style={{ width: '100%' }} min={1} max={24} value={expansionLeadTime} onChange={(val) => setExpansionLeadTime(val || 6)} />
                </div>
                <Row gutter={8}>
                  <Col span={12}>
                    <Text>Cost per Rack ($)</Text>
                    <InputNumber style={{ width: '100%', marginTop: 8 }} min={0} value={expansionCostPerRack} onChange={(val) => setExpansionCostPerRack(val || 0)} />
                  </Col>
                  <Col span={12}>
                    <Text>Cost per kW ($)</Text>
                    <InputNumber style={{ width: '100%', marginTop: 8 }} min={0} value={expansionCostPerKw} onChange={(val) => setExpansionCostPerKw(val || 0)} />
                  </Col>
                </Row>
              </Space>
            </Panel>

            <Panel header={<span><PlusOutlined /> Phased Deployments</span>} key="4">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row gutter={8} align="middle">
                  <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Month</Text></Col>
                  <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>Racks</Text></Col>
                  <Col span={6}><Text type="secondary" style={{ fontSize: 12 }}>kW/Rack</Text></Col>
                  <Col span={6}></Col>
                </Row>
                <Row gutter={8}>
                  <Col span={6}><InputNumber style={{width: '100%'}} min={1} value={addMonth} onChange={v => setAddMonth(v||12)}/></Col>
                  <Col span={6}><InputNumber style={{width: '100%'}} min={1} value={addRacks} onChange={v => setAddRacks(v||10)}/></Col>
                  <Col span={6}><InputNumber style={{width: '100%'}} min={1} value={addKw} onChange={v => setAddKw(v||5)}/></Col>
                  <Col span={6}><Button type="primary" icon={<PlusOutlined />} onClick={() => setPlannedAdditions([...plannedAdditions, {month: addMonth, racks: addRacks, kwPerRack: addKw}])} block>Add</Button></Col>
                </Row>
                <Table 
                  dataSource={plannedAdditions.map((pa, idx) => ({...pa, key: idx}))} 
                  pagination={false} 
                  size="small" 
                  style={{ marginTop: 8 }}
                  columns={[
                    { title: 'Month', dataIndex: 'month' },
                    { title: 'Racks', dataIndex: 'racks' },
                    { title: 'kW/Rack', dataIndex: 'kwPerRack' },
                    { title: '', render: (_, __, idx) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setPlannedAdditions(plannedAdditions.filter((_, i) => i !== idx))} /> }
                  ]} 
                />
              </Space>
            </Panel>
          </Collapse>
        </Col>

        {/* Right Column: Results */}
        <Col xs={24} lg={14}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            
            <Alert
              message={
                <span style={{ fontSize: 18, fontWeight: 600 }}>{alertProps.message}</span>
              }
              type={alertProps.type}
              showIcon
              style={{ ...glassStyle, borderLeft: `6px solid ${alertProps.color}` }}
            />

            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Card style={{ ...glassStyle, textAlign: 'center', height: '100%' }}>
                  <Statistic
                    title="Rack Runway"
                    value={rackRunway}
                    suffix={rackRunway >= planningHorizon ? "+" : " mo"}
                    valueStyle={{ color: getRunwayColor(rackRunway) }}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Progress type="circle" percent={Math.round(rackUtilization)} size={60} strokeColor={getRunwayColor(100 - rackUtilization)} />
                    <div style={{ marginTop: 8 }}><Text type="secondary" style={{fontSize: 12}}>Rack Util</Text></div>
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card style={{ ...glassStyle, textAlign: 'center', height: '100%' }}>
                  <Statistic
                    title="Power Runway"
                    value={powerRunway}
                    suffix={powerRunway >= planningHorizon ? "+" : " mo"}
                    valueStyle={{ color: getRunwayColor(powerRunway) }}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Progress type="circle" percent={Math.round(powerUtilization)} size={60} strokeColor={getRunwayColor(100 - powerUtilization)} />
                    <div style={{ marginTop: 8 }}><Text type="secondary" style={{fontSize: 12}}>Pwr Util</Text></div>
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card style={{ ...glassStyle, textAlign: 'center', height: '100%' }}>
                  <Statistic
                    title="Cooling Runway"
                    value={coolingRunway}
                    suffix={coolingRunway >= planningHorizon ? "+" : " mo"}
                    valueStyle={{ color: getRunwayColor(coolingRunway) }}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Progress type="circle" percent={Math.round(coolingUtilization)} size={60} strokeColor={getRunwayColor(100 - coolingUtilization)} />
                    <div style={{ marginTop: 8 }}><Text type="secondary" style={{fontSize: 12}}>Cooling Util</Text></div>
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card style={{ ...glassStyle, textAlign: 'center', height: '100%' }}>
                  <Statistic
                    title="Network Runway"
                    value={portRunway}
                    suffix={portRunway >= planningHorizon ? "+" : " mo"}
                    valueStyle={{ color: getRunwayColor(portRunway) }}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Progress type="circle" percent={Math.round(portUtilization)} size={60} strokeColor={getRunwayColor(100 - portUtilization)} />
                    <div style={{ marginTop: 8 }}><Text type="secondary" style={{fontSize: 12}}>Net Util</Text></div>
                  </div>
                </Card>
              </Col>
            </Row>

            <Card style={glassStyle}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Critical Runway"
                    value={criticalRunway}
                    suffix=" mo"
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: getRunwayColor(criticalRunway) }}
                  />
                </Col>
                <Col xs={24} sm={12} style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Est. Expansion Cost (+50%)"
                    value={formatCurrency(expansionCost)}
                    prefix={<DollarOutlined />}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Col>
              </Row>
            </Card>

            <Card title={<span><LineChartOutlined /> Utilization Projection (%)</span>} style={glassStyle}>
              <div style={{ height: 400, width: '100%' }}>
                <ResponsiveContainer>
                  <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRack" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={token.colorPrimary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={token.colorPrimary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={token.colorWarning} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={token.colorWarning} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCooling" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={token.colorInfo} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={token.colorInfo} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPorts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={token.colorSuccess} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={token.colorSuccess} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                    <XAxis dataKey="month" stroke={token.colorTextSecondary} tick={{ fontSize: 12 }} />
                    <YAxis stroke={token.colorTextSecondary} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderColor: token.colorBorder, borderRadius: 8 }}
                      itemStyle={{ color: token.colorText }}
                    />
                    <Legend />
                    <ReferenceLine y={100} label={{ position: 'insideTopLeft', value: '100% Capacity', fill: token.colorError }} stroke={token.colorError} strokeDasharray="3 3" />
                    <ReferenceLine y={85} label={{ position: 'insideTopLeft', value: '85% Warning', fill: token.colorWarning }} stroke={token.colorWarning} strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="rackUtil" name="Rack Util %" stroke={token.colorPrimary} fillOpacity={1} fill="url(#colorRack)" />
                    <Area type="monotone" dataKey="powerUtil" name="Power Util %" stroke={token.colorWarning} fillOpacity={1} fill="url(#colorPower)" />
                    <Area type="monotone" dataKey="coolingUtil" name="Cooling Util %" stroke={token.colorInfo} fillOpacity={1} fill="url(#colorCooling)" />
                    <Area type="monotone" dataKey="portUtil" name="Network Util %" stroke={token.colorSuccess} fillOpacity={1} fill="url(#colorPorts)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={<span><DashboardOutlined /> Capacity Heatmap</span>} style={glassStyle} bodyStyle={{ padding: 0 }}>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <Table 
                  dataSource={heatmapData} 
                  columns={heatmapColumns} 
                  pagination={false} 
                  size="small"
                  sticky
                />
              </div>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title={<span><CalendarOutlined /> Expansion Milestones</span>} style={{ ...glassStyle, height: '100%' }} bodyStyle={{ padding: 0 }}>
                  <Table 
                    dataSource={milestones} 
                    columns={columns} 
                    pagination={false} 
                    size="small"
                  />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title={<span><WarningOutlined /> What-If Analysis</span>} style={{ ...glassStyle, height: '100%' }}>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text type="secondary" style={{ fontSize: 16 }}>If growth rate doubles...</Text>
                    <div style={{ marginTop: 16 }}>
                      <Statistic
                        title="New Critical Runway"
                        value={doubleGrowthCriticalRunway}
                        suffix=" months"
                        valueStyle={{ color: token.colorError, fontSize: 24 }}
                      />
                    </div>
                    <Text type="danger" style={{ display: 'block', marginTop: 16 }}>
                      Runway is compressed by {criticalRunway - doubleGrowthCriticalRunway} months!
                    </Text>
                  </div>
                </Card>
              </Col>
            </Row>

          </Space>
        </Col>
      </Row>
    </motion.div>
  );
};
