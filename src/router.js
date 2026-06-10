/**
 * Simple hash-based router for Keizject
 */
export class Router {
    constructor() {
        this.routes = {
            'home': this.showHome.bind(this),
            'characters': this.showCharacters.bind(this),
            'loadouts': this.showLoadouts.bind(this),
            'gameplay': this.showGameplay.bind(this)
        };

        this.currentPage = null;
        this.onPageChange = null;

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        // Set up nav clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    window.location.hash = page;
                }
            });
        });
    }

    init() {
        // Default to home if no hash
        if (!window.location.hash) {
            window.location.hash = 'home';
        } else {
            this.handleRoute();
        }
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        const route = this.routes[hash];

        if (route) {
            this.currentPage = hash;
            route();
            this.updateNavActive(hash);

            if (this.onPageChange) {
                this.onPageChange(hash);
            }
        }
    }

    updateNavActive(page) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    }

    showHome() {
        this.hideAllPages();
        this.showNav();
        document.getElementById('page-home')?.classList.add('active');
        document.getElementById('canvas-container')?.classList.add('hidden');
    }

    showCharacters() {
        this.hideAllPages();
        this.showNav();
        document.getElementById('page-characters')?.classList.add('active');
        document.getElementById('canvas-container')?.classList.remove('hidden');
    }

    showLoadouts() {
        this.hideAllPages();
        this.showNav();
        document.getElementById('page-loadouts')?.classList.add('active');
        document.getElementById('canvas-container')?.classList.add('hidden');
    }

    showGameplay() {
        this.hideAllPages();
        this.hideNav();
        document.getElementById('page-gameplay')?.classList.add('active');
        document.getElementById('canvas-container')?.classList.add('hidden');
    }

    hideAllPages() {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
    }

    showNav() {
        document.querySelector('.top-nav')?.classList.remove('hidden');
    }

    hideNav() {
        document.querySelector('.top-nav')?.classList.add('hidden');
    }

    goTo(page) {
        window.location.hash = page;
    }
}
