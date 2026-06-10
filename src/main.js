import { createScene, updateParticles } from './scene.js';
import { CharacterManager } from './characters/CharacterManager.js';
import { HudController } from './hud/HudController.js';
import { Router } from './router.js';
import { HomePage } from './pages/HomePage.js';
import { LoadoutPage } from './pages/LoadoutPage.js';
import { GamePage } from './pages/GamePage.js';
import { characters } from './characters/characterData.js';

/**
 * KEIZJECT - Main Application
 */
class App {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.sceneActive = false;
        this.selectedCharacterIndex = 0;
        this.init();
    }

    async init() {
        // Initialize pages first
        this.homePage = new HomePage();
        this.homePage.init();

        this.loadoutPage = new LoadoutPage();
        this.loadoutPage.init();

        this.gamePage = new GamePage();

        // Router setup
        this.router = new Router();
        this.router.onPageChange = (page) => this.handlePageChange(page);

        // Initialize router (will show home page by default)
        this.router.init();

        // Setup SELECT button
        this.setupSelectButton();
    }

    setupSelectButton() {
        const selectBtn = document.getElementById('select-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
    }

    startGame() {
        // Get selected character data
        const characterData = characters[this.selectedCharacterIndex];

        // Stop character scene
        this.stopScene();

        // Navigate to gameplay
        this.router.goTo('gameplay');

        // Initialize game with character
        this.gamePage.init(characterData, () => {
            // On game exit, return to character select
            this.router.goTo('characters');
        });
    }

    handlePageChange(page) {
        if (page === 'characters') {
            this.initCharacterScene();
        } else if (page === 'gameplay') {
            // Game page handles its own scene
            this.stopScene();
        } else {
            this.stopScene();
        }
    }

    async initCharacterScene() {
        if (this.sceneActive) return;

        // Scene setup
        const { scene, camera, renderer, controls } = createScene(this.container);
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;

        // Character manager
        this.characterManager = new CharacterManager(scene);
        await this.characterManager.init();

        // HUD controller
        this.hud = new HudController();

        // Card clicks
        this.hud.onCardClick((index) => {
            this.switchToCharacter(index);
        });

        // Keyboard controls for character selection
        this.keyHandler = (e) => {
            // Only handle in character selection, not during gameplay
            if (this.router.currentPage !== 'characters') return;
            if (e.key === 'ArrowLeft') this.prevCharacter();
            if (e.key === 'ArrowRight') this.nextCharacter();
        };
        document.addEventListener('keydown', this.keyHandler);

        this.sceneActive = true;

        // Initialize animation buttons for first character
        this.updateAnimationButtons();

        // Start animation loop
        this.animate();
    }

    stopScene() {
        if (!this.sceneActive) return;

        this.sceneActive = false;

        // Remove keyboard listener
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.container.innerHTML = '';
        }
    }

    switchToCharacter(index) {
        if (!this.characterManager) return;

        const currentIndex = this.characterManager.currentIndex;
        if (index === currentIndex) return;

        this.selectedCharacterIndex = index;

        const direction = index > currentIndex ? 'left' : 'right';
        this.characterManager.switchTo(index, direction, () => {
            this.hud.update(
                this.characterManager.getCurrentCharacter(),
                index
            );
            // Update animation buttons after switch completes
            this.updateAnimationButtons();
        });

        // Immediate card update
        this.hud.update(
            this.characterManager.getCurrentCharacter(),
            index
        );

        // Update animation buttons (may need to wait for model load)
        setTimeout(() => this.updateAnimationButtons(), 300);
    }

    /**
     * Update animation buttons based on current character
     */
    updateAnimationButtons() {
        if (!this.characterManager || !this.hud) return;

        const animations = this.characterManager.getAvailableAnimations();

        if (animations.length > 0) {
            this.hud.updateAnimationButtons(animations, async (animIndex) => {
                await this.characterManager.switchAnimation(animIndex);
            });
        } else {
            this.hud.hideAnimationButtons();
        }
    }

    nextCharacter() {
        if (!this.characterManager) return;
        const nextIndex = (this.characterManager.currentIndex + 1) % 4;
        this.switchToCharacter(nextIndex);
    }

    prevCharacter() {
        if (!this.characterManager) return;
        const prevIndex = (this.characterManager.currentIndex - 1 + 4) % 4;
        this.switchToCharacter(prevIndex);
    }

    animate() {
        if (!this.sceneActive) return;

        requestAnimationFrame(() => this.animate());

        const time = performance.now();

        this.controls.update();
        this.characterManager.update(time);
        updateParticles(this.scene);
        this.renderer.render(this.scene, this.camera);
    }
}

// Start app
new App();
