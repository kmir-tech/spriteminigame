/**
 * Circle collision detection utilities
 */
export class Collision {
    // Check if two circles overlap
    static circleVsCircle(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const radSum = r1 + r2;
        return distSq < radSum * radSum;
    }

    // Check if circle is inside rectangle bounds
    static circleInBounds(x, y, r, bounds) {
        return x - r >= bounds.left &&
            x + r <= bounds.right &&
            y - r >= bounds.bottom &&
            y + r <= bounds.top;
    }

    // Clamp circle position to bounds
    static clampToBounds(x, y, r, bounds) {
        return {
            x: Math.max(bounds.left + r, Math.min(bounds.right - r, x)),
            y: Math.max(bounds.bottom + r, Math.min(bounds.top - r, y))
        };
    }

    // Check if point is outside bounds
    static isOutOfBounds(x, y, bounds) {
        return x < bounds.left || x > bounds.right ||
            y < bounds.bottom || y > bounds.top;
    }
}
