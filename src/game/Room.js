import * as THREE from 'three';

/**
 * Room templates and current room state
 */

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
        this.createRoom();
    }

    createRoom() {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(this.width, this.height);
        const floorMat = new THREE.MeshBasicMaterial({ color: 0x2a2a35 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.z = -0.1;
        this.scene.add(floor);
        this.meshes.push(floor);

        // Walls
        const wallColor = 0x4a4a55;
        const wallThickness = 0.5;

        // Top wall
        this.createWall(0, this.halfH, this.width, wallThickness, wallColor);
        // Bottom wall
        this.createWall(0, -this.halfH, this.width, wallThickness, wallColor);
        // Left wall
        this.createWall(-this.halfW, 0, wallThickness, this.height, wallColor);
        // Right wall
        this.createWall(this.halfW, 0, wallThickness, this.height, wallColor);
    }

    createWall(x, y, w, h, color) {
        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshBasicMaterial({ color });
        const wall = new THREE.Mesh(geo, mat);
        wall.position.set(x, y, 0);
        this.scene.add(wall);
        this.meshes.push(wall);
    }

    createDoors(doorPositions) {
        const doorSize = 1.5;
        const doorColor = 0x664422;
        const openColor = 0x00aa44;

        for (const pos of doorPositions) {
            let x, y, w, h;

            switch (pos) {
                case 'left':
                    x = -this.halfW; y = 0;
                    w = 0.5; h = doorSize;
                    break;
                case 'right':
                    x = this.halfW; y = 0;
                    w = 0.5; h = doorSize;
                    break;
                case 'up':
                    x = 0; y = this.halfH;
                    w = doorSize; h = 0.5;
                    break;
                case 'down':
                    x = 0; y = -this.halfH;
                    w = doorSize; h = 0.5;
                    break;
                default: continue;
            }

            const geo = new THREE.PlaneGeometry(w, h);
            const mat = new THREE.MeshBasicMaterial({ color: doorColor });
            const door = new THREE.Mesh(geo, mat);
            door.position.set(x, y, 0.02);
            this.scene.add(door);
            this.meshes.push(door);

            this.doors[pos] = { mesh: door, closedColor: doorColor, openColor };
        }
    }

    openDoors() {
        if (this.doorsOpen) return;
        this.doorsOpen = true;

        for (const door of Object.values(this.doors)) {
            door.mesh.material.color.setHex(door.openColor);
        }
    }

    closeDoors() {
        this.doorsOpen = false;

        for (const door of Object.values(this.doors)) {
            door.mesh.material.color.setHex(door.closedColor);
        }
    }

    checkDoorCollision(x, y, radius) {
        if (!this.doorsOpen) return null;

        const doorCheckDistance = 1.0;
        const doorWidth = 1.0;

        for (const [pos, door] of Object.entries(this.doors)) {
            let isNearDoor = false;

            switch (pos) {
                case 'right':
                    // Check if player is at right edge and within door width
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

    destroy() {
        for (const mesh of this.meshes) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        }
        this.meshes = [];
        this.doors = {};
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
        return this.roomSequence[this.currentRoomIndex];
    }

    /**
     * Check if current room is a boss room (every 5th room: 5, 10, 15...)
     */
    isBossRoom() {
        const roomNum = this.currentRoomIndex + 1;
        return roomNum > 0 && roomNum % 5 === 0;
    }

    /**
     * Calculate boss HP based on bosses defeated
     * Formula: 100 * 2^bossesDefeated (100 → 200 → 400 → 800...)
     */
    getBossHP() {
        return 100 * Math.pow(2, this.bossesDefeated);
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
