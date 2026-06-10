/**
 * Effects Manager - Screen shake, hit flash, and visual effects
 */
export class EffectsManager {
    constructor(camera, container) {
        this.camera = camera;
        this.container = container;

        // Screen shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTime = 0;
        this.originalCameraPos = { x: 0, y: 0 };

        // Hit flash overlay
        this.flashOverlay = null;
        this.createFlashOverlay();
    }

    /**
     * Create the hit flash overlay element
     */
    createFlashOverlay() {
        this.flashOverlay = document.createElement('div');
        this.flashOverlay.className = 'hit-flash-overlay';
        this.flashOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            background: white;
            opacity: 0;
            z-index: 50;
            transition: opacity 0.05s;
        `;
        this.container.appendChild(this.flashOverlay);
    }

    /**
     * Trigger screen shake
     * @param {number} intensity - Shake intensity (0.1 = subtle, 0.5 = heavy)
     * @param {number} duration - Duration in seconds
     */
    screenShake(intensity = 0.2, duration = 0.15) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTime = 0;
        this.originalCameraPos.x = this.camera.position.x;
        this.originalCameraPos.y = this.camera.position.y;
    }

    /**
     * Trigger red flash for player damage
     */
    hitFlash() {
        if (!this.flashOverlay) return;

        this.flashOverlay.style.background = 'rgba(255, 50, 50, 0.4)';
        this.flashOverlay.style.opacity = '1';

        setTimeout(() => {
            this.flashOverlay.style.opacity = '0';
        }, 80);
    }

    /**
     * Trigger white flash for enemy hit
     */
    whiteFlash() {
        if (!this.flashOverlay) return;

        this.flashOverlay.style.background = 'rgba(255, 255, 255, 0.3)';
        this.flashOverlay.style.opacity = '1';

        setTimeout(() => {
            this.flashOverlay.style.opacity = '0';
        }, 50);
    }

    /**
     * Update effects (call every frame)
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Update screen shake
        if (this.shakeTime < this.shakeDuration) {
            this.shakeTime += dt;

            const progress = this.shakeTime / this.shakeDuration;
            const decay = 1 - progress; // Fade out

            const offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity * decay;
            const offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity * decay;

            this.camera.position.x = this.originalCameraPos.x + offsetX;
            this.camera.position.y = this.originalCameraPos.y + offsetY;
        } else if (this.shakeIntensity > 0) {
            // Reset camera position
            this.camera.position.x = this.originalCameraPos.x;
            this.camera.position.y = this.originalCameraPos.y;
            this.shakeIntensity = 0;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.flashOverlay && this.flashOverlay.parentNode) {
            this.flashOverlay.remove();
        }
    }
}
