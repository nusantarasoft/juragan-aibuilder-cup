import React from 'react';
import { Card, Typography, InputNumber, Button, Divider, Space, Tooltip } from 'antd';
import { motion } from 'framer-motion';
import { EditOutlined, BuildOutlined, GatewayOutlined, SyncOutlined } from '@ant-design/icons';
import { GlassPanel } from './GlassPanel';
import { usePreferencesStore } from '@/store/usePreferencesStore';

const { Text, Title } = Typography;

export function CADEditorPanel({ 
  isDark, 
  selectedObject, 
  onUpdateTransform,
  drawingMode,
  setDrawingMode 
}: { 
  isDark: boolean; 
  selectedObject: any;
  onUpdateTransform: (id: string, prop: 'position' | 'rotation' | 'scale', val: [number, number, number]) => void;
  drawingMode: 'none' | 'wall' | 'fence';
  setDrawingMode: (mode: 'none' | 'wall' | 'fence') => void;
}) {

  return (
    <GlassPanel isDark={isDark} intensity="high" style={{ width: 280, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>
        <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <EditOutlined /> CAD Editor Tools
        </Title>
      </div>

      <div style={{ padding: 16 }}>
        <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>Drawing Modes</Text>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button 
            type={drawingMode === 'none' ? 'primary' : 'default'} 
            onClick={() => setDrawingMode('none')}
            size="small"
          >
            Select
          </Button>
          <Button 
            type={drawingMode === 'wall' ? 'primary' : 'default'} 
            onClick={() => setDrawingMode('wall')}
            icon={<BuildOutlined />}
            size="small"
          >
            Wall
          </Button>
          <Button 
            type={drawingMode === 'fence' ? 'primary' : 'default'} 
            onClick={() => setDrawingMode('fence')}
            icon={<GatewayOutlined />}
            size="small"
          >
            Fence
          </Button>
        </Space>

        <Divider style={{ margin: '16px 0' }} />

        {selectedObject ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 12 }}>Object Properties</Text>
              <Text type="secondary" style={{ fontSize: 10 }}>ID: {selectedObject.id.substring(0, 8)}</Text>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Position (X, Y, Z)</Text>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber 
                  size="small" value={selectedObject.position?.[0] || 0} step={0.5} 
                  onChange={(v) => onUpdateTransform(selectedObject.id, 'position', [v || 0, selectedObject.position?.[1] || 0, selectedObject.position?.[2] || 0])} 
                />
                <InputNumber 
                  size="small" value={selectedObject.position?.[1] || 0} step={0.5} 
                  onChange={(v) => onUpdateTransform(selectedObject.id, 'position', [selectedObject.position?.[0] || 0, v || 0, selectedObject.position?.[2] || 0])} 
                />
                <InputNumber 
                  size="small" value={selectedObject.position?.[2] || 0} step={0.5} 
                  onChange={(v) => onUpdateTransform(selectedObject.id, 'position', [selectedObject.position?.[0] || 0, selectedObject.position?.[1] || 0, v || 0])} 
                />
              </Space.Compact>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>Rotation (Deg)</Text>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber 
                  size="small" value={Math.round((selectedObject.rotation?.[0] || 0) * (180 / Math.PI))} step={15} 
                  onChange={(v) => onUpdateTransform(selectedObject.id, 'rotation', [(v || 0) * (Math.PI / 180), selectedObject.rotation?.[1] || 0, selectedObject.rotation?.[2] || 0])} 
                />
                <InputNumber 
                  size="small" value={Math.round((selectedObject.rotation?.[1] || 0) * (180 / Math.PI))} step={15} 
                  onChange={(v) => onUpdateTransform(selectedObject.id, 'rotation', [selectedObject.rotation?.[0] || 0, (v || 0) * (Math.PI / 180), selectedObject.rotation?.[2] || 0])} 
                />
                <InputNumber 
                  size="small" value={Math.round((selectedObject.rotation?.[2] || 0) * (180 / Math.PI))} step={15} 
                  onChange={(v) => onUpdateTransform(selectedObject.id, 'rotation', [selectedObject.rotation?.[0] || 0, selectedObject.rotation?.[1] || 0, (v || 0) * (Math.PI / 180)])} 
                />
              </Space.Compact>
            </div>

          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.5 }}>
            <Text>Select an object to edit properties</Text>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
