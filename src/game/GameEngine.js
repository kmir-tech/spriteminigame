import * as THREE from 'three';
import { Input } from './Input.js';
import { Player } from './Player.js';
import { ProjectileManager } from './Projectile.js';
import { EnemyManager } from './Enemy.js';
import { Room, RoomManager } from './Room.js';
import { Collision } from './Collision.js';
import { PowerUpManager } from './PowerUp.js';
import { audioManager } from './AudioManager.js';
import { EffectsManager } from './EffectsManager.js';

/**
 * Main game engine - orchestrates all game systems
 */
export class GameEngine {
    constructor(container, characterData, onGameOver) {
        this.container = container;
        this.characterData = characterData;
        this.onGameOver = onGameOver;

        this.running = false;
        this.lastTime = 0;

        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a22);

        // Orthographic camera (16:9 room)
        const aspect = window.innerWidth / window.innerHeight;
        const viewHeight = 10;
        const viewWidth = viewHeight * aspect;

        this.camera = new THREE.OrthographicCamera(
            -viewWidth / 2, viewWidth / 2,
            viewHeight / 2, -viewHeight / 2,
            0.1, 100
        );
        this.camera.position.z = 10;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Resize handler
        this.handleResize = () => {
            const aspect = window.innerWidth / window.innerHeight;
            const viewHeight = 10;
            const viewWidth = viewHeight * aspect;

            this.camera.left = -viewWidth / 2;
            this.camera.right = viewWidth / 2;
            this.camera.top = viewHeight / 2;
            this.camera.bottom = -viewHeight / 2;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', this.handleResize);

        // Input
        this.input = new Input();

        // Room manager
        this.roomManager = new RoomManager();

        // Power-up manager
        this.powerUpManager = new PowerUpManager();

        // Track if we're in boss room and if boss was defeated this room
        this.isBossRoom = false;
        this.bossDefeatedThisRoom = false;
        this.showingPowerUpSelection = false;

        // Initialize first room
        this.setupRoom();

        // HUD elements
        this.createHUD();

        // Effects manager (screen shake, hit flash)
        this.effects = new EffectsManager(this.camera, this.container);

        // Initialize audio on first interaction
        this.container.addEventListener('click', () => audioManager.init(), { once: true });
        this.container.addEventListener('keydown', () => audioManager.init(), { once: true });
    }

    setupRoom() {
        // Clear old room
        if (this.room) {
            this.room.destroy();
        }
        if (this.enemyManager) {
            this.enemyManager.clearAll();
        }
        if (this.projectileManager) {
            this.projectileManager.clearAll();
        }

        // Create room
        this.room = new Room(this.scene);

        // Get template
        const template = this.roomManager.getCurrentTemplate();
        this.room.createDoors(template.doors);

        // Create projectile manager (reusable)
        if (!this.projectileManager) {
            this.projectileManager = new ProjectileManager(this.scene);
        }

        // Create fresh enemy manager for each room
        this.enemyManager = new EnemyManager(this.scene, this.projectileManager);

        // Spawn player (or move to center)
        if (!this.player) {
            this.player = new Player(this.scene, this.characterData);
        }
        this.player.x = 0;
        this.player.y = 0;
        this.player.mesh.position.x = 0;
        this.player.mesh.position.y = 0;

        // Check if this is a boss room
        this.isBossRoom = this.roomManager.isBossRoom();
        this.bossDefeatedThisRoom = false;

        if (this.isBossRoom) {
            // Spawn boss in center
            const bossHP = this.roomManager.getBossHP();
            console.log(`BOSS ROOM! Spawning boss with ${bossHP} HP`);
            this.enemyManager.spawnBoss(0, 2, bossHP);
            this.room.closeDoors();
        } else {
            // Spawn enemies from template
            console.log('Spawning enemies for room:', template.id, 'Count:', template.enemies.length);
            for (const enemyDef of template.enemies) {
                if (enemyDef.type === 'chaser') {
                    this.enemyManager.spawnChaser(enemyDef.x, enemyDef.y);
                } else if (enemyDef.type === 'wanderer') {
                    this.enemyManager.spawnWanderer(enemyDef.x, enemyDef.y, true);
                } else if (enemyDef.type === 'shooter') {
                    this.enemyManager.spawnShooter(enemyDef.x, enemyDef.y);
                } else if (enemyDef.type === 'bomber') {
                    this.enemyManager.spawnBomber(enemyDef.x, enemyDef.y);
                } else if (enemyDef.type === 'splitter') {
                    this.enemyManager.spawnSplitter(enemyDef.x, enemyDef.y);
                }
            }

            // Close doors if enemies present
            if (template.enemies.length > 0) {
                this.room.closeDoors();
            } else {
                this.room.openDoors();
            }
        }

        // Update HUD
        this.updateHUD();
    }

    createHUD() {
        // HUD container
        this.hud = document.createElement('div');
        this.hud.className = 'game-hud';
        this.hud.innerHTML = `
            <div class="hud-left">
                <div class="health-bar">
                    <div class="health-fill" id="health-fill"></div>
                </div>
                <div class="health-text" id="health-text">100 / 100</div>
                <div class="power-ups" id="power-ups"></div>
            </div>
            <div class="hud-center">
                <div class="room-indicator" id="room-indicator">ROOM 1</div>
                <div class="boss-hp-container" id="boss-hp-container" style="display: none;">
                    <div class="boss-label">BOSS</div>
                    <div class="boss-hp-bar">
                        <div class="boss-hp-fill" id="boss-hp-fill"></div>
                    </div>
                </div>
            </div>
            <div class="hud-right">
                <div class="mini-map" id="mini-map"></div>
                <div class="controls-hint">
                    WASD: Move | IJKL: Shoot
                </div>
            </div>
        `;
        this.container.appendChild(this.hud);
    }

    updateHUD() {
        const healthFill = document.getElementById('health-fill');
        const healthText = document.getElementById('health-text');
        const roomIndicator = document.getElementById('room-indicator');
        const powerUpsDiv = document.getElementById('power-ups');
        const bossHpContainer = document.getElementById('boss-hp-container');
        const bossHpFill = document.getElementById('boss-hp-fill');

        if (healthFill && this.player) {
            const pct = (this.player.health / this.player.maxHealth) * 100;
            healthFill.style.width = `${pct}%`;

            if (pct > 60) healthFill.style.background = '#00e676';
            else if (pct > 30) healthFill.style.background = '#ffab00';
            else healthFill.style.background = '#ff5252';
        }

        if (healthText && this.player) {
            healthText.textContent = `${Math.ceil(this.player.health)} / ${this.player.maxHealth}`;
        }

        if (roomIndicator) {
            const roomNum = this.roomManager.getRoomNumber();
            const isBoss = this.roomManager.isBossRoom();
            roomIndicator.textContent = isBoss ? `⚔️ BOSS ROOM ${roomNum}` : `ROOM ${roomNum}`;
            roomIndicator.style.color = isBoss ? '#ff5252' : '#00e5ff';
        }

        // Power-up icons
        if (powerUpsDiv) {
            const icons = this.powerUpManager.getCollectedIcons();
            powerUpsDiv.innerHTML = icons.map(icon => `<span class="power-up-icon">${icon}</span>`).join('');
        }

        // Boss HP bar
        if (bossHpContainer && bossHpFill) {
            const boss = this.enemyManager.enemies.find(e => e.active && e.isBoss);
            if (boss) {
                bossHpContainer.style.display = 'block';
                const pct = (boss.health / boss.maxHealth) * 100;
                bossHpFill.style.width = `${pct}%`;
            } else {
                bossHpContainer.style.display = 'none';
            }
        }
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.running = false;
    }

    gameLoop() {
        if (!this.running) return;

        requestAnimationFrame(() => this.gameLoop());

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta
        this.lastTime = now;

        this.update(dt);
        this.effects.update(dt); // Update screen shake
        this.render();
    }

    update(dt) {
        // Skip update if showing power-up selection
        if (this.showingPowerUpSelection) return;

        // 1. Input update (handled by Input class)

        // 2. Player update
        this.player.update(dt, this.input, this.room.bounds);

        // 3. Player shooting
        if (this.input.shooting && this.player.canShoot()) {
            const dir = this.input.getShootDirection(null);
            if (dir) {
                this.projectileManager.spawn(
                    this.player.x, this.player.y,
                    dir.x, dir.y,
                    this.player.bulletSpeed,
                    this.player.damage,
                    true
                );
                this.player.shoot();
                audioManager.play('shoot');
            }
        }

        // 4. Enemy update
        this.enemyManager.update(dt, this.player.x, this.player.y, this.room.bounds);

        // 5. Projectile update
        this.projectileManager.update(dt, this.room.bounds);

        // 6. Collision resolution
        this.resolveCollisions();

        // 7. Check room clear
        if (!this.room.doorsOpen && this.enemyManager.allCleared()) {
            // Check if boss was defeated
            if (this.isBossRoom && !this.bossDefeatedThisRoom) {
                this.bossDefeatedThisRoom = true;
                this.roomManager.onBossDefeated();
                this.showPowerUpSelection();
                return; // Don't open doors yet
            }
            this.room.openDoors();
        }

        // 8. Check door collision
        const doorHit = this.room.checkDoorCollision(this.player.x, this.player.y, this.player.radius);
        if (doorHit) {
            this.transitionToNextRoom();
        }

        // Update HUD
        this.updateHUD();
    }

    resolveCollisions() {
        const bullets = this.projectileManager.getActive();
        const enemies = this.enemyManager.getActive();

        // Player bullets vs enemies
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet.isPlayerBullet) continue;

            for (const enemy of enemies) {
                if (!enemy.active) continue;

                if (Collision.circleVsCircle(
                    bullet.x, bullet.y, 0.15,
                    enemy.x, enemy.y, enemy.radius
                )) {
                    const killed = enemy.takeDamage(bullet.damage);

                    // Knockback enemy
                    const knockbackForce = 0.3;
                    enemy.x += bullet.dx * knockbackForce;
                    enemy.y += bullet.dy * knockbackForce;

                    // Effects
                    audioManager.play('hit');
                    this.effects.whiteFlash();
                    this.effects.screenShake(0.1, 0.08);

                    if (killed) {
                        audioManager.play('enemyDeath');
                        this.effects.screenShake(0.2, 0.12);
                    }

                    this.projectileManager.deactivate(bullet);
                    break;
                }
            }
        }

        // Enemy bullets vs player
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (bullet.isPlayerBullet) continue;

            if (Collision.circleVsCircle(
                bullet.x, bullet.y, 0.15,
                this.player.x, this.player.y, this.player.radius
            )) {
                const dead = this.player.takeDamage(bullet.damage);
                this.projectileManager.deactivate(bullet);

                // Effects
                audioManager.play('playerHit');
                this.effects.hitFlash();
                this.effects.screenShake(0.25, 0.15);

                if (dead) {
                    this.gameOver();
                    return;
                }
            }
        }

        // Enemies vs player (contact damage)
        for (const enemy of enemies) {
            if (!enemy.active) continue;

            if (Collision.circleVsCircle(
                this.player.x, this.player.y, this.player.radius,
                enemy.x, enemy.y, enemy.radius
            )) {
                const dead = this.player.takeDamage(enemy.damage);

                // Effects
                audioManager.play('playerHit');
                this.effects.hitFlash();
                this.effects.screenShake(0.3, 0.2);

                if (dead) {
                    this.gameOver();
                    return;
                }
            }
        }
    }

    transitionToNextRoom() {
        // Brief pause then setup next room
        this.roomManager.nextRoom();

        // Clear old room
        this.room.destroy();
        this.enemyManager.clearAll();
        this.projectileManager.clearAll();

        // Setup new room
        this.setupRoom();
    }

    gameOver() {
        this.running = false;

        // Show game over overlay
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.innerHTML = `
            <div class="game-over-content">
                <h1>GAME OVER</h1>
                <p>You reached Room ${this.roomManager.getRoomNumber()}</p>
                <button class="btn btn-primary" id="restart-btn">RESTART</button>
                <button class="btn btn-secondary" id="exit-btn">EXIT</button>
            </div>
        `;
        this.container.appendChild(overlay);

        document.getElementById('restart-btn')?.addEventListener('click', () => {
            overlay.remove();
            this.restart();
        });

        document.getElementById('exit-btn')?.addEventListener('click', () => {
            this.destroy();
            if (this.onGameOver) this.onGameOver();
        });
    }

    restart() {
        this.roomManager.reset();
        this.powerUpManager.reset();

        // Reset player stats to base values
        this.player.health = this.characterData?.stats?.hp || 100;
        this.player.maxHealth = this.player.health;
        this.player.speed = 5 + (this.characterData?.stats?.speed || 50) / 25;
        this.player.damage = 10 + (this.characterData?.stats?.atk || 50) / 5;
        this.player.fireRate = 0.25;
        this.player.damageReduction = 0;
        this.player.pierceCount = 0;

        this.setupRoom();
        this.start();
    }

    /**
     * Show power-up selection UI after defeating a boss
     */
    showPowerUpSelection() {
        this.showingPowerUpSelection = true;

        // Get 3 random power-ups
        const options = this.powerUpManager.getRandomSelection(3);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'power-up-overlay';
        overlay.innerHTML = `
            <div class="power-up-selection">
                <h2 class="power-up-title">🏆 BOSS DEFEATED!</h2>
                <p class="power-up-subtitle">Choose your power-up</p>
                <div class="power-up-cards">
                    ${options.map((powerUp, index) => `
                        <div class="power-up-card" data-id="${powerUp.id}" data-index="${index}">
                            <div class="power-up-card-icon" style="background: ${powerUp.color}20;">${powerUp.icon}</div>
                            <div class="power-up-card-name">${powerUp.name}</div>
                            <div class="power-up-card-desc">${powerUp.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.container.appendChild(overlay);

        // Add click handlers to cards
        const cards = overlay.querySelectorAll('.power-up-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const powerUpId = card.dataset.id;

                // Apply power-up
                const powerUp = this.powerUpManager.applyPowerUp(powerUpId, this.player);
                console.log(`Applied power-up: ${powerUp.name}`);

                // Remove overlay
                overlay.remove();
                this.showingPowerUpSelection = false;

                // Open doors and continue
                this.room.openDoors();
                this.updateHUD();
            });

            // Hover effects
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px) scale(1.05)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.running = false;

        window.removeEventListener('resize', this.handleResize);

        if (this.room) this.room.destroy();
        if (this.player) this.player.destroy();
        if (this.projectileManager) this.projectileManager.destroy();
        if (this.enemyManager) this.enemyManager.clearAll();

        if (this.hud) this.hud.remove();

        this.renderer.dispose();
        this.container.innerHTML = '';
    }
}
