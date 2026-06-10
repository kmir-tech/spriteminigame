import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Scene with atmospheric depth - clean studio, character right side
 */
export function createScene(container) {
    const scene = new THREE.Scene();
    // Slightly cool background color
    scene.background = new THREE.Color(0xd8dce6);

    // STEP 2: Add atmospheric fog for depth
    scene.fog = new THREE.FogExp2(0xd8dce6, 0.035);

    // Camera positioned to put character on right
    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(2, 1.6, 5);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // OrbitControls - target character on right
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(1.5, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 8;
    controls.minPolarAngle = Math.PI * 0.35;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.update();

    // Create environment
    createBackground(scene);
    setupLighting(scene);
    createFloor(scene);
    createFocusHalo(scene);
    createCyberpunkAccents(scene);
    createAmbientParticles(scene);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, controls };
}

// STEP 1: Smooth vertical gradient with radial center - NO hard horizon
function createBackground(scene) {
    const backdropGeometry = new THREE.PlaneGeometry(100, 60);
    const backdropMaterial = new THREE.ShaderMaterial({
        uniforms: {
            // STEP 6: Cool temperature for background
            topColor: { value: new THREE.Color(0xbec8d8) },      // Cooler blue-gray top
            bottomColor: { value: new THREE.Color(0xd0d4de) },   // Slightly darker at bottom
            centerColor: { value: new THREE.Color(0xe0e6f0) },   // Light center glow
            centerPos: { value: new THREE.Vector2(0.6, 0.45) },  // Center behind character
            noiseScale: { value: 150.0 },                        // STEP 5: Micro-texture
            noiseOpacity: { value: 0.03 }                        // Very subtle noise
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform vec3 centerColor;
            uniform vec2 centerPos;
            uniform float noiseScale;
            uniform float noiseOpacity;
            varying vec2 vUv;
            
            // Simple noise function for micro-texture
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            void main() {
                // Smooth vertical gradient (darker bottom, lighter top)
                vec3 gradient = mix(bottomColor, topColor, smoothstep(0.0, 0.8, vUv.y));
                
                // Radial glow from center behind character
                float dist = distance(vUv, centerPos);
                float radialGlow = 1.0 - smoothstep(0.0, 0.6, dist);
                gradient = mix(gradient, centerColor, radialGlow * 0.4);
                
                // STEP 5: Add very subtle noise texture
                float noise = random(vUv * noiseScale);
                gradient += (noise - 0.5) * noiseOpacity;
                
                gl_FragColor = vec4(gradient, 1.0);
            }
        `,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
    backdrop.position.set(0, 15, -20);
    scene.add(backdrop);
}

// STEP 6: Color temperature adjusted lighting
function setupLighting(scene) {
    // Ambient - slightly cool
    const ambient = new THREE.AmbientLight(0xe8f0ff, 0.5);
    scene.add(ambient);

    // Key light - warm highlights on character
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.1);
    keyLight.position.set(-3, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);

    // Fill light - cool to balance
    const fillLight = new THREE.DirectionalLight(0xd8e8ff, 0.35);
    fillLight.position.set(5, 3, 3);
    scene.add(fillLight);

    // Cyan rim light from behind - cyberpunk identity
    const rimLight = new THREE.SpotLight(0x00e5ff, 2.5);
    rimLight.position.set(0, 2.5, -4);
    rimLight.angle = Math.PI / 3;
    rimLight.penumbra = 0.8;
    rimLight.decay = 1.5;
    rimLight.distance = 15;
    scene.add(rimLight);
}

// STEP 3: Softened floor with fade-out edges
function createFloor(scene) {
    // Main floor with shader for edge fade
    const floorGeometry = new THREE.PlaneGeometry(50, 50, 1, 1);
    const floorMaterial = new THREE.ShaderMaterial({
        uniforms: {
            // STEP 6: Neutral floor color
            floorColor: { value: new THREE.Color(0xd4d8de) },
            fogColor: { value: new THREE.Color(0xd8dce6) },
            characterPos: { value: new THREE.Vector2(1.5, 0.0) }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: `
            uniform vec3 floorColor;
            uniform vec3 fogColor;
            uniform vec2 characterPos;
            varying vec2 vUv;
            varying vec3 vWorldPos;
            
            void main() {
                // Distance from character center
                float dist = distance(vWorldPos.xz, characterPos);
                
                // Smooth fade starting from 3 units out
                float fade = 1.0 - smoothstep(2.0, 12.0, dist);
                
                // Also fade based on UV edges
                float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
                edgeFade *= smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
                
                float finalFade = fade * edgeFade;
                
                // Mix floor with fog color for dissolve effect
                vec3 color = mix(fogColor, floorColor, finalFade);
                float alpha = finalFade * 0.9;
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Shadow receiver plane (invisible, just for shadows)
    const shadowGeometry = new THREE.PlaneGeometry(20, 20);
    const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.15 });
    const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Reflective area under character
    const reflectionGeometry = new THREE.CircleGeometry(2.2, 64);
    const reflectionMaterial = new THREE.MeshStandardMaterial({
        color: 0xc8d0d8,
        roughness: 0.15,
        metalness: 0.6,
        transparent: true,
        opacity: 0.4
    });

    const reflection = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.set(1.5, 0.01, 0);
    scene.add(reflection);

    // Cyan glow ring under character - softer
    const ringGeometry = new THREE.RingGeometry(2.0, 2.3, 64);
    const ringMaterial = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(0x00e5ff) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying vec2 vUv;
            void main() {
                float alpha = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
                alpha *= 0.25;
                gl_FragColor = vec4(glowColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(1.5, 0.02, 0);
    scene.add(ring);

    scene.userData.glowRing = ring;
}

// STEP 4: Focus halo behind character
function createFocusHalo(scene) {
    const haloGeometry = new THREE.PlaneGeometry(6, 6);
    const haloMaterial = new THREE.ShaderMaterial({
        uniforms: {
            haloColor: { value: new THREE.Color(0x40e8ff) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 haloColor;
            varying vec2 vUv;
            void main() {
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(vUv, center);
                
                // Very soft radial gradient - no hard edges
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha = pow(alpha, 2.0) * 0.15; // Subtle glow
                
                gl_FragColor = vec4(haloColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.set(1.5, 1.3, -1.5); // Behind character upper body
    scene.add(halo);
}

// STEP 7: Subtle cyberpunk accent - faint vertical light streaks
function createCyberpunkAccents(scene) {
    // Very subtle vertical light streaks in far background
    const streakGeometry = new THREE.PlaneGeometry(0.03, 15);
    const streakMaterial = new THREE.ShaderMaterial({
        uniforms: {
            streakColor: { value: new THREE.Color(0x60e0ff) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 streakColor;
            varying vec2 vUv;
            void main() {
                // Fade at top and bottom
                float alpha = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
                alpha *= 0.08; // Very subtle
                gl_FragColor = vec4(streakColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    // Just a few streaks, far in background
    const positions = [-8, -5, 6, 9];
    positions.forEach(x => {
        const streak = new THREE.Mesh(streakGeometry, streakMaterial.clone());
        streak.position.set(x, 7, -18);
        scene.add(streak);
    });
}

// AMBIENT FLOATING PARTICLES - soft energy motes
function createAmbientParticles(scene) {
    const particleCount = 800;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;      // X
        positions[i * 3 + 1] = Math.random() * 8 + 1;       // Y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;  // Z

        speeds[i] = Math.random() * 0.2 + 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

    const material = new THREE.PointsMaterial({
        color: 0x80eaff,
        size: 0.04,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.position.z = -5;

    scene.add(particles);
    scene.userData.particles = particles;
}

// Export: Call this in your animation loop
export function updateParticles(scene) {
    const particles = scene.userData.particles;
    if (!particles) return;

    const positions = particles.geometry.attributes.position.array;
    const speeds = particles.geometry.attributes.speed.array;

    for (let i = 0; i < speeds.length; i++) {
        positions[i * 3 + 1] -= speeds[i];

        // Reset to top when below ground
        if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = Math.random() * 8 + 4;
        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
}
