import * as THREE from 'three';
import { Collision } from './Collision.js';
import { AnimatedSprite } from './AnimatedSprite.js';

/**
 * Base enemy class with animated sprite support
 */
class Enemy {
    constructor(scene, x, y, config = {}) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.radius = config.radius || 0.35;
        this.health = config.health || 20;
        this.maxHealth = this.health;
        this.damage = config.damage || 10;
        this.speed = config.speed || 2;
        this.active = true;
        this.facingRight = true;

        // Sprite config
        this.spriteFolder = config.spriteFolder || null;
        this.spriteSize = config.spriteSize || 1.2;
        this.frameCount = config.frameCount || 6;

        // Animation state
        this.currentState = 'idle';
        this.hurtTimer = 0;

        this.createSprite();
    }

    createSprite() {
        if (this.spriteFolder) {
            // Create animated sprite
            this.sprite = new AnimatedSprite(this.scene, {
                size: this.spriteSize,
                frameRate: 10 // default fallback
            });

            // Add animations with Isaac-style frame rates
            this.sprite.addAnimation('idle', `${this.spriteFolder}/Idle.png`, this.frameCount, 6);
            this.sprite.addAnimation('walk', `${this.spriteFolder}/Walk.png`, this.frameCount, 10);
            this.sprite.addAnimation('run', `${this.spriteFolder}/Run.png`, this.frameCount, 12);
            this.sprite.addAnimation('attack', `${this.spriteFolder}/Attack_1.png`, this.frameCount, 12);
            this.sprite.addAnimation('hurt', `${this.spriteFolder}/Hurt.png`, this.frameCount, 8);
            this.sprite.addAnimation('dead', `${this.spriteFolder}/Dead.png`, this.frameCount, 8);

            this.sprite.setPositionImmediate(this.x, this.y);
            this.sprite.play('idle');

            // Reference mesh for compatibility
            this.mesh = this.sprite.mesh;
        } else {
            // Fallback to colored circle
            const geometry = new THREE.CircleGeometry(this.radius, 12);
            const material = new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true
            });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.set(this.x, this.y, 0.08);
            this.scene.add(this.mesh);
        }
    }

    setState(state) {
        if (this.currentState === state) return;
        if (this.currentState === 'dead') return; // Can't change from dead

        this.currentState = state;
        if (this.sprite) {
            this.sprite.play(state);
        }
    }

    update(dt, playerX, playerY, bounds) {
        // Update sprite animation
        if (this.sprite) {
            this.sprite.update(dt);
        }

        // Hurt timer
        if (this.hurtTimer > 0) {
            this.hurtTimer -= dt;
            if (this.hurtTimer <= 0 && this.currentState === 'hurt') {
                this.setState('idle');
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;

        // Play hurt animation
        this.setState('hurt');
        this.hurtTimer = 0.3;

        // Flash effect
        if (this.sprite) {
            this.sprite.setOpacity(0.5);
            setTimeout(() => {
                if (this.sprite && this.active) this.sprite.setOpacity(1);
            }, 50);
        }

        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    die() {
        this.active = false;

        if (this.sprite) {
            this.setState('dead');
            // Remove after death animation plays
            setTimeout(() => {
                if (this.sprite) {
                    this.sprite.destroy();
                    this.sprite = null;
                }
            }, 500);
        } else {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}

/**
 * Chaser enemy - follows player aggressively
 */
export class ChaserEnemy extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            health: 25,
            speed: 2.5,
            radius: 0.4,
            spriteFolder: '/Chaser',
            spriteSize: 1.4,
            frameCount: 6
        });
    }

    update(dt, playerX, playerY, bounds) {
        if (!this.active) return;

        super.update(dt, playerX, playerY, bounds);

        // Don't move during hurt
        if (this.currentState === 'hurt' || this.currentState === 'dead') return;

        // Move toward player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;

            // Flip sprite based on direction
            const right = dx > 0;
            if (this.sprite) {
                this.sprite.setFacing(right);
            }

            // Play run animation when chasing (with guard)
            if (this.currentState !== 'run') {
                this.setState('run');
            }
        } else {
            // Attack when close (with guard)
            if (this.currentState !== 'attack') {
                this.setState('attack');
            }
        }

        // Clamp to bounds
        const clamped = Collision.clampToBounds(this.x, this.y, this.radius, bounds);
        this.x = clamped.x;
        this.y = clamped.y;

        // Update sprite position
        if (this.sprite) {
            this.sprite.setPosition(this.x, this.y);
        } else {
            this.mesh.position.x = this.x;
            this.mesh.position.y = this.y;
        }
    }
}

/**
 * Wanderer enemy - random movement, occasionally shoots
 */
export class WandererEnemy extends Enemy {
    constructor(scene, x, y, projectileManager) {
        super(scene, x, y, {
            health: 15,
            speed: 1.5,
            radius: 0.35,
            spriteFolder: '/Wanderer',
            spriteSize: 1.2,
            frameCount: 6
        });

        this.projectileManager = projectileManager;
        this.directionTimer = 0;
        this.dirX = 0;
        this.dirY = 0;
        this.shootTimer = 2 + Math.random() * 2;
        this.canShoot = !!projectileManager;

        this.pickNewDirection();
    }

    pickNewDirection() {
        const angle = Math.random() * Math.PI * 2;
        this.dirX = Math.cos(angle);
        this.dirY = Math.sin(angle);
        this.directionTimer = 1 + Math.random() * 2;
    }

    update(dt, playerX, playerY, bounds) {
        if (!this.active) return;

        super.update(dt, playerX, playerY, bounds);

        // Don't move during hurt
        if (this.currentState === 'hurt' || this.currentState === 'dead') return;

        // Direction change
        this.directionTimer -= dt;
        if (this.directionTimer <= 0) {
            this.pickNewDirection();
        }

        // Move
        this.x += this.dirX * this.speed * dt;
        this.y += this.dirY * this.speed * dt;

        // Flip and animate (with guard)
        if (this.sprite) {
            this.sprite.setFacing(this.dirX > 0);
        }
        if (this.currentState !== 'walk') {
            this.setState('walk');
        }

        // Bounce off walls
        if (this.x - this.radius < bounds.left || this.x + this.radius > bounds.right) {
            this.dirX *= -1;
            this.x = Math.max(bounds.left + this.radius, Math.min(bounds.right - this.radius, this.x));
        }
        if (this.y - this.radius < bounds.bottom || this.y + this.radius > bounds.top) {
            this.dirY *= -1;
            this.y = Math.max(bounds.bottom + this.radius, Math.min(bounds.top - this.radius, this.y));
        }

        // Update sprite position
        if (this.sprite) {
            this.sprite.setPosition(this.x, this.y);
        } else {
            this.mesh.position.x = this.x;
            this.mesh.position.y = this.y;
        }

        // Shooting
        if (this.canShoot) {
            this.shootTimer -= dt;
            if (this.shootTimer <= 0) {
                this.shoot(playerX, playerY);
                this.shootTimer = 2 + Math.random() * 2;
            }
        }
    }

    shoot(playerX, playerY) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1 && this.projectileManager) {
            // Play attack animation (with guard)
            if (this.currentState !== 'attack') {
                this.setState('attack');
            }

            this.projectileManager.spawn(
                this.x, this.y,
                dx / dist, dy / dist,
                6, // speed
                this.damage,
                false // enemy bullet
            );
        }
    }
}

/**
 * Boss enemy - larger, more HP, appears every 5 rooms
 * HP doubles each boss encounter (100 → 200 → 400 → 800...)
 */
export class BossEnemy extends Enemy {
    constructor(scene, x, y, hp = 100) {
        super(scene, x, y, {
            health: hp,
            speed: 1.8, // Slower but menacing
            radius: 0.6, // Larger hitbox
            damage: 25,
            spriteFolder: '/Chaser', // Use Chaser sprites for now
            spriteSize: 2.0, // Much larger
            frameCount: 6
        });
        this.isBoss = true;
        this.attackCooldown = 0;
        this.attackInterval = 1.5; // Seconds between attacks
    }

    update(dt, playerX, playerY, bounds) {
        if (!this.active) return;

        super.update(dt, playerX, playerY, bounds);

        // Don't move during hurt
        if (this.currentState === 'hurt' || this.currentState === 'dead') return;

        // Move toward player (like Chaser but slower)
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.8) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;

            // Flip sprite based on direction
            if (this.sprite) {
                this.sprite.setFacing(dx > 0);
            }

            // Play run animation (with guard)
            if (this.currentState !== 'run') {
                this.setState('run');
            }
        } else {
            // Attack when close (with guard)
            if (this.currentState !== 'attack') {
                this.setState('attack');
            }
        }

        // Clamp to bounds
        const clamped = Collision.clampToBounds(this.x, this.y, this.radius, bounds);
        this.x = clamped.x;
        this.y = clamped.y;

        // Update sprite position
        if (this.sprite) {
            this.sprite.setPosition(this.x, this.y);
        } else {
            this.mesh.position.x = this.x;
            this.mesh.position.y = this.y;
        }
    }
}

/**
 * Shooter enemy - Stationary, fires projectiles at player
 */
export class ShooterEnemy extends Enemy {
    constructor(scene, x, y, projectileManager) {
        super(scene, x, y, {
            health: 20,
            speed: 0, // Stationary
            radius: 0.4,
            damage: 10
        });

        this.projectileManager = projectileManager;
        this.shootTimer = 1.5;
        this.shootInterval = 2.0; // Fire every 2 seconds
        this.bulletSpeed = 4;

        // Give it a distinct purple color
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.setHex(0x9966ff);
        }
    }

    update(dt, playerX, playerY, bounds) {
        if (!this.active) return;
        super.update(dt, playerX, playerY, bounds);

        if (this.currentState === 'hurt' || this.currentState === 'dead') return;

        // Shooting logic
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.projectileManager) {
            this.shootTimer = this.shootInterval;

            // Calculate direction to player
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.1) {
                const nx = dx / dist;
                const ny = dy / dist;

                // Fire projectile at player
                this.projectileManager.spawn(
                    this.x, this.y,
                    nx, ny,
                    this.bulletSpeed,
                    this.damage,
                    false // Enemy bullet
                );
            }
        }
    }
}

/**
 * Bomber enemy - Chases player and explodes on contact or death
 */
export class BomberEnemy extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, {
            health: 15,
            speed: 3.5, // Fast
            radius: 0.35,
            damage: 30 // High damage on explosion
        });

        this.exploding = false;
        this.explodeTimer = 0;
        this.explodeDuration = 0.5;

        // Give it a distinct orange color
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.setHex(0xff6600);
        }
    }

    update(dt, playerX, playerY, bounds) {
        if (!this.active) return;
        super.update(dt, playerX, playerY, bounds);

        if (this.currentState === 'dead') return;

        // If exploding, count down
        if (this.exploding) {
            this.explodeTimer -= dt;

            // Flash effect while exploding
            if (this.mesh) {
                const flash = Math.sin(this.explodeTimer * 30) > 0;
                this.mesh.material.color.setHex(flash ? 0xffffff : 0xff3300);
            }

            if (this.explodeTimer <= 0) {
                this.die();
            }
            return;
        }

        if (this.currentState === 'hurt') return;

        // Chase player aggressively
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Start exploding when very close
        if (dist < 0.8) {
            this.startExplode();
            return;
        }

        if (dist > 0.1) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }

        // Clamp to bounds
        const clamped = Collision.clampToBounds(this.x, this.y, this.radius, bounds);
        this.x = clamped.x;
        this.y = clamped.y;

        // Update position
        if (this.mesh) {
            this.mesh.position.x = this.x;
            this.mesh.position.y = this.y;
        }
    }

    startExplode() {
        this.exploding = true;
        this.explodeTimer = this.explodeDuration;
        this.speed = 0; // Stop moving
    }

    takeDamage(amount) {
        const killed = super.takeDamage(amount);
        // Start exploding when killed
        if (killed && !this.exploding) {
            this.exploding = true;
            this.explodeTimer = 0.1; // Quick explode on death
        }
        return killed;
    }
}

/**
 * Splitter enemy - Splits into two smaller copies on death
 */
export class SplitterEnemy extends Enemy {
    constructor(scene, x, y, enemyManager, size = 'large') {
        const configs = {
            large: { health: 30, speed: 1.5, radius: 0.5, damage: 15 },
            small: { health: 12, speed: 2.5, radius: 0.3, damage: 8 }
        };

        const config = configs[size] || configs.large;
        super(scene, x, y, config);

        this.enemyManager = enemyManager;
        this.size = size;

        // Give it a distinct green color
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.setHex(size === 'large' ? 0x33cc33 : 0x66ff66);
        }
    }

    update(dt, playerX, playerY, bounds) {
        if (!this.active) return;
        super.update(dt, playerX, playerY, bounds);

        if (this.currentState === 'hurt' || this.currentState === 'dead') return;

        // Move toward player (slower than chaser)
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
            this.x += (dx / dist) * this.speed * dt;
            this.y += (dy / dist) * this.speed * dt;
        }

        // Clamp to bounds
        const clamped = Collision.clampToBounds(this.x, this.y, this.radius, bounds);
        this.x = clamped.x;
        this.y = clamped.y;

        // Update position
        if (this.mesh) {
            this.mesh.position.x = this.x;
            this.mesh.position.y = this.y;
        }
    }

    die() {
        super.die();

        // Only split if we're large
        if (this.size === 'large' && this.enemyManager) {
            // Spawn two smaller copies
            const offset = 0.5;
            this.enemyManager.spawnSplitter(this.x - offset, this.y, 'small');
            this.enemyManager.spawnSplitter(this.x + offset, this.y, 'small');
        }
    }
}

/**
 * Enemy spawner utility
 */
export class EnemyManager {
    constructor(scene, projectileManager) {
        this.scene = scene;
        this.projectileManager = projectileManager;
        this.enemies = [];
    }

    spawnChaser(x, y) {
        const enemy = new ChaserEnemy(this.scene, x, y);
        this.enemies.push(enemy);
        return enemy;
    }

    spawnWanderer(x, y, canShoot = true) {
        const enemy = new WandererEnemy(
            this.scene, x, y,
            canShoot ? this.projectileManager : null
        );
        this.enemies.push(enemy);
        return enemy;
    }

    spawnBoss(x, y, hp = 100) {
        const enemy = new BossEnemy(this.scene, x, y, hp);
        this.enemies.push(enemy);
        return enemy;
    }

    spawnShooter(x, y) {
        const enemy = new ShooterEnemy(this.scene, x, y, this.projectileManager);
        this.enemies.push(enemy);
        return enemy;
    }

    spawnBomber(x, y) {
        const enemy = new BomberEnemy(this.scene, x, y);
        this.enemies.push(enemy);
        return enemy;
    }

    spawnSplitter(x, y, size = 'large') {
        const enemy = new SplitterEnemy(this.scene, x, y, this, size);
        this.enemies.push(enemy);
        return enemy;
    }

    update(dt, playerX, playerY, bounds) {
        for (const enemy of this.enemies) {
            if (enemy.active) {
                enemy.update(dt, playerX, playerY, bounds);
            }
        }
    }

    getActive() {
        return this.enemies.filter(e => e.active);
    }

    clearAll() {
        for (const enemy of this.enemies) {
            if (enemy.active) enemy.die();
        }
        this.enemies = [];
    }

    allCleared() {
        return this.enemies.every(e => !e.active);
    }

    hasBoss() {
        return this.enemies.some(e => e.active && e.isBoss);
    }
}
