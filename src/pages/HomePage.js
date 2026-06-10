/**
 * Keizject Home Page - Landing page with hero section
 */
export class HomePage {
    constructor() {
        this.container = document.getElementById('page-home');
    }

    init() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="home-hero">
                <div class="hero-background">
                    <div class="grid-overlay"></div>
                    <div class="glow-orb orb-1"></div>
                    <div class="glow-orb orb-2"></div>
                </div>
                
                <div class="hero-content">
                    <div class="logo-container">
                        <h1 class="logo-text">
                            <span class="logo-keiz">KEIZ</span><span class="logo-ject">JECT</span>
                        </h1>
                        <div class="logo-underline"></div>
                    </div>
                    
                    <p class="tagline">CHOOSE YOUR DESTINY</p>
                    
                    <div class="hero-buttons">
                        <button class="hero-btn primary" id="enter-btn">
                            <span class="btn-text">ENTER</span>
                            <span class="btn-glow"></span>
                        </button>
                    </div>
                    
                    <div class="feature-cards">
                        <div class="feature-card" data-page="characters">
                            <div class="feature-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                </svg>
                            </div>
                            <h3 class="feature-title">CHARACTERS</h3>
                            <p class="feature-desc">Select your fighter</p>
                        </div>
                        
                        <div class="feature-card" data-page="loadouts">
                            <div class="feature-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
                                </svg>
                            </div>
                            <h3 class="feature-title">LOADOUTS</h3>
                            <p class="feature-desc">Customize your gear</p>
                        </div>
                    </div>
                </div>
                
                <div class="version-tag">v0.1.0 ALPHA</div>
            </div>
        `;

        this.setupEvents();
    }

    setupEvents() {
        // Enter button goes to characters
        document.getElementById('enter-btn')?.addEventListener('click', () => {
            window.location.hash = 'characters';
        });

        // Feature cards navigation
        this.container.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', () => {
                const page = card.dataset.page;
                if (page) window.location.hash = page;
            });
        });
    }
}
