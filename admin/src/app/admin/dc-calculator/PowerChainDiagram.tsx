import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Row, Col, Card, Form, Select, InputNumber, Typography, Collapse, Table, Alert, Divider, Space, Tooltip } from 'antd';
import {
  ThunderboltOutlined,
  WarningOutlined,
  ApiOutlined,
  DatabaseOutlined,
  PoweroffOutlined,
  AppstoreOutlined,
  FireOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface PowerChainDiagramProps {
  isDark: boolean;
  token: any;
  glassStyle: React.CSSProperties;
}

const formatCurrency = (val: number) => '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);

export function PowerChainDiagram({ isDark, token, glassStyle }: PowerChainDiagramProps) {
  const [redundancy, setRedundancy] = useState<string>('N+1');
  const [totalItLoad, setTotalItLoad] = useState<number>(500);
  const [upsCapacity, setUpsCapacity] = useState<number>(250);
  const [generatorCapacity, setGeneratorCapacity] = useState<number>(500);
  const [racksPerPdu, setRacksPerPdu] = useState<number>(4);
  const [totalRacks, setTotalRacks] = useState<number>(50);

  const [failedComponent, setFailedComponent] = useState<string>('none');

  const [batteryMinutes, setBatteryMinutes] = useState<number>(10);
  const [batteryAhRating, setBatteryAhRating] = useState<number>(100);
  const [batteryVoltage, setBatteryVoltage] = useState<number>(480);
  const [fuelConsumptionRate, setFuelConsumptionRate] = useState<number>(250);

  const {
    paths,
    upsTotal,
    genTotal,
    pduTotal,
    atsTotal,
    stsTotal,
    switchgearTotal,
    totalCost,
    tableData
  } = useMemo(() => {
    const upsUnitsNeededBase = Math.ceil(totalItLoad / upsCapacity) || 1;
    const genUnitsNeededBase = Math.ceil(totalItLoad / generatorCapacity) || 1;
    const pduCountBase = Math.ceil(totalRacks / racksPerPdu) || 1;

    let paths = 1;
    let upsTotal = upsUnitsNeededBase;
    let genTotal = genUnitsNeededBase;
    let pduTotal = pduCountBase;
    let atsTotal = 1;
    let stsTotal = 1;
    let switchgearTotal = 1;

    if (redundancy === 'N+1') {
      upsTotal = upsUnitsNeededBase + 1;
      genTotal = genUnitsNeededBase + 1;
    } else if (redundancy === '2N') {
      paths = 2;
      upsTotal = upsUnitsNeededBase * 2;
      genTotal = genUnitsNeededBase * 2;
      atsTotal = 2;
      stsTotal = 2;
      switchgearTotal = 2;
      pduTotal = pduCountBase * 2;
    } else if (redundancy === '2(N+1)') {
      paths = 2;
      upsTotal = (upsUnitsNeededBase + 1) * 2;
      genTotal = (genUnitsNeededBase + 1) * 2;
      atsTotal = 2;
      stsTotal = 2;
      switchgearTotal = 2;
      pduTotal = pduCountBase * 2;
    }

    const rates = {
      UPS: 300,
      Generator: 200,
      ATS: 50,
      Switchgear: 100,
      STS: 80,
      PDU: 60
    };

    const costGen = genTotal * generatorCapacity * rates.Generator;
    const costUps = upsTotal * upsCapacity * rates.UPS;
    // For ATS, Switchgear, STS, assume they handle the full path capacity roughly (totalItLoad / paths) or just totalItLoad. We'll use totalItLoad per path.
    const pathCapacity = totalItLoad / paths;
    const pathCostBase = pathCapacity; // capacity in kW

    const costATS = atsTotal * pathCostBase * rates.ATS;
    const costSwitchgear = switchgearTotal * pathCostBase * rates.Switchgear;
    const costSTS = stsTotal * pathCostBase * rates.STS;
    const costPDU = pduTotal * (pathCostBase / (pduTotal/paths || 1)) * rates.PDU;

    const totalCost = costGen + costUps + costATS + costSwitchgear + costSTS + costPDU;

    const tableData = [
      { key: '1', component: 'Generators', count: genTotal, rate: `$${rates.Generator}/kW`, estCost: formatCurrency(costGen) },
      { key: '2', component: 'UPS Units', count: upsTotal, rate: `$${rates.UPS}/kW`, estCost: formatCurrency(costUps) },
      { key: '3', component: 'ATS', count: atsTotal, rate: `$${rates.ATS}/kW`, estCost: formatCurrency(costATS) },
      { key: '4', component: 'Switchgear', count: switchgearTotal, rate: `$${rates.Switchgear}/kW`, estCost: formatCurrency(costSwitchgear) },
      { key: '5', component: 'STS', count: stsTotal, rate: `$${rates.STS}/kW`, estCost: formatCurrency(costSTS) },
      { key: '6', component: 'PDUs', count: pduTotal, rate: `$${rates.PDU}/kW`, estCost: formatCurrency(costPDU) },
    ];

    return { paths, upsTotal, genTotal, pduTotal, atsTotal, stsTotal, switchgearTotal, totalCost, tableData };
  }, [redundancy, totalItLoad, upsCapacity, generatorCapacity, racksPerPdu, totalRacks]);

  const { batteryRuntime, fuelNeeds, spofs } = useMemo(() => {
    const itLoadPerPath = totalItLoad / paths;
    
    const batteryKwh = (batteryAhRating * batteryVoltage) / 1000;
    const runtime100 = (batteryKwh / itLoadPerPath) * 60;
    const runtime75 = (batteryKwh / (itLoadPerPath * 0.75)) * 60;
    const runtime50 = (batteryKwh / (itLoadPerPath * 0.50)) * 60;
    
    const fuel24h = fuelConsumptionRate * 24;
    const fuel48h = fuelConsumptionRate * 48;
    const fuel72h = fuelConsumptionRate * 72;
    const litersToGal = 0.264172;

    let spofs: { component: string; explanation: string }[] = [];
    if (redundancy === 'N') {
      spofs.push({ component: 'All Components', explanation: 'Single path topology means any component failure will drop the load.' });
    } else if (redundancy === 'N+1') {
      spofs.push({ component: 'Shared Bus / Switchgear', explanation: 'While generators and UPS units have N+1 redundancy, they share a common ATS/Switchgear path.' });
    } else if (redundancy === '2N') {
      spofs.push({ component: 'STS (Static Transfer Switch)', explanation: 'If a single STS is used to switch between paths, it represents a potential SPOF.' });
    }

    return {
      batteryRuntime: { runtime100: isFinite(runtime100) ? runtime100 : 0, runtime75: isFinite(runtime75) ? runtime75 : 0, runtime50: isFinite(runtime50) ? runtime50 : 0 },
      fuelNeeds: { 
        h24: { l: fuel24h, gal: fuel24h * litersToGal }, 
        h48: { l: fuel48h, gal: fuel48h * litersToGal }, 
        h72: { l: fuel72h, gal: fuel72h * litersToGal } 
      },
      spofs
    };
  }, [batteryAhRating, batteryVoltage, totalItLoad, paths, fuelConsumptionRate, redundancy]);

  const blockStyle = (type: string, pathIndex: number, componentName: string): React.CSSProperties => {
    let bg = token.colorBgContainer;
    let borderColor = token.colorBorder;
    
    // Simulate fault
    const isFailed = failedComponent === componentName || failedComponent === `${componentName}_${pathIndex}`;
    
    let isBackupActive = false;
    if (failedComponent !== 'none') {
      if (paths === 2 && failedComponent.endsWith('_0') && pathIndex === 1) isBackupActive = true;
      if (paths === 2 && failedComponent.endsWith('_1') && pathIndex === 0) isBackupActive = true;
      if (failedComponent.includes('Utility') && type === 'Generator') isBackupActive = true;
    }

    if (isFailed) {
      bg = token.colorErrorBg;
      borderColor = token.colorError;
    } else if (isBackupActive) {
      bg = token.colorSuccessBg;
      borderColor = token.colorSuccess;
    } else {
      if (type === 'Utility') {
        bg = token.colorPrimaryBg;
        borderColor = token.colorPrimary;
      } else if (type === 'Generator') {
        bg = token.colorWarningBg;
        borderColor = token.colorWarning;
      } else if (pathIndex === 1) {
        bg = token.colorSuccessBgHover;
        borderColor = token.colorSuccessBorder;
      }
    }

    return {
      padding: '12px 16px',
      borderRadius: '8px',
      border: `2px solid ${borderColor}`,
      background: bg,
      minWidth: '100px',
      textAlign: 'center',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      opacity: isFailed ? 0.7 : 1,
      position: 'relative',
      animation: isFailed ? 'pulseRed 1.5s infinite' : 'none'
    };
  };

  const getLineStyle = (isActive: boolean): React.CSSProperties => ({
    flexGrow: 1,
    height: '4px',
    background: isActive ? token.colorSuccess : token.colorTextQuaternary,
    minWidth: '30px',
    margin: '0 8px',
    position: 'relative',
    transition: 'all 0.3s',
    backgroundImage: `linear-gradient(90deg, transparent 50%, ${isDark ? '#000' : '#fff'} 50%)`,
    backgroundSize: '20px 100%',
    animation: 'dash 1s linear infinite'
  });

  const renderPath = (pathIndex: number) => {
    const pathPrefix = paths === 2 ? `Path ${pathIndex === 0 ? 'A' : 'B'} ` : '';
    const atsFailed = failedComponent === `ATS_${pathIndex}`;
    const utilFailed = failedComponent === `Utility_${pathIndex}`;
    const genActive = utilFailed;

    return (
      <div key={pathIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: paths === 2 ? '40px' : '0', overflowX: 'auto', padding: '20px' }}>
        
        {/* Source Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <motion.div onClick={() => setFailedComponent(`Utility_${pathIndex}`)} whileHover={{ scale: 1.05 }} style={blockStyle('Utility', pathIndex, `Utility_${pathIndex}`)}>
            <ApiOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
            <Text strong>{pathPrefix}Utility</Text>
          </motion.div>
          
          <motion.div onClick={() => setFailedComponent(`Generator_${pathIndex}`)} whileHover={{ scale: 1.05 }} style={blockStyle('Generator', pathIndex, `Generator_${pathIndex}`)}>
            <FireOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
            <Text strong>{pathPrefix}Generator</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{genTotal / paths} Units</Text>
          </motion.div>
        </div>

        <div style={getLineStyle(genActive)} />

        <motion.div onClick={() => setFailedComponent(`ATS_${pathIndex}`)} whileHover={{ scale: 1.05 }} style={blockStyle('Normal', pathIndex, `ATS_${pathIndex}`)}>
          <AppstoreOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <Text strong>ATS</Text>
        </motion.div>

        <div style={getLineStyle(false)} />

        <motion.div onClick={() => setFailedComponent(`Switchgear_${pathIndex}`)} whileHover={{ scale: 1.05 }} style={blockStyle('Normal', pathIndex, `Switchgear_${pathIndex}`)}>
          <DatabaseOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <Text strong>Switchgear</Text>
        </motion.div>

        <div style={getLineStyle(false)} />

        <motion.div onClick={() => setFailedComponent(`UPS_${pathIndex}`)} whileHover={{ scale: 1.05 }} style={blockStyle('Normal', pathIndex, `UPS_${pathIndex}`)}>
          <PoweroffOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <Text strong>UPS</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{upsTotal / paths} Units</Text>
        </motion.div>

        <div style={getLineStyle(false)} />

        <motion.div onClick={() => setFailedComponent(`STS_${pathIndex}`)} whileHover={{ scale: 1.05 }} style={blockStyle('Normal', pathIndex, `STS_${pathIndex}`)}>
          <ThunderboltOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <Text strong>STS</Text>
        </motion.div>

        <div style={getLineStyle(false)} />

        <motion.div onClick={() => setFailedComponent(`PDU_${pathIndex}`)} whileHover={{ scale: 1.05 }} style={blockStyle('Normal', pathIndex, `PDU_${pathIndex}`)}>
          <AppstoreOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <Text strong>PDU</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{pduTotal / paths} Units</Text>
        </motion.div>

        <div style={getLineStyle(false)} />

        <motion.div onClick={() => setFailedComponent(`Racks_${pathIndex}`)} whileHover={{ scale: 1.05 }} style={blockStyle('Normal', pathIndex, `Racks_${pathIndex}`)}>
          <DatabaseOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <Text strong>IT Racks</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{totalRacks / paths} Racks</Text>
        </motion.div>
      </div>
    );
  };

  const getImpactMessage = () => {
    if (failedComponent === 'none') return "System operating normally.";
    
    if (failedComponent.includes('Utility')) {
      return "Utility failed. Generator is starting. Temporary reliance on UPS battery.";
    }
    
    if (failedComponent.includes('UPS')) {
      if (redundancy === 'N') return "CRITICAL: UPS failure in N configuration. Load will be dropped if utility fluctuates or fails.";
      if (redundancy === 'N+1') return "WARNING: UPS failure. Redundant UPS unit taking over load.";
      if (redundancy === '2N' || redundancy === '2(N+1)') return "WARNING: UPS Path failed. STS transferring load to alternate path.";
    }

    if (failedComponent.includes('Generator')) {
      if (redundancy === 'N') return "WARNING: Generator failure in N configuration. No backup power if utility fails.";
      return "WARNING: Generator failure. Redundant capacity available.";
    }
    
    return "Component failed. System redundancy absorbing impact.";
  };

  return (
    <motion.div key="power-chain-diagram" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <style>{`
        @keyframes dash {
          to {
            background-position: 20px 0;
          }
        }
        @keyframes pulseRed {
          0% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 77, 79, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0); }
        }
      `}</style>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card style={glassStyle} title="Power Chain Configuration">
              <Form layout="vertical">
                <Form.Item label="Redundancy Topology">
                  <Select value={redundancy} onChange={setRedundancy}>
                    <Select.Option value="N">N (No Redundancy)</Select.Option>
                    <Select.Option value="N+1">N+1</Select.Option>
                    <Select.Option value="2N">2N</Select.Option>
                    <Select.Option value="2(N+1)">2(N+1)</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Total IT Load (kW)">
                  <InputNumber style={{ width: '100%' }} value={totalItLoad} onChange={(v) => setTotalItLoad(v || 500)} min={100} max={100000} />
                </Form.Item>
                <Form.Item label="Total Racks">
                  <InputNumber style={{ width: '100%' }} value={totalRacks} onChange={(v) => setTotalRacks(v || 50)} min={1} max={500} />
                </Form.Item>
                <Collapse ghost>
                  <Panel header="Detailed Equipment Sizing" key="1">
                    <Form.Item label="UPS Unit Capacity (kVA)">
                      <InputNumber style={{ width: '100%' }} value={upsCapacity} onChange={(v) => setUpsCapacity(v || 250)} min={10} />
                    </Form.Item>
                    <Form.Item label="Generator Capacity (kW)">
                      <InputNumber style={{ width: '100%' }} value={generatorCapacity} onChange={(v) => setGeneratorCapacity(v || 500)} min={10} />
                    </Form.Item>
                    <Form.Item label="Racks per PDU">
                      <InputNumber style={{ width: '100%' }} value={racksPerPdu} onChange={(v) => setRacksPerPdu(v || 4)} min={1} max={10} />
                    </Form.Item>
                  </Panel>
                  <Panel header="UPS Battery & Generator Sizing" key="2">
                    <Form.Item label="Battery Runtime at Full Load (mins)">
                      <InputNumber style={{ width: '100%' }} value={batteryMinutes} onChange={(v) => setBatteryMinutes(v || 10)} min={1} max={30} />
                    </Form.Item>
                    <Form.Item label="Battery Ah Rating">
                      <InputNumber style={{ width: '100%' }} value={batteryAhRating} onChange={(v) => setBatteryAhRating(v || 100)} min={10} max={1000} />
                    </Form.Item>
                    <Form.Item label="Battery String Voltage">
                      <InputNumber style={{ width: '100%' }} value={batteryVoltage} onChange={(v) => setBatteryVoltage(v || 480)} min={48} max={800} />
                    </Form.Item>
                    <Form.Item label="Gen Fuel Consumption (L/hr)">
                      <InputNumber style={{ width: '100%' }} value={fuelConsumptionRate} onChange={(v) => setFuelConsumptionRate(v || 250)} min={50} max={2000} />
                    </Form.Item>
                  </Panel>
                </Collapse>
              </Form>
            </Card>

            <Card style={glassStyle} title="Fault Simulation">
              <Form layout="vertical">
                <Form.Item label="Select Component to Fail">
                  <Select value={failedComponent} onChange={setFailedComponent}>
                    <Select.Option value="none">Normal Operation</Select.Option>
                    <Select.Option value="Utility_0">Utility Path A</Select.Option>
                    <Select.Option value="Generator_0">Generator Path A</Select.Option>
                    <Select.Option value="UPS_0">UPS Path A</Select.Option>
                    {paths === 2 && (
                      <>
                        <Select.Option value="Utility_1">Utility Path B</Select.Option>
                        <Select.Option value="Generator_1">Generator Path B</Select.Option>
                        <Select.Option value="UPS_1">UPS Path B</Select.Option>
                      </>
                    )}
                  </Select>
                </Form.Item>
              </Form>
              {failedComponent !== 'none' && (
                <Alert
                  message="Fault Impact"
                  description={getImpactMessage()}
                  type={(redundancy === 'N' && failedComponent !== 'none') ? 'error' : 'warning'}
                  showIcon
                  icon={redundancy === 'N' ? <WarningOutlined /> : <WarningOutlined />}
                />
              )}
            </Card>

            <Card style={glassStyle} title="Single Point of Failure (SPOF)">
              {spofs.length === 0 ? (
                <Alert message="No single points of failure detected." type="success" showIcon />
              ) : (
                <Alert
                  message="Potential SPOFs Detected"
                  description={
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {spofs.map((s, i) => (
                        <li key={i}><strong>{s.component}:</strong> {s.explanation}</li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                />
              )}
            </Card>

            <Card style={glassStyle} title="UPS Battery Runtime Calculator">
              <Row gutter={[8, 8]}>
                <Col span={24}>
                  <Card size="small" title="100% Load">
                    <Text strong>{batteryRuntime.runtime100.toFixed(1)}</Text> mins
                  </Card>
                </Col>
                <Col span={24}>
                  <Card size="small" title="75% Load">
                    <Text strong>{batteryRuntime.runtime75.toFixed(1)}</Text> mins
                  </Card>
                </Col>
                <Col span={24}>
                  <Card size="small" title="50% Load">
                    <Text strong>{batteryRuntime.runtime50.toFixed(1)}</Text> mins
                  </Card>
                </Col>
              </Row>
            </Card>

            <Card style={glassStyle} title="Generator Fuel Tank Sizing">
              <Row gutter={[8, 8]}>
                <Col span={24}>
                  <Card size="small" title="24h Runtime">
                    <div><Text strong>{fuelNeeds.h24.l.toFixed(0)}</Text> L</div>
                    <div><Text type="secondary">{fuelNeeds.h24.gal.toFixed(0)} gal</Text></div>
                  </Card>
                </Col>
                <Col span={24}>
                  <Card size="small" title="48h Runtime">
                    <div><Text strong>{fuelNeeds.h48.l.toFixed(0)}</Text> L</div>
                    <div><Text type="secondary">{fuelNeeds.h48.gal.toFixed(0)} gal</Text></div>
                  </Card>
                </Col>
                <Col span={24}>
                  <Card size="small" title="72h Runtime">
                    <div><Text strong>{fuelNeeds.h72.l.toFixed(0)}</Text> L</div>
                    <div><Text type="secondary">{fuelNeeds.h72.gal.toFixed(0)} gal</Text></div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Space>
        </Col>
        
        <Col xs={24} lg={16}>
          <Card style={{ ...glassStyle, overflowX: 'auto', minHeight: '400px' }} title="Single-Line Power Diagram">
            {renderPath(0)}
            {paths === 2 && (
              <>
                <Divider dashed>Path Separation</Divider>
                {renderPath(1)}
              </>
            )}
          </Card>
          
          <Card style={{ ...glassStyle, marginTop: '16px' }} title="Component Summary & Estimated Cost">
            <Table
              dataSource={tableData}
              pagination={false}
              size="small"
              columns={[
                { title: 'Component', dataIndex: 'component', key: 'component' },
                { title: 'Quantity', dataIndex: 'count', key: 'count' },
                { title: 'Rate', dataIndex: 'rate', key: 'rate' },
                { title: 'Est. Cost', dataIndex: 'estCost', key: 'estCost', align: 'right' }
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Total Estimated Power Chain Cost</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong type="success">{formatCurrency(totalCost)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Col>
      </Row>
    </motion.div>
  );
}
