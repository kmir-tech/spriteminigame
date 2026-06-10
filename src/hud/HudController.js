import gsap from 'gsap';
import { characters, MAX_STATS } from '../characters/characterData.js';

/**
 * HUD Controller - Horizontal Card Carousel
 * Supports animation switching buttons for animated characters
 */
export class HudController {
    constructor() {
        this.cardsContainer = document.getElementById('cards-carousel');
        this.currentIndex = 0;

        this.createCards();
        this.createAnimationButtons();
    }

    createCards() {
        if (!this.cardsContainer) return;

        // Create cards with portrait, name, class, stats
        this.cardsContainer.innerHTML = characters.map((char, index) => {
            const statLevel = (val, max) => {
                const pct = val / max;
                if (pct >= 0.8) return { text: 'MAX', class: 'max' };
                if (pct >= 0.6) return { text: 'HIGH', class: 'high' };
                return { text: 'MED', class: 'med' };
            };

            const armor = statLevel(char.stats.def, 150);
            const mobility = statLevel(char.stats.speed, 150);
            const power = statLevel(char.stats.atk, 150);

            return `
                <div class="char-card ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="card-portrait">
                        <img src="${char.icon}" alt="${char.name}" class="portrait-icon" />
                    </div>
                    <div class="card-name">${char.name.toUpperCase()}</div>
                    <div class="card-class">${char.role.toUpperCase()}</div>
                    <div class="card-stats">
                        <div class="card-stat-row">
                            <span class="card-stat-label">ARMOR:</span>
                            <span class="card-stat-value ${armor.class}">${armor.text}</span>
                        </div>
                        <div class="card-stat-row">
                            <span class="card-stat-label">MOBILITY:</span>
                            <span class="card-stat-value ${mobility.class}">${mobility.text}</span>
                        </div>
                        <div class="card-stat-row">
                            <span class="card-stat-label">POWER:</span>
                            <span class="card-stat-value ${power.class}">${power.text}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.cardElements = document.querySelectorAll('.char-card');
        this.updateCardsLayout();
    }

    /**
     * Create animation switching buttons (hidden by default)
     */
    createAnimationButtons() {
        // Create container for animation buttons
        this.animButtonsContainer = document.createElement('div');
        this.animButtonsContainer.className = 'animation-buttons';
        this.animButtonsContainer.style.display = 'none';
        this.animButtonsContainer.innerHTML = `
            <div class="anim-buttons-label">ANIMATION</div>
            <div class="anim-buttons-row" id="anim-buttons-row"></div>
        `;

        // Add to bottom section or create new container
        const bottomSection = document.querySelector('.bottom-section');
        if (bottomSection) {
            bottomSection.insertBefore(this.animButtonsContainer, bottomSection.firstChild);
        } else {
            document.body.appendChild(this.animButtonsContainer);
        }

        this.animButtonsRow = document.getElementById('anim-buttons-row');
    }

    /**
     * Update animation buttons based on current character
     */
    updateAnimationButtons(animations, onAnimationSwitch) {
        if (!animations || animations.length === 0) {
            this.animButtonsContainer.style.display = 'none';
            return;
        }

        this.animButtonsContainer.style.display = 'flex';

        this.animButtonsRow.innerHTML = animations.map((anim, index) => `
            <button class="anim-btn ${anim.isActive ? 'active' : ''}" data-index="${index}">
                ${anim.name}
            </button>
        `).join('');

        // Add click handlers
        const buttons = this.animButtonsRow.querySelectorAll('.anim-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                if (onAnimationSwitch) {
                    onAnimationSwitch(index);
                }

                // Update active state
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    /**
     * Hide animation buttons
     */
    hideAnimationButtons() {
        if (this.animButtonsContainer) {
            this.animButtonsContainer.style.display = 'none';
        }
    }

    updateCardsLayout() {
        if (!this.cardElements) return;

        this.cardElements.forEach((card, i) => {
            const offset = i - this.currentIndex;
            const isActive = offset === 0;

            // Calculate position and scale based on offset from selected
            let translateX, scale, opacity, zIndex;

            if (offset === 0) {
                translateX = 0;
                scale = 1.05;
                opacity = 1;
                zIndex = 10;
            } else if (Math.abs(offset) === 1) {
                translateX = offset * 50;
                scale = 0.95;
                opacity = 0.9;
                zIndex = 5;
            } else {
                translateX = offset * 45;
                scale = 0.88;
                opacity = 0.7;
                zIndex = 1;
            }

            gsap.to(card, {
                x: translateX,
                scale: scale,
                opacity: opacity,
                zIndex: zIndex,
                duration: 0.4,
                ease: 'power2.out'
            });

            card.classList.toggle('active', isActive);
        });
    }

    update(character, index) {
        this.currentIndex = index;
        this.updateCardsLayout();
    }

    onCardClick(callback) {
        if (!this.cardElements) return;
        this.cardElements.forEach((card) => {
            card.addEventListener('click', () => {
                const index = parseInt(card.dataset.index);
                callback(index);
            });
        });
    }

    // Compatibility methods
    onDotClick(callback) { }
    screenShake() { }
}
