/**
 * Swipe Controller - handles mouse drag and touch swipe
 */
export class SwipeController {
    constructor(element, options = {}) {
        this.element = element;
        this.threshold = options.threshold || 80;
        this.onSwipeLeft = options.onSwipeLeft || (() => { });
        this.onSwipeRight = options.onSwipeRight || (() => { });
        this.onDragMove = options.onDragMove || (() => { });

        this.isLocked = false;
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;

        this.bindEvents();
    }

    bindEvents() {
        // Pointer events for unified mouse/touch handling
        this.element.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.element.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.element.addEventListener('pointerup', this.onPointerUp.bind(this));
        this.element.addEventListener('pointercancel', this.onPointerUp.bind(this));
        this.element.addEventListener('pointerleave', this.onPointerUp.bind(this));

        // Prevent context menu on long press
        this.element.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onPointerDown(e) {
        if (this.isLocked) return;

        this.isDragging = true;
        this.startX = e.clientX;
        this.currentX = e.clientX;

        // Capture pointer for reliable tracking
        this.element.setPointerCapture(e.pointerId);

        document.body.style.cursor = 'grabbing';
    }

    onPointerMove(e) {
        if (!this.isDragging || this.isLocked) return;

        this.currentX = e.clientX;
        const deltaX = this.currentX - this.startX;

        // Feedback during drag
        this.onDragMove(deltaX);

        // Visual arrow feedback
        this.updateArrows(deltaX);
    }

    onPointerUp(e) {
        if (!this.isDragging) return;

        const deltaX = this.currentX - this.startX;

        if (Math.abs(deltaX) >= this.threshold) {
            if (deltaX < 0) {
                this.onSwipeLeft();
            } else {
                this.onSwipeRight();
            }
        }

        this.isDragging = false;
        this.resetArrows();
        document.body.style.cursor = 'grab';
    }

    updateArrows(deltaX) {
        const leftArrow = document.getElementById('arrow-left');
        const rightArrow = document.getElementById('arrow-right');

        if (deltaX < -30) {
            leftArrow?.classList.add('active');
            rightArrow?.classList.remove('active');
        } else if (deltaX > 30) {
            rightArrow?.classList.add('active');
            leftArrow?.classList.remove('active');
        } else {
            this.resetArrows();
        }
    }

    resetArrows() {
        document.getElementById('arrow-left')?.classList.remove('active');
        document.getElementById('arrow-right')?.classList.remove('active');
    }

    lock() {
        this.isLocked = true;
    }

    unlock() {
        this.isLocked = false;
    }
}
