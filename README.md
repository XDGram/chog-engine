# CHOG ENGINE

A real-time, counter-only boss fighter. Each Chog has a fixed personality and three phase cores. The player has three lives; only a successful counter during a boss opening breaks a core.

## Play the prototype

```bash
npm install
npm run dev
```

Choose Heavy, Erratic, or Gravity and enter the arena. Move with WASD or the arrow keys, dodge with Space or Shift, and counter with J. Pointer input also dodges, or counters when an opening is active.

## Boss patterns

- **Heavy:** dodge the marked power swing; counter during its recovery.
- **Erratic:** evade three tracking pulses, move to the marked safe pocket, and counter during exhaust.
- **Gravity:** move during the field flip to escape its origin, then counter once gravity settles.

All three Chogs use the same three-core, three-life rules. Clear time is recorded locally per boss; a no-hit run is marked in the result. A death ends and resets the run. Wallet, NFT mapping, and on-chain ranking are not part of this offline combat prototype.

## Stack

TypeScript, Vite, Canvas 2D. Phaser remains available as a project dependency for future game systems.
