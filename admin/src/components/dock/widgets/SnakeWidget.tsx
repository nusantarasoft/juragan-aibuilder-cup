"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Typography, theme } from "antd";

const { Title, Text } = Typography;

const GRID_SIZE = 20;
const CELL_SIZE = 16;
const INITIAL_SPEED = 150;

type Point = { x: number; y: number };

export default function SnakeWidget() {
    const { token } = theme.useToken();
    const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
    const [food, setFood] = useState<Point>({ x: 5, y: 5 });
    const [dir, setDir] = useState<Point>({ x: 0, y: -1 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [playing, setPlaying] = useState(false);

    const generateFood = useCallback((currentSnake: Point[]) => {
        let newFood: Point;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
            // eslint-disable-next-line no-loop-func
            if (!currentSnake.some(s => s.x === newFood.x && s.y === newFood.y)) {
                break;
            }
        }
        return newFood;
    }, []);

    const resetGame = () => {
        setSnake([{ x: 10, y: 10 }]);
        setDir({ x: 0, y: -1 });
        setFood(generateFood([{ x: 10, y: 10 }]));
        setScore(0);
        setGameOver(false);
        setPlaying(true);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!playing) return;
            switch (e.key) {
                case "ArrowUp": if (dir.y === 0) setDir({ x: 0, y: -1 }); break;
                case "ArrowDown": if (dir.y === 0) setDir({ x: 0, y: 1 }); break;
                case "ArrowLeft": if (dir.x === 0) setDir({ x: -1, y: 0 }); break;
                case "ArrowRight": if (dir.x === 0) setDir({ x: 1, y: 0 }); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [dir, playing]);

    useEffect(() => {
        if (!playing || gameOver) return;

        const moveSnake = () => {
            setSnake(prev => {
                const head = prev[0];
                const newHead = { x: head.x + dir.x, y: head.y + dir.y };

                // Check collision with walls
                if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                    setGameOver(true);
                    setPlaying(false);
                    return prev;
                }

                // Check collision with self
                if (prev.some(s => s.x === newHead.x && s.y === newHead.y)) {
                    setGameOver(true);
                    setPlaying(false);
                    return prev;
                }

                const newSnake = [newHead, ...prev];

                // Check food
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore(s => s + 10);
                    setFood(generateFood(newSnake));
                } else {
                    newSnake.pop();
                }

                return newSnake;
            });
        };

        const speed = Math.max(50, INITIAL_SPEED - (score / 10) * 5);
        const interval = setInterval(moveSnake, speed);
        return () => clearInterval(interval);
    }, [dir, food, gameOver, playing, score, generateFood]);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "transparent", padding: 20, alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0, color: token.colorText }}>Snake</Title>
                <Text style={{ color: token.colorSuccess, fontSize: 18, fontWeight: "bold" }}>Score: {score}</Text>
            </div>

            <div style={{ 
                width: GRID_SIZE * CELL_SIZE, 
                height: GRID_SIZE * CELL_SIZE, 
                background: token.colorBgContainer, 
                position: "relative",
                border: `2px solid ${token.colorBorderSecondary}`,
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                borderRadius: token.borderRadius
            }}>
                {/* Food */}
                <div style={{
                    position: "absolute",
                    left: food.x * CELL_SIZE,
                    top: food.y * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: token.colorError,
                    borderRadius: "50%"
                }} />
                
                {/* Snake */}
                {snake.map((segment, i) => (
                    <div key={i} style={{
                        position: "absolute",
                        left: segment.x * CELL_SIZE,
                        top: segment.y * CELL_SIZE,
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: i === 0 ? token.colorSuccess : `${token.colorSuccess}aa`,
                        border: `1px solid ${token.colorSuccessBorder}`
                    }} />
                ))}

                {/* Overlays */}
                {(!playing && !gameOver) && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${token.colorBgElevated}cc`, backdropFilter: "blur(4px)" }}>
                        <Button type="primary" onClick={resetGame}>Start Game</Button>
                    </div>
                )}
                {gameOver && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `${token.colorBgElevated}dd`, backdropFilter: "blur(4px)" }}>
                        <Title level={3} style={{ color: token.colorError, margin: 0, marginBottom: 16 }}>Game Over</Title>
                        <Button type="primary" onClick={resetGame}>Play Again</Button>
                    </div>
                )}
            </div>
            <div style={{ marginTop: 20, color: token.colorTextSecondary, fontSize: 12 }}>
                Use arrow keys to move. Click the window to focus.
            </div>
        </div>
    );
}
