import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import gsap from 'gsap';
import { characters } from './characterData.js';

/**
 * Character Manager - Character positioned on right side
 * Supports animated GLB models with animation switching
 */
export class CharacterManager {
    constructor(scene) {
        this.scene = scene;
        this.currentIndex = 0;
        this.currentModel = null;
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

            // Entry animation
            gsap.from(model.scale, {
                x: 0.85,
                y: 0.85,
                z: 0.85,
                duration: 0.35,
                ease: 'back.out(1.5)'
            });

            gsap.from(model.rotation, {
                y: -0.3,
                duration: 0.4,
                ease: 'power2.out'
            });
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
    }
}
