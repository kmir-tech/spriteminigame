import * as THREE from 'three';

/**
 * Object-pooled projectile system
 */
export class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.pool = [];
        this.active = [];
        this.poolSize = 100;

        // Shared geometry and material
        this.geometry = new THREE.CircleGeometry(0.15, 8);
        this.playerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });

        this.initPool();
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
                damage: 0,
                isPlayerBullet: true,
                active: false
            });
        }
    }

    spawn(x, y, dirX, dirY, speed, damage, isPlayerBullet = true) {
        // Find inactive bullet
        const bullet = this.pool.find(b => !b.active);
        if (!bullet) return null;

        bullet.x = x;
        bullet.y = y;
        bullet.vx = dirX * speed;
        bullet.vy = dirY * speed;
        bullet.damage = damage;
        bullet.isPlayerBullet = isPlayerBullet;
        bullet.active = true;

        bullet.mesh.material = isPlayerBullet ? this.playerMaterial : this.enemyMaterial;
        bullet.mesh.position.x = x;
        bullet.mesh.position.y = y;
        bullet.mesh.visible = true;

        this.active.push(bullet);
        return bullet;
    }

    update(dt, bounds) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const bullet = this.active[i];

            // Move
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            bullet.mesh.position.x = bullet.x;
            bullet.mesh.position.y = bullet.y;

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
        this.playerMaterial.dispose();
        this.enemyMaterial.dispose();
    }
}
