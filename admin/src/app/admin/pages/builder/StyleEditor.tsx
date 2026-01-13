import React, { useState, useEffect } from "react";
import { Form, InputNumber, ColorPicker, Collapse, Space, Select, Slider, Row, Col, Input } from "antd";
import {
    BgColorsOutlined,
    FontSizeOutlined,
    BorderOuterOutlined,
    LayoutOutlined,
    VerticalAlignMiddleOutlined
} from "@ant-design/icons";

const { Panel } = Collapse;

// Common CSS units
const UNITS = [
    { label: 'px', value: 'px' },
    { label: '%', value: '%' },
    { label: 'rem', value: 'rem' },
    { label: 'em', value: 'em' },
    { label: 'vh', value: 'vh' },
    { label: 'vw', value: 'vw' },
    { label: 'auto', value: 'auto' },
];

const SIZE_UNITS = UNITS.filter(u => u.value !== 'auto');

interface StyleEditorProps {
    style?: React.CSSProperties;
    onChange: (style: React.CSSProperties) => void;
}

// Helper to parse value and unit from CSS value like "10px" or "50%"
const parseValueWithUnit = (cssValue: string | number | undefined): { value: number | undefined; unit: string } => {
    if (cssValue === undefined || cssValue === null || cssValue === '') {
        return { value: undefined, unit: 'px' };
    }
    if (cssValue === 'auto') {
        return { value: undefined, unit: 'auto' };
    }
    const str = String(cssValue);
    const match = str.match(/^(-?\d*\.?\d+)(px|%|rem|em|vh|vw)?$/);
    if (match) {
        return { value: parseFloat(match[1]), unit: match[2] || 'px' };
    }
    return { value: undefined, unit: 'px' };
};

// Component for value + unit input
interface ValueWithUnitInputProps {
    value?: string | number;
    onChange: (value: string | undefined) => void;
    placeholder?: string;
    allowAuto?: boolean;
    style?: React.CSSProperties;
}

const ValueWithUnitInput: React.FC<ValueWithUnitInputProps> = ({
    value,
    onChange,
    placeholder = "0",
    allowAuto = false,
    style
}) => {
    const parsed = parseValueWithUnit(value);
    const [unit, setUnit] = useState(parsed.unit);
    const [numValue, setNumValue] = useState(parsed.value);

    useEffect(() => {
        const p = parseValueWithUnit(value);
        setUnit(p.unit);
        setNumValue(p.value);
    }, [value]);

    const handleValueChange = (val: number | null) => {
        setNumValue(val ?? undefined);
        if (unit === 'auto') {
            onChange('auto');
        } else if (val !== null && val !== undefined) {
            onChange(`${val}${unit}`);
        } else {
            onChange(undefined);
        }
    };

    const handleUnitChange = (newUnit: string) => {
        setUnit(newUnit);
        if (newUnit === 'auto') {
            onChange('auto');
        } else if (numValue !== undefined) {
            onChange(`${numValue}${newUnit}`);
        }
    };

    const units = allowAuto ? UNITS : SIZE_UNITS;

    return (
        <Input.Group compact style={{ display: 'flex', ...style }}>
            <InputNumber
                size="small"
                placeholder={placeholder}
                value={unit === 'auto' ? undefined : numValue}
                onChange={handleValueChange}
                disabled={unit === 'auto'}
                style={{ flex: 1, minWidth: 40 }}
            />
            <Select
                size="small"
                value={unit}
                onChange={handleUnitChange}
                options={units}
                style={{ width: 58 }}
            />
        </Input.Group>
    );
};

// 4-direction input (for margin/padding)
interface FourDirectionInputProps {
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
    onChangeTop: (v: string | undefined) => void;
    onChangeRight: (v: string | undefined) => void;
    onChangeBottom: (v: string | undefined) => void;
    onChangeLeft: (v: string | undefined) => void;
}

const FourDirectionInput: React.FC<FourDirectionInputProps> = ({
    top, right, bottom, left,
    onChangeTop, onChangeRight, onChangeBottom, onChangeLeft
}) => {
    return (
        <Row gutter={[4, 4]}>
            <Col span={12}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Top</div>
                <ValueWithUnitInput value={top} onChange={onChangeTop} placeholder="0" allowAuto />
            </Col>
            <Col span={12}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Right</div>
                <ValueWithUnitInput value={right} onChange={onChangeRight} placeholder="0" allowAuto />
            </Col>
            <Col span={12}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Bottom</div>
                <ValueWithUnitInput value={bottom} onChange={onChangeBottom} placeholder="0" allowAuto />
            </Col>
            <Col span={12}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Left</div>
                <ValueWithUnitInput value={left} onChange={onChangeLeft} placeholder="0" allowAuto />
            </Col>
        </Row>
    );
};

export const StyleEditor: React.FC<StyleEditorProps> = ({ style = {}, onChange }) => {
    const updateStyle = (key: string, value: any) => {
        onChange({
            ...style,
            [key]: value,
        });
    };

    return (
        <Collapse defaultActiveKey={['spacing', 'layout']} ghost size="small">
            {/* Spacing & Size */}
            <Panel header={<Space><BorderOuterOutlined /> Spacing & Size</Space>} key="spacing">
                <Form layout="vertical" size="small">
                    <Form.Item label="Padding" style={{ marginBottom: 12 }}>
                        <FourDirectionInput
                            top={style.paddingTop}
                            right={style.paddingRight}
                            bottom={style.paddingBottom}
                            left={style.paddingLeft}
                            onChangeTop={(v) => updateStyle("paddingTop", v)}
                            onChangeRight={(v) => updateStyle("paddingRight", v)}
                            onChangeBottom={(v) => updateStyle("paddingBottom", v)}
                            onChangeLeft={(v) => updateStyle("paddingLeft", v)}
                        />
                    </Form.Item>
                    <Form.Item label="Margin" style={{ marginBottom: 12 }}>
                        <FourDirectionInput
                            top={style.marginTop}
                            right={style.marginRight}
                            bottom={style.marginBottom}
                            left={style.marginLeft}
                            onChangeTop={(v) => updateStyle("marginTop", v)}
                            onChangeRight={(v) => updateStyle("marginRight", v)}
                            onChangeBottom={(v) => updateStyle("marginBottom", v)}
                            onChangeLeft={(v) => updateStyle("marginLeft", v)}
                        />
                    </Form.Item>
                    <Form.Item label="Width & Height" style={{ marginBottom: 8 }}>
                        <Row gutter={8}>
                            <Col span={12}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Width</div>
                                <ValueWithUnitInput
                                    value={style.width}
                                    onChange={(v) => updateStyle("width", v)}
                                    placeholder="auto"
                                    allowAuto
                                />
                            </Col>
                            <Col span={12}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Height</div>
                                <ValueWithUnitInput
                                    value={style.height}
                                    onChange={(v) => updateStyle("height", v)}
                                    placeholder="auto"
                                    allowAuto
                                />
                            </Col>
                        </Row>
                    </Form.Item>
                    <Form.Item label="Min/Max Width" style={{ marginBottom: 8 }}>
                        <Row gutter={8}>
                            <Col span={12}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Min</div>
                                <ValueWithUnitInput
                                    value={style.minWidth}
                                    onChange={(v) => updateStyle("minWidth", v)}
                                    placeholder="0"
                                />
                            </Col>
                            <Col span={12}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Max</div>
                                <ValueWithUnitInput
                                    value={style.maxWidth}
                                    onChange={(v) => updateStyle("maxWidth", v)}
                                    placeholder="none"
                                />
                            </Col>
                        </Row>
                    </Form.Item>
                    <Form.Item label="Min/Max Height" style={{ marginBottom: 8 }}>
                        <Row gutter={8}>
                            <Col span={12}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Min</div>
                                <ValueWithUnitInput
                                    value={style.minHeight}
                                    onChange={(v) => updateStyle("minHeight", v)}
                                    placeholder="0"
                                />
                            </Col>
                            <Col span={12}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Max</div>
                                <ValueWithUnitInput
                                    value={style.maxHeight}
                                    onChange={(v) => updateStyle("maxHeight", v)}
                                    placeholder="none"
                                />
                            </Col>
                        </Row>
                    </Form.Item>
                </Form>
            </Panel>

            {/* Layout & Position */}
            <Panel header={<Space><LayoutOutlined /> Layout & Position</Space>} key="layout">
                <Form layout="vertical" size="small">
                    <Form.Item label="Display" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.display as string}
                            onChange={(val) => updateStyle("display", val)}
                            allowClear
                            placeholder="Auto"
                            options={[
                                { label: "Block", value: "block" },
                                { label: "Inline Block", value: "inline-block" },
                                { label: "Inline", value: "inline" },
                                { label: "Flex", value: "flex" },
                                { label: "Inline Flex", value: "inline-flex" },
                                { label: "Grid", value: "grid" },
                                { label: "None", value: "none" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Position" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.position as string}
                            onChange={(val) => updateStyle("position", val)}
                            allowClear
                            placeholder="Static"
                            options={[
                                { label: "Static", value: "static" },
                                { label: "Relative", value: "relative" },
                                { label: "Absolute", value: "absolute" },
                                { label: "Fixed", value: "fixed" },
                                { label: "Sticky", value: "sticky" },
                            ]}
                        />
                    </Form.Item>
                    {(style.position === 'absolute' || style.position === 'fixed' || style.position === 'relative' || style.position === 'sticky') && (
                        <Form.Item label="Position Values" style={{ marginBottom: 8 }}>
                            <Row gutter={[4, 4]}>
                                <Col span={12}>
                                    <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Top</div>
                                    <ValueWithUnitInput
                                        value={style.top}
                                        onChange={(v) => updateStyle("top", v)}
                                        placeholder="auto"
                                        allowAuto
                                    />
                                </Col>
                                <Col span={12}>
                                    <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Right</div>
                                    <ValueWithUnitInput
                                        value={style.right}
                                        onChange={(v) => updateStyle("right", v)}
                                        placeholder="auto"
                                        allowAuto
                                    />
                                </Col>
                                <Col span={12}>
                                    <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Bottom</div>
                                    <ValueWithUnitInput
                                        value={style.bottom}
                                        onChange={(v) => updateStyle("bottom", v)}
                                        placeholder="auto"
                                        allowAuto
                                    />
                                </Col>
                                <Col span={12}>
                                    <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Left</div>
                                    <ValueWithUnitInput
                                        value={style.left}
                                        onChange={(v) => updateStyle("left", v)}
                                        placeholder="auto"
                                        allowAuto
                                    />
                                </Col>
                            </Row>
                        </Form.Item>
                    )}
                    <Form.Item label="Z-Index" style={{ marginBottom: 8 }}>
                        <InputNumber
                            size="small"
                            value={style.zIndex as number}
                            onChange={(val) => updateStyle("zIndex", val)}
                            placeholder="Auto"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                    <Form.Item label="Overflow" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.overflow as string}
                            onChange={(val) => updateStyle("overflow", val)}
                            allowClear
                            placeholder="Visible"
                            options={[
                                { label: "Visible", value: "visible" },
                                { label: "Hidden", value: "hidden" },
                                { label: "Scroll", value: "scroll" },
                                { label: "Auto", value: "auto" },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Panel>

            {/* Flexbox Alignment */}
            <Panel header={<Space><VerticalAlignMiddleOutlined /> Alignment (Flex)</Space>} key="alignment">
                <Form layout="vertical" size="small">
                    <Form.Item label="Flex Direction" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.flexDirection as string}
                            onChange={(val) => updateStyle("flexDirection", val)}
                            allowClear
                            placeholder="Row"
                            options={[
                                { label: "Row", value: "row" },
                                { label: "Row Reverse", value: "row-reverse" },
                                { label: "Column", value: "column" },
                                { label: "Column Reverse", value: "column-reverse" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Justify Content" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.justifyContent as string}
                            onChange={(val) => updateStyle("justifyContent", val)}
                            allowClear
                            placeholder="Start"
                            options={[
                                { label: "Start", value: "flex-start" },
                                { label: "Center", value: "center" },
                                { label: "End", value: "flex-end" },
                                { label: "Space Between", value: "space-between" },
                                { label: "Space Around", value: "space-around" },
                                { label: "Space Evenly", value: "space-evenly" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Align Items" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.alignItems as string}
                            onChange={(val) => updateStyle("alignItems", val)}
                            allowClear
                            placeholder="Stretch"
                            options={[
                                { label: "Start", value: "flex-start" },
                                { label: "Center", value: "center" },
                                { label: "End", value: "flex-end" },
                                { label: "Stretch", value: "stretch" },
                                { label: "Baseline", value: "baseline" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Flex Wrap" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.flexWrap as string}
                            onChange={(val) => updateStyle("flexWrap", val)}
                            allowClear
                            placeholder="No Wrap"
                            options={[
                                { label: "No Wrap", value: "nowrap" },
                                { label: "Wrap", value: "wrap" },
                                { label: "Wrap Reverse", value: "wrap-reverse" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Gap" style={{ marginBottom: 8 }}>
                        <ValueWithUnitInput
                            value={style.gap}
                            onChange={(v) => updateStyle("gap", v)}
                            placeholder="0"
                        />
                    </Form.Item>
                </Form>
            </Panel>

            {/* Appearance */}
            <Panel header={<Space><BgColorsOutlined /> Appearance</Space>} key="appearance">
                <Form layout="vertical" size="small">
                    <Form.Item label="Background Color" style={{ marginBottom: 8 }}>
                        <ColorPicker
                            showText
                            size="small"
                            value={style.backgroundColor as string}
                            onChange={(color) => updateStyle("backgroundColor", color.toHexString())}
                        />
                    </Form.Item>
                    <Form.Item label="Opacity" style={{ marginBottom: 8 }}>
                        <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={style.opacity as number ?? 1}
                            onChange={(val) => updateStyle("opacity", val)}
                        />
                    </Form.Item>
                    <Form.Item label="Border Radius" style={{ marginBottom: 8 }}>
                        <ValueWithUnitInput
                            value={style.borderRadius}
                            onChange={(v) => updateStyle("borderRadius", v)}
                            placeholder="0"
                        />
                    </Form.Item>
                    <Form.Item label="Border" style={{ marginBottom: 8 }}>
                        <Row gutter={[4, 4]}>
                            <Col span={8}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Width</div>
                                <ValueWithUnitInput
                                    value={style.borderWidth}
                                    onChange={(v) => {
                                        updateStyle("borderWidth", v);
                                        if (v && !style.borderStyle) updateStyle("borderStyle", "solid");
                                    }}
                                    placeholder="0"
                                />
                            </Col>
                            <Col span={8}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Style</div>
                                <Select
                                    size="small"
                                    value={style.borderStyle as string}
                                    onChange={(val) => updateStyle("borderStyle", val)}
                                    placeholder="Solid"
                                    options={[
                                        { label: "Solid", value: "solid" },
                                        { label: "Dashed", value: "dashed" },
                                        { label: "Dotted", value: "dotted" },
                                        { label: "None", value: "none" },
                                    ]}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col span={8}>
                                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Color</div>
                                <ColorPicker
                                    size="small"
                                    value={style.borderColor as string}
                                    onChange={(color) => updateStyle("borderColor", color.toHexString())}
                                />
                            </Col>
                        </Row>
                    </Form.Item>
                    <Form.Item label="Box Shadow" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.boxShadow as string}
                            onChange={(val) => updateStyle("boxShadow", val)}
                            allowClear
                            placeholder="None"
                            options={[
                                { label: "None", value: "none" },
                                { label: "Small", value: "0 1px 2px rgba(0,0,0,0.1)" },
                                { label: "Medium", value: "0 4px 6px rgba(0,0,0,0.1)" },
                                { label: "Large", value: "0 10px 15px rgba(0,0,0,0.1)" },
                                { label: "XL", value: "0 20px 25px rgba(0,0,0,0.15)" },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Panel>

            {/* Typography */}
            <Panel header={<Space><FontSizeOutlined /> Typography</Space>} key="typography">
                <Form layout="vertical" size="small">
                    <Form.Item label="Text Color" style={{ marginBottom: 8 }}>
                        <ColorPicker
                            showText
                            size="small"
                            value={style.color as string}
                            onChange={(color) => updateStyle("color", color.toHexString())}
                        />
                    </Form.Item>
                    <Form.Item label="Font Size" style={{ marginBottom: 8 }}>
                        <ValueWithUnitInput
                            value={style.fontSize}
                            onChange={(v) => updateStyle("fontSize", v)}
                            placeholder="16"
                        />
                    </Form.Item>
                    <Form.Item label="Font Weight" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.fontWeight as string}
                            onChange={(val) => updateStyle("fontWeight", val)}
                            placeholder="Normal"
                            options={[
                                { label: "Thin (100)", value: "100" },
                                { label: "Light (300)", value: "300" },
                                { label: "Normal (400)", value: "normal" },
                                { label: "Medium (500)", value: "500" },
                                { label: "Semi-Bold (600)", value: "600" },
                                { label: "Bold (700)", value: "bold" },
                                { label: "Heavy (800)", value: "800" },
                                { label: "Black (900)", value: "900" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Text Align" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.textAlign as string}
                            onChange={(val) => updateStyle("textAlign", val)}
                            placeholder="Left"
                            options={[
                                { label: "Left", value: "left" },
                                { label: "Center", value: "center" },
                                { label: "Right", value: "right" },
                                { label: "Justify", value: "justify" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Line Height" style={{ marginBottom: 8 }}>
                        <ValueWithUnitInput
                            value={style.lineHeight}
                            onChange={(v) => updateStyle("lineHeight", v)}
                            placeholder="normal"
                        />
                    </Form.Item>
                    <Form.Item label="Letter Spacing" style={{ marginBottom: 8 }}>
                        <ValueWithUnitInput
                            value={style.letterSpacing}
                            onChange={(v) => updateStyle("letterSpacing", v)}
                            placeholder="normal"
                        />
                    </Form.Item>
                    <Form.Item label="Text Transform" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.textTransform as string}
                            onChange={(val) => updateStyle("textTransform", val)}
                            allowClear
                            placeholder="None"
                            options={[
                                { label: "None", value: "none" },
                                { label: "Uppercase", value: "uppercase" },
                                { label: "Lowercase", value: "lowercase" },
                                { label: "Capitalize", value: "capitalize" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label="Text Decoration" style={{ marginBottom: 8 }}>
                        <Select
                            size="small"
                            value={style.textDecoration as string}
                            onChange={(val) => updateStyle("textDecoration", val)}
                            allowClear
                            placeholder="None"
                            options={[
                                { label: "None", value: "none" },
                                { label: "Underline", value: "underline" },
                                { label: "Line Through", value: "line-through" },
                                { label: "Overline", value: "overline" },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Panel>
        </Collapse>
    );
};
