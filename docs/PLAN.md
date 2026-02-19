# Plan: Media Detail Modal UI/UX Overhaul (Cinema Mode)

## 🎯 Objective
Create a **premium, full-screen "Cinema Mode"** for media details that completely eliminates double scrollbars.
-   **Core Goal 1**: Maxiumum screen usage (95vw / 90vh).
-   **Core Goal 2**: **Zero Scroll** on the modal body itself. Only specific panels scroll internally.
-   **Core Goal 3**: **Fixed Sidebar** (Right) always visible, with tabs fully expanded.

## 🛠️ Layout Strategy: "Cinema Mode" (Split View)

### 1. The Container (The Fix for Scrollbars)
-   **Modal**: `width: 95vw`, `height: 90vh`, `padding: 0`.
-   **Modal Body**: `flex h-full w-full overflow-hidden` (This is the KEY fix).
-   **Grid Layout**:
    -   **Left Panel (Preview)**: `flex-1 (approx 70%)`, `h-full`, `bg-gray-100/dark:bg-black`.
        -   **Content**: `flex items-center justify-center h-full w-full`.
        -   **Scroll**: `overflow-hidden` by default. `overflow-auto` ONLY for deep zoom or PDF if needed (internal).
    -   **Right Panel (Info/Tabs)**: `w-[400px] (fixed)`, `h-full`, `bg-white/dark:bg-gray-900`, `border-l`.
        -   **Header**: Fixed Tabs at Top (Never scroll).
        -   **Body**: `flex-1 overflow-y-auto` (The ONLY scrollbar user typically interacts with).

### 2. The Right Panel (The Fix for Tabs)
-   **Width**: Fixed `400px` (Wide enough for 4 tabs: Info | AI | Auto | Ver).
-   **Tabs Style**:
    -   **Compact Modern**: Icons + Short Text (e.g., `Info`, `AI`, `Auto`, `History`).
    -   **No overflow**, no scroll arrows.
-   **Content Flow**: All metadata, tags, and versions live here. Long content scrolls vertically *inside* this panel, leaving the rest of the UI stable.

### 3. The Left Panel (Preview Excellence)
-   **Image**: `object-contain`, centered. No crop.
-   **Video**: Native controls, `max-h-full`.
-   **PDF/Doc**:
    -   Use `iframe` or `DocumentPreview` set to `h-full w-full`.
    -   Let the viewer handle internal scrolling (e.g., PDF sidebar).
    -   **Result**: The user scrolls *inside* the document, not the modal page.

## 👥 Agent Orchestration
-   **frontend-specialist**: Execute the "Cinema Mode" CSS/Layout changes.
-   **test-engineer**: Verify strict `overflow-hidden` on parent containers.

## ✅ Success Criteria
-   [ ] **Zero Page/Body Scroll**: The modal never triggers a browser window scrollbar.
-   [ ] **Single Internal Scroll**: Only the Right Sidebar content scrolls vertically.
-   [ ] **Full Tabs**: All 4 tabs visible in the sidebar header without horizontal scrolling.
-   [ ] **Maximized Preview**: Images/Videos use ~70% of screen width.
