** This is a work in progress, it is not deployed yet. I will deploy it when it is done. Do not try to use this yet. **

# iloader-next

A combined web and desktop app for sideloading iOS apps. The next generation of iloader.

## Architecture

To make maintainability easier (though it may actually make it harder...) this repo is a single codebase that serves both the web and desktop versions of the app.

Layout:

```
- frontend
  - src # React frontend code
  - src-tauri # Tauri desktop app code, exposes tauri commands for iloader-core
- rust
  - iloader-core # Core rust code powering both apps
  - server # Proxy server for the web app
  - wasm # WASM bindings for iloader-core
```

All the sideloading logic is actually in a separate crate, [isideload](https://github.com/nab138/isideload). That crate can be used by any rust project, and is what powers both the web and desktop versions of iloader. The `iloader-core` crate is just a thin wrapper around `isideload` and `idevice` that provides some additional functionality and makes it easier to use in the context of iloader.

### Development

For your convenience, a `dev` script is available to handle compiling the wasm, running the Tauri desktop app, and starting the web server. It will watch for changes and automatically rebuild as needed. It's very janky though.

This guide assumes you have [bun](https://bun.sh) and [rust](https://rust-lang.org/learn/get-started/) installed.

Install dependencies:

```
bun i && cd frontend && bun i && cd ..
```

Install wasm-pack:

```
cargo install wasm-pack
```

Install Tauri CLI:

```
cargo install tauri-cli
```

Start dev server:

```
RUSTFLAGS="--cfg=web_sys_unstable_apis" bun dev
```

You can also add the rustflags to your global cargo config to avoid having to specify it manually.

## Credits

- Icon made by [Transistor](https://github.com/transistor-exe)
- [nythepegasus](https://github.com/nythepegasus) provided guidance on apple's API's and other technical details, provided [PyDunk](https://github.com/nythepegasus/PyDunk) as a reference implementation for GrandSlam
- [jkcoxson](https://github.com/jkcoxson) offered a lot of advice and help during this project, and created:
  - [idevice](https://github.com/jkcoxson/idevice) which is used to communicate with the device
  - [netmuxd](https://github.com/jkcoxson/netmuxd) which allows the browser to communicate with the device over usb, and
  - [idevice_pair](https://github.com/jkcoxson/idevice_pair) which is used for pairing file management
- A [heavily modified version of apple-platform-rs](https://github.com/nab138/isideload-apple-platform-rs) is used for codesigning, based off [plume-apple-platform-rs](https://github.com/plumeimpactor/plume-apple-platform-rs)
- [Impactor](https://github.com/khcrysalis/Impactor) was used as a reference for cryptography, codesigning, and provision file parsing.
- [Sideloader](https://github.com/Dadoum/Sideloader) was used as a reference for how apple private developer endpoints work
- App made with [tauri](https://tauri.app)
