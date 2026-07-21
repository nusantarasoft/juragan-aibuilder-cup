# Native PrimeReact Dock & Dialog Update

## Overview
We have fully transitioned the custom macOS-style dock component to utilize native **PrimeReact** components (`primereact/dock` and `primereact/dialog`), drastically simplifying the codebase while providing native macOS-style physics, magnification, and window management.

## What Was Updated

### 1. PrimeReact `<Dock />` Integration
- **Removed Custom Physics:** The custom Framer Motion physics engine was gutted.
- **Native Magnification:** We are now utilizing the official `import { Dock } from 'primereact/dock'` component. This provides a buttery-smooth, native "fisheye" magnification effect out-of-the-box.
- **Sleek Dock Shelf:** The dock is wrapped in a heavily blurred, glassy pill shape to seamlessly match your system aesthetics.
- **Freestanding 3D Emoji Icons:** The standalone emojis are injected directly into the PrimeReact `template` renderer, giving them high-fidelity scaling and perfect drop shadows.

### 2. PrimeReact `<Dialog />` Integration
- **Removed Custom Windows:** The custom drag-and-drop `DockWindow` wrapper was gutted.
- **Native Window Management:** The widgets are now powered by `import { Dialog } from 'primereact/dialog'`.
- **System Theme Integration:** We pushed the Ant Design system integration directly into the PrimeReact passthrough (`pt`) props. The Dialogs now utilize `token.colorBgElevated` with a 70% opacity and a massive `blur(50px)` backdrop filter, perfectly mimicking the previous frosted-glass UI.
- **Advanced Controls:** By using PrimeReact Dialogs, your widget windows now have native drag-and-drop, native edge resizing, and native maximize/minimize header controls right out of the box!

## Verification
1. **Move your mouse** quickly back and forth across the dock to see the native PrimeReact fisheye magnification effect in action.
2. **Open the Calculator** and try clicking the **Maximize** icon in the header, or try dragging the edges of the window to resize it!
3. Switch your CMS to **Dark Mode** and watch the PrimeReact dialogs natively adapt their frosted-glass panels.
