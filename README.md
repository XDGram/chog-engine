# CHOG ENGINE: Riftbreakers

A browser-based, cinematic 2.5D Chog NFT boss-fighting game. Built with TypeScript, Canvas 2D and Vite, with no external art assets required.

## Run
```bash
npm install
npm run dev
```
For a production build: `npm run build`.

## Play
- **WASD / arrow keys:** move around the arena
- **Space / Shift:** dodge (brief invulnerability)
- **J / click COUNTER:** counter only while a boss is exposed
- **Enter:** begin or restart
- Touch-friendly dodge/counter controls are included on small screens.

## Game design
Each Chog NFT is a distinct boss identity, not the player avatar. Choose a Riftbreaker fighter, then face the Heavy, Erratic and Gravity Chogs. Every boss has three cores/phases; the player has three shared lives. Only a successful counter during a recovery window breaks a core. There are no basic attacks or chip damage. A death resets the ranked run to phase one. Clear time is the primary score; no-hit is a badge/tie-breaker. Best times are stored locally.

This is an offline playable prototype. Wallet ownership verification, NFT metadata ingestion, multiplayer, and on-chain rankings are not implemented and are not implied by the UI.
