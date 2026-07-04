/**
 * Input manager - tracks keyboard and mouse state
 */
export class Input {
    constructor() {
        this.keys = {};
        this.justPressedKeys = {};
        this.mousePos = { x: 0, y: 0 };
        this.mouseDown = false;

        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.justPressedKeys[e.code] = true;
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.justPressedKeys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        window.addEventListener('mousedown', () => this.mouseDown = true);
        window.addEventListener('mouseup', () => this.mouseDown = false);
    }

    consumeJustPressed(code) {
        const val = this.justPressedKeys[code];
        this.justPressedKeys[code] = false;
        return !!val;
    }

    // Movement
    get moveLeft() { return this.keys['KeyA'] || this.keys['ArrowLeft']; }
    get moveRight() { return this.keys['KeyD'] || this.keys['ArrowRight']; }
    get moveUp() { return this.keys['KeyW'] || this.keys['ArrowUp']; }
    get moveDown() { return this.keys['KeyS'] || this.keys['ArrowDown']; }

    // Action keys
    get dodge() { return this.keys['Space'] || this.keys['ShiftLeft']; }
    get swapWeapon() { return this.keys['KeyQ']; } // Swap with Q
    get ultimate() { return this.keys['KeyF']; }

    get useSkill1() { return this.keys['Space']; }
    get useSkill2() { return this.keys['KeyE']; }
    get useSkill3() { return this.keys['ShiftLeft'] || this.keys['ShiftRight']; }

    // Shooting (IJKL or mouse)
    get shootLeft() { return this.keys['KeyJ']; }
    get shootRight() { return this.keys['KeyL']; }
    get shootUp() { return this.keys['KeyI']; }
    get shootDown() { return this.keys['KeyK']; }
    get shooting() { return this.shootLeft || this.shootRight || this.shootUp || this.shootDown || this.mouseDown; }

    // Get shoot direction from keys or mouse world position
    getShootDirection(playerWorldPos) {
        if (this.shootLeft) return { x: -1, y: 0 };
        if (this.shootRight) return { x: 1, y: 0 };
        if (this.shootUp) return { x: 0, y: 1 };
        if (this.shootDown) return { x: 0, y: -1 };

        if (this.mouseDown && playerWorldPos) {
            const dx = playerWorldPos.mouseX - playerWorldPos.x;
            const dy = playerWorldPos.mouseY - playerWorldPos.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0.01) {
                return { x: dx / len, y: dy / len };
            }
        }

        return null;
    }

    reset() {
        this.keys = {};
        this.justPressedKeys = {};
        this.mouseDown = false;
    }
}
