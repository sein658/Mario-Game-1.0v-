const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameRunning = false;
let score = 0;
let animationId;

// Physics Constants
const GRAVITY = 0.5;
const FRICTION = 0.8;
const MOVE_SPEED = 5;
const JUMP_FORCE = 12;

// Map Configuration
const TILE_SIZE = 40;
const VIEWPORT_WIDTH = canvas.width;
const VIEWPORT_HEIGHT = canvas.height;

// Simple Level Design (W=200 tiles wide usually, here simplified)
// 0: Air, 1: Ground, 2: Brick, 3: Q-Block, 4: Pipe, 9: Goomba
const LEVEL_MAP = [
    "                                                                                ",
    "                                                                                ",
    "                                                                                ",
    "                                                                                ",
    "                                                                                ",
    "      3                                                                         ",
    "                                                                                ",
    "         3   3                                         3 3 3                    ",
    "       2 2 2 2 2                                                                ",
    "                                      3                                         ",
    "                    2                                                           ",
    "                  2 2      9               9                                    ",
    "          9     2 2 2    2 2 2 2 2 2 2 2 2 2 2 2                                ",
    "1 1 1 1 1 1 1 1 1 1 1    1 1 1 1 1 1 1 1 1 1 1 1          1 1 1 1 1 1 1 1 1 1 1 ",
    "1 1 1 1 1 1 1 1 1 1 1    1 1 1 1 1 1 1 1 1 1 1 1          1 1 1 1 1 1 1 1 1 1 1 "
];

// Classes
class Camera {
    constructor() {
        this.x = 0;
    }
    update(playerX) {
        // Keep player in middle (approx)
        this.x = Math.max(0, playerX - VIEWPORT_WIDTH / 3);
    }
}

class Player {
    constructor() {
        this.width = 30;
        this.height = 30; // Small Mario
        this.reset();
    }

    reset() {
        this.x = 100;
        this.y = 100;
        this.velX = 0;
        this.velY = 0;
        this.grounded = false;
        this.dead = false;
    }

    update(keys) {
        if (this.dead) return;

        // Input
        if (keys['ArrowLeft']) this.velX--;
        if (keys['ArrowRight']) this.velX++;
        if (keys['Space'] && this.grounded) {
            this.velY = -JUMP_FORCE;
            this.grounded = false;
        }

        // Physics
        this.velX *= FRICTION;
        this.velY += GRAVITY;

        // Max Speed Cap (Optional but good)
        if (this.velX > MOVE_SPEED) this.velX = MOVE_SPEED;
        if (this.velX < -MOVE_SPEED) this.velX = -MOVE_SPEED;

        this.x += this.velX;
        this.checkCollisions(true); // check X
        this.y += this.velY;
        this.checkCollisions(false); // check Y

        // Void Death
        if (this.y > VIEWPORT_HEIGHT + 100) {
            die();
        }
    }

    checkCollisions(isXAxis) {
        // Get surrounding tiles
        const startCol = Math.floor(this.x / TILE_SIZE);
        const endCol = Math.floor((this.x + this.width) / TILE_SIZE);
        const startRow = Math.floor(this.y / TILE_SIZE);
        const endRow = Math.floor((this.y + this.height) / TILE_SIZE);

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                if (!LEVEL_MAP[r] || !LEVEL_MAP[r][c]) continue;
                const tile = LEVEL_MAP[r][c];
                
                if (tile !== ' ' && tile !== '9') { // Solid blocks
                    const tileX = c * TILE_SIZE;
                    const tileY = r * TILE_SIZE;

                    if (isXAxis) {
                        if (this.velX > 0) { // Moving Right
                            this.x = tileX - this.width - 0.1;
                            this.velX = 0;
                        } else if (this.velX < 0) { // Moving Left
                            this.x = tileX + TILE_SIZE + 0.1;
                            this.velX = 0;
                        }
                    } else {
                        if (this.velY > 0) { // Falling
                            this.y = tileY - this.height - 0.1;
                            this.velY = 0;
                            this.grounded = true;
                        } else if (this.velY < 0) { // Jumping up
                            this.y = tileY + TILE_SIZE + 0.1;
                            this.velY = 0;
                            // Block interaction
                            if (tile === '3') {
                                // Hit Q block
                                score += 100;
                                // Ideally change tile to empty or used but simplified here
                            }
                        }
                    }
                }
            }
        }
    }

    draw(ctx, camX) {
        if (this.dead) return;
        ctx.fillStyle = '#ff3e3e'; // Mario Red
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        
        // Eyes (Simple detail)
        ctx.fillStyle = '#fff';
        if (this.velX >= 0) {
            ctx.fillRect(this.x - camX + 20, this.y + 5, 5, 5);
        } else {
            ctx.fillRect(this.x - camX + 5, this.y + 5, 5, 5);
        }
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velX = -2;
        this.velY = 0;
    }

    update() {
        this.velY += GRAVITY;
        this.x += this.velX;
        this.y += this.velY;
        
        // Simple floor collision for enemy
        const r = Math.floor((this.y + this.height) / TILE_SIZE);
        const c = Math.floor((this.x + this.width/2) / TILE_SIZE);
        
        if (LEVEL_MAP[r] && LEVEL_MAP[r][c] !== ' ' && LEVEL_MAP[r][c] !== '9') {
             this.y = r * TILE_SIZE - this.height;
             this.velY = 0;
        }

        // Turn around at walls or edges (Simplified: just distance or timer, or collision)
        // For simplicity: turn every 100 frames or if hit wall
        if (Math.random() < 0.01) this.velX *= -1;
    }

    draw(ctx, camX) {
        ctx.fillStyle = '#8b4513'; // Goomba Brown
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - camX + 5, this.y + 10, 5, 5);
        ctx.fillRect(this.x - camX + 20, this.y + 10, 5, 5);
    }
}

// Game Instances
let player = new Player();
let camera = new Camera();
let enemies = [];
let keys = {};

function initLevel() {
    enemies = [];
    for (let r = 0; r < LEVEL_MAP.length; r++) {
        for (let c = 0; c < LEVEL_MAP[r].length; c++) {
            if (LEVEL_MAP[r][c] === '9') {
                enemies.push(new Enemy(c * TILE_SIZE, r * TILE_SIZE));
            }
        }
    }
}

function die() {
    player.dead = true;
    gameRunning = false;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function checkEntityCollisions() {
    // Player vs Enemy
    for (let e of enemies) {
        if (
            player.x < e.x + e.width &&
            player.x + player.width > e.x &&
            player.y < e.y + e.height &&
            player.y + player.height > e.y
        ) {
            // Check stomp
            if (player.velY > 0 && player.y + player.height < e.y + e.height / 2) {
                // Stomp success
                player.velY = -8; // Bounce
                score += 500;
                // Remove enemy (simple splice)
                enemies = enemies.filter(en => en !== e);
            } else {
                die();
            }
        }
    }
}

function update() {
    if (!gameRunning) return;

    player.update(keys);
    camera.update(player.x);
    
    enemies.forEach(e => e.update());
    checkEntityCollisions();
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Map
    const startCol = Math.floor(camera.x / TILE_SIZE);
    const endCol = startCol + (canvas.width / TILE_SIZE) + 1;

    for (let r = 0; r < LEVEL_MAP.length; r++) {
        for (let c = startCol; c <= endCol; c++) {
            if (!LEVEL_MAP[r]) continue;
            const tile = LEVEL_MAP[r][c];
            if (tile && tile !== ' ' && tile !== '9') {
                const x = c * TILE_SIZE - camera.x;
                const y = r * TILE_SIZE;
                
                // Styles
                if (tile === '1') {
                    ctx.fillStyle = '#654321'; // Ground
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#00aa00'; // Grass top
                    ctx.fillRect(x, y, TILE_SIZE, 5);
                } else if (tile === '2') {
                    ctx.fillStyle = '#b22222'; // Brick
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    // Brick detail
                    ctx.fillStyle = '#8b0000';
                    ctx.fillRect(x+5, y+5, TILE_SIZE-10, TILE_SIZE-10);
                } else if (tile === '3') {
                    ctx.fillStyle = '#ffd700'; // Question Block
                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = '#000';
                    ctx.font = '20px serif';
                    ctx.fillText('?', x + 12, y + 28);
                }
            }
        }
    }

    player.draw(ctx, camera.x);
    enemies.forEach(e => e.draw(ctx, camera.x));

    // UI
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText(`SCORE: ${score}`, 20, 40);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Input Handling
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        // Prevent scrolling
        e.preventDefault();
    }
    
    if (e.code === 'Enter') {
        if (!gameRunning) {
            // Start or Restart
            gameRunning = true;
            score = 0;
            player.reset();
            initLevel();
            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
        }
    }
});

window.addEventListener('keyup', e => keys[e.code] = false);

// Init
initLevel();
loop();
