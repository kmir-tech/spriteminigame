import * as THREE from 'three';

/**
 * Object-pooled projectile system
 */
export class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
        this.active = [];
        this.poolSize = 150; // Increased size to support fast weapons/spreads

        // Shared geometry and default materials
        this.geometry = new THREE.CircleGeometry(0.15, 8);
        this.playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00e5ff }); // Cyan default
        this.enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });

        // Materials cache to prevent memory leaks
        this.materials = new Map();
        this.materials.set('player', this.playerMaterial);
        this.materials.set('enemy', this.enemyMaterial);

        this.initPool();
    }

    getMaterial(colorHex) {
        if (!this.materials.has(colorHex)) {
            this.materials.set(colorHex, new THREE.MeshBasicMaterial({ color: colorHex }));
        }
        return this.materials.get(colorHex);
    }

    initPool() {
        for (let i = 0; i < this.poolSize; i++) {
            const mesh = new THREE.Mesh(this.geometry, this.playerMaterial);
            mesh.visible = false;
            mesh.position.z = 0.05;
            this.scene.add(mesh);

            this.pool.push({
                mesh,
                x: 0, y: 0,
                vx: 0, vy: 0,
                dx: 0, dy: 0, // Direction vector components
                damage: 0,
                isPlayerBullet: true,
                active: false,
                pierceCount: 0,
                type: 'standard',
                lifetime: 999,
                timeActive: 0,
                hitEnemies: []
            });
        }
    }

    spawn(x, y, dirX, dirY, speed, damage, isPlayerBullet = true, bulletConfig = {}) {
        // Find inactive bullet
        const bullet = this.pool.find(b => !b.active);
        if (!bullet) return null;

        bullet.x = x;
        bullet.y = y;
        bullet.vx = dirX * speed;
        bullet.vy = dirY * speed;
        bullet.dx = dirX; // Storing direction components to resolve NaN knockback
        bullet.dy = dirY;
        bullet.damage = damage;
        bullet.isPlayerBullet = isPlayerBullet;
        bullet.active = true;
        bullet.pierceCount = bulletConfig.pierceCount || 0;
        bullet.type = bulletConfig.type || 'standard';
        bullet.lifetime = bulletConfig.lifetime || 999;
        bullet.timeActive = 0;
        bullet.hitEnemies = [];

        // Visual configurations
        if (isPlayerBullet) {
            const colorHex = bulletConfig.color || 0x00e5ff;
            bullet.mesh.material = this.getMaterial(colorHex);
            
            const size = bulletConfig.size || 0.15;
            bullet.mesh.scale.set(size / 0.15, size / 0.15, 1);
        } else {
            bullet.mesh.material = this.enemyMaterial;
            bullet.mesh.scale.set(1, 1, 1);
        }

        bullet.mesh.position.x = x;
        bullet.mesh.position.y = y;
        bullet.mesh.visible = true;

        this.active.push(bullet);
        return bullet;
    }

    update(dt, bounds, activeEnemies = null, bulletTimeActive = false) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const bullet = this.active[i];
            const bulletDt = (bulletTimeActive && !bullet.isPlayerBullet) ? (dt * 0.25) : dt;

            // Mage active bullets homing passive
            if (activeEnemies && bullet.isPlayerBullet && bullet.type !== 'slash') {
                let closestEnemy = null;
                let minDist = Infinity;

                for (const enemy of activeEnemies) {
                    if (!enemy.active) continue;
                    const dx = enemy.x - bullet.x;
                    const dy = enemy.y - bullet.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist) {
                        minDist = dist;
                        closestEnemy = enemy;
                    }
                }

                if (closestEnemy) {
                    const dx = closestEnemy.x - bullet.x;
                    const dy = closestEnemy.y - bullet.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0.05) {
                        const currentSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                        if (currentSpeed > 0) {
                            const targetVx = (dx / dist) * currentSpeed;
                            const targetVy = (dy / dist) * currentSpeed;

                            // Adjust velocity vectors
                            const steerStrength = 6.0 * bulletDt; 
                            bullet.vx += (targetVx - bullet.vx) * steerStrength;
                            bullet.vy += (targetVy - bullet.vy) * steerStrength;

                            // Maintain original speed
                            const newSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                            if (newSpeed > 0) {
                                bullet.vx = (bullet.vx / newSpeed) * currentSpeed;
                                bullet.vy = (bullet.vy / newSpeed) * currentSpeed;
                            }

                            // Keep direction vectors up to date
                            bullet.dx = bullet.vx / currentSpeed;
                            bullet.dy = bullet.vy / currentSpeed;
                        }
                    }
                }
            }

            // Move
            bullet.x += bullet.vx * bulletDt;
            bullet.y += bullet.vy * bulletDt;
            bullet.mesh.position.x = bullet.x;
            bullet.mesh.position.y = bullet.y;

            // Check lifetime (e.g. melee slashes decay fast)
            if (bullet.lifetime !== 999) {
                bullet.timeActive += bulletDt;
                if (bullet.timeActive >= bullet.lifetime) {
                    this.deactivate(bullet, i);
                    continue;
                }
            }

            // Check bounds
            if (bullet.x < bounds.left || bullet.x > bounds.right ||
                bullet.y < bounds.bottom || bullet.y > bounds.top) {
                this.deactivate(bullet, i);
            }
        }
    }

    deactivate(bullet, index = -1) {
        bullet.active = false;
        bullet.mesh.visible = false;

        if (index >= 0) {
            this.active.splice(index, 1);
        } else {
            const idx = this.active.indexOf(bullet);
            if (idx >= 0) this.active.splice(idx, 1);
        }
    }

    getActive() {
        return this.active;
    }

    clearAll() {
        for (const bullet of this.active) {
            bullet.active = false;
            bullet.mesh.visible = false;
        }
        this.active = [];
    }

    destroy() {
        for (const bullet of this.pool) {
            this.scene.remove(bullet.mesh);
        }
        this.geometry.dispose();
        
        // Dispose cached materials
        for (const mat of this.materials.values()) {
            mat.dispose();
        }
        this.materials.clear();
    }
}
