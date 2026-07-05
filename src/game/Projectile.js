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

        // Shared PlaneGeometry for 2D sprites
        this.geometry = new THREE.PlaneGeometry(0.42, 0.42);

        // Preload and cache all projectile animation sequences
        this.projectileSequences = {
            'fireArrow': this.loadSequence('/Projectiles/FireArrow', 'Fire Arrow_Frame_', '.png', 8),
            'fireBall': this.loadSequence('/Projectiles/FireBall', 'Fire Ball_Frame_', '.png', 8),
            'fireSpell': this.loadSequence('/Projectiles/FireSpell', 'Fire Spell_Frame_', '.png', 8),
            'waterArrow': this.loadSequence('/Projectiles/WaterArrow', 'Water Arrow_Frame_', '.png', 8),
            'waterBall': this.loadSequence('/Projectiles/WaterBall', 'Water Ball_Frame_', '.png', 12),
            'waterSpell': this.loadSequence('/Projectiles/WaterSpell', 'Water Spell_Frame_', '.png', 8),
        };

        this.initPool();
    }

    loadSequence(folderPath, prefix, suffix, frameCount) {
        const loader = new THREE.TextureLoader();
        const textures = [];
        for (let i = 1; i <= frameCount; i++) {
            const frameIndex = String(i).padStart(2, '0');
            const path = `${folderPath}/${prefix}${frameIndex}${suffix}`;
            const texture = loader.load(path);
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;
            textures.push(texture);
        }
        return textures;
    }

    initPool() {
        for (let i = 0; i < this.poolSize; i++) {
            // Create a unique material per mesh so they can have independent maps/frames
            const material = new THREE.MeshBasicMaterial({
                transparent: true,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(this.geometry, material);
            mesh.visible = false;
            mesh.position.z = 0.05;
            this.scene.add(mesh);

            this.pool.push({
                mesh,
                material,
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
                hitEnemies: [],
                element: 'fireBall',
                frameCount: 8,
                frameTime: 0,
                currentFrame: 0
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

        // Visual and animation configuration
        bullet.element = bulletConfig.element || (isPlayerBullet ? 'fireBall' : 'fireSpell');
        bullet.frameCount = bullet.element === 'waterBall' ? 12 : 8;
        bullet.frameTime = 0;
        bullet.currentFrame = 0;

        // Apply initial texture frame
        const seq = this.projectileSequences[bullet.element];
        if (seq && seq[0]) {
            bullet.material.map = seq[0];
        }
        bullet.material.needsUpdate = true;

        // Visual size scaling
        const size = bulletConfig.size || 0.42;
        bullet.mesh.scale.set(size / 0.42, size / 0.42, 1);

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

            // Animate projectile frame sequence
            bullet.frameTime += bulletDt;
            const frameDuration = 1 / 14; // 14 frames per second
            while (bullet.frameTime >= frameDuration) {
                bullet.frameTime -= frameDuration;
                bullet.currentFrame = (bullet.currentFrame + 1) % bullet.frameCount;
            }

            const seq = this.projectileSequences[bullet.element];
            if (seq && seq[bullet.currentFrame]) {
                bullet.material.map = seq[bullet.currentFrame];
                bullet.material.needsUpdate = true;
            }

            // Face direction of travel
            const angle = Math.atan2(bullet.vy, bullet.vx);
            bullet.mesh.rotation.z = angle;

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
            bullet.material.dispose();
        }
        this.geometry.dispose();
        
        // Dispose cached textures
        for (const seq of Object.values(this.projectileSequences)) {
            for (const tex of seq) {
                if (tex) tex.dispose();
            }
        }
    }
}
