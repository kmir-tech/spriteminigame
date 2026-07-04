import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import gsap from 'gsap';
import { characters } from './characterData.js';
import { audioManager } from '../game/AudioManager.js';

/**
 * Character Manager - Character positioned on right side
 * Supports animated GLB models with animation switching
 */
export class CharacterManager {
    constructor(scene) {
        this.scene = scene;
        this.currentIndex = 0;
        this.currentModel = null;
        this.currentWeapon = null;
        this.isTransitioning = false;
        this.loader = new GLTFLoader();
        this.modelCache = new Map();

        // Animation support
        this.mixer = null;
        this.currentAction = null;
        this.clock = new THREE.Clock();
        this.currentAnimationIndex = 0;

        // Character container - positioned on right
        this.container = new THREE.Group();
        this.container.position.set(1.5, 0, 0);
        this.scene.add(this.container);

        // Callback for animation button updates
        this.onAnimationChange = null;
    }

    async init() {
        await this.preloadAllModels();
        this.loadCharacter(0);
    }

    async preloadAllModels() {
        const loadPromises = characters.map(char => this.loadModel(char.model, char.id));
        await Promise.all(loadPromises);
        console.log('All models loaded');
    }

    loadModel(path, id) {
        return new Promise((resolve) => {
            this.loader.load(
                path,
                (gltf) => {
                    this.modelCache.set(id, gltf);
                    console.log(`Loaded: ${id}`);
                    resolve();
                },
                null,
                (error) => {
                    console.warn(`Failed to load ${path}`);
                    resolve();
                }
            );
        });
    }

    getCurrentCharacter() {
        return characters[this.currentIndex];
    }

    loadCharacter(index) {
        const character = characters[index];
        const cachedGltf = this.modelCache.get(character.id);

        // Stop any existing animation
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }

        if (cachedGltf) {
            // For animated models with skeletons, we need to use SkeletonUtils.clone
            // For static models, regular clone works
            let model;
            const hasAnimations = cachedGltf.animations && cachedGltf.animations.length > 0;

            if (hasAnimations) {
                // Clone with skeleton using SkeletonUtils
                model = SkeletonUtils.clone(cachedGltf.scene);
            } else {
                model = cachedGltf.scene.clone();
            }

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Enable transparency for glitch opacity animation
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.transparent = true;
                            mat.opacity = 1.0;
                        });
                    } else if (child.material) {
                        child.material.transparent = true;
                        child.material.opacity = 1.0;
                    }
                }
            });

            // Auto-scale and center
            // For accurate bounding box, compute from original scene (not cloned skeleton)
            const box = new THREE.Box3().setFromObject(cachedGltf.scene);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            console.log(`Model ${character.id} - Size:`, size, 'Center:', center);

            const targetHeight = 2.6;
            const scale = targetHeight / size.y;

            // Sanity check - prevent extreme scales
            const clampedScale = Math.min(Math.max(scale, 0.1), 10);
            model.scale.setScalar(clampedScale);

            console.log(`Scale: ${scale}, Clamped: ${clampedScale}`);

            // Center the model on the container's origin (0,0,0 in local space)
            // The container itself is positioned at (1.5, 0, 0) in world space
            model.position.x = -center.x * clampedScale;
            model.position.y = -box.min.y * clampedScale;
            model.position.z = -center.z * clampedScale;

            this.container.add(model);
            this.currentModel = model;

            // Setup animation if available
            if (hasAnimations) {
                this.mixer = new THREE.AnimationMixer(model);
                const action = this.mixer.clipAction(cachedGltf.animations[0]);
                action.play();
                this.currentAction = action;
                console.log('Playing animation:', cachedGltf.animations[0].name);
            }

            // Reset animation index
            this.currentAnimationIndex = 0;

            // 1. Hologram Glitch Loading Sequence using GSAP keyframes
            // Flicker scale
            gsap.fromTo(model.scale, 
                { x: clampedScale * 0.1, y: clampedScale * 1.5, z: clampedScale * 0.1 },
                {
                    keyframes: [
                        { x: clampedScale * 1.2, y: clampedScale * 0.8, z: clampedScale * 1.2, duration: 0.08 },
                        { x: clampedScale * 0.85, y: clampedScale * 1.15, z: clampedScale * 0.85, duration: 0.06 },
                        { x: clampedScale * 1.05, y: clampedScale * 0.95, z: clampedScale * 1.05, duration: 0.06 },
                        { x: clampedScale, y: clampedScale, z: clampedScale, duration: 0.12 }
                    ],
                    ease: 'power1.inOut'
                }
            );

            // Flicker opacity of materials
            model.traverse((child) => {
                if (child.isMesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => {
                        gsap.fromTo(mat,
                            { opacity: 0 },
                            {
                                keyframes: [
                                    { opacity: 0.2, duration: 0.05 },
                                    { opacity: 0.8, duration: 0.04 },
                                    { opacity: 0.3, duration: 0.05 },
                                    { opacity: 1.0, duration: 0.08 },
                                    { opacity: 0.5, duration: 0.04 },
                                    { opacity: 1.0, duration: 0.1 }
                                ],
                                ease: 'steps(1)'
                            }
                        );
                    });
                }
            });

            gsap.from(model.rotation, {
                y: -0.3,
                duration: 0.4,
                ease: 'power2.out'
            });

            // 2. Build and add weapon showcase
            if (this.currentWeapon) {
                this.disposeModel(this.currentWeapon);
                this.container.remove(this.currentWeapon);
            }
            const weapon = this.createWeaponMesh(character.id);
            this.container.add(weapon);
            this.currentWeapon = weapon;

            // Weapon entry animation
            weapon.scale.set(0.01, 0.01, 0.01);
            gsap.to(weapon.scale, {
                x: 1.0,
                y: 1.0,
                z: 1.0,
                duration: 0.5,
                delay: 0.1,
                ease: 'back.out(1.7)'
            });

            // Trigger premium particle switch burst
            this.spawnSwitchBurst(character.color);

        } else {
            // Fallback placeholder
            const geometry = new THREE.CapsuleGeometry(0.4, 1.4, 8, 16);
            const material = new THREE.MeshStandardMaterial({
                color: character.color,
                roughness: 0.4,
                metalness: 0.3
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = 1.2;
            mesh.castShadow = true;
            this.container.add(mesh);
            this.currentModel = mesh;
        }
    }

    /**
     * Dynamically assemble 3D weapon meshes using Three.js shapes
     */
    createWeaponMesh(characterId) {
        const group = new THREE.Group();

        if (characterId === 'warrior') {
            // Sword
            const bladeGeom = new THREE.BoxGeometry(0.1, 1.4, 0.03);
            const bladeMat = new THREE.MeshStandardMaterial({
                color: 0xff6b35,
                emissive: 0xff6b35,
                emissiveIntensity: 2.5,
                roughness: 0.2,
                metalness: 0.8
            });
            const blade = new THREE.Mesh(bladeGeom, bladeMat);
            blade.position.y = 0.7;
            blade.castShadow = true;
            group.add(blade);

            const guardGeom = new THREE.BoxGeometry(0.35, 0.06, 0.06);
            const guardMat = new THREE.MeshStandardMaterial({
                color: 0x222222,
                roughness: 0.4,
                metalness: 0.8
            });
            const guard = new THREE.Mesh(guardGeom, guardMat);
            guard.position.y = 0.0;
            guard.castShadow = true;
            group.add(guard);

            const handleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8);
            const handleMat = new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.6,
                metalness: 0.5
            });
            const handle = new THREE.Mesh(handleGeom, handleMat);
            handle.position.y = -0.2;
            handle.castShadow = true;
            group.add(handle);

            const pommelGeom = new THREE.SphereGeometry(0.05, 8, 8);
            const pommel = new THREE.Mesh(pommelGeom, guardMat);
            pommel.position.y = -0.38;
            group.add(pommel);

            // Adjust center pivot
            group.position.y = 0.2;

        } else if (characterId === 'mage') {
            // Staff
            const shaftGeom = new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8);
            const shaftMat = new THREE.MeshStandardMaterial({
                color: 0x221144,
                roughness: 0.3,
                metalness: 0.8
            });
            const shaft = new THREE.Mesh(shaftGeom, shaftMat);
            shaft.position.y = 0;
            shaft.castShadow = true;
            group.add(shaft);

            // Crest ring
            const ringGeom = new THREE.TorusGeometry(0.18, 0.025, 8, 24);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0xffd700,
                roughness: 0.2,
                metalness: 0.9
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.position.y = 0.95;
            ring.rotation.x = Math.PI / 2;
            ring.castShadow = true;
            group.add(ring);

            // Floating crystal
            const crystalGeom = new THREE.OctahedronGeometry(0.09, 0);
            const crystalMat = new THREE.MeshStandardMaterial({
                color: 0x7c4dff,
                emissive: 0x7c4dff,
                emissiveIntensity: 3.0,
                roughness: 0.1,
                metalness: 0.1
            });
            const crystal = new THREE.Mesh(crystalGeom, crystalMat);
            crystal.position.y = 0.95;
            group.add(crystal);
            group.userData.crystal = crystal; // For local bobbing

        } else if (characterId === 'assassin') {
            // Double Daggers
            const createDagger = (offsetX, offsetY, rotZ) => {
                const dagger = new THREE.Group();
                
                const bladeGeom = new THREE.ConeGeometry(0.06, 0.6, 4);
                bladeGeom.rotateX(Math.PI);
                const bladeMat = new THREE.MeshStandardMaterial({
                    color: 0x00e676,
                    emissive: 0x00e676,
                    emissiveIntensity: 2.0,
                    roughness: 0.2,
                    metalness: 0.8
                });
                const blade = new THREE.Mesh(bladeGeom, bladeMat);
                blade.position.y = 0.3;
                blade.scale.set(1, 1, 0.3); // Flat blade
                blade.castShadow = true;
                dagger.add(blade);

                const guardGeom = new THREE.BoxGeometry(0.16, 0.03, 0.03);
                const guardMat = new THREE.MeshStandardMaterial({
                    color: 0x111111,
                    roughness: 0.2,
                    metalness: 0.9
                });
                const guard = new THREE.Mesh(guardGeom, guardMat);
                guard.position.y = 0.0;
                guard.castShadow = true;
                dagger.add(guard);

                const handleGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8);
                const handleMat = new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    roughness: 0.5,
                    metalness: 0.5
                });
                const handle = new THREE.Mesh(handleGeom, handleMat);
                handle.position.y = -0.09;
                handle.castShadow = true;
                dagger.add(handle);

                dagger.position.set(offsetX, offsetY, 0);
                dagger.rotation.z = rotZ;
                return dagger;
            };

            const dagger1 = createDagger(-0.15, 0.1, -Math.PI / 6);
            const dagger2 = createDagger(0.15, -0.1, Math.PI / 6);
            group.add(dagger1);
            group.add(dagger2);

        } else if (characterId === 'tank') {
            // Hexagonal Barrier
            const barrierGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.03, 6);
            barrierGeom.rotateX(Math.PI / 2);
            const barrierMat = new THREE.MeshStandardMaterial({
                color: 0x29b6f6,
                emissive: 0x29b6f6,
                emissiveIntensity: 1.8,
                transparent: true,
                opacity: 0.6,
                roughness: 0.1,
                metalness: 0.9
            });
            const barrier = new THREE.Mesh(barrierGeom, barrierMat);
            group.add(barrier);

            // Wireframe border
            const borderGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 6);
            borderGeom.rotateX(Math.PI / 2);
            const borderMat = new THREE.MeshBasicMaterial({
                color: 0x81d4fa,
                wireframe: true,
                transparent: true,
                opacity: 0.9
            });
            const border = new THREE.Mesh(borderGeom, borderMat);
            group.add(border);
        }

        return group;
    }

    /**
     * Switch to a different animation for the current character
     * @param {number} animIndex - Index of the animation to switch to
     */
    async switchAnimation(animIndex) {
        const character = this.getCurrentCharacter();
        if (!character.hasAnimations || !character.animations) return;

        const animations = character.animations;
        if (animIndex < 0 || animIndex >= animations.length) return;
        if (animIndex === this.currentAnimationIndex) return;

        this.currentAnimationIndex = animIndex;
        const animPath = animations[animIndex].path;

        // Load the new animation GLB
        return new Promise((resolve) => {
            this.loader.load(
                animPath,
                (gltf) => {
                    // Remove old model
                    if (this.currentModel) {
                        this.disposeModel(this.currentModel);
                        this.container.remove(this.currentModel);
                    }

                    // Stop old mixer
                    if (this.mixer) {
                        this.mixer.stopAllAction();
                        this.mixer = null;
                    }

                    // Use SkeletonUtils.clone for animated models
                    const model = SkeletonUtils.clone(gltf.scene);

                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            // Enable transparency for glitch opacity animation
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.transparent = true;
                                    mat.opacity = 1.0;
                                });
                            } else if (child.material) {
                                child.material.transparent = true;
                                child.material.opacity = 1.0;
                            }
                        }
                    });

                    // Auto-scale and center (use original scene for accurate bbox)
                    const box = new THREE.Box3().setFromObject(gltf.scene);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());

                    console.log('Switch animation - Size:', size);

                    const targetHeight = 2.6;
                    const scale = targetHeight / size.y;
                    const clampedScale = Math.min(Math.max(scale, 0.1), 10);
                    model.scale.setScalar(clampedScale);

                    model.position.x = -center.x * clampedScale;
                    model.position.y = -box.min.y * clampedScale;
                    model.position.z = -center.z * clampedScale;

                    this.container.add(model);
                    this.currentModel = model;

                    // Play animation
                    if (gltf.animations && gltf.animations.length > 0) {
                        this.mixer = new THREE.AnimationMixer(model);
                        const action = this.mixer.clipAction(gltf.animations[0]);
                        action.play();
                        this.currentAction = action;
                    }

                    // Glitch sequence for animation switch
                    gsap.fromTo(model.scale, 
                        { x: clampedScale * 0.1, y: clampedScale * 1.5, z: clampedScale * 0.1 },
                        {
                            keyframes: [
                                { x: clampedScale * 1.2, y: clampedScale * 0.8, z: clampedScale * 1.2, duration: 0.08 },
                                { x: clampedScale * 0.85, y: clampedScale * 1.15, z: clampedScale * 0.85, duration: 0.06 },
                                { x: clampedScale, y: clampedScale, z: clampedScale, duration: 0.1 }
                            ],
                            ease: 'power1.inOut'
                        }
                    );

                    // Notify callback
                    if (this.onAnimationChange) {
                        this.onAnimationChange(animIndex, animations[animIndex].name);
                    }

                    resolve();
                },
                null,
                (error) => {
                    console.warn(`Failed to load animation: ${animPath}`);
                    resolve();
                }
            );
        });
    }

    /**
     * Get available animations for current character
     */
    getAvailableAnimations() {
        const character = this.getCurrentCharacter();
        if (character.hasAnimations && character.animations) {
            return character.animations.map((anim, index) => ({
                index,
                name: anim.name,
                isActive: index === this.currentAnimationIndex
            }));
        }
        return [];
    }

    disposeModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.geometry?.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }

    switchTo(index, direction = 'left', onComplete) {
        if (this.isTransitioning || index === this.currentIndex) return;

        this.isTransitioning = true;
        const oldModel = this.currentModel;
        const oldWeapon = this.currentWeapon;

        // Play sound effects when switching characters
        const nextChar = characters[index];
        const soundName = `select${nextChar.name}`;
        audioManager.play(soundName);

        // Stop old animation
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }

        // Rotate out
        gsap.to(oldModel.rotation, {
            y: direction === 'left' ? 0.5 : -0.5,
            duration: 0.2,
            ease: 'power2.in'
        });

        // Scale down weapon
        if (oldWeapon) {
            gsap.to(oldWeapon.scale, {
                x: 0.01,
                y: 0.01,
                z: 0.01,
                duration: 0.2,
                ease: 'power2.in'
            });
        }

        gsap.to(oldModel.scale, {
            x: 0.8,
            y: 0.8,
            z: 0.8,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => {
                if (oldModel) {
                    this.disposeModel(oldModel);
                    this.container.remove(oldModel);
                }
                if (oldWeapon) {
                    this.disposeModel(oldWeapon);
                    this.container.remove(oldWeapon);
                }

                this.currentIndex = index;
                this.loadCharacter(index);

                this.isTransitioning = false;
                if (onComplete) onComplete();
            }
        });
    }

    next(onComplete) {
        if (this.isTransitioning) return;
        const nextIndex = (this.currentIndex + 1) % characters.length;
        this.switchTo(nextIndex, 'left', onComplete);
    }

    prev(onComplete) {
        if (this.isTransitioning) return;
        const prevIndex = (this.currentIndex - 1 + characters.length) % characters.length;
        this.switchTo(prevIndex, 'right', onComplete);
    }

    update(time) {
        // Update animation mixer
        if (this.mixer) {
            const delta = this.clock.getDelta();
            this.mixer.update(delta);
        }

        // Idle sway for non-animated models
        if (this.currentModel && !this.isTransitioning && !this.mixer) {
            this.currentModel.rotation.y = Math.sin(time * 0.0003) * 0.05;
        }

        // Glow ring animation
        if (this.scene.userData.glowRing) {
            this.scene.userData.glowRing.material.opacity = 0.25 + Math.sin(time * 0.002) * 0.1;
        }

        // Weapon slow orbit around pedestal (origin of local container coordinates)
        if (this.currentWeapon && !this.isTransitioning) {
            const orbitSpeed = 0.0008; // Radians per ms
            const radius = 1.35; // Pedestal radius
            const angle = time * orbitSpeed;

            // Orbit positioning in container local coordinates
            this.currentWeapon.position.x = Math.cos(angle) * radius;
            this.currentWeapon.position.z = Math.sin(angle) * radius;

            // Facing and bobbing mechanics
            this.currentWeapon.rotation.y = -angle + Math.PI / 2; // Face the pedestal
            this.currentWeapon.rotation.x = Math.sin(time * 0.0025) * 0.12; // Slow showcase tilt
            this.currentWeapon.position.y = 1.1 + Math.sin(time * 0.0018) * 0.08; // Dynamic bobbing

            // Internal ornament animations (e.g. Mage floating crystal)
            if (this.currentWeapon.userData.crystal) {
                this.currentWeapon.userData.crystal.position.y = 0.95 + Math.sin(time * 0.0035) * 0.035;
                this.currentWeapon.userData.crystal.rotation.y = time * 0.0012;
            }
        }
    }

    spawnSwitchBurst(color) {
        const particleCount = 60;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        // Center is container position + slightly offset
        const originX = this.container.position.x;
        const originY = 1.0;
        const originZ = this.container.position.z;

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = originX;
            positions[i * 3 + 1] = originY;
            positions[i * 3 + 2] = originZ;

            // Random sphere velocity direction
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI;
            const speed = 2.0 + Math.random() * 3.5;

            velocities.push({
                x: Math.cos(angle) * Math.cos(elevation) * speed,
                y: Math.sin(elevation) * speed + 2.0, // bias upward
                z: Math.sin(angle) * Math.cos(elevation) * speed
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.12,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const burstPoints = new THREE.Points(geometry, material);
        this.scene.add(burstPoints);

        let elapsed = 0;
        const duration = 0.6;

        const animateBurst = () => {
            elapsed += 0.016;
            const pct = elapsed / duration;
            if (pct >= 1.0) {
                this.scene.remove(burstPoints);
                geometry.dispose();
                material.dispose();
            } else {
                const posArr = geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    posArr[i * 3] += velocities[i].x * 0.016;
                    posArr[i * 3 + 1] += velocities[i].y * 0.016;
                    posArr[i * 3 + 2] += velocities[i].z * 0.016;
                    
                    // gravity decay
                    velocities[i].y -= 9.8 * 0.016;
                }
                geometry.attributes.position.needsUpdate = true;
                material.opacity = 0.9 * (1 - pct);
                requestAnimationFrame(animateBurst);
            }
        };
        requestAnimationFrame(animateBurst);
    }
}
