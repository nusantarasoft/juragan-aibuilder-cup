"use client";

import React, { useState, useEffect } from "react";

interface MiniGameProps {
    game?: "snake" | "tetris" | "pong";
    enabled?: boolean;
}

// Simple Snake Game
const SnakeGame = () => {
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [snake, setSnake] = useState([[5, 5]]);
    const [food, setFood] = useState([10, 10]);
    const [direction, setDirection] = useState("RIGHT");
    const [isPlaying, setIsPlaying] = useState(false);

    const gridSize = 20;

    useEffect(() => {
        if (!isPlaying || gameOver) return;

        const moveSnake = () => {
            const newSnake = [...snake];
            const head = [...newSnake[0]];

            switch (direction) {
                case "UP": head[1] -= 1; break;
                case "DOWN": head[1] += 1; break;
                case "LEFT": head[0] -= 1; break;
                case "RIGHT": head[0] += 1; break;
            }

            // Check collision with walls
            if (head[0] < 0 || head[0] >= gridSize || head[1] < 0 || head[1] >= gridSize) {
                setGameOver(true);
                return;
            }

            // Check collision with self
            if (newSnake.some(segment => segment[0] === head[0] && segment[1] === head[1])) {
                setGameOver(true);
                return;
            }

            newSnake.unshift(head);

            // Check if ate food
            if (head[0] === food[0] && head[1] === food[1]) {
                setScore(s => s + 10);
                setFood([
                    Math.floor(Math.random() * gridSize),
                    Math.floor(Math.random() * gridSize)
                ]);
            } else {
                newSnake.pop();
            }

            setSnake(newSnake);
        };

        const interval = setInterval(moveSnake, 150);
        return () => clearInterval(interval);
    }, [snake, direction, isPlaying, gameOver, food]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp": if (direction !== "DOWN") setDirection("UP"); break;
                case "ArrowDown": if (direction !== "UP") setDirection("DOWN"); break;
                case "ArrowLeft": if (direction !== "RIGHT") setDirection("LEFT"); break;
                case "ArrowRight": if (direction !== "LEFT") setDirection("RIGHT"); break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [direction]);

    const resetGame = () => {
        setSnake([[5, 5]]);
        setFood([10, 10]);
        setDirection("RIGHT");
        setScore(0);
        setGameOver(false);
        setIsPlaying(true);
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="text-xl font-bold">🐍 Snake Game</div>
            <div className="text-lg">Score: {score}</div>

            <div
                className="relative bg-gray-900 border-2 border-gray-700"
                style={{
                    width: gridSize * 15,
                    height: gridSize * 15,
                }}
            >
                {/* Snake */}
                {snake.map((segment, i) => (
                    <div
                        key={i}
                        className={`absolute ${i === 0 ? 'bg-green-400' : 'bg-green-500'} rounded-sm`}
                        style={{
                            left: segment[0] * 15,
                            top: segment[1] * 15,
                            width: 15,
                            height: 15,
                        }}
                    />
                ))}

                {/* Food */}
                <div
                    className="absolute bg-red-500 rounded-full"
                    style={{
                        left: food[0] * 15,
                        top: food[1] * 15,
                        width: 15,
                        height: 15,
                    }}
                />

                {/* Game Over Overlay */}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                        <div className="text-white text-xl mb-4">Game Over!</div>
                        <div className="text-white mb-4">Score: {score}</div>
                    </div>
                )}

                {/* Start Overlay */}
                {!isPlaying && !gameOver && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                        <div className="text-white text-center">
                            <div className="text-xl mb-2">Press Start</div>
                            <div className="text-sm">Use Arrow Keys</div>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={resetGame}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
                {isPlaying ? "Restart" : "Start Game"}
            </button>

            {/* Mobile Controls */}
            <div className="grid grid-cols-3 gap-2 md:hidden">
                <div></div>
                <button onClick={() => direction !== "DOWN" && setDirection("UP")} className="p-4 bg-gray-200 rounded">↑</button>
                <div></div>
                <button onClick={() => direction !== "RIGHT" && setDirection("LEFT")} className="p-4 bg-gray-200 rounded">←</button>
                <button onClick={() => direction !== "UP" && setDirection("DOWN")} className="p-4 bg-gray-200 rounded">↓</button>
                <button onClick={() => direction !== "LEFT" && setDirection("RIGHT")} className="p-4 bg-gray-200 rounded">→</button>
            </div>
        </div>
    );
};

export default function MiniGamesWidget({ game = "snake", enabled = true }: MiniGameProps) {
    if (!enabled) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg overflow-hidden">
            {game === "snake" && <SnakeGame />}
            {game === "tetris" && (
                <div className="p-8 text-center">
                    <div className="text-4xl mb-4">🧱</div>
                    <div className="text-xl font-bold">Tetris</div>
                    <div className="text-gray-500">Coming Soon</div>
                </div>
            )}
            {game === "pong" && (
                <div className="p-8 text-center">
                    <div className="text-4xl mb-4">🏓</div>
                    <div className="text-xl font-bold">Pong</div>
                    <div className="text-gray-500">Coming Soon</div>
                </div>
            )}
        </div>
    );
}
