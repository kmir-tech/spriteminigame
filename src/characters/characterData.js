/**
 * Character class definitions with stats and descriptions
 */
export const characters = [
    {
        id: 'warrior',
        name: 'Warrior',
        role: 'Frontline Fighter',
        description: 'A battle-hardened soldier wielding heavy weapons. Excels in close combat with high defense.',
        stats: { hp: 120, atk: 90, def: 100, speed: 50 },
        color: 0xff6b35, // Orange
        model: '/soilder.glb',
        icon: '/soilder.png'
    },
    {
        id: 'mage',
        name: 'Mage',
        role: 'Elemental Caster',
        description: 'Master of arcane arts. Devastating ranged attacks but fragile in close quarters.',
        stats: { hp: 70, atk: 120, def: 40, speed: 80 },
        color: 0x7c4dff, // Purple
        model: '/mage.glb',
        icon: '/mage.png'
    },
    {
        id: 'assassin',
        name: 'Assassin',
        role: 'Shadow Operative',
        description: 'Swift and deadly. Strikes from the shadows with unmatched speed and precision.',
        stats: { hp: 80, atk: 110, def: 60, speed: 120 },
        color: 0x00e676, // Green
        model: '/Meshy_AI_biped/Meshy_AI_Animation_Running_withSkin.glb',
        icon: '/assasin.png',
        // Animated model with multiple animation options
        hasAnimations: true,
        animations: [
            { name: 'Running', path: '/Meshy_AI_biped/Meshy_AI_Animation_Running_withSkin.glb' },
            { name: 'Walking', path: '/Meshy_AI_biped/Meshy_AI_Animation_Walking_withSkin.glb' },
            { name: 'Groove', path: '/Meshy_AI_biped/Meshy_AI_Animation_You_Groove_withSkin.glb' }
        ]
    },
    {
        id: 'tank',
        name: 'Tank',
        role: 'Heavy Guardian',
        description: 'An immovable fortress. Absorbs massive damage while protecting allies.',
        stats: { hp: 180, atk: 60, def: 140, speed: 30 },
        color: 0x29b6f6, // Blue
        model: '/tank.glb',
        icon: '/Tank.png'
    }
];

// Max values for stat bar percentages
export const MAX_STATS = {
    hp: 200,
    atk: 150,
    def: 150,
    speed: 150
};
