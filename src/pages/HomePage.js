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
            <style>
            .leaderboard-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(5, 5, 10, 0.85);
                backdrop-filter: blur(8px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }
            .leaderboard-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            .leaderboard-content {
                background: rgba(20, 20, 35, 0.95);
                border: 2px solid #00ffff;
                box-shadow: 0 0 25px rgba(0, 255, 255, 0.4);
                border-radius: 12px;
                width: 90%;
                max-width: 750px;
                padding: 30px;
                color: #e0e5ff;
                position: relative;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            .leaderboard-overlay.active .leaderboard-content {
                transform: scale(1);
            }
            .leaderboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px dashed #bd00ff;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .leaderboard-header h2 {
                margin: 0;
                font-size: 1.8rem;
                color: #00ffff;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                letter-spacing: 2px;
            }
            .close-btn {
                background: none;
                border: none;
                color: #ff0055;
                font-size: 2rem;
                cursor: pointer;
                line-height: 1;
                transition: color 0.2s, transform 0.2s;
            }
            .close-btn:hover {
                color: #ff5599;
                transform: scale(1.1);
            }
            .leaderboard-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 0.95rem;
            }
            .leaderboard-table th {
                color: #bd00ff;
                padding: 12px 10px;
                border-bottom: 1px solid #333355;
                font-weight: bold;
                letter-spacing: 1px;
            }
            .leaderboard-table td {
                padding: 12px 10px;
                border-bottom: 1px solid #222233;
            }
            .leaderboard-table tr:hover {
                background: rgba(0, 255, 255, 0.05);
            }
            .rank-col {
                font-weight: bold;
                color: #a0a0c0;
            }
            .rank-1 .rank-col { color: #ffd700; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
            .rank-2 .rank-col { color: #c0c0c0; text-shadow: 0 0 5px rgba(192, 192, 192, 0.5); }
            .rank-3 .rank-col { color: #cd7f32; text-shadow: 0 0 5px rgba(205, 127, 50, 0.5); }

            .rank-1 { background: rgba(255, 215, 0, 0.03); }
            .rank-2 { background: rgba(192, 192, 192, 0.03); }
            .rank-3 { background: rgba(205, 127, 50, 0.03); }

            .score-col {
                color: #00ffaa;
                font-weight: bold;
                text-shadow: 0 0 5px rgba(0, 255, 170, 0.3);
            }
            .empty-leaderboard {
                text-align: center;
                padding: 40px 0;
                color: #8888aa;
                font-size: 1.1rem;
                line-height: 1.8;
            }
            .blink-text {
                animation: blink 2s infinite;
                color: #bd00ff;
                font-weight: bold;
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
            </style>

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
                        <button class="hero-btn secondary" id="leaderboard-btn" style="margin-left: 15px;">
                            <span class="btn-text">LEADERBOARD</span>
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

            <!-- Leaderboard Overlay Modal -->
            <div class="leaderboard-overlay" id="leaderboard-modal">
                <div class="leaderboard-content">
                    <div class="leaderboard-header">
                        <h2>HIGH SCORE LEADERBOARD</h2>
                        <button class="close-btn" id="close-leaderboard-btn">&times;</button>
                    </div>
                    <div class="leaderboard-body" id="leaderboard-list">
                        <!-- High Scores populated here -->
                    </div>
                </div>
            </div>
        `;

        this.setupEvents();
    }

    setupEvents() {
        // Enter button goes to characters
        document.getElementById('enter-btn')?.addEventListener('click', () => {
            window.location.hash = 'characters';
        });

        // Toggle Leaderboard Overlay
        const leaderboardModal = document.getElementById('leaderboard-modal');
        document.getElementById('leaderboard-btn')?.addEventListener('click', () => {
            this.renderLeaderboard();
            leaderboardModal?.classList.add('active');
        });

        document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => {
            leaderboardModal?.classList.remove('active');
        });

        leaderboardModal?.addEventListener('click', (e) => {
            if (e.target === leaderboardModal) {
                leaderboardModal.classList.remove('active');
            }
        });

        // Feature cards navigation
        this.container.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', () => {
                const page = card.dataset.page;
                if (page) window.location.hash = page;
            });
        });
    }

    renderLeaderboard() {
        const scores = JSON.parse(localStorage.getItem('keizject_leaderboard') || '[]');
        const container = document.getElementById('leaderboard-list');
        if (!container) return;

        if (scores.length === 0) {
            container.innerHTML = `
                <div class="empty-leaderboard">
                    <p>NO HIGH SCORES YET</p>
                    <p class="blink-text">ENTER THE SYSTEM AND SECURE YOUR LEGACY</p>
                </div>
            `;
            return;
        }

        let html = `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>RANK</th>
                        <th>OPERATOR</th>
                        <th>ROOM</th>
                        <th>KILLS</th>
                        <th>CREDITS</th>
                        <th>TIME</th>
                        <th>SCORE</th>
                    </tr>
                </thead>
                <tbody>
        `;

        scores.forEach((entry, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            const minutes = Math.floor(entry.time / 60);
            const seconds = entry.time % 60;
            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            const characterName = entry.name || 'Recruit';

            html += `
                <tr class="${rankClass}">
                    <td class="rank-col">#${rank}</td>
                    <td class="name-col">${characterName} (${entry.character || 'soldier'})</td>
                    <td>Room ${entry.rooms || 1}</td>
                    <td>${entry.kills || 0}</td>
                    <td>${entry.credits || 0}</td>
                    <td>${timeStr}</td>
                    <td class="score-col">${entry.score}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }
}
