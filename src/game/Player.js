import * as THREE from 'three';
import { Collision } from './Collision.js';

/**
 * Player entity with movement, weapon systems, active skills, and ultimate abilities
 */
export class Player {
    constructor(scene, characterData, loadout = null) {
        this.scene = scene;
        this.characterData = characterData;
        this.loadout = loadout || {
            primary: null,
            secondary: null,
            skills: [null, null, null]
        };

        // Stats from character
        this.maxHealth = characterData?.stats?.hp || 100;
        this.health = this.maxHealth;
        
        // Base movement speed (translated from character data)
        this.baseSpeed = 5 + (characterData?.stats?.speed || 50) / 25; // 5-9 range
        this.speed = this.baseSpeed;
        this.damageMultiplier = 1.0;

        // Base damage (translated from character data)
        this.baseDamage = 10 + (characterData?.stats?.atk || 50) / 5; // 10-30 range
        this.damage = this.baseDamage;

        // Weapon states
        this.activeWeaponSlot = 'primary'; // 'primary' or 'secondary'
        this.fireCooldown = 0;
        this.weaponSwapCooldown = 0;
        this.speedBoostTimer = 0; // Assassin swap speed passive

        // Position and physics
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 0.4;

        // Invincibility
        this.invincible = false;
        this.invincibleTime = 0;
        this.invincibleDuration = 1.0;

        // Power-ups collected in-game
        this.damageReduction = 0; // Armor power-up
        this.pierceCount = 0;     // Bullet piercing power-up
        this.fireRateMultiplier = 1.0; // Fire rate multiplier power-up

        // Facing direction for sprite flip
        this.facingRight = true;

        // Credit Economy
        this.credits = 0;

        // Ultimate Ability Gauge (0 - 100)
        this.ultimateCharge = 0;

        // Active Skills State
        this.skillsCooldowns = [0, 0, 0];
        
        // Skill Durations and status flags
        this.dashActive = false;
        this.dashTime = 0;
        this.dashDuration = 0.25;
        this.dashDirection = { x: 0, y: 0 };

        this.shieldActive = false;
        this.shieldTime = 0;
        this.shieldDuration = 4.0;
        this.shieldMesh = null;

        this.boostActive = false;
        this.boostTime = 0;
        this.boostDuration = 6.0;
        this.boostMesh = null;

        this.createMesh();
    }

    createMesh() {
        const spritePath = this.characterData?.icon || '/soilder.png';
        const spriteSize = 1.0;

        const geometry = new THREE.PlaneGeometry(spriteSize, spriteSize);

        const loader = new THREE.TextureLoader();
        const texture = loader.load(spritePath);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.z = 0.1;
        this.scene.add(this.mesh);

        // Direction indicator (small green dot showing aim direction)
        const indicatorGeo = new THREE.CircleGeometry(0.08, 8);
        const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        this.indicator.position.set(0.4, 0, 0.15);
        this.mesh.add(this.indicator);
    }

    getActiveWeapon() {
        const primaryWeapon = this.loadout.primary;
        const secondaryWeapon = this.loadout.secondary;

        if (this.activeWeaponSlot === 'primary') {
            return primaryWeapon || { id: 'rifle', name: 'Plasma Rifle', icon: '🔫', stats: { damage: 60, range: 80, speed: 60 } };
        } else {
            return secondaryWeapon || { id: 'pistol', name: 'Sidearm', icon: '🔧', stats: { damage: 35, range: 40, speed: 85 } };
        }
    }

    getFireRate() {
        const weapon = this.getActiveWeapon();
        let baseRate = 0.25;

        // Custom fire rates based on item ID
        switch (weapon.id) {
            case 'rifle': baseRate = 0.18; break;
            case 'shotgun': baseRate = 0.65; break;
            case 'smg': baseRate = 0.08; break;
            case 'sniper': baseRate = 1.0; break;
            case 'pistol': baseRate = 0.3; break;
            case 'knife': baseRate = 0.25; break;
            case 'launcher': baseRate = 0.8; break;
            default: baseRate = 0.25; break;
        }

        // Apply Power Surge skill boost (halves the delay)
        if (this.boostActive) {
            return baseRate * 0.5 * (this.fireRateMultiplier || 1.0);
        }
        return baseRate * (this.fireRateMultiplier || 1.0);
    }

    swapWeapon() {
        if (this.weaponSwapCooldown > 0) return;
        this.activeWeaponSlot = this.activeWeaponSlot === 'primary' ? 'secondary' : 'primary';
        this.weaponSwapCooldown = 0.3; // Prevent spamming
        
        // Assassin swap speed passive
        if (this.characterData?.id === 'assassin') {
            this.speedBoostTimer = 1.5; // +30% movement speed for 1.5s
        }
    }

    activateSkill(index) {
        if (index < 0 || index >= 3) return;
        const skill = this.loadout.skills[index];
        if (!skill || this.skillsCooldowns[index] > 0) return;

        let cooldown = 15; // default fallback

        switch (skill.id) {
            case 'dash':
                cooldown = 6;
                this.dashActive = true;
                this.dashTime = this.dashDuration;
                
                // Dash in the direction the player is moving, or forward
                const moveLen = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (moveLen > 0) {
                    this.dashDirection.x = this.vx / moveLen;
                    this.dashDirection.y = this.vy / moveLen;
                } else {
                    this.dashDirection.x = this.facingRight ? 1 : -1;
                    this.dashDirection.y = 0;
                }
                
                // Assassin has +0.15s extra invincibility duration during dodge/dash
                const invulnDur = (this.characterData?.id === 'assassin') ? (this.dashDuration + 0.15) : this.dashDuration;
                this.invincible = true;
                this.invincibleTime = invulnDur;
                break;

            case 'shield':
                cooldown = 14;
                this.shieldActive = true;
                this.shieldTime = this.shieldDuration;
                if (!this.shieldMesh) {
                    const geo = new THREE.RingGeometry(0.55, 0.6, 24);
                    const mat = new THREE.MeshBasicMaterial({ 
                        color: 0x00aaff, 
                        transparent: true, 
                        opacity: 0.8, 
                        side: THREE.DoubleSide 
                    });
                    this.shieldMesh = new THREE.Mesh(geo, mat);
                    this.shieldMesh.position.z = 0.12;
                    this.mesh.add(this.shieldMesh);
                }
                break;

            case 'heal':
                cooldown = 18;
                // Instantly heal 30% of max health
                const healAmt = this.maxHealth * 0.3;
                this.health = Math.min(this.health + healAmt, this.maxHealth);
                break;

            case 'grenade':
                cooldown = 10;
                break;

            case 'scan':
                cooldown = 12;
                break;

            case 'boost':
                cooldown = 20;
                this.boostActive = true;
                this.boostTime = this.boostDuration;
                if (!this.boostMesh) {
                    const geo = new THREE.RingGeometry(0.48, 0.52, 24);
                    const mat = new THREE.MeshBasicMaterial({ 
                        color: 0xff3333, 
                        transparent: true, 
                        opacity: 0.7, 
                        side: THREE.DoubleSide 
                    });
                    this.boostMesh = new THREE.Mesh(geo, mat);
                    this.boostMesh.position.z = 0.12;
                    this.mesh.add(this.boostMesh);
                }
                break;
        }

        // Set active cooldown
        this.skillsCooldowns[index] = cooldown;
        return skill.id;
    }

    update(dt, input, bounds) {
        // Decrement cooldowns
        for (let i = 0; i < 3; i++) {
            if (this.skillsCooldowns[i] > 0) {
                this.skillsCooldowns[i] = Math.max(0, this.skillsCooldowns[i] - dt);
            }
        }

        if (this.weaponSwapCooldown > 0) {
            this.weaponSwapCooldown -= dt;
        }

        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= dt;
        }

        // 1. Skill Timers Update
        if (this.dashActive) {
            this.dashTime -= dt;
            if (this.dashTime <= 0) {
                this.dashActive = false;
            }
        }

        if (this.shieldActive) {
            this.shieldTime -= dt;
            if (this.shieldMesh) {
                this.shieldMesh.rotation.z += dt * 3.5;
                this.shieldMesh.scale.setScalar(1 + Math.sin(this.shieldTime * 12) * 0.05);
            }
            if (this.shieldTime <= 0) {
                this.shieldActive = false;
                if (this.shieldMesh) {
                    this.mesh.remove(this.shieldMesh);
                    this.shieldMesh.geometry.dispose();
                    this.shieldMesh.material.dispose();
                    this.shieldMesh = null;
                }
            }
        }

        if (this.boostActive) {
            this.boostTime -= dt;
            if (this.boostMesh) {
                this.boostMesh.rotation.z -= dt * 4.5;
            }
            if (this.boostTime <= 0) {
                this.boostActive = false;
                if (this.boostMesh) {
                    this.mesh.remove(this.boostMesh);
                    this.boostMesh.geometry.dispose();
                    this.boostMesh.material.dispose();
                    this.boostMesh = null;
                }
            }
        }

        // 2. Velocity Calculation
        if (this.dashActive) {
            // High dash speed
            const dashSpeed = this.baseSpeed * 2.5;
            this.vx = this.dashDirection.x * dashSpeed;
            this.vy = this.dashDirection.y * dashSpeed;
        } else {
            this.vx = 0;
            this.vy = 0;

            if (input.moveLeft) this.vx -= 1;
            if (input.moveRight) this.vx += 1;
            if (input.moveUp) this.vy += 1;
            if (input.moveDown) this.vy -= 1;

            // Normalize diagonal movement
            const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (len > 0) {
                // Apply speed multiplier if Power Surge (boost) or Assassin swap speed passive is active
                let speedMultiplier = 1.0;
                if (this.boostActive) speedMultiplier *= 1.35;
                if (this.speedBoostTimer > 0) speedMultiplier *= 1.3;

                const currentSpeed = this.baseSpeed * speedMultiplier;
                this.vx = (this.vx / len) * currentSpeed;
                this.vy = (this.vy / len) * currentSpeed;

                // Flip sprite based on movement direction
                if (this.vx > 0) this.facingRight = true;
                if (this.vx < 0) this.facingRight = false;
            }
        }

        // Apply sprite flip
        this.mesh.scale.x = this.facingRight ? 1 : -1;

        // Apply velocity
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Clamp to bounds
        const clamped = Collision.clampToBounds(this.x, this.y, this.radius, bounds);
        this.x = clamped.x;
        this.y = clamped.y;

        // Update mesh position
        this.mesh.position.x = this.x;
        this.mesh.position.y = this.y;

        // 3. Update Direction Indicator based on Mouse World coords or movement direction
        const mouseWorldX = input.mousePos.x * (bounds.right * 1.1); // Estimate viewport bounds
        const mouseWorldY = input.mousePos.y * (bounds.top * 1.1);
        const playerPos = {
            x: this.x,
            y: this.y,
            mouseX: mouseWorldX,
            mouseY: mouseWorldY
        };

        const shootDir = input.getShootDirection(playerPos);
        if (shootDir) {
            this.indicator.position.x = shootDir.x * 0.5;
            this.indicator.position.y = shootDir.y * 0.5;
        } else {
            const moveLen = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (moveLen > 0) {
                this.indicator.position.x = (this.vx / moveLen) * 0.5;
                this.indicator.position.y = (this.vy / moveLen) * 0.5;
            }
        }

        // 4. Fire cooldown
        if (this.fireCooldown > 0) {
            this.fireCooldown -= dt;
        }

        // 5. Invincibility blink
        if (this.invincible) {
            this.invincibleTime -= dt;
            this.mesh.material.opacity = Math.sin(this.invincibleTime * (this.dashActive ? 40 : 20)) * 0.3 + 0.7;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
                this.mesh.material.opacity = 1;
            }
        }
    }

    canShoot() {
        return this.fireCooldown <= 0 && !this.dashActive;
    }

    shoot() {
        this.fireCooldown = this.getFireRate();
    }

    takeDamage(amount) {
        if (this.invincible || this.shieldActive) return false;

        // Apply damage reduction from armor power-up
        const reducedDamage = amount * (1 - Math.min(this.damageReduction, 0.75));
        this.health -= reducedDamage;
        this.invincible = true;
        this.invincibleTime = this.invincibleDuration;

        return this.health <= 0;
    }

    destroy() {
        if (this.mesh.material.map) {
            this.mesh.material.map.dispose();
        }
        this.mesh.material.dispose();
        this.mesh.geometry.dispose();

        if (this.shieldMesh) {
            this.shieldMesh.geometry.dispose();
            this.shieldMesh.material.dispose();
        }
        if (this.boostMesh) {
            this.boostMesh.geometry.dispose();
            this.boostMesh.material.dispose();
        }

        this.scene.remove(this.mesh);
    }
}
