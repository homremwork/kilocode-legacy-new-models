---
"kilo-code": patch
---

Eliminate the legacy ripgrep postinstall downloader from CI by moving to @vscode/ripgrep 1.18.0 platform packages, pinning deterministic installs, and pin Windows native-module CI to the Visual Studio 2022 runner supported by the current node-gyp toolchain.
