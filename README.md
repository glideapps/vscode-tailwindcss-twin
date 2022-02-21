<p align="center">
  <img src="https://i.imgur.com/U2PIUW2.jpeg">
</p>

This is a VSCode Tailwind IntelliSense Extension which supports [twin.macro](https://github.com/ben-rogerson/twin.macro)

[Install via the Marketplace](https://marketplace.visualstudio.com/items?itemName=lightyen.tailwindcss-intellisense-twin)

<div align="center">
 Tailwind CSS IntelliSense VSCode Extension which supports Glide specific tailwind classes
</div>

<br>

Support ONLY `*.tsx` and `*.jsx`
## Install Instructions

**Before installing**:

-   Verify any existing `Tailwind CSS IntelliSense` is uninstalled from your VS Code.
-   Have `yarn` installed.

```bash
npm install --save-dev @glideapps/prettier-plugin-glide-tailwind

git clone https://github.com/glideapps/vscode-tailwindcss-twin

cd vscode-tailwindcss-twin

yarn install
yarn build
yarn package
```

Then go to VSCode and open up your command palate and enter:

`Extensions: Install from VISX...`

Navigate to the location where you cloned the `vscode-tailwindcss-twin` repo where you'll find the VSIX file called:

`tailwindcss-intellisense-twin-0.8.5.vsix`

It will ask you to restart your VScode, Restart it.

_Important Note:_

> Sometimes VScode will decide to install the extension in the marketplace instead of the fork. Might be because we need to change the name of the fork

## Features

-   auto completion
-   hover
-   color decoration
-   document references
-   diagnostics

## Supported

Support ONLY `react` and `twin.macro`
