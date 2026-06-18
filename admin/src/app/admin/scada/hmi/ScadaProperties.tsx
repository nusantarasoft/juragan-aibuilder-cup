import React from 'react';
import { Form, Input, InputNumber, Select, ColorPicker, Button, Divider, Space, Slider, Typography } from 'antd';
import { useHmiStore } from '@/store/useHmiStore';
import { useScada3dStore } from '@/store/useScada3dStore';
import { useScadaStore } from '@/store/useScadaStore';

const { Text } = Typography;

export default function ScadaProperties({ selected3dId }: { selected3dId?: string | null }) {
    const { elements: elements2d, selectedIds: selected2dIds, updateElement: update2dElement, deleteElements: delete2dElements } = useHmiStore();
    const { elements: elements3d, updateElement: update3dElement, deleteElement: delete3dElement } = useScada3dStore();
    const { tags } = useScadaStore();
    
    const is3d = !!selected3dId;
    const selectedEl = is3d 
        ? elements3d.find(el => el.id === selected3dId)
        : elements2d.find(el => el.id === selected2dIds[0]);

    if (!selectedEl) {
        return <div style={{ padding: 16, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>Click an object to view properties</div>;
    }

    const boundTag = selectedEl.tagId ? tags[selectedEl.tagId] : null;

    const handlePropChange = (key: string, value: any) => {
        if (is3d) {
            update3dElement(selectedEl.id, { properties: { ...selectedEl.properties, [key]: value } });
        } else {
            update2dElement(selectedEl.id, { properties: { ...selectedEl.properties, [key]: value } });
        }
    };

    const handleBaseChange = (key: string, value: any) => {
        if (is3d) {
            update3dElement(selectedEl.id, { [key]: value });
        } else {
            update2dElement(selectedEl.id, { [key]: value });
        }
    };

    const handleDelete = () => {
        if (is3d) {
            delete3dElement(selectedEl.id);
        } else {
            delete2dElements([selectedEl.id]);
        }
    };

    const tagOptions = Object.values(tags).map(tag => ({
        value: tag.id,
        label: `${tag.name} (${tag.id})`
    }));

    return (
        <div style={{ overflowY: 'auto', paddingRight: 4 }}>
            <Form layout="vertical" size="small">
                <Space style={{ display: 'flex', marginBottom: 4 }}>
                    <Form.Item label="ID" style={{ margin: 0, flex: 1 }}>
                        <Input value={selectedEl.id} disabled style={{ fontSize: 11 }} />
                    </Form.Item>
                    <Form.Item label="Type" style={{ margin: 0, flex: 1 }}>
                        <Input value={selectedEl.type} disabled style={{ fontSize: 11 }} />
                    </Form.Item>
                </Space>
                
                <Divider style={{ margin: '8px 0', fontSize: 11 }}>Transform {is3d ? '(3D)' : '(2D)'}</Divider>
                
                {is3d ? (
                    <>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Position</Text>
                        <Space style={{ display: 'flex', marginBottom: 6 }}>
                            <Form.Item label="X" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).position[0]} step={0.5} onChange={v => handleBaseChange('position', [v, (selectedEl as any).position[1], (selectedEl as any).position[2]])} style={{ width: 70 }} />
                            </Form.Item>
                            <Form.Item label="Y" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).position[1]} step={0.5} onChange={v => handleBaseChange('position', [(selectedEl as any).position[0], v, (selectedEl as any).position[2]])} style={{ width: 70 }} />
                            </Form.Item>
                            <Form.Item label="Z" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).position[2]} step={0.5} onChange={v => handleBaseChange('position', [(selectedEl as any).position[0], (selectedEl as any).position[1], v])} style={{ width: 70 }} />
                            </Form.Item>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Rotation (rad)</Text>
                        <Space style={{ display: 'flex', marginBottom: 6 }}>
                            <Form.Item label="Rx" style={{ margin: 0 }}>
                                <InputNumber value={parseFloat(((selectedEl as any).rotation[0]).toFixed(2))} step={0.1} onChange={v => handleBaseChange('rotation', [v, (selectedEl as any).rotation[1], (selectedEl as any).rotation[2]])} style={{ width: 70 }} />
                            </Form.Item>
                            <Form.Item label="Ry" style={{ margin: 0 }}>
                                <InputNumber value={parseFloat(((selectedEl as any).rotation[1]).toFixed(2))} step={0.1} onChange={v => handleBaseChange('rotation', [(selectedEl as any).rotation[0], v, (selectedEl as any).rotation[2]])} style={{ width: 70 }} />
                            </Form.Item>
                            <Form.Item label="Rz" style={{ margin: 0 }}>
                                <InputNumber value={parseFloat(((selectedEl as any).rotation[2]).toFixed(2))} step={0.1} onChange={v => handleBaseChange('rotation', [(selectedEl as any).rotation[0], (selectedEl as any).rotation[1], v])} style={{ width: 70 }} />
                            </Form.Item>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>Scale</Text>
                        <Space style={{ display: 'flex', marginBottom: 6 }}>
                            <Form.Item label="Sx" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).scale[0]} step={0.1} min={0.1} onChange={v => handleBaseChange('scale', [v, (selectedEl as any).scale[1], (selectedEl as any).scale[2]])} style={{ width: 70 }} />
                            </Form.Item>
                            <Form.Item label="Sy" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).scale[1]} step={0.1} min={0.1} onChange={v => handleBaseChange('scale', [(selectedEl as any).scale[0], v, (selectedEl as any).scale[2]])} style={{ width: 70 }} />
                            </Form.Item>
                            <Form.Item label="Sz" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).scale[2]} step={0.1} min={0.1} onChange={v => handleBaseChange('scale', [(selectedEl as any).scale[0], (selectedEl as any).scale[1], v])} style={{ width: 70 }} />
                            </Form.Item>
                        </Space>
                    </>
                ) : (
                    <>
                        <Space style={{ display: 'flex', marginBottom: 6 }}>
                            <Form.Item label="X" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).x} onChange={v => handleBaseChange('x', v)} style={{ width: 80 }} />
                            </Form.Item>
                            <Form.Item label="Y" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).y} onChange={v => handleBaseChange('y', v)} style={{ width: 80 }} />
                            </Form.Item>
                        </Space>
                        <Space style={{ display: 'flex', marginBottom: 6 }}>
                            <Form.Item label="W" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).width} onChange={v => handleBaseChange('width', v)} min={10} style={{ width: 80 }} />
                            </Form.Item>
                            <Form.Item label="H" style={{ margin: 0 }}>
                                <InputNumber value={(selectedEl as any).height} onChange={v => handleBaseChange('height', v)} min={4} style={{ width: 80 }} />
                            </Form.Item>
                        </Space>
                        <Form.Item label="Rotation (°)" style={{ marginBottom: 6 }}>
                            <InputNumber value={(selectedEl as any).rotation} onChange={v => handleBaseChange('rotation', v)} min={0} max={360} />
                        </Form.Item>
                    </>
                )}

                <Divider style={{ margin: '8px 0', fontSize: 11 }}>Data Binding</Divider>
                <Form.Item label="Tag ID" style={{ marginBottom: 4 }}>
                    <Select 
                        value={selectedEl.tagId} 
                        onChange={v => handleBaseChange('tagId', v)}
                        options={tagOptions}
                        allowClear
                        size="small"
                    />
                </Form.Item>
                {boundTag && (
                    <div style={{ padding: '4px 8px', background: boundTag.alarm ? 'rgba(245,34,45,0.15)' : 'rgba(24,144,255,0.1)', borderRadius: 4, marginBottom: 8, fontSize: 11 }}>
                        <Text type="secondary">Live: </Text>
                        <Text strong style={{ color: boundTag.alarm ? '#f5222d' : '#1890ff', fontFamily: 'monospace' }}>
                            {typeof boundTag.value === 'boolean' ? (boundTag.value ? 'ON' : 'OFF') : boundTag.value} {boundTag.unit}
                        </Text>
                    </div>
                )}

                <Divider style={{ margin: '8px 0', fontSize: 11 }}>Appearance</Divider>
                <Form.Item label="Name/Label" style={{ marginBottom: 6 }}>
                    <Input value={selectedEl.properties.label || selectedEl.properties.name || ''} onChange={e => handlePropChange(is3d ? 'name' : 'label', e.target.value)} />
                </Form.Item>
                
                {is3d && (
                    <>
                        <Form.Item label="Color" style={{ marginBottom: 6 }}>
                            <ColorPicker 
                                value={selectedEl.properties.color || '#888888'} 
                                onChange={(_, hex) => handlePropChange('color', hex)} 
                                showText
                                size="small"
                            />
                        </Form.Item>
                        <Form.Item label="Metalness" style={{ marginBottom: 4 }}>
                            <Slider min={0} max={1} step={0.1} value={selectedEl.properties.metalness ?? 0.5} onChange={v => handlePropChange('metalness', v)} />
                        </Form.Item>
                        <Form.Item label="Roughness" style={{ marginBottom: 4 }}>
                            <Slider min={0} max={1} step={0.1} value={selectedEl.properties.roughness ?? 0.5} onChange={v => handlePropChange('roughness', v)} />
                        </Form.Item>
                        <Form.Item label="Opacity" style={{ marginBottom: 6 }}>
                            <Slider min={0} max={1} step={0.1} value={selectedEl.properties.opacity ?? 1} onChange={v => handlePropChange('opacity', v)} />
                        </Form.Item>
                    </>
                )}
                
                {!is3d && (
                    <Form.Item label="Color" style={{ marginBottom: 6 }}>
                        <ColorPicker 
                            value={selectedEl.properties.color || '#ffffff'} 
                            onChange={(_, hex) => handlePropChange('color', hex)} 
                            showText
                            size="small"
                        />
                    </Form.Item>
                )}
                
                {!is3d && selectedEl.type === 'indicator' && (
                    <Space style={{ display: 'flex' }}>
                        <Form.Item label="Unit" style={{ marginBottom: 6 }}>
                            <Input value={selectedEl.properties.unit || ''} onChange={e => handlePropChange('unit', e.target.value)} />
                        </Form.Item>
                        <Form.Item label="Format" style={{ marginBottom: 6 }}>
                            <Input value={selectedEl.properties.format || ''} onChange={e => handlePropChange('format', e.target.value)} />
                        </Form.Item>
                    </Space>
                )}

                <Divider style={{ margin: '10px 0' }} />
                <Button danger block onClick={handleDelete} size="small">
                    Delete Element
                </Button>
            </Form>
        </div>
    );
}
