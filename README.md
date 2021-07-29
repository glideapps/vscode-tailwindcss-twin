<p align="center">
  <img src="https://i.imgur.com/U2PIUW2.jpeg">
</p>

<<<<<<< HEAD
This is a VSCode Tailwind IntelliSense Extension which supports [twin.macro](https://github.com/ben-rogerson/twin.macro)

[Install via the Marketplace](https://marketplace.visualstudio.com/items?itemName=lightyen.tailwindcss-intellisense-twin)

https://user-images.githubusercontent.com/28860476/138010418-9a6a4aac-3429-4b48-bab4-97e7416e1389.mp4
=======
<h1 align="center">Tailwind Twin IntelliSense</h1>
>>>>>>> Update README to contain install instructions

<div align="center">
 Tailwind CSS IntelliSense VSCode Extension which supports Glide specific tailwind classes
</div>

<br>

<<<<<<< HEAD
Support ONLY `*.tsx` and `*.jsx`
=======
## Install Instructions

**Before installing**:
>>>>>>> Update README to contain install instructions

-   Verify any existing `Tailwind CSS IntelliSense` is uninstalled from your VS Code.
-   Have `yarn` installed.

```bash
npm install --save-dev @glideapps/prettier-plugin-glide-tailwind

git clone https://github.com/glideapps/vscode-tailwindcss-twin

<<<<<<< HEAD
### Defaults

```json5
{
  "tailwindcss.colorDecorators": "inherit", // inherit from "editor.colorDecorators"
  "tailwindcss.references": true,
  "tailwindcss.diagnostics": {
    "enabled": true,
    "conflict": "strict",
    "emptyClass": true,
    "emptyGroup": true,
    "emptyCssProperty": true
  },
  "tailwindcss.preferVariantWithParentheses": false,
  "tailwindcss.fallbackDefaultConfig": true,
  "tailwindcss.enabled": true,
  "tailwindcss.jsxPropImportChecking": true,
  "tailwindcss.rootFontSize": 16,
  "tailwindcss.logLevel": "info",
  "tailwindcss.documentColors": false,
  "tailwindcss.hoverColorHint": "none"
}
```

### Custom CompletionList Panel

```json5
// example
{
  "workbench.colorCustomizations": {
    "[One Dark Pro Darker]": {
      "editorHoverWidget.background": "#1f2229e8",
      "editorSuggestWidget.background": "#1f2229e8",
      "editor.wordHighlightBackground": "#0000",
      "editor.wordHighlightBorder": "#3f3f3f3d",
      "editor.wordHighlightStrongBorder": "#3f3f3f3d"
    }
  }
}
```

### Custom Semantic Colors [(docs)](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)

```json5
{
  "editor.tokenColorCustomizations": {
    "[One Dark Pro Darker]": {
      "textMateRules": [
        {
          "scope": "support.constant.classname.twin",
          "settings": {
            "foreground": "#abb2bf"
          }
        },
        {
          "scope": "entity.other.inherited-class.variant.twin",
          "settings": {
            "foreground": "#c678dd"
          }
        },
        {
          "scope": "support.type.short-css.prop.twin",
          "settings": {
            "foreground": "#5dbeff"
          }
        },
        {
          "scope": "punctuation.section.embedded.short-css",
          "settings": {
            "foreground": "#5dbeff"
          }
        },
        {
          "scope": "support.type.arbitrary-style.prop.twin",
            "settings": {
              "foreground": "#8a88fc"
            }
        },
        {
          "scope": "support.type.arbitrary-style.endOpacity.twin",
            "settings": {
              "foreground": "#c05b5b6b"
            }
        },
        {
          "scope": "punctuation.section.embedded.arbitrary-style",
             "settings": {
               "foreground": "#8a88fc"
            }
        },
        {
          "scope": "entity.name.variable.css-value.twin",
          "settings": {
            "foreground": "#abb2bb"
          }
        }
      ]
    }
  }
}
```
=======
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
>>>>>>> Update README to contain install instructions
