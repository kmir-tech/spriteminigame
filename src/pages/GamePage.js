import { GameEngine } from '../game/GameEngine.js';

/**
 * Game Page - hosts the roguelite gameplay
 */
export class GamePage {
    constructor() {
        this.container = document.getElementById('page-gameplay');
        this.gameEngine = null;
        this.characterData = null;
    }

    init(characterData, onExit) {
        this.characterData = characterData;
        this.onExit = onExit;

        if (!this.container) return;

        // Create game container
        this.container.innerHTML = `
            <div id="game-container" class="game-container"></div>
        `;

        const gameContainer = document.getElementById('game-container');

        // Start game engine
        this.gameEngine = new GameEngine(gameContainer, characterData, () => {
            this.exit();
        });

        this.gameEngine.start();
    }

    exit() {
        if (this.gameEngine) {
            this.gameEngine.destroy();
            this.gameEngine = null;
        }

        if (this.onExit) {
            this.onExit();
        }
    }

    destroy() {
        if (this.gameEngine) {
            this.gameEngine.destroy();
            this.gameEngine = null;
        }
    }
}
