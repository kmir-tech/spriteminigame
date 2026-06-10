import * as THREE from 'three';
import { Collision } from './Collision.js';

/**
 * Player entity with movement and shooting - uses sprite texture
 */
export class Player {
    constructor(scene, characterData) {
        this.scene = scene;
        this.characterData = characterData;

        // Stats from character
        this.maxHealth = characterData?.stats?.hp || 100;
        this.health = this.maxHealth;
        this.speed = 5 + (characterData?.stats?.speed || 50) / 25; // 5-9 range
        this.damage = 10 + (characterData?.stats?.atk || 50) / 5;  // 10-30 range

        // Position and physics
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 0.4;

        // Shooting
        this.fireRate = 0.25; // seconds between shots
        this.fireCooldown = 0;
        this.bulletSpeed = 12;

        // Invincibility
        this.invincible = false;
        this.invincibleTime = 0;
        this.invincibleDuration = 1.0;

        // Power-up stats
        this.damageReduction = 0; // Armor power-up
        this.pierceCount = 0;     // Piercing bullets power-up

        // Facing direction for sprite flip
        this.facingRight = true;

        this.createMesh();
    }

    createMesh() {
        // Get sprite path from character data or use default
        const spritePath = this.characterData?.icon || '/soilder.png';
        const spriteSize = 1.0; // Size of the sprite in world units

        // Create plane geometry for sprite
        const geometry = new THREE.PlaneGeometry(spriteSize, spriteSize);

        // Load texture
        const loader = new THREE.TextureLoader();
        const texture = loader.load(spritePath);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

        // Create material with transparency
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.z = 0.1;
        this.scene.add(this.mesh);

        // Direction indicator (small white dot showing aim direction)
        const indicatorGeo = new THREE.CircleGeometry(0.08, 8);
        const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        this.indicator.position.set(0.4, 0, 0.15);
        this.mesh.add(this.indicator);
    }

    update(dt, input, bounds) {
        // Movement input
        this.vx = 0;
        this.vy = 0;

        if (input.moveLeft) this.vx -= 1;
        if (input.moveRight) this.vx += 1;
        if (input.moveUp) this.vy += 1;
        if (input.moveDown) this.vy -= 1;

        // Normalize diagonal movement
        const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (len > 0) {
            this.vx = (this.vx / len) * this.speed;
            this.vy = (this.vy / len) * this.speed;

            // Flip sprite based on movement direction
            if (this.vx > 0) this.facingRight = true;
            if (this.vx < 0) this.facingRight = false;
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

        // Update direction indicator
        const shootDir = input.getShootDirection(null);
        if (shootDir) {
            this.indicator.position.x = shootDir.x * 0.5;
            this.indicator.position.y = shootDir.y * 0.5;
        } else if (len > 0) {
            this.indicator.position.x = (this.vx / this.speed) * 0.5;
            this.indicator.position.y = (this.vy / this.speed) * 0.5;
        }

        // Fire cooldown
        if (this.fireCooldown > 0) {
            this.fireCooldown -= dt;
        }

        // Invincibility
        if (this.invincible) {
            this.invincibleTime -= dt;
            this.mesh.material.opacity = Math.sin(this.invincibleTime * 20) * 0.3 + 0.7;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
                this.mesh.material.opacity = 1;
            }
        }
    }

    canShoot() {
        return this.fireCooldown <= 0;
    }

    shoot() {
        this.fireCooldown = this.fireRate;
    }

    takeDamage(amount) {
        if (this.invincible) return false;

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
        this.scene.remove(this.mesh);
    }
}
