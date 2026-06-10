/**
 * Roguelike Power-Up System
 * Pick 1 from 3 cards after defeating a boss
 */

// Power-up definitions
export const POWER_UPS = [
    {
        id: 'maxHpUp',
        name: 'Vitality',
        description: '+25 Max HP',
        icon: '❤️',
        color: '#ff5252',
        apply: (player) => {
            player.maxHealth += 25;
            player.health = Math.min(player.health + 25, player.maxHealth);
        }
    },
    {
        id: 'speedUp',
        name: 'Swift Boots',
        description: '+15% Speed',
        icon: '⚡',
        color: '#ffeb3b',
        apply: (player) => {
            player.speed *= 1.15;
        }
    },
    {
        id: 'damageUp',
        name: 'Power Shot',
        description: '+25% Damage',
        icon: '💪',
        color: '#ff9800',
        apply: (player) => {
            player.damage *= 1.25;
        }
    },
    {
        id: 'fireRateUp',
        name: 'Rapid Fire',
        description: '+20% Fire Rate',
        icon: '🔫',
        color: '#2196f3',
        apply: (player) => {
            player.fireRate *= 0.8; // Lower = faster
        }
    },
    {
        id: 'armor',
        name: 'Iron Skin',
        description: '-15% Damage Taken',
        icon: '🛡️',
        color: '#9e9e9e',
        apply: (player) => {
            // Stack multiplicatively
            player.damageReduction = (player.damageReduction || 0) + 0.15;
        }
    },
    {
        id: 'piercing',
        name: 'Piercing Rounds',
        description: 'Bullets Pierce +1 Enemy',
        icon: '🎯',
        color: '#9c27b0',
        apply: (player) => {
            player.pierceCount = (player.pierceCount || 0) + 1;
        }
    }
];

/**
 * Power-Up Manager - tracks collected power-ups
 */
export class PowerUpManager {
    constructor() {
        this.collected = []; // Array of power-up ids
    }

    /**
     * Get 3 random power-ups for selection
     */
    getRandomSelection(count = 3) {
        const shuffled = [...POWER_UPS].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    /**
     * Apply a power-up to the player
     */
    applyPowerUp(powerUpId, player) {
        const powerUp = POWER_UPS.find(p => p.id === powerUpId);
        if (powerUp) {
            powerUp.apply(player);
            this.collected.push(powerUpId);
            return powerUp;
        }
        return null;
    }

    /**
     * Get collected power-up icons for HUD
     */
    getCollectedIcons() {
        return this.collected.map(id => {
            const powerUp = POWER_UPS.find(p => p.id === id);
            return powerUp ? powerUp.icon : '';
        });
    }

    /**
     * Reset for new game
     */
    reset() {
        this.collected = [];
    }
}
