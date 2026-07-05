import * as THREE from 'three';

// Room template definitions
const ROOM_TEMPLATES = [
    {
        id: 'start',
        enemies: [], // No enemies in start room
        doors: ['right']
    },
    {
        id: 'easy1',
        enemies: [
            { type: 'chaser', x: -3, y: 2 },
            { type: 'chaser', x: 3, y: -2 }
        ],
        doors: ['left', 'right']
    },
    {
        id: 'easy2',
        enemies: [
            { type: 'wanderer', x: -4, y: 0 },
            { type: 'wanderer', x: 4, y: 0 }
        ],
        doors: ['left', 'right']
    },
    {
        id: 'medium1',
        enemies: [
            { type: 'chaser', x: -3, y: 2 },
            { type: 'chaser', x: 3, y: 2 },
            { type: 'wanderer', x: 0, y: -2 }
        ],
        doors: ['left', 'right', 'up']
    },
    {
        id: 'medium2',
        enemies: [
            { type: 'chaser', x: -4, y: 0 },
            { type: 'chaser', x: 4, y: 0 },
            { type: 'chaser', x: 0, y: 3 },
            { type: 'wanderer', x: 0, y: -3 }
        ],
        doors: ['left', 'right']
    },
    {
        id: 'hard1',
        enemies: [
            { type: 'chaser', x: -3, y: 2 },
            { type: 'chaser', x: 3, y: 2 },
            { type: 'chaser', x: -3, y: -2 },
            { type: 'chaser', x: 3, y: -2 },
            { type: 'wanderer', x: 0, y: 0 }
        ],
        doors: ['left', 'right']
    }
];

// Define a shop template with no enemies
const SHOP_TEMPLATE = {
    id: 'shop',
    enemies: [],
    doors: ['left', 'right'],
    isShop: true
};

/**
 * Room class - handles walls, doors, and bounds
 */
export class Room {
    constructor(scene, width = 16, height = 9) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.halfW = width / 2;
        this.halfH = height / 2;

        this.doors = {};
        this.doorsOpen = false;

        this.bounds = {
            left: -this.halfW + 0.5,
            right: this.halfW - 0.5,
            bottom: -this.halfH + 0.5,
            top: this.halfH - 0.5
        };

        this.meshes = [];
        this.terminals = [];
        this.createRoom();
    }

    createRoom() {
        // Floor Plane
        const floorGeo = new THREE.PlaneGeometry(this.width, this.height);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x181822,
            roughness: 0.4,
            metalness: 0.8
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.z = -0.1;
        this.scene.add(floor);
        this.meshes.push(floor);

        // Floor Neon Grid (pulsing cyan & purple cyberpunk wireframes)
        const gridSize = Math.max(this.width, this.height) + 2;
        const gridHelper = new THREE.GridHelper(gridSize, 20, 0x00ffff, 0xbd00ff);
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.set(0, 0, -0.09);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.35;
        this.scene.add(gridHelper);
        this.meshes.push(gridHelper);

        // Walls
        const wallColor = 0x2d2d38;
        const wallThickness = 0.5;

        // Top wall
        this.createWall(0, this.halfH, this.width, wallThickness, wallColor);
        // Bottom wall
        this.createWall(0, -this.halfH, this.width, wallThickness, wallColor);
        // Left wall
        this.createWall(-this.halfW, 0, wallThickness, this.height, wallColor);
        // Right wall
        this.createWall(this.halfW, 0, wallThickness, this.height, wallColor);

        // Sci-Fi corner terminals and batteries
        const cornerCoords = [
            { x: -this.halfW + 0.75, y: this.halfH - 0.75 },
            { x: this.halfW - 0.75, y: this.halfH - 0.75 },
            { x: -this.halfW + 0.75, y: -this.halfH + 0.75 },
            { x: this.halfW - 0.75, y: -this.halfH + 0.75 }
        ];
        const terminalColors = [0x00ffff, 0xbd00ff, 0x00ffaa, 0xff0055];

        cornerCoords.forEach((coord, index) => {
            const neonColor = terminalColors[index % terminalColors.length];

            // Terminal Base
            const baseGeo = new THREE.BoxGeometry(0.5, 0.5, 0.4);
            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x1a1a24,
                roughness: 0.5,
                metalness: 0.8
            });
            const baseMesh = new THREE.Mesh(baseGeo, baseMat);
            baseMesh.position.set(coord.x, coord.y, 0.2);
            this.scene.add(baseMesh);
            this.meshes.push(baseMesh);

            // Glowing Screen
            const screenGeo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
            const screenMat = new THREE.MeshBasicMaterial({ color: neonColor });
            const screenMesh = new THREE.Mesh(screenGeo, screenMat);
            screenMesh.position.set(coord.x, coord.y, 0.41);
            this.scene.add(screenMesh);
            this.meshes.push(screenMesh);

            // Flickering Point Light
            const light = new THREE.PointLight(neonColor, 1.5, 5);
            light.position.set(coord.x, coord.y, 0.5);
            this.scene.add(light);
            this.meshes.push(light);

            this.terminals.push({
                screen: screenMesh,
                light: light,
                baseIntensity: 1.5,
                pulseSpeed: 3 + Math.random() * 2,
                timeOffset: Math.random() * Math.PI * 2
            });
        });
    }

    createWall(x, y, w, h, color) {
        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.5,
            metalness: 0.7
        });
        const wall = new THREE.Mesh(geo, mat);
        wall.position.set(x, y, 0);
        this.scene.add(wall);
        this.meshes.push(wall);
    }

    createDoors(doorPositions) {
        const doorSize = 1.5;
        const closedColor = 0xff0055; // Red locked neon
        const openColor = 0x00ffff;   // Cyan open neon

        for (const pos of doorPositions) {
            let x, y, w, h;

            switch (pos) {
                case 'left':
                    x = -this.halfW; y = 0;
                    w = 0.4; h = doorSize;
                    break;
                case 'right':
                    x = this.halfW; y = 0;
                    w = 0.4; h = doorSize;
                    break;
                case 'up':
                    x = 0; y = this.halfH;
                    w = doorSize; h = 0.4;
                    break;
                case 'down':
                    x = 0; y = -this.halfH;
                    w = doorSize; h = 0.4;
                    break;
                default: continue;
            }

            const geo = new THREE.PlaneGeometry(w, h);
            const mat = new THREE.MeshBasicMaterial({
                color: closedColor,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const doorMesh = new THREE.Mesh(geo, mat);
            doorMesh.position.set(x, y, 0.05);
            this.scene.add(doorMesh);
            this.meshes.push(doorMesh);

            this.doors[pos] = {
                mesh: doorMesh,
                isOpen: false,
                closedColor,
                openColor,
                pos,
                update: (dt) => {
                    const targetScale = this.doorsOpen ? 0.01 : 1.0;
                    const targetOpacity = this.doorsOpen ? 0.0 : 0.8;
                    const targetColor = this.doorsOpen ? openColor : closedColor;

                    // Vertical scale contraction
                    if (pos === 'left' || pos === 'right') {
                        doorMesh.scale.y += (targetScale - doorMesh.scale.y) * 8 * dt;
                    } else {
                        doorMesh.scale.x += (targetScale - doorMesh.scale.x) * 8 * dt;
                    }

                    // Opacity fade transition
                    doorMesh.material.opacity += (targetOpacity - doorMesh.material.opacity) * 8 * dt;

                    // Color lerping
                    doorMesh.material.color.lerp(new THREE.Color(targetColor), 8 * dt);

                    // Humming flicker
                    if (!this.doorsOpen) {
                        const hum = Math.sin(Date.now() * 0.015) * 0.07;
                        doorMesh.material.opacity = Math.max(0.2, 0.8 + hum);
                    }
                }
            };
        }
    }

    openDoors() {
        if (this.doorsOpen) return;
        this.doorsOpen = true;
    }

    closeDoors() {
        this.doorsOpen = false;
    }

    checkDoorCollision(x, y, radius) {
        if (!this.doorsOpen) return null;

        const doorCheckDistance = 1.0;
        const doorWidth = 1.0;

        for (const [pos, door] of Object.entries(this.doors)) {
            let isNearDoor = false;

            switch (pos) {
                case 'right':
                    isNearDoor = x > this.halfW - doorCheckDistance && Math.abs(y) < doorWidth;
                    break;
                case 'left':
                    isNearDoor = x < -this.halfW + doorCheckDistance && Math.abs(y) < doorWidth;
                    break;
                case 'up':
                    isNearDoor = y > this.halfH - doorCheckDistance && Math.abs(x) < doorWidth;
                    break;
                case 'down':
                    isNearDoor = y < -this.halfH + doorCheckDistance && Math.abs(x) < doorWidth;
                    break;
            }

            if (isNearDoor) {
                return pos;
            }
        }

        return null;
    }

    update(dt) {
        const time = Date.now() * 0.001;
        // Pulse terminals
        if (this.terminals) {
            for (const t of this.terminals) {
                const flicker = Math.sin(time * t.pulseSpeed + t.timeOffset);
                const randomFlicker = (Math.random() - 0.5) * 0.12;
                const newIntensity = t.baseIntensity * (0.8 + 0.2 * flicker) + randomFlicker;
                t.light.intensity = Math.max(0.2, newIntensity);

                const scaleVal = 1.0 + 0.04 * flicker;
                t.screen.scale.set(scaleVal, scaleVal, 1.0);
            }
        }

        // Update animated doors
        if (this.doors) {
            for (const door of Object.values(this.doors)) {
                if (door.update) {
                    door.update(dt);
                }
            }
        }
    }

    destroy() {
        for (const mesh of this.meshes) {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        }
        this.meshes = [];
        this.doors = {};
        this.terminals = [];
    }
}

/**
 * Room Manager - handles room transitions and templates
 */
export class RoomManager {
    constructor() {
        this.currentRoomIndex = 0;
        this.bossesDefeated = 0;
        this.roomSequence = this.generateRoomSequence();
    }

    generateRoomSequence(length = 10) {
        const sequence = [ROOM_TEMPLATES[0]]; // Start room

        const nonStartTemplates = ROOM_TEMPLATES.slice(1);
        for (let i = 1; i < length; i++) {
            const template = nonStartTemplates[Math.floor(Math.random() * nonStartTemplates.length)];
            sequence.push(template);
        }

        return sequence;
    }

    getCurrentTemplate() {
        if (this.isShopRoom()) {
            return SHOP_TEMPLATE;
        }
        return this.roomSequence[this.currentRoomIndex];
    }

    /**
     * Check if current room is a boss room (every 5th room: 5, 10, 15...)
     */
    isBossRoom() {
        const roomNum = this.getRoomNumber();
        return roomNum > 0 && roomNum % 5 === 0;
    }

    /**
     * Check if current room is a shop room (every 4th room, except boss rooms)
     */
    isShopRoom() {
        const roomNum = this.getRoomNumber();
        return roomNum > 0 && roomNum % 4 === 0 && roomNum % 5 !== 0;
    }

    /**
     * Calculate boss HP based on bosses defeated
     * Formula: 350 * 2^bossesDefeated (350 → 700 → 1400 → 2800...)
     */
    getBossHP() {
        return 350 * Math.pow(2, this.bossesDefeated);
    }

    /**
     * Called when a boss is defeated
     */
    onBossDefeated() {
        this.bossesDefeated++;
    }

    nextRoom() {
        this.currentRoomIndex++;
        if (this.currentRoomIndex >= this.roomSequence.length) {
            // Generate more rooms
            const newRooms = this.generateRoomSequence(5);
            this.roomSequence.push(...newRooms.slice(1));
        }
        return this.getCurrentTemplate();
    }

    getRoomNumber() {
        return this.currentRoomIndex + 1;
    }

    reset() {
        this.currentRoomIndex = 0;
        this.bossesDefeated = 0;
        this.roomSequence = this.generateRoomSequence();
    }
}
