import React from 'react';
import { Card, Typography, Progress, Badge, Row, Col, Statistic, List, Avatar } from 'antd';
import { DollarOutlined, ArrowUpOutlined, ArrowDownOutlined, WarningOutlined } from '@ant-design/icons';
import { GlassPanel } from './GlassPanel';
import { motion } from 'framer-motion';

const { Text, Title } = Typography;

export function CostPanel({ isDark, progress }: { isDark: boolean; progress: number }) {
  // Mock data for costs based on progress
  const totalBudget = 1500000;
  const currentCost = (progress / 100) * totalBudget * (1 + (Math.random() * 0.1)); // Adds slight random overrun
  const costVariance = currentCost - ((progress / 100) * totalBudget);
  const isOverrun = costVariance > 0;

  return (
    <GlassPanel isDark={isDark} intensity="medium" style={{ padding: 16 }}>
      <Title level={5} style={{ marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <DollarOutlined /> Cost Tracking
      </Title>
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Statistic 
            title="Total Budget" 
            value={totalBudget} 
            prefix="$" 
            valueStyle={{ fontSize: 16 }}
          />
        </Col>
        <Col span={12}>
          <Statistic 
            title="Current Cost" 
            value={Math.round(currentCost)} 
            prefix="$" 
            valueStyle={{ 
              fontSize: 16, 
              color: isOverrun ? '#ef4444' : '#10b981' 
            }} 
            suffix={isOverrun ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
          />
        </Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Budget Burn Rate</Text>
        <Progress 
          percent={Math.round((currentCost / totalBudget) * 100)} 
          status={isOverrun ? 'exception' : 'active'}
          strokeColor={isOverrun ? '#ef4444' : '#10b981'}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <Text strong style={{ fontSize: 12 }}>Top Cost Centers</Text>
        <List
          size="small"
          dataSource={[
            { name: 'Materials', cost: currentCost * 0.45 },
            { name: 'Labor', cost: currentCost * 0.35 },
            { name: 'Equipment', cost: currentCost * 0.20 },
          ]}
          renderItem={item => (
            <List.Item style={{ padding: '8px 0', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Text style={{ fontSize: 12 }}>{item.name}</Text>
                <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>${Math.round(item.cost).toLocaleString()}</Text>
              </div>
            </List.Item>
          )}
        />
      </div>
      
      {isOverrun && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 12, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}
        >
          <Text style={{ color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <WarningOutlined /> Cost Overrun Detected (${Math.round(costVariance).toLocaleString()})
          </Text>
        </motion.div>
      )}
    </GlassPanel>
  );
}
