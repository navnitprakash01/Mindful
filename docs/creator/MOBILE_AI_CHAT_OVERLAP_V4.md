# Mobile AI Chat BottomNav Overlap & Compact Floating Navigation — Final Specification

## 1. Executive Summary & Root Cause

In previous iterations (V1, V2, V3), the AI Chat screen relied on `BottomNav` being `position: fixed` floating as a ~100px overlay on top of the mobile viewport, which led to occlusion of the chat messages and action pathway buttons. While an initial flex-flow repair moved `BottomNav` below the input, a permanent ~100px bar occupied too much vertical real estate on phone screens.

### Final Architecture:
- **Phone AI Chat (`< 768px`)**: The permanent ~100px `BottomNav` bar is completely removed. In its place, a **compact floating navigation button/menu** (44×44px glass capsule with a popup menu) is positioned alongside the input bar. The chat scroll container expands to take **maximum usable screen space** (>500px on standard phone viewports).
- **Tablet ($768\text{px} \le \text{width} < 1024\text{px}$)**: Preserves the standard horizontal BottomNav capsule with all 6 navigation items.
- **Desktop ($\ge 1024\text{px}$)**: BottomNav is hidden (`lg:hidden`). Top header navigation and centered sticky chat layout are preserved.
- **Other Mobile Screens (Dashboard, Journal, etc.)**: Preserves the standard BottomNav on both phone and tablet.

---

## 2. Phone AI Chat Navigation Contract

### Visual & Physical Hierarchy
```
┌─────────────────────────────────────────────────────────────┐  0px
│ App Header (Mindful logo, Pro badge, Audio, Profile)        │  ~78px
├─────────────────────────────────────────────────────────────┤
│ AI Companion Header (Session #24, Voice, Clear)             │  ~50px
├─────────────────────────────────────────────────────────────┤
│ Mode Selector & Badge                                       │  ~60px
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ .chat-messages-scroll (flex: 1 1 0%; min-height: 0)         │
│                                                             │
│ Welcome Message                                             │
│ Pathway 1 ("Guide me through a calming breath")             │
│ Pathway 2 ("Help me reframe this feeling")                  │
│ Pathway 3 ("What patterns do you notice?")                  │
│                                                             │
│ (Over 270px of clean, open visible space!)                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤  ~766px
│ [🧭 Floating Nav]   [ Share what's on your mind... ]   [➤]  │
└─────────────────────────────────────────────────────────────┘  844px
```

### Key Guarantees:
1. **Zero Occlusion**:
   - The compact floating button (44×44px) sits at `left: 16px` on the exact same vertical baseline as the chat input form.
   - The chat input form starts at `left: 72px` (`phone-chat-input-container`).
   - The send button sits on the far right (`right: 16px`).
   - Neither the floating button nor the input bar hovers over or covers AI responses or pathway buttons.
2. **Expanded Navigation Popover**:
   - Tapping the floating navigation button expands an animated floating glass menu (`w-56`, `backdrop-blur-[40px]`) directly above the button.
   - Shows all 6 destinations: Journal, AI Chat (active pill), Home (Dashboard), Mood, Habits, Insights.
   - Selecting any destination navigates immediately and closes the menu.
   - Clicking outside or pressing `Escape` closes the menu.
   - When expanded, it leaves >70% of the upper conversation visible and unobscured.

---

## 3. Files Modified

1. [`src/components/layout/BottomNav.tsx`](file:///d:/TRAINING%20PROJECT%201/src/components/layout/BottomNav.tsx):
   - Removed obsolete `ResizeObserver` and dynamic window listeners.
   - On Phone AI Chat (`isCompanion` AND `< 768px` via `md:hidden`): renders the compact floating navigation button and animated popover menu.
   - On Tablet AI Chat (`isCompanion` AND `hidden md:flex lg:hidden`): renders the standard horizontal capsule.
   - On other views (`!isCompanion`): renders the standard horizontal capsule on phone and tablet (`flex lg:hidden`).
2. [`src/components/features/AICompanionView.tsx`](file:///d:/TRAINING%20PROJECT%201/src/components/features/AICompanionView.tsx):
   - Outer container: `h-full min-h-0 flex flex-col overflow-hidden pt-2 sm:pt-4 lg:pt-20 lg:pb-8 lg:h-auto lg:min-h-screen lg:overflow-visible`.
   - Input container: uses `.phone-chat-input-container` to reserve 56px on the left on phone viewports for the floating button, clearing room for both elements on the same row.
3. [`src/index.css`](file:///d:/TRAINING%20PROJECT%201/src/index.css):
   - Added `.phone-chat-input-container` (`padding-left: 3.5rem; padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))`).
   - Added `.mobile-companion-shell` for bounded 100dvh phone shell.
   - Cleaned up obsolete `--bottom-nav-height` and compensation tokens.
4. [`src/components/layout/Header.tsx`](file:///d:/TRAINING%20PROJECT%201/src/components/layout/Header.tsx):
   - Flow-docked `relative shrink-0` on mobile companion view; `fixed top-0` on desktop and other views.
5. [`src/App.tsx`](file:///d:/TRAINING%20PROJECT%201/src/App.tsx):
   - Conditionally applies `mobile-companion-shell` and `app-main` on companion view.

---

## 4. Multi-Device Verification Matrix

Automated headless Chrome test results (`scratch/verify_floating_nav.js`):

| Test Case | Viewport | Device Mode | Floating Nav Button | Standard 100px Nav | Pathway 3 Bottom | Scroll Height | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Phone Ref** | 390 × 844 | Phone | **Visible (44px)** | **Hidden (0px)** | 495.3px | **509px** | **PASS** |
| **Compact** | 375 × 667 | Phone | **Visible (44px)** | **Hidden (0px)** | 481.3px | **332px** | **PASS** |
| **Large Android**| 412 × 915 | Phone | **Visible (44px)** | **Hidden (0px)** | 480.3px | **595px** | **PASS** |
| **Keyboard Open**| 390 × 500 | Phone | **Visible (44px)** | **Hidden (0px)** | 402.3px | **165px** | **PASS** |
| **Tablet** | 768 × 1024| Tablet | Hidden (`0px`) | **Visible (6-item capsule)** | 505.5px | **583px** | **PASS** |
| **Desktop** | 1440 × 900| Desktop | Hidden (`0px`) | Hidden (`0px`) | 491.5px | **534px** | **PASS** |
| **Dashboard** | 390 × 844 | Phone | Hidden (`0px`) | **Visible (6-item capsule)** | — | — | **PASS** |

### Acceptance Criteria Checklist:
1. Phone AI Chat has compact floating navigation: **YES** (44×44px button at bottom left).
2. No ~100px permanent BottomNav on phone AI Chat: **YES** (`standardNavVisible === false`).
3. Full AI response remains readable: **YES** (Chat scroll container receives 509px height).
4. All 3 pathway buttons remain accessible: **YES** (>270px clearance above input).
5. Chat input and send button remain accessible: **YES** (Input starts at 72px, Send is at 347px).
6. Expanded navigation does not obscure conversation content: **YES** (Popover anchors to button, upper conversation remains completely readable).
7. Tablet remains unchanged: **YES** (Standard horizontal BottomNav capsule renders).
8. Desktop remains unchanged: **YES** (Desktop top header & centered sticky input render).
9. Other mobile screens remain unchanged: **YES** (Dashboard and other views render existing BottomNav).
10. `npm run lint` passes: **YES** (0 errors).
11. `npm run build` passes: **YES** (0 errors).
12. No Git commit or push: **YES** (Working tree modified only).
