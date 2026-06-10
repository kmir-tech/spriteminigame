import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Cyberpunk Environment - Rain, particles, city backdrop
 */
export class CyberpunkEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.rainParticles = null;
        this.dustParticles = null;

        this.init();
    }

    init() {
        this.createBackground();
        this.createRain();
        this.createDustParticles();
        this.createCityBackdrop();
        this.createGroundReflection();
    }

    createBackground() {
        // Gradient background using a large sphere
        const geometry = new THREE.SphereGeometry(50, 32, 32);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0a0a1a) },
                bottomColor: { value: new THREE.Color(0x1a0a2e) },
                offset: { value: 10 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(geometry, material);
        this.scene.add(sky);
    }

    createRain() {
        const rainCount = 3000;
        const positions = new Float32Array(rainCount * 3);
        const velocities = new Float32Array(rainCount);

        for (let i = 0; i < rainCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = Math.random() * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
            velocities[i] = 0.1 + Math.random() * 0.2;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x8888ff,
            size: 0.05,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });

        this.rainParticles = new THREE.Points(geometry, material);
        this.rainParticles.velocities = velocities;
        this.scene.add(this.rainParticles);
    }

    createDustParticles() {
        const dustCount = 500;
        const positions = new Float32Array(dustCount * 3);
        const colors = new Float32Array(dustCount * 3);

        for (let i = 0; i < dustCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = Math.random() * 8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

            // Cyan or magenta tint
            if (Math.random() > 0.5) {
                colors[i * 3] = 0;
                colors[i * 3 + 1] = 0.9;
                colors[i * 3 + 2] = 1;
            } else {
                colors[i * 3] = 1;
                colors[i * 3 + 1] = 0;
                colors[i * 3 + 2] = 0.8;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.08,
            transparent: true,
            opacity: 0.6,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });

        this.dustParticles = new THREE.Points(geometry, material);
        this.scene.add(this.dustParticles);
    }

    createCityBackdrop() {
        // Simple city silhouette with neon lights
        const buildingCount = 20;
        const cityGroup = new THREE.Group();
        cityGroup.position.z = -15;
        cityGroup.position.y = 0;

        for (let i = 0; i < buildingCount; i++) {
            const width = 0.5 + Math.random() * 1.5;
            const height = 2 + Math.random() * 6;
            const depth = 0.5 + Math.random() * 1;

            const geometry = new THREE.BoxGeometry(width, height, depth);
            const material = new THREE.MeshStandardMaterial({
                color: 0x0a0a15,
                roughness: 0.9,
                metalness: 0.1
            });

            const building = new THREE.Mesh(geometry, material);
            building.position.x = (i - buildingCount / 2) * 2 + Math.random();
            building.position.y = height / 2 - 1;

            // Add random neon windows
            this.addNeonWindows(building, width, height);

            cityGroup.add(building);
        }

        this.scene.add(cityGroup);
    }

    addNeonWindows(building, width, height) {
        const windowCount = Math.floor(Math.random() * 5) + 2;

        for (let i = 0; i < windowCount; i++) {
            const windowGeom = new THREE.PlaneGeometry(0.1, 0.15);
            const windowColor = Math.random() > 0.5 ? 0x00ffff : 0xff00ff;
            const windowMat = new THREE.MeshBasicMaterial({
                color: windowColor,
                transparent: true,
                opacity: 0.8
            });

            const windowMesh = new THREE.Mesh(windowGeom, windowMat);
            windowMesh.position.x = (Math.random() - 0.5) * width * 0.8;
            windowMesh.position.y = (Math.random() - 0.3) * height * 0.8;
            windowMesh.position.z = width / 2 + 0.01;

            building.add(windowMesh);
        }
    }

    createGroundReflection() {
        // Wet ground with reflection
        const geometry = new THREE.PlaneGeometry(40, 40);
        const material = new THREE.MeshStandardMaterial({
            color: 0x0a0a15,
            roughness: 0.2,
            metalness: 0.8,
            envMapIntensity: 0.5
        });

        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.52;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    update(time) {
        // Animate rain
        if (this.rainParticles) {
            const positions = this.rainParticles.geometry.attributes.position.array;
            const velocities = this.rainParticles.velocities;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] -= velocities[i];

                if (positions[i * 3 + 1] < -2) {
                    positions[i * 3 + 1] = 20;
                }
            }
            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Animate dust floating
        if (this.dustParticles) {
            this.dustParticles.rotation.y = time * 0.00005;
            const positions = this.dustParticles.geometry.attributes.position.array;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] += Math.sin(time * 0.001 + i) * 0.002;
            }
            this.dustParticles.geometry.attributes.position.needsUpdate = true;
        }
    }
}
