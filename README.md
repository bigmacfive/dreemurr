# dreemurr

Local-first spatial canvas for macOS. Cards, connections, boxes, and boards live on your machine — spaces are saved as `.dreem` files in `~/Documents/dreemurr`.

Based on [Kinopio](https://kinopio.club) (`kinopio-client`), adapted as a Tauri desktop app.

<img src="./src/assets/logos/logo-base.png" alt="dreemurr" width="120">

## Install

Download the latest **`.dmg`** from [Releases](https://github.com/bigmacfive/dreemurr/releases). Open it and drag `dreemurr.app` to Applications.

## Develop

```bash
npm install
npm run desktop
```

Vite must be able to build the UI; `npm run desktop` launches the native window.

```bash
npm run test
npm run desktop:build   # dreemurr.app + .dmg
```

## Data

- Spaces: `~/Documents/dreemurr/*.dreem`
- Every `.dreem` file in that folder shows up in the in-app space list

## License

PolyForm Noncommercial 1.0.0. See `LICENSE.md`. Kinopio is © Kinopio LLC; this desktop fork is not an official Kinopio product.
