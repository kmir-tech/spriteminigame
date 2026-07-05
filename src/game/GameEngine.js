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
import { AnimatedSprite } from './AnimatedSprite.js';

/**
 * Main game engine - orchestrates all game systems
 */
export class GameEngine {
    constructor(container, characterData, onGameOver, loadout = null) {
        this.container = container;
        this.characterData = characterData;
        this.onGameOver = onGameOver;
        this.loadout = loadout;

        this.running = false;
        this.lastTime = 0;

        // Credit Economy & Shop
        this.coins = [];
        this.merchantDrone = null;

        // Ultimates
        this.bulletTimeTimer = 0;
        this.swordWhirlTimer = 0;
        this.swordWhirlMesh = null;
        this.tankShieldTimer = 0;
        this.tankShield = null;

        // Temp meshes/effects to animate and clear
        this.tempMeshes = [];

        // Progression, scoring & zoom variables
        this.kills = 0;
        this.gameTime = 0;
        this.targetZoom = 1.0;

        // Track single-frame keystate transitions
        this.keyState = {
            swap: false,
            skill0: false,
            skill1: false,
            skill2: false
        };

        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0c0c14); // Sleeker dark mode background

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

        // WebGLRenderer
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
        this.updateHUDWeapon();

        // Shop overlay
        this.shopOverlay = document.createElement('div');
        this.shopOverlay.id = 'shop-overlay';
        this.shopOverlay.style.cssText = `
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 15, 25, 0.95);
            border: 2px solid #00e5ff;
            border-radius: 12px;
            padding: 25px;
            z-index: 500;
            color: white;
            width: 400px;
            font-family: 'Rajdhani', sans-serif;
            box-shadow: 0 0 30px rgba(0, 229, 255, 0.4);
            pointer-events: auto;
        `;
        this.container.appendChild(this.shopOverlay);

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

        // Clear coins
        for (const coin of this.coins) {
            this.scene.remove(coin.mesh);
            coin.mesh.geometry.dispose();
            coin.mesh.material.dispose();
        }
        this.coins = [];

        // Clear merchant drone
        if (this.merchantDrone) {
            this.scene.remove(this.merchantDrone.mesh);
            if (this.merchantDrone.mesh.geometry) this.merchantDrone.mesh.geometry.dispose();
            if (this.merchantDrone.mesh.material) this.merchantDrone.mesh.material.dispose();
            this.merchantDrone = null;
        }

        // Hide shop panel
        if (this.shopOverlay) {
            this.shopOverlay.style.display = 'none';
        }

        // Clear sword whirl
        if (this.swordWhirlMesh) {
            this.scene.remove(this.swordWhirlMesh);
            this.swordWhirlMesh.geometry.dispose();
            this.swordWhirlMesh.material.dispose();
            this.swordWhirlMesh = null;
        }
        this.swordWhirlTimer = 0;
        this.bulletTimeTimer = 0;
        this.tankShieldTimer = 0;
        this.tankShield = null;

        // Clear temp meshes
        for (const item of this.tempMeshes) {
            this.scene.remove(item.mesh);
            if (item.mesh.geometry) item.mesh.geometry.dispose();
            if (item.mesh.material) item.mesh.material.dispose();
        }
        this.tempMeshes = [];

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
            this.player = new Player(this.scene, this.characterData, this.loadout);
        }
        this.player.x = 0;
        this.player.y = 0;
        this.player.mesh.position.x = 0;
        this.player.mesh.position.y = 0;

        // Check if this is a boss room or shop room
        this.isBossRoom = this.roomManager.isBossRoom();
        const isShop = template.isShop;
        this.bossDefeatedThisRoom = false;

        if (this.isBossRoom) {
            // Spawn boss in center
            const bossHP = this.roomManager.getBossHP();
            console.log(`BOSS ROOM! Spawning boss with ${bossHP} HP`);
            this.enemyManager.spawnBoss(0, 2, bossHP);
            this.room.closeDoors();
        } else if (isShop) {
            console.log("Entering SHOP ROOM!");
            // Spawn merchant drone
            const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
            const coreMesh = new THREE.Mesh(coreGeo, coreMat);
            coreMesh.position.set(0, 1.5, 0.05);

            const ringGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2;
            coreMesh.add(ringMesh);

            this.scene.add(coreMesh);
            this.merchantDrone = {
                mesh: coreMesh,
                x: 0,
                y: 1.5
            };

            this.room.openDoors(); // Shop doors are open
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
                } else if (enemyDef.type === 'goblin') {
                    this.enemyManager.spawnGoblin(enemyDef.x, enemyDef.y);
                } else if (enemyDef.type === 'ogre') {
                    this.enemyManager.spawnOgre(enemyDef.x, enemyDef.y);
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
        // Hide default mouse cursor for premium customized crosshair
        this.container.style.cursor = 'none';

        // 1. Crosshair Element
        this.crosshair = document.createElement('div');
        this.crosshair.id = 'game-crosshair';
        this.crosshair.className = 'game-crosshair';
        this.crosshair.innerHTML = `
            <div class="crosshair-ring"></div>
            <div class="crosshair-dot"></div>
        `;
        this.container.appendChild(this.crosshair);

        // 2. HUD layout
        this.hud = document.createElement('div');
        this.hud.className = 'game-hud';
        this.hud.innerHTML = `
            <div class="hud-left">
                <!-- Health Panel -->
                <div class="hud-health-panel">
                    <div class="health-bar">
                        <div class="health-fill" id="health-fill"></div>
                    </div>
                    <div class="health-text" id="health-text">100 / 100</div>
                </div>
                
                <!-- Ultimate Charge Gauge -->
                <div class="ultimate-container" style="margin-top: 8px;">
                    <div class="ultimate-bar" style="width: 200px; height: 10px; background: rgba(0, 0, 0, 0.5); border: 2px solid rgba(0, 229, 255, 0.3); border-radius: 4px; overflow: hidden; position: relative;">
                        <div class="ultimate-fill" id="ultimate-fill" style="height: 100%; width: 0%; background: #00e5ff; transition: width 0.1s;"></div>
                    </div>
                    <div class="ultimate-text" id="ultimate-text" style="font-family: 'Orbitron', sans-serif; font-size: 0.65rem; color: rgba(0, 229, 255, 0.8); letter-spacing: 1px; margin-top: 2px;">ULTIMATE [F]: 0%</div>
                </div>

                <!-- Credits counter -->
                <div class="credits-text" id="credits-text" style="font-family: 'Orbitron', sans-serif; font-size: 0.75rem; color: #ffd700; letter-spacing: 1px; margin-top: 5px;">CREDITS: 0</div>
                
                <!-- Weapon Swap Indicator -->
                <div class="hud-weapon-panel">
                    <div class="weapon-icon" id="hud-weapon-icon">🔫</div>
                    <div class="weapon-info">
                        <div class="weapon-name" id="hud-weapon-name">PLASMA RIFLE</div>
                        <div class="weapon-slot-badge" id="hud-weapon-slot">PRIMARY</div>
                    </div>
                    <div class="weapon-hint">[Q] SWAP</div>
                </div>
                
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
                <div class="controls-hint">
                    WASD / Arrows: Move<br>
                    Mouse: Aim & Click to Shoot<br>
                    Q: Swap Weapons<br>
                    SPACE / E / SHIFT: Active Skills<br>
                    F: Trigger Ultimate
                </div>
            </div>

            <!-- Skills Hotbar (Bottom Centered) -->
            <div class="hud-skills-hotbar">
                <div class="hud-skill-slot" id="hud-skill-slot-0">
                    <div class="skill-icon">❓</div>
                    <div class="skill-cd-overlay"></div>
                    <div class="skill-cd-text"></div>
                    <div class="skill-badge">SPACE</div>
                    <div class="skill-name">EMPTY</div>
                </div>
                <div class="hud-skill-slot" id="hud-skill-slot-1">
                    <div class="skill-icon">❓</div>
                    <div class="skill-cd-overlay"></div>
                    <div class="skill-cd-text"></div>
                    <div class="skill-badge">E</div>
                    <div class="skill-name">EMPTY</div>
                </div>
                <div class="hud-skill-slot" id="hud-skill-slot-2">
                    <div class="skill-icon">❓</div>
                    <div class="skill-cd-overlay"></div>
                    <div class="skill-cd-text"></div>
                    <div class="skill-badge">SHIFT</div>
                    <div class="skill-name">EMPTY</div>
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

        const ultFill = document.getElementById('ultimate-fill');
        const ultText = document.getElementById('ultimate-text');
        const creditsText = document.getElementById('credits-text');

        if (ultFill && this.player) {
            ultFill.style.width = `${Math.min(100, this.player.ultimateCharge || 0)}%`;
        }
        if (ultText && this.player) {
            ultText.textContent = `ULTIMATE [F]: ${Math.round(this.player.ultimateCharge || 0)}%`;
        }
        if (creditsText && this.player) {
            creditsText.textContent = `CREDITS: ${this.player.credits || 0}`;
        }

        if (roomIndicator) {
            const roomNum = this.roomManager.getRoomNumber();
            const isBoss = this.roomManager.isBossRoom();
            const isShop = this.roomManager.isShopRoom();
            if (isBoss) {
                roomIndicator.textContent = `⚔️ BOSS ROOM ${roomNum}`;
                roomIndicator.style.color = '#ff5252';
            } else if (isShop) {
                roomIndicator.textContent = `🛒 SHOP ROOM ${roomNum}`;
                roomIndicator.style.color = '#ffd700';
            } else {
                roomIndicator.textContent = `ROOM ${roomNum}`;
                roomIndicator.style.color = '#00e5ff';
            }
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

        // Update Weapon Swap and Skills UI overlays
        this.updateHUDWeapon();
        this.updateSkillsHUD();
    }

    updateHUDWeapon() {
        if (!this.player) return;
        const weapon = this.player.getActiveWeapon();
        const activeSlot = this.player.activeWeaponSlot;

        const weaponNameEl = document.getElementById('hud-weapon-name');
        const weaponIconEl = document.getElementById('hud-weapon-icon');
        const weaponSlotEl = document.getElementById('hud-weapon-slot');

        if (weaponNameEl && weaponIconEl && weaponSlotEl) {
            weaponNameEl.textContent = weapon.name.toUpperCase();
            weaponIconEl.textContent = weapon.icon;
            weaponSlotEl.textContent = activeSlot.toUpperCase();
        }
    }

    updateSkillsHUD() {
        if (!this.player) return;

        for (let i = 0; i < 3; i++) {
            const skill = this.player.loadout.skills[i];
            const slotEl = document.getElementById(`hud-skill-slot-${i}`);
            if (!slotEl) continue;

            if (skill) {
                slotEl.style.display = 'flex';
                slotEl.querySelector('.skill-icon').textContent = skill.icon;
                slotEl.querySelector('.skill-name').textContent = skill.name.toUpperCase();

                const cdOverlay = slotEl.querySelector('.skill-cd-overlay');
                const cdText = slotEl.querySelector('.skill-cd-text');
                const cd = this.player.skillsCooldowns[i];

                if (cd > 0) {
                    slotEl.classList.add('on-cooldown');
                    
                    // Estimate Max Cooldowns to calculate sweep percentage
                    let maxCd = 10;
                    if (skill.id === 'dash') maxCd = 6;
                    else if (skill.id === 'shield') maxCd = 14;
                    else if (skill.id === 'heal') maxCd = 18;
                    else if (skill.id === 'grenade') maxCd = 10;
                    else if (skill.id === 'scan') maxCd = 12;
                    else if (skill.id === 'boost') maxCd = 20;

                    cdOverlay.style.height = `${(cd / maxCd) * 100}%`;
                    cdText.textContent = `${Math.ceil(cd)}s`;
                } else {
                    slotEl.classList.remove('on-cooldown');
                    cdOverlay.style.height = '0%';
                    cdText.textContent = '';
                }
            } else {
                // If slot empty, render blank slot
                slotEl.style.display = 'flex';
                slotEl.querySelector('.skill-icon').textContent = '—';
                slotEl.querySelector('.skill-name').textContent = 'EMPTY';
                slotEl.classList.add('empty-slot');
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
        if (this.showingPowerUpSelection) return;

        // Custom Mouse Crosshair positioning
        if (this.crosshair) {
            const screenX = (this.input.mousePos.x + 1) * 0.5 * window.innerWidth;
            const screenY = (1 - this.input.mousePos.y) * 0.5 * window.innerHeight;
            this.crosshair.style.left = `${screenX}px`;
            this.crosshair.style.top = `${screenY}px`;

            if (this.input.mouseDown) {
                this.crosshair.classList.add('firing');
            } else {
                this.crosshair.classList.remove('firing');
            }
        }

        // Weapon swapping key tracking
        if (this.input.swapWeapon) {
            if (!this.keyState.swap) {
                this.player.swapWeapon();
                this.keyState.swap = true;
                this.updateHUDWeapon();
            }
        } else {
            this.keyState.swap = false;
        }

        // Triggering active skills
        if (this.input.useSkill1) {
            if (!this.keyState.skill0) {
                this.triggerSkill(0);
                this.keyState.skill0 = true;
            }
        } else {
            this.keyState.skill0 = false;
        }

        if (this.input.useSkill2) {
            if (!this.keyState.skill1) {
                this.triggerSkill(1);
                this.keyState.skill1 = true;
            }
        } else {
            this.keyState.skill1 = false;
        }

        if (this.input.useSkill3) {
            if (!this.keyState.skill2) {
                this.triggerSkill(2);
                this.keyState.skill2 = true;
            }
        } else {
            this.keyState.skill2 = false;
        }

        // Update ultimate bullet time active timer
        if (this.bulletTimeTimer > 0) {
            this.bulletTimeTimer -= dt;
        }
        const enemyDt = this.bulletTimeTimer > 0 ? (dt * 0.25) : dt;

        // Player update
        this.player.update(dt, this.input, this.room.bounds);

        // Player shooting
        if (this.input.shooting && this.player.canShoot()) {
            const aspect = window.innerWidth / window.innerHeight;
            const viewHeight = 10;
            const viewWidth = viewHeight * aspect;

            const mouseWorldX = this.input.mousePos.x * (viewWidth / 2);
            const mouseWorldY = this.input.mousePos.y * (viewHeight / 2);
            
            const playerPos = {
                x: this.player.x,
                y: this.player.y,
                mouseX: mouseWorldX,
                mouseY: mouseWorldY
            };

            const dir = this.input.getShootDirection(playerPos);
            if (dir) {
                this.spawnPlayerWeaponBullets(dir.x, dir.y);
                this.player.shoot();
            }
        }

        // 3. Ultimate Trigger Input [F]
        if (this.input.ultimate && this.input.consumeJustPressed('KeyF') && this.player.ultimateCharge >= 100) {
            this.triggerUltimate();
        }

        // Enemy update (dilated dt)
        this.enemyManager.update(enemyDt, this.player.x, this.player.y, this.room.bounds);

        // Check for Ogre slam shockwave triggers
        const activeEnemies = this.enemyManager.getActive();
        for (const enemy of activeEnemies) {
            if (enemy.justSlammed) {
                enemy.justSlammed = false;

                // Spawn shockwave ring
                const shockGeo = new THREE.RingGeometry(0.1, 0.15, 32);
                const shockMat = new THREE.MeshBasicMaterial({
                    color: 0xff3300, // Red shockwave
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                });
                const shockMesh = new THREE.Mesh(shockGeo, shockMat);
                shockMesh.position.set(enemy.x, enemy.y, 0.06);
                this.scene.add(shockMesh);

                audioManager.play('explosion'); // Play slam explosion sound
                this.effects.screenShake(0.4, 0.25);

                const maxSlamRadius = 2.0;

                // Check if player is caught in the slam shockwave range immediately
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= maxSlamRadius && !this.player.shieldActive && !this.player.invincible) {
                    const dead = this.player.takeDamage(18); // Slam deals 18 damage
                    audioManager.play('playerHit');
                    this.effects.hitFlash();
                    if (dead) {
                        this.gameOver();
                        return;
                    }
                }

                // Add expansion animation
                this.tempMeshes.push({
                    mesh: shockMesh,
                    timer: 0.4,
                    maxRadius: maxSlamRadius,
                    update: (itemDt, self) => {
                        self.timer -= itemDt;
                        if (self.timer <= 0) {
                            this.scene.remove(self.mesh);
                            shockGeo.dispose();
                            shockMat.dispose();
                            return true;
                        }
                        const scale = 1 + (1 - self.timer / 0.4) * (self.maxRadius * 5);
                        self.mesh.scale.set(scale, scale, scale);
                        self.mesh.material.opacity = (self.timer / 0.4) * 0.9;
                        return false;
                    }
                });
            }
        }

        // Projectile update (homing active if Mage)
        const activeEnemiesForHoming = this.characterData?.id === 'mage' ? this.enemyManager.getActive() : null;
        this.projectileManager.update(dt, this.room.bounds, activeEnemiesForHoming, this.bulletTimeTimer > 0);

        // Update visual effects & ultimate structures
        this.updateUltimateEffects(dt);

        // Update Credit Coins and vacuum pull
        this.updateCoins(dt);

        // Merchant Drone interactions
        this.updateShop(dt);

        // Grenade and Rocket custom physics update
        const bullets = this.projectileManager.getActive();
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            if (bullet.type === 'grenade') {
                bullet.timeActive += dt;
                // Add jumping effect (scale wobble)
                const scaleWobble = 1 + Math.sin(bullet.timeActive * 16) * 0.25;
                bullet.mesh.scale.setScalar((0.35 / 0.15) * scaleWobble);

                if (bullet.timeActive >= bullet.lifetime) {
                    this.triggerExplosion(bullet.x, bullet.y, 2.4, bullet.damage);
                    this.projectileManager.deactivate(bullet, i);
                }
            } else if (bullet.type === 'rocket' && (
                bullet.x < this.room.bounds.left || bullet.x > this.room.bounds.right ||
                bullet.y < this.room.bounds.bottom || bullet.y > this.room.bounds.top
            )) {
                this.triggerExplosion(bullet.x, bullet.y, 1.8, bullet.damage);
                this.projectileManager.deactivate(bullet, i);
            }
        }

        // Collision resolution
        this.resolveCollisions();

        // Check room clear
        if (!this.room.doorsOpen && this.enemyManager.allCleared()) {
            if (this.isBossRoom && !this.bossDefeatedThisRoom) {
                this.bossDefeatedThisRoom = true;
                this.roomManager.onBossDefeated();
                this.showPowerUpSelection();
                return;
            }

            // Warrior passive: healing 5 HP upon room clears
            if (this.player && this.player.characterData && this.player.characterData.id === 'warrior') {
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 5);
            }

            this.room.openDoors();
            this.updateHUD();
        }

        // Check door collision
        const doorHit = this.room.checkDoorCollision(this.player.x, this.player.y, this.player.radius);
        if (doorHit) {
            this.transitionToNextRoom();
        }

        // Increment session game time
        this.gameTime += dt;

        // Camera zoom dynamics (zoom out to 0.85 in boss, zoom in to 1.15 in standard)
        this.targetZoom = this.isBossRoom ? 0.85 : 1.15;
        this.camera.zoom += (this.targetZoom - this.camera.zoom) * 2 * dt;

        // Camera target tracking: shifts slightly toward the player (15% offset), centered to 0,0 in boss rooms
        const targetX = this.isBossRoom ? 0 : this.player.x * 0.15;
        const targetY = this.isBossRoom ? 0 : this.player.y * 0.15;
        this.camera.position.x += (targetX - this.camera.position.x) * 4 * dt;
        this.camera.position.y += (targetY - this.camera.position.y) * 4 * dt;
        this.camera.updateProjectionMatrix();

        // Update Room pulsing terminals and energy barriers
        if (this.room && this.room.update) {
            this.room.update(dt);
        }

        // Update HUD elements
        this.updateHUD();
    }

    spawnPlayerWeaponBullets(dirX, dirY) {
        const weapon = this.player.getActiveWeapon();
        const baseDamage = this.player.damage;

        let bulletSpeed = 12;
        let damage = baseDamage;
        let config = {};

        // Dynamic magic element based on player character class
        let element = 'fireBall';
        const classId = this.characterData?.id || 'warrior';
        if (classId === 'mage') element = 'fireBall';
        else if (classId === 'assassin') element = 'waterArrow';
        else if (classId === 'tank') element = 'waterBall';
        else element = 'fireArrow'; // warrior

        // Local helper to automatically inject the element configuration
        const spawn = (sx, sy, vx, vy, spd, dmg, isPlayer, cfg) => {
            cfg.element = element;
            return this.projectileManager.spawn(sx, sy, vx, vy, spd, dmg, isPlayer, cfg);
        };

        switch (weapon.id) {
            case 'rifle':
                bulletSpeed = 15;
                damage = baseDamage * 0.85;
                config = { color: 0x00e5ff, size: 0.15 }; // Cyan
                spawn(this.player.x, this.player.y, dirX, dirY, bulletSpeed, damage, true, config);
                audioManager.play('shoot');
                break;

            case 'shotgun':
                bulletSpeed = 9.5;
                damage = baseDamage * 0.55; // Multi-pellet spread
                config = { color: 0xff8f00, size: 0.13 }; // Bright Orange pellets
                
                const spreadAngle = 0.22; // spread gap
                for (let i = -2; i <= 2; i++) {
                    const angleOffset = i * spreadAngle * 0.5;
                    const cosVal = Math.cos(angleOffset);
                    const sinVal = Math.sin(angleOffset);
                    
                    const rx = dirX * cosVal - dirY * sinVal;
                    const ry = dirX * sinVal + dirY * cosVal;
                    
                    spawn(this.player.x, this.player.y, rx, ry, bulletSpeed, damage, true, config);
                }
                
                this.effects.screenShake(0.25, 0.12);
                audioManager.play('shoot');
                break;

            case 'smg':
                bulletSpeed = 14;
                damage = baseDamage * 0.45;
                
                // Add spray spread angle offset
                const sprayOffset = (Math.random() - 0.5) * 0.28;
                const cosVal = Math.cos(sprayOffset);
                const sinVal = Math.sin(sprayOffset);
                const rx = dirX * cosVal - dirY * sinVal;
                const ry = dirX * sinVal + dirY * cosVal;
                
                config = { color: 0xffeb3b, size: 0.11 }; // Yellow electric sparks
                spawn(this.player.x, this.player.y, rx, ry, bulletSpeed, damage, true, config);
                audioManager.play('shoot');
                break;

            case 'sniper':
                bulletSpeed = 26;
                damage = baseDamage * 3.2; // heavy critical damage
                config = { 
                    color: 0xd500f9, 
                    size: 0.28, 
                    pierceCount: 3 + this.player.pierceCount 
                }; // Heavy Purple piercing bolt
                spawn(this.player.x, this.player.y, dirX, dirY, bulletSpeed, damage, true, config);
                this.effects.screenShake(0.4, 0.16);
                audioManager.play('enemyDeath');
                break;

            case 'knife':
                bulletSpeed = 6.5;
                damage = baseDamage * 1.8;
                config = { 
                    color: 0x39ff14, // Neon Green slash arc
                    size: 0.55, 
                    lifetime: 0.12, 
                    type: 'slash',
                    pierceCount: 99 // Pierces everyone in swing radius
                };
                spawn(this.player.x, this.player.y, dirX, dirY, bulletSpeed, damage, true, config);
                audioManager.play('shoot');
                break;

            case 'launcher':
                bulletSpeed = 8.5;
                damage = baseDamage * 1.5;
                config = { 
                    color: 0xff1744, // Red shell rocket
                    size: 0.26, 
                    type: 'rocket'
                };
                spawn(this.player.x, this.player.y, dirX, dirY, bulletSpeed, damage, true, config);
                audioManager.play('shoot');
                break;

            default:
                bulletSpeed = 12;
                damage = baseDamage;
                config = { color: 0x00e5ff, size: 0.15 };
                spawn(this.player.x, this.player.y, dirX, dirY, bulletSpeed, damage, true, config);
                audioManager.play('shoot');
                break;
        }
    }

    triggerSkill(index) {
        if (!this.player) return;
        const skill = this.player.loadout.skills[index];
        if (!skill || this.player.skillsCooldowns[index] > 0) return;

        const skillId = this.player.activateSkill(index);

        if (skillId) {
            audioManager.play('hit');
            this.effects.whiteFlash();

            if (skillId === 'grenade') {
                // Compute mouse direction to throw grenade
                const aspect = window.innerWidth / window.innerHeight;
                const viewHeight = 10;
                const viewWidth = viewHeight * aspect;
                const mouseWorldX = this.input.mousePos.x * (viewWidth / 2);
                const mouseWorldY = this.input.mousePos.y * (viewHeight / 2);
                const dx = mouseWorldX - this.player.x;
                const dy = mouseWorldY - this.player.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                const dirX = len > 0 ? dx / len : 1;
                const dirY = len > 0 ? dy / len : 0;

                this.projectileManager.spawn(
                    this.player.x, this.player.y,
                    dirX, dirY,
                    8, // throwing speed
                    60, // grenade explosion damage
                    true,
                    {
                        type: 'grenade',
                        size: 0.35,
                        color: 0xffab00,
                        lifetime: 1.0 // Explodes after 1 second
                    }
                );
            } else if (skillId === 'scan') {
                this.effects.screenShake(0.3, 0.4);
                this.triggerThreatScan();
            } else if (skillId === 'heal') {
                this.spawnFloatingIndicator(this.player.x, this.player.y + 0.6, '+30 HP', '#00ff66');
            }
            
            this.updateSkillsHUD();
        }
    }

    triggerThreatScan() {
        // Draw Sonar scan ring
        const scanRingGeo = new THREE.RingGeometry(0.1, 0.15, 32);
        const scanRingMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const scanMesh = new THREE.Mesh(scanRingGeo, scanRingMat);
        scanMesh.position.set(this.player.x, this.player.y, 0.06);
        this.scene.add(scanMesh);

        let elapsed = 0;
        const duration = 0.4;
        const maxRadius = 11;

        const animateScan = () => {
            if (!this.running) {
                this.scene.remove(scanMesh);
                scanRingGeo.dispose();
                scanRingMat.dispose();
                return;
            }
            elapsed += 0.016;
            const pct = elapsed / duration;
            if (pct >= 1.0) {
                this.scene.remove(scanMesh);
                scanRingGeo.dispose();
                scanRingMat.dispose();
            } else {
                scanMesh.scale.setScalar(pct * maxRadius);
                scanRingMat.opacity = 0.8 * (1 - pct);
                requestAnimationFrame(animateScan);
            }
        };
        requestAnimationFrame(animateScan);

        // Stun (freeze) all enemies currently in the room
        const enemies = this.enemyManager.getActive();
        for (const enemy of enemies) {
            if (enemy.active) {
                enemy.takeDamage(10);
                this.spawnFloatingIndicator(enemy.x, enemy.y + 0.55, 'STUNNED', '#00e5ff');
                
                const origSpeed = enemy.speed;
                enemy.speed = 0;
                if (enemy.sprite) enemy.sprite.setOpacity(0.4);

                setTimeout(() => {
                    if (enemy.active) {
                        enemy.speed = origSpeed;
                        if (enemy.sprite) enemy.sprite.setOpacity(1);
                    }
                }, 3000); // 3 seconds freeze duration
            }
        }
    }

    triggerExplosion(x, y, radius, damage) {
        audioManager.play('enemyDeath');
        this.effects.screenShake(0.35, 0.16);

        // Circular shockwave ring mesh
        const expGeo = new THREE.CircleGeometry(0.1, 24);
        const expMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, transparent: true, opacity: 0.8 });
        const expMesh = new THREE.Mesh(expGeo, expMat);
        expMesh.position.set(x, y, 0.06);
        this.scene.add(expMesh);

        let elapsed = 0;
        const duration = 0.25;

        const animateExp = () => {
            if (!this.running) {
                this.scene.remove(expMesh);
                expGeo.dispose();
                expMat.dispose();
                return;
            }
            elapsed += 0.016;
            const pct = elapsed / duration;
            if (pct >= 1.0) {
                this.scene.remove(expMesh);
                expGeo.dispose();
                expMat.dispose();
            } else {
                expMesh.scale.setScalar(radius * pct * 10);
                expMat.opacity = 0.8 * (1 - pct);
                requestAnimationFrame(animateExp);
            }
        };
        requestAnimationFrame(animateExp);

        // AOE Damage to all enemies in area
        const enemies = this.enemyManager.getActive();
        for (const enemy of enemies) {
            if (enemy.active) {
                const dist = Math.sqrt((enemy.x - x) ** 2 + (enemy.y - y) ** 2);
                if (dist <= radius + enemy.radius) {
                    enemy.takeDamage(damage);
                    this.spawnFloatingIndicator(enemy.x, enemy.y + 0.55, `-${Math.round(damage)}`, '#ff1744');
                    
                    const angle = Math.atan2(enemy.y - y, enemy.x - x);
                    enemy.x += Math.cos(angle) * 0.75;
                    enemy.y += Math.sin(angle) * 0.75;
                }
            }
        }
    }

    spawnFloatingIndicator(x, y, text, color) {
        const el = document.createElement('div');
        el.className = 'floating-vfx';
        el.textContent = text;
        el.style.cssText = `
            position: absolute;
            color: ${color};
            font-family: 'Orbitron', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            pointer-events: none;
            z-index: 105;
            text-shadow: 0 0 8px rgba(0, 0, 0, 0.9), 0 0 4px ${color};
            transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
            transform: translate(-50%, -50%);
        `;

        const screenPos = this.worldToScreen(x, y);
        el.style.left = `${screenPos.x}px`;
        el.style.top = `${screenPos.y}px`;

        this.container.appendChild(el);

        setTimeout(() => {
            el.style.top = `${screenPos.y - 45}px`;
            el.style.opacity = '0';
        }, 10);

        setTimeout(() => {
            el.remove();
        }, 600);
    }

    worldToScreen(worldX, worldY) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        const aspect = width / height;
        const viewHeight = 10;
        const viewWidth = viewHeight * aspect;

        const screenX = ((worldX / (viewWidth / 2)) + 1) * 0.5 * width;
        const screenY = (1 - (worldY / (viewHeight / 2))) * 0.5 * height;

        return { x: screenX, y: screenY };
    }

    resolveCollisions() {
        const bullets = this.projectileManager.getActive();
        const enemies = this.enemyManager.getActive();

        // 1. Shield active deflection checks
        if (this.player && this.player.shieldActive) {
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                if (bullet.isPlayerBullet) continue;

                const dist = Math.sqrt((bullet.x - this.player.x) ** 2 + (bullet.y - this.player.y) ** 2);
                if (dist <= 0.65) {
                    this.projectileManager.deactivate(bullet, i);
                    audioManager.play('hit');
                }
            }
        }

        // Warrior sword whirl vs enemy projectiles
        if (this.swordWhirlTimer > 0) {
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                if (bullet.isPlayerBullet) continue;

                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= 1.8) {
                    // Deflect enemy projectile! Reverse velocity, make it player's
                    bullet.isPlayerBullet = true;
                    bullet.vx = -bullet.vx;
                    bullet.vy = -bullet.vy;
                    bullet.dx = -bullet.dx;
                    bullet.dy = -bullet.dy;
                    bullet.mesh.material = this.projectileManager.playerMaterial;
                }
            }
        }

        // Tank shield bubble vs enemy projectiles
        if (this.tankShield) {
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                if (bullet.isPlayerBullet) continue;

                const dx = bullet.x - this.tankShield.x;
                const dy = bullet.y - this.tankShield.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= this.tankShield.radius) {
                    this.projectileManager.deactivate(bullet, i);
                }
            }
        }

        // 2. Player bullets vs enemies
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (!bullet.isPlayerBullet) continue;

            for (const enemy of enemies) {
                if (!enemy.active) continue;

                // Skip if this bullet has already hit this enemy
                if (bullet.hitEnemies && bullet.hitEnemies.includes(enemy)) continue;

                if (Collision.circleVsCircle(
                    bullet.x, bullet.y, 0.15,
                    enemy.x, enemy.y, enemy.radius
                )) {
                    if (bullet.type === 'rocket') {
                        this.triggerExplosion(bullet.x, bullet.y, 1.8, bullet.damage);
                        this.projectileManager.deactivate(bullet, i);
                        break;
                    }

                    if (bullet.type === 'grenade') {
                        // Grenades trigger on time limit, bypass contact explosion
                        break;
                    }

                    const damageDealt = bullet.damage * (this.player.damageMultiplier || 1.0);
                    const killed = enemy.takeDamage(damageDealt);
                    this.spawnFloatingIndicator(enemy.x, enemy.y + 0.55, `-${Math.round(damageDealt)}`, '#ffeb3b');

                    // Register hit
                    if (!bullet.hitEnemies) {
                        bullet.hitEnemies = [];
                    }
                    bullet.hitEnemies.push(enemy);

                    // Knockback enemy (Warrior class gets 1.35x knockback passive)
                    let knockbackForce = bullet.type === 'slash' ? 0.6 : 0.35;
                    if (this.player && this.characterData?.id === 'warrior') {
                        knockbackForce *= 1.35;
                    }
                    enemy.x += bullet.dx * knockbackForce;
                    enemy.y += bullet.dy * knockbackForce;

                    // Effects
                    audioManager.play('hit');
                    this.effects.whiteFlash();
                    this.effects.screenShake(bullet.type === 'slash' ? 0.18 : 0.08, 0.06);

                    if (killed) {
                        audioManager.play('enemyDeath');
                        this.effects.screenShake(0.2, 0.12);
                        
                        this.spawnCoin(enemy.x, enemy.y);
                        this.player.ultimateCharge = Math.min(100, (this.player.ultimateCharge || 0) + 8);
                        this.kills++;
                    }

                    // Pierce decrement check
                    if (bullet.pierceCount && bullet.pierceCount > 0) {
                        bullet.pierceCount--;
                    } else {
                        this.projectileManager.deactivate(bullet, i);
                    }
                    break;
                }
            }
        }

        // 3. Enemy bullets vs player
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            if (bullet.isPlayerBullet) continue;

            if (Collision.circleVsCircle(
                bullet.x, bullet.y, 0.15,
                this.player.x, this.player.y, this.player.radius
            )) {
                // If shield is active, ignore damage completely
                if (this.player.shieldActive) {
                    this.projectileManager.deactivate(bullet, i);
                    continue;
                }

                const dead = this.player.takeDamage(bullet.damage);
                this.projectileManager.deactivate(bullet, i);

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

        // 4. Enemies vs player contact damage
        for (const enemy of enemies) {
            if (!enemy.active) continue;

            if (Collision.circleVsCircle(
                this.player.x, this.player.y, this.player.radius,
                enemy.x, enemy.y, enemy.radius
            )) {
                if (this.player.shieldActive || this.player.invincible) continue;

                // Tank passive: reflect contact damage back to colliding enemy, triggers a radial shockwave
                const isTank = this.characterData?.id === 'tank';

                if (isTank) {
                    const killedSelf = enemy.takeDamage(enemy.damage);
                    if (killedSelf) {
                        this.spawnCoin(enemy.x, enemy.y);
                        this.player.ultimateCharge = Math.min(100, (this.player.ultimateCharge || 0) + 8);
                        audioManager.play('enemyDeath');
                        this.kills++;
                    }

                    // Shockwave radial effect
                    const shockGeo = new THREE.RingGeometry(0.1, 0.2, 32);
                    const shockMat = new THREE.MeshBasicMaterial({
                        color: 0x29b6f6,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.8
                    });
                    const shockMesh = new THREE.Mesh(shockGeo, shockMat);
                    shockMesh.position.set(this.player.x, this.player.y, 0.05);
                    this.scene.add(shockMesh);

                    this.tempMeshes.push({
                        mesh: shockMesh,
                        timer: 0.3,
                        maxRadius: 2.0,
                        update: (itemDt, self) => {
                            self.timer -= itemDt;
                            if (self.timer <= 0) {
                                this.scene.remove(self.mesh);
                                shockGeo.dispose();
                                shockMat.dispose();
                                return true;
                            }
                            const scale = 1 + (1 - self.timer / 0.3) * (self.maxRadius * 5);
                            self.mesh.scale.set(scale, scale, scale);
                            self.mesh.material.opacity = (self.timer / 0.3) * 0.8;
                            return false;
                        }
                    });

                    // Damage and knock back nearby enemies within shockwave radius
                    const nearbyEnemies = this.enemyManager.getActive();
                    for (const nearby of nearbyEnemies) {
                        if (nearby === enemy) continue;
                        const ndx = nearby.x - this.player.x;
                        const ndy = nearby.y - this.player.y;
                        const ndist = Math.sqrt(ndx*ndx + ndy*ndy);
                        if (ndist <= 2.2) {
                            const killed = nearby.takeDamage(this.player.damage);
                            if (killed) {
                                this.spawnCoin(nearby.x, nearby.y);
                                this.player.ultimateCharge = Math.min(100, (this.player.ultimateCharge || 0) + 8);
                                audioManager.play('enemyDeath');
                                this.kills++;
                            }
                            // Knock back
                            const force = 0.5;
                            nearby.x += (ndx / ndist) * force;
                            nearby.y += (ndy / ndist) * force;
                        }
                    }
                }

                // Goblin thief coin stealing trigger
                if (enemy.stealCoin) {
                    const beforeCredits = this.player.credits || 0;
                    enemy.stealCoin(this.player);
                    const afterCredits = this.player.credits || 0;
                    if (beforeCredits > afterCredits) {
                        this.spawnFloatingIndicator(this.player.x, this.player.y + 0.6, "-1 Coin", "#e53935");
                        this.updateHUD();
                    }
                }

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
        if (this.player) {
            this.player.credits = (this.player.credits || 0) + 50; // Earn 50 credits for room completion
        }
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
        this.container.style.cursor = 'auto'; // Restore default pointer

        const roomsCompleted = this.roomManager.getRoomNumber() - 1;
        const playerCredits = this.player?.credits || 0;
        const score = Math.max(0, Math.floor((this.kills * 100) + (playerCredits * 50) + (roomsCompleted * 250) - (this.gameTime * 1.5)));

        // Update persistent milestones
        const milestones = JSON.parse(localStorage.getItem('keizject_milestones') || '{"bossesDefeated": 0, "maxRoomReached": 1}');
        milestones.maxRoomReached = Math.max(milestones.maxRoomReached, this.roomManager.getRoomNumber());
        milestones.bossesDefeated = Math.max(milestones.bossesDefeated, this.roomManager.bossesDefeated);
        localStorage.setItem('keizject_milestones', JSON.stringify(milestones));

        // Save scores to LocalStorage leaderboard
        const newEntry = {
            name: this.characterData?.name || 'Recruit',
            character: this.characterData?.id || 'soldier',
            score: score,
            kills: this.kills,
            credits: playerCredits,
            rooms: this.roomManager.getRoomNumber(),
            time: Math.floor(this.gameTime),
            date: new Date().toISOString()
        };

        const existingScores = JSON.parse(localStorage.getItem('keizject_leaderboard') || '[]');
        existingScores.push(newEntry);
        existingScores.sort((a, b) => b.score - a.score);
        localStorage.setItem('keizject_leaderboard', JSON.stringify(existingScores.slice(0, 10)));

        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Styled game over overlay
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.innerHTML = `
            <div class="game-over-content" style="text-align: center; font-family: 'Orbitron', sans-serif; border: 2px solid #ff0055; box-shadow: 0 0 25px rgba(255, 0, 85, 0.4); background: rgba(15, 10, 15, 0.95); border-radius: 12px; padding: 30px; width: 380px;">
                <h1 style="color: #ff0055; text-shadow: 0 0 10px rgba(255, 0, 85, 0.5); font-size: 2.2rem; margin-bottom: 20px; letter-spacing: 2px;">SYSTEM CRASH</h1>
                <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255, 0, 85, 0.2); border-radius: 8px; padding: 20px; margin-bottom: 20px; line-height: 1.8; color: #e0e5ff; font-size: 0.95rem;">
                    <p style="font-size: 1.6rem; color: #00ffcc; text-shadow: 0 0 5px rgba(0, 255, 204, 0.4); margin: 0 0 15px 0; font-weight: bold; font-family: 'Orbitron', sans-serif;">SCORE: ${score}</p>
                    <p style="margin: 5px 0; text-align: left; display: flex; justify-content: space-between;"><span>Reached Room:</span> <span style="color: #00ffff; font-weight: bold;">${this.roomManager.getRoomNumber()}</span></p>
                    <p style="margin: 5px 0; text-align: left; display: flex; justify-content: space-between;"><span>Total Kills:</span> <span style="color: #ffd700; font-weight: bold;">${this.kills}</span></p>
                    <p style="margin: 5px 0; text-align: left; display: flex; justify-content: space-between;"><span>Credits Accrued:</span> <span style="color: #00ffaa; font-weight: bold;">${playerCredits}</span></p>
                    <p style="margin: 5px 0; text-align: left; display: flex; justify-content: space-between;"><span>Time Elapsed:</span> <span style="color: #bd00ff; font-weight: bold;">${timeStr}</span></p>
                </div>
                <button class="btn btn-primary" id="restart-btn" style="padding: 10px 20px; width: 120px;">RESTART</button>
                <button class="btn btn-secondary" id="exit-btn" style="padding: 10px 20px; width: 120px; margin-left: 15px;">EXIT</button>
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

        this.kills = 0;
        this.gameTime = 0;

        this.player.health = this.characterData?.stats?.hp || 100;
        this.player.maxHealth = this.player.health;
        this.player.speed = this.player.baseSpeed;
        this.player.damage = this.player.baseDamage;
        this.player.damageMultiplier = 1.0;
        this.player.damageReduction = 0;
        this.player.pierceCount = 0;
        this.player.credits = 0;
        this.player.ultimateCharge = 0;
        this.player.skillsCooldowns = [0, 0, 0];
        
        // Reset player active flags
        this.player.shieldActive = false;
        if (this.player.shieldMesh) {
            this.player.mesh.remove(this.player.shieldMesh);
            this.player.shieldMesh = null;
        }
        this.player.boostActive = false;
        if (this.player.boostMesh) {
            this.player.mesh.remove(this.player.boostMesh);
            this.player.boostMesh = null;
        }
        this.player.dashActive = false;

        this.setupRoom();
        this.start();
    }

    showPowerUpSelection() {
        this.showingPowerUpSelection = true;
        this.container.style.cursor = 'auto'; // Show cursor for card picking

        const options = this.powerUpManager.getRandomSelection(3);

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

        const cards = overlay.querySelectorAll('.power-up-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const powerUpId = card.dataset.id;
                this.powerUpManager.applyPowerUp(powerUpId, this.player);

                overlay.remove();
                this.showingPowerUpSelection = false;
                this.container.style.cursor = 'none'; // Re-hide cursor

                this.room.openDoors();
                this.updateHUD();
            });

            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px) scale(1.05)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    triggerUltimate() {
        this.player.ultimateCharge = 0;
        audioManager.play('powerUp');
        this.effects.whiteFlash();
        this.effects.screenShake(0.3, 0.25);

        const classId = this.characterData?.id;

        if (classId === 'warrior') {
            // Deflecting circular sword whirl
            this.swordWhirlTimer = 2.0;

            const whirlGeo = new THREE.RingGeometry(0.1, 1.8, 32);
            const whirlMat = new THREE.MeshBasicMaterial({
                color: 0xff6b35,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4
            });
            this.swordWhirlMesh = new THREE.Mesh(whirlGeo, whirlMat);
            this.swordWhirlMesh.position.set(this.player.x, this.player.y, 0.05);
            this.scene.add(this.swordWhirlMesh);

        } else if (classId === 'mage') {
            // Ethereal lightning field striking all active targets
            const activeEnemies = this.enemyManager.getActive();
            for (const enemy of activeEnemies) {
                const killed = enemy.takeDamage(this.player.damage * 3.0);

                // Spawning visual lightning bolt
                const points = [];
                points.push(new THREE.Vector3(enemy.x + (Math.random() - 0.5) * 2, 6, 0.1));
                const segments = 4;
                for (let s = 1; s < segments; s++) {
                    const t = s / segments;
                    const lx = THREE.MathUtils.lerp(enemy.x + (Math.random() - 0.5) * 2, enemy.x, t);
                    const ly = THREE.MathUtils.lerp(6, enemy.y, t);
                    points.push(new THREE.Vector3(lx + (Math.random() - 0.5) * 0.3, ly, 0.1));
                }
                points.push(new THREE.Vector3(enemy.x, enemy.y, 0.1));

                const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                const lineMat = new THREE.LineBasicMaterial({ color: 0x7c4dff, linewidth: 2 });
                const line = new THREE.Line(lineGeo, lineMat);
                this.scene.add(line);

                this.tempMeshes.push({
                    mesh: line,
                    timer: 0.15,
                    update: (itemDt, self) => {
                        self.timer -= itemDt;
                        if (self.timer <= 0) {
                            this.scene.remove(self.mesh);
                            lineGeo.dispose();
                            lineMat.dispose();
                            return true;
                        }
                        return false;
                    }
                });

                if (killed) {
                    audioManager.play('enemyDeath');
                    this.spawnCoin(enemy.x, enemy.y);
                    this.kills++;
                }
            }
            this.effects.screenShake(0.4, 0.3);

        } else if (classId === 'assassin') {
            // Bullet time: slows engine delta time updates for active objects except player
            this.bulletTimeTimer = 4.0;

            if (this.effects && this.effects.flashOverlay) {
                this.effects.flashOverlay.style.background = 'rgba(0, 229, 255, 0.15)';
                this.effects.flashOverlay.style.opacity = '1';
                setTimeout(() => {
                    this.effects.flashOverlay.style.opacity = '0';
                }, 300);
            }

        } else if (classId === 'tank') {
            // Stationary shield barrier bubble protecting against all projectiles
            this.tankShieldTimer = 5.0;

            const shieldGeo = new THREE.RingGeometry(1.95, 2.05, 32);
            const shieldMat = new THREE.MeshBasicMaterial({
                color: 0x29b6f6,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
            shieldMesh.position.set(this.player.x, this.player.y, 0.05);
            this.scene.add(shieldMesh);

            this.tankShield = {
                mesh: shieldMesh,
                x: this.player.x,
                y: this.player.y,
                radius: 2.0
            };
        }

        this.updateHUD();
    }

    updateUltimateEffects(dt) {
        // 1. Warrior sword whirl
        if (this.swordWhirlTimer > 0 && this.swordWhirlMesh) {
            this.swordWhirlTimer -= dt;
            this.swordWhirlMesh.position.set(this.player.x, this.player.y, 0.05);
            this.swordWhirlMesh.rotation.z += dt * 10;

            // Continuous whirl damage to nearby enemies
            const nearby = this.enemyManager.getActive();
            for (const enemy of nearby) {
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= 1.9) {
                    const killed = enemy.takeDamage(this.player.damage * 0.15); // continuous DPS tick
                    if (killed) {
                        audioManager.play('enemyDeath');
                        this.spawnCoin(enemy.x, enemy.y);
                        this.player.ultimateCharge = Math.min(100, (this.player.ultimateCharge || 0) + 8);
                        this.kills++;
                    }
                }
            }

            if (this.swordWhirlTimer <= 0) {
                this.scene.remove(this.swordWhirlMesh);
                this.swordWhirlMesh.geometry.dispose();
                this.swordWhirlMesh.material.dispose();
                this.swordWhirlMesh = null;
            }
        }

        // 2. Tank stationary bubble shield
        if (this.tankShieldTimer > 0 && this.tankShield) {
            this.tankShieldTimer -= dt;
            this.tankShield.mesh.rotation.z -= dt * 1.5;

            if (this.tankShieldTimer <= 0) {
                this.scene.remove(this.tankShield.mesh);
                this.tankShield.mesh.geometry.dispose();
                this.tankShield.mesh.material.dispose();
                this.tankShield = null;
            }
        }

        // 3. Temp generic meshes animation update
        for (let i = this.tempMeshes.length - 1; i >= 0; i--) {
            const item = this.tempMeshes[i];
            const finished = item.update(dt, item);
            if (finished) {
                this.tempMeshes.splice(i, 1);
            }
        }
    }

    spawnCoin(x, y) {
        const coinSprite = new AnimatedSprite(this.scene, {
            size: 0.35,
            frameRate: 20
        });
        coinSprite.addAnimationSequence('spin', '/Gold', 'Gold_', '.png', 30, 20, 1, 0);
        coinSprite.setPositionImmediate(x, y);
        coinSprite.play('spin');

        this.coins.push({
            sprite: coinSprite,
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 3, // Initial burst speed spreading
            vy: (Math.random() - 0.5) * 3
        });
    }

    updateCoins(dt) {
        if (!this.player) return;

        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];

            const dx = this.player.x - coin.x;
            const dy = this.player.y - coin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Pull to player if within magnet vacuum range
            if (dist < 2.5) {
                const pullForce = 6.0;
                coin.vx += (dx / dist) * pullForce * dt;
                coin.vy += (dy / dist) * pullForce * dt;

                // Speed limit
                const speed = Math.sqrt(coin.vx * coin.vx + coin.vy * coin.vy);
                if (speed > 8) {
                    coin.vx = (coin.vx / speed) * 8;
                    coin.vy = (coin.vy / speed) * 8;
                }
            } else {
                // Apply friction
                coin.vx *= 0.95;
                coin.vy *= 0.95;
            }

            coin.x += coin.vx * dt;
            coin.y += coin.vy * dt;

            if (coin.sprite) {
                coin.sprite.setPositionImmediate(coin.x, coin.y);
                coin.sprite.update(dt);
            }

            // Pick up check
            if (dist < (this.player.radius + 0.15)) {
                if (coin.sprite) {
                    coin.sprite.destroy();
                }
                this.coins.splice(i, 1);

                // Increment credits
                this.player.credits = (this.player.credits || 0) + 1;
                audioManager.play('hit'); // Soft collect sound
                this.updateHUD();
            }
        }
    }

    updateShop(dt) {
        if (!this.merchantDrone || !this.player) return;

        // Drone hover/rotate animations
        this.merchantDrone.mesh.position.y = 1.5 + Math.sin(performance.now() * 0.003) * 0.15;
        this.merchantDrone.mesh.rotation.y += dt * 0.8;

        const dx = this.player.x - this.merchantDrone.x;
        const dy = this.player.y - this.merchantDrone.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Open shop panel if player is close to drone
        if (dist < 1.5) {
            if (this.shopOverlay.style.display !== 'block') {
                this.shopOverlay.style.display = 'block';
                this.updateShopUI();
            }
        } else {
            if (this.shopOverlay.style.display !== 'none') {
                this.shopOverlay.style.display = 'none';
            }
        }
    }

    updateShopUI() {
        if (!this.shopOverlay || !this.player) return;

        const credits = this.player.credits || 0;

        this.shopOverlay.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid rgba(0, 229, 255, 0.3); padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="font-family: 'Orbitron', sans-serif; color: #00e5ff; letter-spacing: 2px; margin: 0;">MERCHANT DRONE</h2>
                <p style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.6); margin: 5px 0 0;">UPGRADE SYSTEM ONLINE</p>
                <div style="font-family: 'Orbitron', sans-serif; color: #ffd700; font-size: 0.95rem; margin-top: 10px;">YOUR CREDITS: ${credits}</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
                    <div>
                        <div style="font-weight: bold; color: #00e676;">Nano Repair</div>
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.6);">Heal 25 HP</div>
                    </div>
                    <button class="shop-btn btn" data-item="heal" style="padding: 6px 12px; font-size: 0.8rem; height: auto;" ${credits < 8 ? 'disabled' : ''}>8 Credits</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
                    <div>
                        <div style="font-weight: bold; color: #ff5252;">Shield Capacitor</div>
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.6);">+25 Max HP</div>
                    </div>
                    <button class="shop-btn btn" data-item="maxHp" style="padding: 6px 12px; font-size: 0.8rem; height: auto;" ${credits < 15 ? 'disabled' : ''}>15 Credits</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
                    <div>
                        <div style="font-weight: bold; color: #ff9800;">Power Core</div>
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.6);">+2.5 Bullet Damage</div>
                    </div>
                    <button class="shop-btn btn" data-item="atk" style="padding: 6px 12px; font-size: 0.8rem; height: auto;" ${credits < 15 ? 'disabled' : ''}>15 Credits</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.05); padding: 10px; border-radius: 6px;">
                    <div>
                        <div style="font-weight: bold; color: #ffeb3b;">Thrusters</div>
                        <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.6);">+0.5 Movement Speed</div>
                    </div>
                    <button class="shop-btn btn" data-item="speed" style="padding: 6px 12px; font-size: 0.8rem; height: auto;" ${credits < 12 ? 'disabled' : ''}>12 Credits</button>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 0.8rem; color: rgba(255, 255, 255, 0.4);">
                Move away from drone to close.
            </div>
        `;

        const buttons = this.shopOverlay.querySelectorAll('.shop-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const item = button.dataset.item;
                this.purchaseItem(item);
            });
        });
    }

    purchaseItem(item) {
        if (!this.player) return;

        let cost = 0;
        if (item === 'heal') cost = 8;
        else if (item === 'maxHp') cost = 15;
        else if (item === 'atk') cost = 15;
        else if (item === 'speed') cost = 12;

        if (this.player.credits >= cost) {
            this.player.credits -= cost;

            if (item === 'heal') {
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 25);
            } else if (item === 'maxHp') {
                this.player.maxHealth += 25;
                this.player.health += 25;
            } else if (item === 'atk') {
                this.player.damageMultiplier += 0.15; // +15% damage scaling
            } else if (item === 'speed') {
                this.player.baseSpeed += 0.5;
            }

            audioManager.play('powerUp');
            this.effects.whiteFlash();
            this.updateHUD();
            this.updateShopUI();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        this.running = false;
        this.container.style.cursor = 'auto'; // Restore default pointer

        window.removeEventListener('resize', this.handleResize);

        if (this.shopOverlay) this.shopOverlay.remove();

        // Clear coins
        for (const coin of this.coins) {
            this.scene.remove(coin.mesh);
            if (coin.mesh.geometry) coin.mesh.geometry.dispose();
            if (coin.mesh.material) coin.mesh.material.dispose();
        }
        this.coins = [];

        // Clear merchant drone
        if (this.merchantDrone) {
            this.scene.remove(this.merchantDrone.mesh);
            if (this.merchantDrone.mesh.geometry) this.merchantDrone.mesh.geometry.dispose();
            if (this.merchantDrone.mesh.material) this.merchantDrone.mesh.material.dispose();
            this.merchantDrone = null;
        }

        // Clear ultimate meshes
        if (this.swordWhirlMesh) {
            this.scene.remove(this.swordWhirlMesh);
            this.swordWhirlMesh.geometry.dispose();
            this.swordWhirlMesh.material.dispose();
            this.swordWhirlMesh = null;
        }

        if (this.tankShield && this.tankShield.mesh) {
            this.scene.remove(this.tankShield.mesh);
            this.tankShield.mesh.geometry.dispose();
            this.tankShield.mesh.material.dispose();
            this.tankShield = null;
        }

        // Clear tempMeshes
        for (const item of this.tempMeshes) {
            this.scene.remove(item.mesh);
            if (item.mesh.geometry) item.mesh.geometry.dispose();
            if (item.mesh.material) item.mesh.material.dispose();
        }
        this.tempMeshes = [];

        if (this.room) this.room.destroy();
        if (this.player) this.player.destroy();
        if (this.projectileManager) this.projectileManager.destroy();
        if (this.enemyManager) this.enemyManager.clearAll();

        if (this.hud) this.hud.remove();
        if (this.crosshair) this.crosshair.remove();

        this.renderer.dispose();
        this.container.innerHTML = '';
    }
}
