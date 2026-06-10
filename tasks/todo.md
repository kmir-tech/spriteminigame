# Roguelike Power-ups & Boss System - Task Tracker

## Completed ✅

### Phase 1: Power-Up System
- [x] Create `PowerUp.js` with 6 power-up types
- [x] Define power-up effects (apply to player)
- [x] Create `PowerUpManager` class

### Phase 2: Boss Enemy
- [x] Add `BossEnemy` class to `Enemy.js`
- [x] Larger sprite (2.0), higher HP/damage (25)
- [x] Add `spawnBoss(x, y, hp)` to `EnemyManager`

### Phase 3: Room Manager
- [x] Add `bossesDefeated` counter
- [x] Add `isBossRoom()` method (every 5 rooms)
- [x] Calculate boss HP: `100 * 2^bossesDefeated`

### Phase 4: Power-Up Selection UI
- [x] Create card selection overlay (3 cards)
- [x] Pause game during selection
- [x] Apply selected power-up
- [x] Resume game after selection
- [x] CSS styling for cards and overlay

### Phase 5: Integration
- [x] Spawn boss on boss rooms
- [x] Trigger power-up selection after boss defeat
- [x] Update HUD with active power-ups
- [x] Boss HP bar in center of screen
- [x] Reset power-ups on restart

### Phase 6: Player Updates
- [x] Add `damageReduction` for Armor power-up
- [x] Add `pierceCount` for Piercing power-up
- [x] Apply damage reduction in `takeDamage()`

---

## Testing Checklist
- [ ] Test boss spawning every 5 rooms
- [ ] Test boss HP doubling (100 → 200 → 400)
- [ ] Test power-up selection UI appears
- [ ] Test each power-up effect

---

## Review Notes
- Boss HP: 100 → 200 → 400 → 800 (doubles each boss)
- Power-ups: Pick 1 from 3 random cards
- Boss rooms: Every 5th room (5, 10, 15, 20...)
- 6 power-ups: Vitality, Swift Boots, Power Shot, Rapid Fire, Iron Skin, Piercing Rounds
