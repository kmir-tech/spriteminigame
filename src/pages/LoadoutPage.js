/**
 * Keizject Loadout Page - Weapon and skill customization
 */

// Sample weapons data
const weapons = {
    primary: [
        { id: 'rifle', name: 'Plasma Rifle', icon: '🔫', stats: { damage: 75, range: 80, speed: 60 } },
        { id: 'shotgun', name: 'Thunder Blaster', icon: '💥', stats: { damage: 95, range: 30, speed: 40 } },
        { id: 'smg', name: 'Volt SMG', icon: '⚡', stats: { damage: 45, range: 50, speed: 90 } },
        { id: 'sniper', name: 'Arc Sniper', icon: '🎯', stats: { damage: 100, range: 100, speed: 25 } }
    ],
    secondary: [
        { id: 'pistol', name: 'Sidearm', icon: '🔧', stats: { damage: 35, range: 40, speed: 85 } },
        { id: 'knife', name: 'Cyber Blade', icon: '🗡️', stats: { damage: 60, range: 5, speed: 100 } },
        { id: 'launcher', name: 'Mini Launcher', icon: '🚀', stats: { damage: 80, range: 60, speed: 30 } }
    ]
};

// Sample skills data
const skills = [
    { id: 'shield', name: 'Energy Shield', icon: '🛡️', cooldown: '15s', desc: 'Block incoming damage' },
    { id: 'dash', name: 'Phase Dash', icon: '💨', cooldown: '8s', desc: 'Quick directional dash' },
    { id: 'heal', name: 'Nano Repair', icon: '💚', cooldown: '20s', desc: 'Restore health over time' },
    { id: 'grenade', name: 'Pulse Grenade', icon: '💣', cooldown: '12s', desc: 'Area damage explosion' },
    { id: 'scan', name: 'Threat Scanner', icon: '📡', cooldown: '10s', desc: 'Reveal enemy positions' },
    { id: 'boost', name: 'Power Surge', icon: '⚡', cooldown: '25s', desc: 'Increase damage output' }
];

const itemLocks = {
    'sniper': { requirement: 'Defeat 1 Boss', check: (milestones) => (milestones.bossesDefeated || 0) >= 1 },
    'boost': { requirement: 'Reach Room 8', check: (milestones) => (milestones.maxRoomReached || 1) >= 8 }
};

export class LoadoutPage {
    constructor() {
        this.container = document.getElementById('page-loadouts');
        this.loadout = {
            primary: null,
            secondary: null,
            skills: [null, null, null]
        };
        this.activeSlot = null;
    }

    init() {
        if (!this.container) return;

        this.container.innerHTML = `
            <style>
            .modal-item.locked {
                position: relative;
                opacity: 0.6;
                filter: grayscale(0.8);
                cursor: not-allowed !important;
                border-color: #444 !important;
            }
            .modal-item.locked:hover {
                background: transparent !important;
                box-shadow: none !important;
            }
            .lock-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 10, 20, 0.8);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                border-radius: 4px;
                pointer-events: none;
                z-index: 10;
            }
            .lock-icon {
                font-size: 1.5rem;
                margin-bottom: 5px;
            }
            .lock-req {
                font-size: 0.8rem;
                color: #ff0055;
                font-weight: bold;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                text-align: center;
                padding: 0 5px;
            }
            </style>

            <div class="loadout-container">
                <div class="loadout-header">
                    <h2 class="loadout-title">LOADOUT</h2>
                    <p class="loadout-subtitle">Customize your arsenal</p>
                </div>
                
                <div class="loadout-content">
                    <!-- Weapons Section -->
                    <div class="weapons-section">
                        <h3 class="section-title">WEAPONS</h3>
                        <div class="weapon-slots">
                            <div class="weapon-slot primary-slot" data-slot="primary">
                                <div class="slot-label">PRIMARY</div>
                                <div class="slot-content">
                                    <span class="slot-icon">+</span>
                                    <span class="slot-name">Select Weapon</span>
                                </div>
                            </div>
                            <div class="weapon-slot secondary-slot" data-slot="secondary">
                                <div class="slot-label">SECONDARY</div>
                                <div class="slot-content">
                                    <span class="slot-icon">+</span>
                                    <span class="slot-name">Select Weapon</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Skills Section -->
                    <div class="skills-section-loadout">
                        <h3 class="section-title">SKILLS</h3>
                        <div class="skill-slots">
                            <div class="skill-slot" data-slot="skill-0">
                                <div class="slot-number">1</div>
                                <div class="slot-content">
                                    <span class="slot-icon">+</span>
                                </div>
                            </div>
                            <div class="skill-slot" data-slot="skill-1">
                                <div class="slot-number">2</div>
                                <div class="slot-content">
                                    <span class="slot-icon">+</span>
                                </div>
                            </div>
                            <div class="skill-slot" data-slot="skill-2">
                                <div class="slot-number">3</div>
                                <div class="slot-content">
                                    <span class="slot-icon">+</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Selection Modal -->
                <div class="selection-modal" id="selection-modal">
                    <div class="modal-backdrop"></div>
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">SELECT</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-grid" id="modal-grid">
                            <!-- Items populated by JS -->
                        </div>
                    </div>
                </div>
                
                <!-- Action Bar -->
                <div class="loadout-actions">
                    <button class="btn btn-primary" id="save-loadout">SAVE LOADOUT</button>
                    <button class="btn btn-secondary" id="clear-loadout">CLEAR ALL</button>
                </div>
            </div>
        `;

        this.setupEvents();
    }

    setupEvents() {
        // Weapon slot clicks
        this.container.querySelectorAll('.weapon-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                this.openModal(slot.dataset.slot);
            });
        });

        // Skill slot clicks
        this.container.querySelectorAll('.skill-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                this.openModal(slot.dataset.slot);
            });
        });

        // Modal close
        this.container.querySelector('.modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });

        this.container.querySelector('.modal-backdrop')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Clear loadout
        this.container.querySelector('#clear-loadout')?.addEventListener('click', () => {
            this.clearLoadout();
        });

        // Save loadout
        this.container.querySelector('#save-loadout')?.addEventListener('click', () => {
            this.saveLoadout();
        });
    }

    openModal(slotType) {
        this.activeSlot = slotType;
        const modal = this.container.querySelector('#selection-modal');
        const grid = this.container.querySelector('#modal-grid');
        const title = this.container.querySelector('.modal-title');

        let items = [];

        if (slotType === 'primary') {
            title.textContent = 'SELECT PRIMARY WEAPON';
            items = weapons.primary;
        } else if (slotType === 'secondary') {
            title.textContent = 'SELECT SECONDARY WEAPON';
            items = weapons.secondary;
        } else if (slotType.startsWith('skill-')) {
            title.textContent = 'SELECT SKILL';
            items = skills;
        }

        const milestones = JSON.parse(localStorage.getItem('keizject_milestones') || '{"bossesDefeated": 0, "maxRoomReached": 1}');

        grid.innerHTML = items.map(item => {
            const lockInfo = itemLocks[item.id];
            const isLocked = lockInfo ? !lockInfo.check(milestones) : false;

            return `
                <div class="modal-item ${isLocked ? 'locked' : ''}" data-id="${item.id}">
                    <div class="item-icon">${item.icon}</div>
                    <div class="item-name">${item.name}</div>
                    ${item.stats ? `
                        <div class="item-stats">
                            <div class="stat-bar"><span>DMG</span><div class="bar"><div style="width:${item.stats.damage}%"></div></div></div>
                            <div class="stat-bar"><span>RNG</span><div class="bar"><div style="width:${item.stats.range}%"></div></div></div>
                            <div class="stat-bar"><span>SPD</span><div class="bar"><div style="width:${item.stats.speed}%"></div></div></div>
                        </div>
                    ` : `
                        <div class="item-desc">${item.desc}</div>
                        <div class="item-cooldown">${item.cooldown}</div>
                    `}
                    ${isLocked ? `
                        <div class="lock-overlay">
                            <span class="lock-icon">🔒</span>
                            <span class="lock-req">${lockInfo.requirement}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Item click handlers
        grid.querySelectorAll('.modal-item').forEach(item => {
            if (item.classList.contains('locked')) {
                return; // Disabled selection
            }
            item.addEventListener('click', () => {
                this.selectItem(item.dataset.id, items);
            });
        });

        modal.classList.add('active');
    }

    closeModal() {
        this.container.querySelector('#selection-modal')?.classList.remove('active');
        this.activeSlot = null;
    }

    selectItem(id, items) {
        const item = items.find(i => i.id === id);
        if (!item) return;

        const slotType = this.activeSlot;

        if (slotType === 'primary' || slotType === 'secondary') {
            this.loadout[slotType] = item;
            const slot = this.container.querySelector(`[data-slot="${slotType}"]`);
            slot.querySelector('.slot-icon').textContent = item.icon;
            slot.querySelector('.slot-name').textContent = item.name;
            slot.classList.add('filled');
        } else if (slotType.startsWith('skill-')) {
            const index = parseInt(slotType.split('-')[1]);
            this.loadout.skills[index] = item;
            const slot = this.container.querySelector(`[data-slot="${slotType}"]`);
            slot.querySelector('.slot-icon').textContent = item.icon;
            slot.classList.add('filled');
        }

        this.closeModal();
    }

    clearLoadout() {
        this.loadout = { primary: null, secondary: null, skills: [null, null, null] };

        // Reset weapon slots
        this.container.querySelectorAll('.weapon-slot').forEach(slot => {
            slot.querySelector('.slot-icon').textContent = '+';
            slot.querySelector('.slot-name').textContent = 'Select Weapon';
            slot.classList.remove('filled');
        });

        // Reset skill slots
        this.container.querySelectorAll('.skill-slot').forEach(slot => {
            slot.querySelector('.slot-icon').textContent = '+';
            slot.classList.remove('filled');
        });
    }

    saveLoadout() {
        console.log('Loadout saved:', this.loadout);
        // Visual feedback
        const btn = this.container.querySelector('#save-loadout');
        btn.textContent = 'SAVED!';
        btn.classList.add('saved');
        setTimeout(() => {
            btn.textContent = 'SAVE LOADOUT';
            btn.classList.remove('saved');
        }, 2000);
    }
}
