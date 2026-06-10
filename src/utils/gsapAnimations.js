import gsap from 'gsap';

/**
 * Camera animation utilities
 */
export function cameraZoomPulse(camera) {
    const originalZ = camera.position.z;

    gsap.to(camera.position, {
        z: originalZ - 0.4,
        duration: 0.2,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1
    });
}

/**
 * Screen flash effect
 */
export function screenFlash(color = '#00ffff') {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${color};
        pointer-events: none;
        z-index: 100;
    `;
    document.body.appendChild(flash);

    gsap.fromTo(flash,
        { opacity: 0.3 },
        {
            opacity: 0,
            duration: 0.3,
            onComplete: () => flash.remove()
        }
    );
}
