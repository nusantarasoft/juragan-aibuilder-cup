import React from 'react';
import { Typography, Progress, Badge, Row, Col, List, Avatar, Tag } from 'antd';
import { TeamOutlined, ToolOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { GlassPanel } from './GlassPanel';

const { Text, Title } = Typography;

export function ResourcePanel({ isDark, progress }: { isDark: boolean; progress: number }) {
  // Mock data for resource utilization based on progress phase
  const activeWorkers = Math.max(10, Math.round(Math.sin(progress / 100 * Math.PI) * 50));
  const heavyMachinery = Math.max(2, Math.round(Math.sin(progress / 100 * Math.PI) * 8));
  
  const getUtilizationColor = (val: number, max: number) => {
    const ratio = val / max;
    if (ratio > 0.9) return '#ef4444'; // Overallocated
    if (ratio > 0.7) return '#f59e0b'; // High
    return '#10b981'; // Optimal
  };

  return (
    <GlassPanel isDark={isDark} intensity="medium" style={{ padding: 16 }}>
      <Title level={5} style={{ marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <TeamOutlined /> Resource Utilization
      </Title>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 12 }}><TeamOutlined /> Site Workers</Text>
          <Text style={{ fontSize: 12 }}>{activeWorkers} / 60</Text>
        </div>
        <Progress 
          percent={Math.round((activeWorkers / 60) * 100)} 
          size="small" 
          strokeColor={getUtilizationColor(activeWorkers, 60)} 
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 12 }}><ToolOutlined /> Heavy Machinery</Text>
          <Text style={{ fontSize: 12 }}>{heavyMachinery} / 10</Text>
        </div>
        <Progress 
          percent={Math.round((heavyMachinery / 10) * 100)} 
          size="small" 
          strokeColor={getUtilizationColor(heavyMachinery, 10)} 
        />
      </div>

      <div>
        <Text strong style={{ fontSize: 12 }}>Key Personnel</Text>
        <List
          size="small"
          dataSource={[
            { role: 'Site Manager', name: 'John Doe', status: 'On Site' },
            { role: 'Safety Officer', name: 'Jane Smith', status: 'On Site' },
            { role: 'Lead Engineer', name: 'Mike Ross', status: 'Remote' },
          ]}
          renderItem={item => (
            <List.Item style={{ padding: '8px 0', border: 'none' }}>
              <List.Item.Meta
                avatar={<Avatar size="small" style={{ backgroundColor: '#3b82f6' }}>{item.name[0]}</Avatar>}
                title={<Text style={{ fontSize: 12 }}>{item.name}</Text>}
                description={<Text type="secondary" style={{ fontSize: 10 }}>{item.role}</Text>}
              />
              <Tag color={item.status === 'On Site' ? 'success' : 'default'} style={{ fontSize: 10 }}>
                {item.status}
              </Tag>
            </List.Item>
          )}
        />
      </div>

      <div style={{ marginTop: 12, padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <Text style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
          <SafetyCertificateOutlined /> Zero safety incidents reported today.
        </Text>
      </div>
    </GlassPanel>
  );
}
