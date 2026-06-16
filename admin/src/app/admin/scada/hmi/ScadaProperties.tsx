import React from 'react';
import { Form, Input, InputNumber, Select, ColorPicker, Button, Divider, Space } from 'antd';
import { useHmiStore } from '@/store/useHmiStore';

export default function ScadaProperties() {
    const { elements, selectedIds, updateElement, deleteElements } = useHmiStore();
    
    if (selectedIds.length === 0) {
        return <div style={{ padding: 16, textAlign: 'center', opacity: 0.5 }}>No element selected</div>;
    }

    const selectedEl = elements.find(el => el.id === selectedIds[0]);
    if (!selectedEl) return null;

    const handlePropChange = (key: string, value: any) => {
        updateElement(selectedEl.id, {
            properties: { ...selectedEl.properties, [key]: value }
        });
    };

    const handleBaseChange = (key: string, value: any) => {
        updateElement(selectedEl.id, { [key]: value });
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', paddingRight: 8 }}>
            <Form layout="vertical" size="small">
                <Form.Item label="ID">
                    <Input value={selectedEl.id} disabled />
                </Form.Item>
                <Form.Item label="Type">
                    <Input value={selectedEl.type} disabled />
                </Form.Item>
                
                <Divider style={{ margin: '12px 0' }}>Transform</Divider>
                <Space style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item label="X" style={{ margin: 0 }}>
                        <InputNumber value={selectedEl.x} onChange={v => handleBaseChange('x', v)} />
                    </Form.Item>
                    <Form.Item label="Y" style={{ margin: 0 }}>
                        <InputNumber value={selectedEl.y} onChange={v => handleBaseChange('y', v)} />
                    </Form.Item>
                </Space>
                <Space style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item label="W" style={{ margin: 0 }}>
                        <InputNumber value={selectedEl.width} onChange={v => handleBaseChange('width', v)} min={10} />
                    </Form.Item>
                    <Form.Item label="H" style={{ margin: 0 }}>
                        <InputNumber value={selectedEl.height} onChange={v => handleBaseChange('height', v)} min={4} />
                    </Form.Item>
                </Space>
                <Form.Item label="Rotation (°)">
                    <InputNumber value={selectedEl.rotation} onChange={v => handleBaseChange('rotation', v)} min={0} max={360} />
                </Form.Item>
                <Form.Item label="Z-Index">
                    <InputNumber value={selectedEl.zIndex} onChange={v => handleBaseChange('zIndex', v)} />
                </Form.Item>

                <Divider style={{ margin: '12px 0' }}>Data Binding</Divider>
                <Form.Item label="Tag ID">
                    <Select 
                        value={selectedEl.tagId} 
                        onChange={v => handleBaseChange('tagId', v)}
                        options={[
                            { value: 'tag_temp_1', label: 'Chiller 1 Temp (tag_temp_1)' },
                            { value: 'tag_temp_2', label: 'Tower Return Temp (tag_temp_2)' },
                            { value: 'tag_pump_hz', label: 'Pump Frequency (tag_pump_hz)' },
                            { value: 'tag_pump_status', label: 'Pump Status (tag_pump_status)' },
                        ]}
                        allowClear
                    />
                </Form.Item>

                <Divider style={{ margin: '12px 0' }}>Appearance</Divider>
                <Form.Item label="Label">
                    <Input value={selectedEl.properties.label || ''} onChange={e => handlePropChange('label', e.target.value)} />
                </Form.Item>
                <Form.Item label="Primary Color">
                    <ColorPicker 
                        value={selectedEl.properties.color || '#ffffff'} 
                        onChange={(_, hex) => handlePropChange('color', hex)} 
                        showText
                    />
                </Form.Item>
                
                {selectedEl.type === 'indicator' && (
                    <Space style={{ display: 'flex' }}>
                        <Form.Item label="Unit">
                            <Input value={selectedEl.properties.unit || ''} onChange={e => handlePropChange('unit', e.target.value)} />
                        </Form.Item>
                        <Form.Item label="Format">
                            <Input value={selectedEl.properties.format || ''} onChange={e => handlePropChange('format', e.target.value)} />
                        </Form.Item>
                    </Space>
                )}

                <Divider style={{ margin: '16px 0' }} />
                <Button danger block onClick={() => deleteElements([selectedEl.id])}>
                    Delete Element
                </Button>
            </Form>
        </div>
    );
}
