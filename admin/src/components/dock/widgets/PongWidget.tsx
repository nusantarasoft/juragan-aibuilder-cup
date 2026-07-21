"use client";

import React, { useRef, useEffect, useState } from "react";
import { Button, Typography, theme } from "antd";

const { Title } = Typography;

export default function PongWidget() {
    const { token } = theme.useToken();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [playing, setPlaying] = useState(false);
    const [score, setScore] = useState({ player: 0, ai: 0 });
    const [gameOver, setGameOver] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;

        // Game state
        const ball = { x: canvas.width / 2, y: canvas.height / 2, radius: 8, dx: 4, dy: 4 };
        const paddleWidth = 10, paddleHeight = 60;
        const player = { x: 10, y: canvas.height / 2 - paddleHeight / 2, score: 0 };
        const ai = { x: canvas.width - 20, y: canvas.height / 2 - paddleHeight / 2, score: 0 };

        let upPressed = false;
        let downPressed = false;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp") upPressed = true;
            if (e.key === "ArrowDown") downPressed = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp") upPressed = false;
            if (e.key === "ArrowDown") downPressed = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        const resetBall = () => {
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
            ball.dx = -ball.dx;
            ball.dy = 4 * (Math.random() > 0.5 ? 1 : -1);
        };

        const draw = () => {
            if (!playing) return;

            // Clear canvas
            ctx.fillStyle = token.colorBgContainer;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw net
            ctx.setLineDash([5, 15]);
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.strokeStyle = token.colorBorder;
            ctx.stroke();

            // Draw paddles
            ctx.fillStyle = token.colorText;
            ctx.fillRect(player.x, player.y, paddleWidth, paddleHeight);
            ctx.fillRect(ai.x, ai.y, paddleWidth, paddleHeight);

            // Draw ball
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = token.colorSuccess;
            ctx.fill();
            ctx.closePath();

            // Move player
            if (upPressed && player.y > 0) player.y -= 6;
            if (downPressed && player.y < canvas.height - paddleHeight) player.y += 6;

            // Move AI (simple follow logic)
            const aiCenter = ai.y + paddleHeight / 2;
            if (aiCenter < ball.y - 10) ai.y += 4;
            else if (aiCenter > ball.y + 10) ai.y -= 4;

            // Constrain AI
            if (ai.y < 0) ai.y = 0;
            if (ai.y > canvas.height - paddleHeight) ai.y = canvas.height - paddleHeight;

            // Move ball
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Wall collision (top/bottom)
            if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
                ball.dy = -ball.dy;
            }

            // Paddle collision
            const hitPlayer = ball.x - ball.radius < player.x + paddleWidth && ball.y > player.y && ball.y < player.y + paddleHeight;
            const hitAi = ball.x + ball.radius > ai.x && ball.y > ai.y && ball.y < ai.y + paddleHeight;

            if (hitPlayer) {
                ball.dx = -ball.dx;
                ball.x = player.x + paddleWidth + ball.radius;
            } else if (hitAi) {
                ball.dx = -ball.dx;
                ball.x = ai.x - ball.radius;
            }

            // Score
            if (ball.x < 0) {
                ai.score++;
                setScore({ player: player.score, ai: ai.score });
                if (ai.score >= 5) setGameOver(true);
                else resetBall();
            } else if (ball.x > canvas.width) {
                player.score++;
                setScore({ player: player.score, ai: ai.score });
                if (player.score >= 5) setGameOver(true);
                else resetBall();
            }

            if (!gameOver) {
                animationFrameId = requestAnimationFrame(draw);
            }
        };

        if (playing && !gameOver) {
            draw();
        }

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [playing, gameOver, token]);

    const startGame = () => {
        setScore({ player: 0, ai: 0 });
        setGameOver(false);
        setPlaying(true);
    };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "transparent", padding: 20, alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 10 }}>
                <Title level={4} style={{ margin: 0, color: token.colorText }}>Pong</Title>
                <div style={{ fontSize: 24, fontWeight: "bold" }}>
                    <span style={{ color: token.colorSuccess }}>{score.player}</span>
                    <span style={{ margin: "0 10px", color: token.colorTextSecondary }}>-</span>
                    <span style={{ color: token.colorError }}>{score.ai}</span>
                </div>
            </div>

            <div style={{ position: "relative", width: 400, height: 300, border: `2px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, overflow: "hidden" }}>
                <canvas ref={canvasRef} width={400} height={300} style={{ display: "block", background: token.colorBgContainer }} />
                
                {(!playing && !gameOver) && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${token.colorBgElevated}cc`, backdropFilter: "blur(4px)" }}>
                        <Button type="primary" onClick={startGame}>Start Game</Button>
                    </div>
                )}
                {gameOver && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `${token.colorBgElevated}dd`, backdropFilter: "blur(4px)" }}>
                        <Title level={3} style={{ color: score.player >= 5 ? token.colorSuccess : token.colorError, margin: 0, marginBottom: 16 }}>
                            {score.player >= 5 ? "You Win!" : "You Lose!"}
                        </Title>
                        <Button type="primary" onClick={startGame}>Play Again</Button>
                    </div>
                )}
            </div>
            <div style={{ marginTop: 20, color: token.colorTextSecondary, fontSize: 12 }}>
                First to 5 wins. Use UP/DOWN arrows to move.
            </div>
        </div>
    );
}
