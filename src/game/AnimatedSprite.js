import * as THREE from 'three';

/**
 * Animated sprite using sprite sheets
 * Supports horizontal sprite strips with multiple frames
 */
export class AnimatedSprite {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.animations = {};
        this.currentAnim = null;
        this.currentFrame = 0;
        this.frameTime = 0;
        this.frameRate = config.frameRate || 10; // default frames per second
        this.loop = config.loop !== false;
        this.size = config.size || 1.0;
        this.facingRight = true;

        // Visual interpolation for smooth rendering (Isaac-style)
        this.renderX = 0;
        this.renderY = 0;
        this.targetX = 0;
        this.targetY = 0;

        // Create plane geometry
        this.geometry = new THREE.PlaneGeometry(this.size, this.size);

        // Create material (will be updated with texture)
        this.material = new THREE.MeshBasicMaterial({
            transparent: true,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.z = 0.1;
        scene.add(this.mesh);
    }

    /**
     * Add an animation from a sprite sheet
     * @param {string} name - Animation name (e.g., 'idle', 'walk')
     * @param {string} path - Path to sprite sheet PNG
     * @param {number} frameCount - Number of frames in the sprite sheet
     * @param {number} frameRate - Frames per second for this animation (default: 10)
     */
    addAnimation(name, path, frameCount, frameRate = 10) {
        const loader = new THREE.TextureLoader();
        const texture = loader.load(path, (tex) => {
            // Set texture wrapping for sprite sheet
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.repeat.set(1 / frameCount, 1);
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
        });

        this.animations[name] = {
            texture,
            frameCount,
            frameRate,
            path
        };

        // Set first animation as default
        if (!this.currentAnim) {
            this.play(name);
        }
    }

    /**
     * Play an animation
     * @param {string} name - Animation name to play
     * @param {boolean} restart - Restart from frame 0 even if already playing
     */
    play(name, restart = false) {
        if (this.currentAnim === name && !restart) return;

        const anim = this.animations[name];
        if (!anim) return;

        this.currentAnim = name;
        this.currentFrame = 0;
        this.frameTime = 0;

        // Set texture
        this.material.map = anim.texture;
        this.material.needsUpdate = true;

        this.updateTextureOffset();
    }

    /**
     * Update animation frame based on delta time
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.currentAnim) return;

        const anim = this.animations[this.currentAnim];
        if (!anim) return;

        // Smooth visual interpolation (Isaac-style)
        // This makes sprite movement feel buttery smooth
        this.renderX += (this.targetX - this.renderX) * 0.25;
        this.renderY += (this.targetY - this.renderY) * 0.25;
        this.mesh.position.x = this.renderX;
        this.mesh.position.y = this.renderY;

        // Use per-animation frame rate, fallback to default
        const frameRate = anim.frameRate || this.frameRate;
        const frameDuration = 1 / frameRate;

        this.frameTime += dt;

        // Accumulated frame stepping - prevents stutter on dt spikes
        while (this.frameTime >= frameDuration) {
            this.frameTime -= frameDuration;
            this.currentFrame++;

            if (this.currentFrame >= anim.frameCount) {
                this.currentFrame = this.loop ? 0 : anim.frameCount - 1;
            }
        }

        this.updateTextureOffset();
    }

    updateTextureOffset() {
        const anim = this.animations[this.currentAnim];
        if (!anim || !anim.texture) return;

        // Move texture offset to show current frame
        anim.texture.offset.x = this.currentFrame / anim.frameCount;
    }

    /**
     * Set facing direction (flips sprite horizontally)
     */
    setFacing(right) {
        this.facingRight = right;
        this.mesh.scale.x = right ? 1 : -1;
    }

    /**
     * Set target position (will interpolate smoothly)
     */
    setPosition(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Set position immediately without interpolation
     */
    setPositionImmediate(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.renderX = x;
        this.renderY = y;
        this.mesh.position.x = x;
        this.mesh.position.y = y;
    }

    /**
     * Set opacity for damage flash etc.
     */
    setOpacity(opacity) {
        this.material.opacity = opacity;
    }

    destroy() {
        this.scene.remove(this.mesh);

        // Dispose textures
        for (const anim of Object.values(this.animations)) {
            if (anim.texture) {
                anim.texture.dispose();
            }
        }

        this.geometry.dispose();
        this.material.dispose();
    }
}
