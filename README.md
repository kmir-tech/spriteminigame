 ## Project Summary

  An interactive web application combining a 3D Character Selection Dashboard and a 2D-in-3D Action Rogue-Lite Mini-
  Game. Built using native WebGL rendering via Three.js, the project features skeletal model loading, custom keyframe
  sprite animations, a modular state-driven game loop, procedural room-based progression, and custom collision/audio
  systems.
  ──────
  ## Technical Stack

  • Core: ES6+ JavaScript, HTML5, Vanilla CSS3 (Custom Glassmorphism Design System)
  • 3D Graphics & Physics: Three.js (WebGL, GLTFLoader, OrbitControls, AnimationMixers, Particle Systems)
  • Animations: GSAP (GreenSock Animation Platform) for camera pathing and UI transitions
  • Audio Engine: Web Audio API (custom sound manager with dynamic audio playback)
  • Build & Bundling: Vite, npm
  ──────
  ## Key Features & Architectural Accomplishments

  ### 1. 3D Character Selection Interface

  • Designed a dynamic selection hub displaying distinct character classes (Warrior, Mage, Assassin, Tank) with custom
  metrics, scaling stat bars, and playstyle descriptions.
  • Implemented GLTFLoader to load complex  .glb  character models, integrating a keyframe animation system
  (AnimationMixer) to handle real-time action playback (Idle, Walk, Run, and Groove loops) upon user interaction.
  • Utilized GSAP to orchestrate seamless, non-blocking camera movements and transitions between characters.

  ### 2. Hybrid 2D-in-3D Action Game Engine

  • Engineered a high-performance 2D sprite rendering system within a 3D coordinate space using custom texture-mapped
  planes, akin to retro-modern titles like The Binding of Isaac.
  • Developed a state-driven game engine ( GameEngine ) handling game loop cycles via  requestAnimationFrame  with
  delta-time throttling to ensure uniform gameplay speeds across varying hardware refresh rates.
  • Created a custom Collision System supporting axis-aligned bounding boxes (AABB), circle-to-circle, and circle-to-
  box checks for bullet hits, player boundaries, and enemy knockbacks.

  ### 3. Rogue-Lite Systems & Entity Managers

  • Coded a modular room progression system ( Room.js ) generating normal battle rooms, boss arenas, and interactive
  transition stages.
  • Built decoupled manager classes ( EnemyManager ,  ProjectileManager ,  PowerUpManager ) leveraging object pooling
  practices to reduce garbage collection spikes during high-intensity bullet patterns.
  • Integrated a roguelike progression cycle with interactive card-selection screens granting permanent or room-level
  stat improvements (e.g., armor rating, piercing ammunition, velocity).

  ### 4. UI/UX & Sensory polish

  • Built a custom Single Page Application (SPA) Router in vanilla JS to transition routes (Home → Characters →
  Gameplay) with zero page-reloads.
  • Crafted visual polish including screen shake effects, hit flash indicators, and custom particle engines.
  • Designed a unified audio layer using the Web Audio API featuring ambient background tracks and dynamic sound
  effects synced with player actions.
