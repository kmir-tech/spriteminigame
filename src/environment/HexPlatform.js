import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Hexagonal glowing platform for characters
 */
export class HexPlatform {
    constructor(color = 0x00ffff) {
        this.color = color;
        this.group = new THREE.Group();
        this.glowIntensity = 0.5;

        this.create();
    }

    create() {
        // Main hexagon platform
        const hexShape = new THREE.Shape();
        const size = 0.8;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if (i === 0) hexShape.moveTo(x, y);
            else hexShape.lineTo(x, y);
        }
        hexShape.closePath();

        // Platform base
        const extrudeSettings = { depth: 0.05, bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            color: 0x0a0a15,
            roughness: 0.3,
            metalness: 0.7
        });

        const platform = new THREE.Mesh(geometry, material);
        platform.position.y = -0.5;
        platform.receiveShadow = true;
        this.group.add(platform);

        // Glowing edge ring
        const edgeGeometry = new THREE.RingGeometry(size * 0.95, size, 6);
        edgeGeometry.rotateX(-Math.PI / 2);
        edgeGeometry.rotateY(Math.PI / 6);

        const edgeMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        this.edgeRing = new THREE.Mesh(edgeGeometry, edgeMaterial);
        this.edgeRing.position.y = -0.44;
        this.group.add(this.edgeRing);

        // Holographic frame behind character
        this.createHoloFrame();

        // Ground glow
        this.createGroundGlow();
    }

    createHoloFrame() {
        const frameGroup = new THREE.Group();

        // Outer hexagon wireframe
        const points = [];
        const size = 1.2;
        for (let i = 0; i <= 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
            points.push(new THREE.Vector3(
                Math.cos(angle) * size,
                Math.sin(angle) * size,
                0
            ));
        }

        const frameGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const frameMaterial = new THREE.LineBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.4
        });

        const frame = new THREE.Line(frameGeometry, frameMaterial);
        frame.position.y = 1;
        frame.position.z = -0.3;
        frameGroup.add(frame);

        // Inner rotating hex
        const innerPoints = [];
        const innerSize = 0.9;
        for (let i = 0; i <= 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            innerPoints.push(new THREE.Vector3(
                Math.cos(angle) * innerSize,
                Math.sin(angle) * innerSize,
                0
            ));
        }

        const innerGeometry = new THREE.BufferGeometry().setFromPoints(innerPoints);
        const innerMaterial = new THREE.LineBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.2
        });

        this.innerFrame = new THREE.Line(innerGeometry, innerMaterial);
        this.innerFrame.position.y = 1;
        this.innerFrame.position.z = -0.4;
        frameGroup.add(this.innerFrame);

        this.group.add(frameGroup);
    }

    createGroundGlow() {
        const glowGeometry = new THREE.CircleGeometry(1.2, 32);
        glowGeometry.rotateX(-Math.PI / 2);

        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(this.color) },
                intensity: { value: this.glowIntensity }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float intensity;
                varying vec2 vUv;
                void main() {
                    float dist = distance(vUv, vec2(0.5));
                    float alpha = smoothstep(0.5, 0.1, dist) * intensity;
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        this.groundGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.groundGlow.position.y = -0.48;
        this.group.add(this.groundGlow);
    }

    setSelected(selected) {
        const targetOpacity = selected ? 1 : 0.3;
        const targetIntensity = selected ? 0.8 : 0.3;
        const targetColor = selected ? 0x00ffff : 0x4488aa;

        gsap.to(this.edgeRing.material, {
            opacity: targetOpacity,
            duration: 0.4
        });

        gsap.to(this.groundGlow.material.uniforms.intensity, {
            value: targetIntensity,
            duration: 0.4
        });

        // Pulse animation for selected
        if (selected) {
            gsap.to(this.edgeRing.scale, {
                x: 1.05,
                y: 1.05,
                duration: 1,
                ease: 'sine.inOut',
                yoyo: true,
                repeat: -1
            });
        } else {
            gsap.killTweensOf(this.edgeRing.scale);
            gsap.to(this.edgeRing.scale, { x: 1, y: 1, duration: 0.3 });
        }
    }

    update(time) {
        if (this.innerFrame) {
            this.innerFrame.rotation.z = time * 0.0003;
        }
    }
}
