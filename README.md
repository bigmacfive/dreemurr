# dreemurr

A local-first spatial canvas for macOS and Windows.

Drop cards anywhere. Connect them. Group them into boxes. Your boards live on disk as `.dreem` files in `~/Documents/dreemurr` — not in a cloud account.

<p align="center">
  <img src="./src-tauri/icons/icon-1024.png" alt="dreemurr" width="160">
</p>

## Install

Grab a build from [Releases](https://github.com/bigmacfive/dreemurr/releases) or the latest [Actions](https://github.com/bigmacfive/dreemurr/actions) artifacts.

- **macOS:** `.dmg` — drag **dreemurr** into Applications. Unsigned; allow it under System Settings → Privacy & Security if Gatekeeper complains.
- **Windows:** `.exe` NSIS installer from the `dreemurr-windows` artifact. Spaces go in `%USERPROFILE%\Documents\dreemurr`.

## What it is

- Spatial notes: cards, connections, boxes, lists, drawing
- Multiple spaces, search, tags, and tasks
- JSON / `.dreem` import and export
- URL previews and YouTube embeds without a Kinopio account
- Trackpad / scroll pan, local `.dreem` files, desktop window chrome

Based on [Kinopio](https://kinopio.club). This is a desktop fork, not the hosted product.

## Develop

```bash
git clone https://github.com/bigmacfive/dreemurr.git
cd dreemurr
npm install
npm run desktop
```

```bash
npm run test
npm run desktop:build   # macOS .app/.dmg or Windows NSIS, depending on host
```

Spaces are stored at `~/Documents/dreemurr/*.dreem` (Windows: `%USERPROFILE%\Documents\dreemurr`). Every valid file in that folder appears in the in-app space list.

## License

[PolyForm Noncommercial 1.0.0](./LICENSE.md). Kinopio is © Kinopio LLC. dreemurr is an independent desktop fork.
