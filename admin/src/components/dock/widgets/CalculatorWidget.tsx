"use client";

import React, { useState } from "react";
import { Button, Typography, theme } from "antd";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

export default function CalculatorWidget() {
    const { themeColor } = usePreferencesStore();
    const { token } = theme.useToken();
    const [display, setDisplay] = useState("0");
    const [equation, setEquation] = useState("");
    
    const handleInput = (val: string) => {
        if (display === "0" || display === "Error") {
            setDisplay(val);
        } else {
            setDisplay(display + val);
        }
    };
    
    const handleOp = (op: string) => {
        setEquation(display + " " + op + " ");
        setDisplay("0");
    };
    
    const calculate = () => {
        try {
            const expression = equation + display;
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + expression)();
            setDisplay(String(result));
            setEquation("");
        } catch (e) {
            setDisplay("Error");
        }
    };
    
    const clear = () => {
        setDisplay("0");
        setEquation("");
    };

    const btnStyle = {
        width: "100%", 
        height: 50, 
        fontSize: 20, 
        borderRadius: 12,
        background: token.colorBgContainer,
        color: token.colorText,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: "0 2px 0 rgba(0,0,0,0.02)"
    };

    const opBtnStyle = {
        ...btnStyle,
        background: themeColor,
        color: "#fff",
        border: "none"
    };

    return (
        <div style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column", background: "transparent" }}>
            <div style={{ 
                background: token.colorBgContainer, 
                padding: "20px 16px", 
                borderRadius: 16, 
                marginBottom: 20,
                textAlign: "right",
                border: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
            }}>
                <div style={{ minHeight: 20, fontSize: 14, color: token.colorTextSecondary }}>{equation}</div>
                <div style={{ fontSize: 42, fontWeight: 300, color: token.colorText, overflow: "hidden", textOverflow: "ellipsis" }}>{display}</div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1 }}>
                <Button style={{ ...btnStyle, gridColumn: "span 2", background: token.colorError, color: "#fff", border: "none" }} onClick={clear}>C</Button>
                <Button style={btnStyle} onClick={() => {
                    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
                }}>⌫</Button>
                <Button style={opBtnStyle} onClick={() => handleOp("/")}>÷</Button>
                
                <Button style={btnStyle} onClick={() => handleInput("7")}>7</Button>
                <Button style={btnStyle} onClick={() => handleInput("8")}>8</Button>
                <Button style={btnStyle} onClick={() => handleInput("9")}>9</Button>
                <Button style={opBtnStyle} onClick={() => handleOp("*")}>×</Button>
                
                <Button style={btnStyle} onClick={() => handleInput("4")}>4</Button>
                <Button style={btnStyle} onClick={() => handleInput("5")}>5</Button>
                <Button style={btnStyle} onClick={() => handleInput("6")}>6</Button>
                <Button style={opBtnStyle} onClick={() => handleOp("-")}>-</Button>
                
                <Button style={btnStyle} onClick={() => handleInput("1")}>1</Button>
                <Button style={btnStyle} onClick={() => handleInput("2")}>2</Button>
                <Button style={btnStyle} onClick={() => handleInput("3")}>3</Button>
                <Button style={opBtnStyle} onClick={() => handleOp("+")}>+</Button>
                
                <Button style={{ ...btnStyle, gridColumn: "span 2" }} onClick={() => handleInput("0")}>0</Button>
                <Button style={btnStyle} onClick={() => handleInput(".")}>.</Button>
                <Button style={opBtnStyle} onClick={calculate}>=</Button>
            </div>
        </div>
    );
}
