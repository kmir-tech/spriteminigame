/**
 * Audio Manager - Handles all game sound effects
 * Uses Web Audio API for low-latency playback
 */
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;

        // Define sound effects with generated tones (no external files needed)
        this.soundDefs = {
            shoot: { type: 'square', freq: 400, duration: 0.08, decay: 0.05 },
            hit: { type: 'sawtooth', freq: 200, duration: 0.1, decay: 0.08 },
            enemyDeath: { type: 'square', freq: 150, duration: 0.15, decay: 0.12, slide: -50 },
            playerHit: { type: 'sawtooth', freq: 100, duration: 0.2, decay: 0.15 },
            doorOpen: { type: 'sine', freq: 600, duration: 0.2, decay: 0.1, slide: 200 },
            powerUp: { type: 'sine', freq: 500, duration: 0.3, decay: 0.2, slide: 300 },
            bossSpawn: { type: 'square', freq: 80, duration: 0.5, decay: 0.4 }
        };

        // Lazy init audio context (must be triggered by user interaction)
        this.context = null;
    }

    /**
     * Initialize audio context (call after user interaction)
     */
    init() {
        if (this.context) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioManager initialized');
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    /**
     * Play a sound effect
     * @param {string} name - Sound name from soundDefs
     */
    play(name) {
        if (!this.enabled || !this.context) return;

        const def = this.soundDefs[name];
        if (!def) return;

        // Resume context if suspended (browser policy)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = def.type;
        osc.frequency.setValueAtTime(def.freq, this.context.currentTime);

        // Apply frequency slide if defined
        if (def.slide) {
            osc.frequency.linearRampToValueAtTime(
                def.freq + def.slide,
                this.context.currentTime + def.duration
            );
        }

        // Volume envelope
        gain.gain.setValueAtTime(this.volume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.01,
            this.context.currentTime + def.duration
        );

        osc.connect(gain);
        gain.connect(this.context.destination);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + def.duration);
    }

    /**
     * Set master volume
     * @param {number} vol - Volume 0-1
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    /**
     * Toggle audio on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Global singleton
export const audioManager = new AudioManager();
