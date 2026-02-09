import React, { useState, useEffect, useRef, useCallback } from 'react';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const GRAVITY = 0.6;
const JUMP_POWER = -14;
const RUN_SPEED = 6;
const PLAYER_SIZE = 30;
const ENEMY_SIZE = 30;
const ENEMY_SPEED = 1.5;

// Level Definition (x, y, width, height)
const PLATFORMS = [
    // Ground
    { x: 0, y: GAME_HEIGHT - 20, w: GAME_WIDTH, h: 20, type: 'ground' },
    // Floating Platforms
    { x: 100, y: GAME_HEIGHT - 80, w: 150, h: 20, type: 'platform' },
    { x: 450, y: GAME_HEIGHT - 120, w: 300, h: 20, type: 'platform' },
    { x: 50, y: GAME_HEIGHT - 200, w: 100, h: 20, type: 'platform' },
];

const ENEMY_INITIAL_STATE = [
    // Patroling enemy 1 (Simple Goomba)
    { id: 1, x: 500, y: GAME_HEIGHT - 20 - ENEMY_SIZE, vx: -ENEMY_SPEED, patrolStart: 460, patrolEnd: 720, isAlive: true, type: 'patrol' },
    // AI enemy 2 (Simple Shy Guy - chases)
    { id: 2, x: 150, y: GAME_HEIGHT - 80 - ENEMY_SIZE, vx: ENEMY_SPEED, patrolStart: 100, patrolEnd: 220, isAlive: true, type: 'chase', aggressionRange: 150 },
];

// Helper function for AABB collision
const checkCollision = (rect1, rect2) => {
    return (
        rect1.x < rect2.x + rect2.w &&
        rect1.x + rect1.w > rect2.x &&
        rect1.y < rect2.y + rect2.h &&
        rect1.y + rect1.h > rect2.y
    );
};

export default function App() {
    const [player, setPlayer] = useState({
        x: 50,
        y: GAME_HEIGHT - 20 - PLAYER_SIZE,
        vy: 0,
        vx: 0,
        w: PLAYER_SIZE,
        h: PLAYER_SIZE,
        onGround: false,
        isAlive: true,
    });
    const [enemies, setEnemies] = useState(ENEMY_INITIAL_STATE);
    const [score, setScore] = useState(0);

    const inputRef = useRef({ left: false, right: false, jump: false });
    const gameLoopRef = useRef(null);
    const lastTimeRef = useRef(0);

    // --- Input Handling ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!player.isAlive) return;
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                    inputRef.current.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                    inputRef.current.right = true;
                    break;
                case ' ':
                case 'ArrowUp':
                case 'w':
                    inputRef.current.jump = true;
                    break;
            }
        };

        const handleKeyUp = (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                case 'a':
                    inputRef.current.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    inputRef.current.right = false;
                    break;
                case ' ':
                case 'ArrowUp':
                case 'w':
                    inputRef.current.jump = false;
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [player.isAlive]);

    // --- Physics & Game Loop ---

    const updatePhysics = useCallback((deltaTime) => {
        setPlayer(prevPlayer => {
            if (!prevPlayer.isAlive) return prevPlayer;

            let newPlayer = { ...prevPlayer, onGround: false };

            // 1. Horizontal movement
            if (inputRef.current.left) newPlayer.vx = -RUN_SPEED;
            else if (inputRef.current.right) newPlayer.vx = RUN_SPEED;
            else newPlayer.vx = 0;

            newPlayer.x += newPlayer.vx * (deltaTime / 16);
            
            // Boundary check
            newPlayer.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, newPlayer.x));

            // 2. Vertical movement (Gravity & Jump)
            newPlayer.vy += GRAVITY * (deltaTime / 16);

            if (inputRef.current.jump && prevPlayer.onGround) {
                newPlayer.vy = JUMP_POWER;
                inputRef.current.jump = false; // Consume jump input
            }

            newPlayer.y += newPlayer.vy * (deltaTime / 16);

            // 3. Platform Collision
            for (const platform of PLATFORMS) {
                if (checkCollision(newPlayer, platform)) {
                    // Check collision from above (landing)
                    if (prevPlayer.y + prevPlayer.h <= platform.y && newPlayer.vy >= 0) {
                        newPlayer.y = platform.y - newPlayer.h;
                        newPlayer.vy = 0;
                        newPlayer.onGround = true;
                    } 
                    // Check collision from below (hitting head)
                    else if (prevPlayer.y >= platform.y + platform.h && newPlayer.vy < 0) {
                        newPlayer.y = platform.y + platform.h;
                        newPlayer.vy = 0;
                    }
                    // Simple wall collision (needs refinement but works for stopping horizontal movement)
                    else if (newPlayer.x < platform.x || newPlayer.x + newPlayer.w > platform.x + platform.w) {
                        // Revert X movement if collision happened horizontally
                        newPlayer.x = prevPlayer.x;
                    }
                }
            }

            // 4. Death by falling (or simple boundary check)
            if (newPlayer.y > GAME_HEIGHT) {
                 newPlayer.isAlive = false;
            }

            return newPlayer;
        });
    }, []);

    const updateEnemies = useCallback((playerState, deltaTime) => {
        setEnemies(prevEnemies => prevEnemies.map(enemy => {
            if (!enemy.isAlive) return enemy;

            let newEnemy = { ...enemy };

            // Apply gravity (if not always on ground, though simplified enemies often are)
            // For simplicity, assume enemies always stay on their platform or the ground.

            // AI Logic
            if (enemy.type === 'patrol') {
                newEnemy.x += newEnemy.vx * (deltaTime / 16);
                if (newEnemy.x <= enemy.patrolStart || newEnemy.x >= enemy.patrolEnd) {
                    newEnemy.vx *= -1; // Reverse direction
                }
            } else if (enemy.type === 'chase' && playerState.isAlive) {
                const distanceX = playerState.x - newEnemy.x;
                const distanceY = playerState.y - newEnemy.y;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

                if (distance < enemy.aggressionRange) {
                    // Chase mode
                    if (Math.abs(distanceX) > 5) {
                        newEnemy.vx = distanceX > 0 ? ENEMY_SPEED * 1.5 : -ENEMY_SPEED * 1.5;
                    } else {
                        newEnemy.vx = 0;
                    }
                } else {
                    // Simple idle patrol when not chasing
                    newEnemy.vx = enemy.vx > 0 ? ENEMY_SPEED : -ENEMY_SPEED;
                }
                newEnemy.x += newEnemy.vx * (deltaTime / 16);
            }

            return newEnemy;
        }));
    }, []);


    const handleCollisions = useCallback((playerState, currentEnemies) => {
        let newPlayerState = { ...playerState };
        let newEnemies = [...currentEnemies];

        newEnemies = newEnemies.map(enemy => {
            if (!enemy.isAlive) return enemy;

            const playerRect = { x: newPlayerState.x, y: newPlayerState.y, w: newPlayerState.w, h: newPlayerState.h };
            const enemyRect = { x: enemy.x, y: enemy.y, w: ENEMY_SIZE, h: ENEMY_SIZE };

            if (checkCollision(playerRect, enemyRect)) {
                // Determine collision type
                // Collision from above (stomp)
                const isStomp = playerState.vy > 0 && 
                                (playerState.y + playerState.h - playerState.vy * (16 / 1000) <= enemyRect.y);

                if (isStomp) {
                    // Player jumps off enemy
                    newPlayerState.vy = JUMP_POWER * 0.7; 
                    enemy.isAlive = false;
                    setScore(s => s + 100);
                } else {
                    // Side collision or under collision (Player takes damage/dies)
                    newPlayerState.isAlive = false;
                }
            }
            return enemy;
        });

        setPlayer(() => newPlayerState);
        setEnemies(() => newEnemies);

    }, []);


    const gameLoop = useCallback((timestamp) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const deltaTime = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Ensure DeltaTime is reasonable (cap at ~60 FPS update if tab was inactive)
        const effectiveDeltaTime = Math.min(deltaTime, 1000 / 15); 

        if (player.isAlive) {
            updatePhysics(effectiveDeltaTime);
            updateEnemies(player, effectiveDeltaTime);
            handleCollisions(player, enemies); // Note: This uses state from the *previous* frame's updates, but minimizes hook dependencies
        }

        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, [player, enemies, updatePhysics, updateEnemies, handleCollisions]);


    useEffect(() => {
        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            cancelAnimationFrame(gameLoopRef.current);
        };
    }, [gameLoop]);


    const resetGame = () => {
        setPlayer({
            x: 50,
            y: GAME_HEIGHT - 20 - PLAYER_SIZE,
            vy: 0,
            vx: 0,
            w: PLAYER_SIZE,
            h: PLAYER_SIZE,
            onGround: false,
            isAlive: true,
        });
        setEnemies(ENEMY_INITIAL_STATE.map(e => ({...e, isAlive: true})));
        setScore(0);
    };

    // --- Rendering ---
    const PlayerSprite = (
        <div
            className={`absolute transition-colors duration-100 ${player.isAlive ? 'bg-red-500 border-yellow-300 border-4' : 'bg-gray-700 opacity-50'}`}
            style={{
                width: PLAYER_SIZE,
                height: PLAYER_SIZE,
                transform: `translate(${player.x}px, ${player.y}px)`,
                borderRadius: '50%',
                zIndex: 10,
            }}
        >
            <div className="text-xs text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                {player.isAlive ? 'M' : 'X'}
            </div>
        </div>
    );

    const EnemySprites = enemies.map(enemy => {
        if (!enemy.isAlive) return null;

        const isChaser = enemy.type === 'chase';
        const isFacingLeft = enemy.vx < 0;
        
        return (
            <div
                key={enemy.id}
                className={`absolute transition-transform duration-50 bg-green-700 border-4 ${isChaser ? 'border-red-500' : 'border-yellow-600'}`}
                style={{
                    width: ENEMY_SIZE,
                    height: ENEMY_SIZE,
                    transform: `translate(${enemy.x}px, ${enemy.y}px)`,
                    borderRadius: isChaser ? '10%' : '50%', // Different shape for AI type
                    zIndex: 5,
                }}
            >
                <div className="text-xs text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-bold">
                    {isChaser ? (isFacingLeft ? 'AI <' : 'AI >') : 'E'}
                </div>
            </div>
        );
    });

    const PlatformSprites = PLATFORMS.map((p, index) => (
        <div
            key={index}
            className={`absolute ${p.type === 'ground' ? 'bg-yellow-800' : 'bg-gray-500'} border-t-4 border-gray-700`}
            style={{
                left: p.x,
                top: p.y,
                width: p.w,
                height: p.h,
            }}
        />
    ));

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
            <h1 className="text-3xl font-mario text-white mb-4">React Native Mario (Web Sim)</h1>
            
            <div className="flex justify-between w-[800px] mb-2 text-white font-mono">
                <span>Score: {score}</span>
                <span>Status: {player.isAlive ? 'Playing' : 'Game Over'}</span>
            </div>

            {/* Game World Container */}
            <div
                className="relative overflow-hidden border-8 border-yellow-500 bg-sky-400 shadow-2xl"
                style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
            >
                {PlatformSprites}
                {EnemySprites}
                {PlayerSprite}

                {!player.isAlive && (
                    <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-20">
                        <h2 className="text-6xl text-red-600 font-extrabold mb-4">GAME OVER</h2>
                        <button
                            onClick={resetGame}
                            className="px-6 py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 transition"
                        >
                            Play Again
                        </button>
                    </div>
                )}
            </div>

            {/* Controls Info */}
            <div className="mt-6 text-gray-300 w-[800px] text-center">
                <p>Use A/D or Left/Right to Move. Use Space/W to Jump.</p>
                <p className="text-sm mt-2">Enemies: Yellow = Patrol, Red = Aggressive AI Chase</p>
            </div>
        </div>
    );
}