# Pixel Duel 2.0

Pixel Duel is a pixel-art fantasy fighting game for two players. Pick a class and sprite variant, vote privately on a battlefield, then choose moves simultaneously. The server resolves combat and keeps both players synchronized.

## Play online

**[Play Pixel Duel](https://pixel-duel-n6kl.onrender.com)**

The game features six character classes, 18 selectable sprite variants, five battlefields, animated combat, private map voting, rematches, and a local in-game menu for leaving a match.

## Run locally

Requires Node.js 18 or newer.

```bash
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000) in two browser windows to play a local multiplayer match.

Run the automated tests with:

```bash
npm test
```

Deployment configuration and hosting notes are in [docs/deployment.md](docs/deployment.md).
