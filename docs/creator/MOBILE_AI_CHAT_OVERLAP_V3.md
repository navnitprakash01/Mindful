# Mobile AI Chat BottomNav Overlap — Production Architecture & Root-Cause Fix (V3)

## 1. Executive Summary

This document specifies the definitive architectural resolution for the mobile AI Chat screen layout defect where the fixed navigation bar (`BottomNav`) previously occluded suggested action buttons and the chat input bar on mobile devices.

The resolution eliminates guesswork and arbitrary padding values by implementing:
1. **Empirically Measured DOM Geometry** across real devices and emulated viewports.
2. **Dynamic Measurement via `ResizeObserver` & Layout Token (`--actual-bottom-nav-space`)**: Real-time DOM metric binding that adapts dynamically to viewport changes, device safe-area insets, and user font scaling.
3. **Three-Layer Viewport Flex Architecture**: Explicit physical decoupling between scrollable chat content, docked input bar, and fixed navigation.
4. **Preserved Desktop Ergonomics**: Zero disruption or styling regression on desktop (`lg:`, $\ge 1024\text{px}$).

---

## 2. Real DOM Footprint & Why Previous Attempts Failed

### Measured Geometry (390 × 844 Viewport)

Using headless Chrome with Chrome DevTools Protocol (CDP), the true DOM bounding boxes of the mobile layout were captured:

| Element | Selector / Role | Top | Bottom | Height | z-index | Position |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`BottomNav`** | `nav.lg:hidden` | `740px` | `824px` | `84px` | `50` | `fixed` |
| **Bottom Offset** | `bottom: calc(1.25rem + env(...))` | `824px` | `844px` | `20px` | — | — |
| **Total Nav Space** | Height + Offset | `740px` | `844px` | **`104px`** | — | — |
| **Chat Input** | `.chat-input-docked` | `662px` | `724px` | `62px` | `40` | `relative` |
| **Safe Clearance Gap** | Input bottom to Nav top | `724px` | `740px` | **`16px`** | — | — |
| **Scroll Container** | `.chat-messages-scroll` | `303px` | `650px` | `347px` | — | `relative` (scroll) |
| **Suggested Pathways** | Action chips container | `443.25px` | `549.25px` | `106px` | — | inside scroll |

### Why Previous Attempts Failed

1. **Attempt V1 (Fixed-Height & Sticky Assumption):**
   - Assumed `BottomNav` was $\approx 68\text{px}$ high. In reality, the capsule (icons + label + padding) is **$84\text{px}$** plus a $20\text{px}$ (`1.25rem`) bottom offset, requiring **$104\text{px}$** of baseline viewport space before safe-area insets.
   - Used `position: sticky` on the chat input bar. On mobile Safari/WebKit, `position: sticky` elements inside inertia-scrolling parents desynchronize during rapid touch gestures or rubber-banding, allowing the input to slip underneath fixed `z-50` chrome.
2. **Attempt V2 (Static Margin Guesswork):**
   - Attempted hardcoded bottom padding without coupling to the actual rendered capsule rect.
   - On varying screen sizes (e.g. iPhone SE 667px height, Pixel 915px height, or devices with larger iOS home bar insets), static values either clipped the suggested pathways or caused unneeded dead space.

---

## 3. The 3-Layer Viewport Flex Architecture

The mobile layout is structured as three strictly separated vertical zones:

```
+-------------------------------------------------------------+  0px
| Top Header (Fixed / Floating)                               |
+-------------------------------------------------------------+
| Zone 1: Chat Container (.chat-screen-layout)                |
|         height: 100dvh; max-height: 100dvh; overflow: hidden|
|                                                             |
|   - Fixed Header / Mode Selector / Badge (shrink-0)         |
|   - Scroll Container (.chat-messages-scroll)                |
|     (flex: 1 1 0%; min-height: 0; overflow-y: auto)         |
|     * All messages & suggested action pathways scroll here  |
|     * Window document NEVER scrolls (window.scrollY === 0)  |
|                                                             |
| Zone 2: Docked Chat Input (.chat-input-docked)              |
|         shrink-0; relative; z-index: 40                     |
|         margin-bottom: var(--actual-bottom-nav-space, 120px)|
+-------------------------------------------------------------+  724px
| Safe Physical Gap (16px)                                    |
+-------------------------------------------------------------+  740px
| Zone 3: BottomNav (nav.fixed.lg:hidden)                     |
|         z-index: 50; height: 84px; bottom: 20px + safe-area |
+-------------------------------------------------------------+  844px (viewport bottom)
```

### Architectural Principles:
1. **Window Never Scrolls**: `chat-screen-layout` is bounded by `100dvh` and `overflow: hidden`. The browser window stays at `scrollY = 0`, preventing bottom bar clipping and bounce-desynchronization.
2. **Input Is Docked, Not Sticky**: On mobile, `.chat-input-docked` is a standard flex child with `flex-shrink: 0`. It sits directly above the bottom clearance margin.
3. **Scroll Container Absorbs Dynamic Height**: `.chat-messages-scroll` uses `flex: 1 1 0%` and `min-height: 0`. Whether the viewport is 844px, 667px, or 500px (virtual keyboard), the scroll container automatically sizes to the available remainder.

---

## 4. Dynamic Measurement Strategy (`ResizeObserver`)

Rather than maintaining fragile hardcoded offsets across OS versions, `BottomNav.tsx` actively measures its own geometry and exposes `--actual-bottom-nav-space` to `:root`:

```tsx
// src/components/layout/BottomNav.tsx
const navRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  const updateSpace = () => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    if (rect.height > 0) {
      // Distance from top of nav capsule to viewport bottom + 16px safe gap
      const occupiedBottomSpace = Math.max(0, window.innerHeight - rect.top) + 16;
      document.documentElement.style.setProperty(
        '--actual-bottom-nav-space',
        `${occupiedBottomSpace}px`
      );
    }
  };

  updateSpace();

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined' && navRef.current) {
    resizeObserver = new ResizeObserver(updateSpace);
    resizeObserver.observe(navRef.current);
  }

  window.addEventListener('resize', updateSpace);

  return () => {
    if (resizeObserver) resizeObserver.disconnect();
    window.removeEventListener('resize', updateSpace);
  };
}, [currentView]);
```

### CSS Binding:
```css
/* src/index.css */
.chat-input-docked {
  margin-bottom: var(--actual-bottom-nav-space, var(--mobile-chat-bottom-offset));
}

@media (min-width: 1024px) {
  .chat-input-docked {
    margin-bottom: 0;
    position: sticky;
    bottom: 1.5rem;
  }
}
```

---

## 5. Verification Matrix Across Viewports

Automated verification tests (`verify_all_final.js`) confirmed exact clearances and zero overlapping elements:

| Viewport | Device Type | Input Bottom | Nav Top | Physical Clearance | Scroll Container Height | Overlap Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **390 × 844** | iPhone 12/13/14 | `724px` | `740px` | **`+16px`** | `347px` | **PASSED (0 overlap)** |
| **375 × 667** | iPhone SE / Compact | `547px` | `563px` | **`+16px`** | `170px` (internal scroll) | **PASSED (0 overlap)** |
| **412 × 915** | Pixel 7 / Samsung | `795px` | `811px` | **`+16px`** | `433px` | **PASSED (0 overlap)** |
| **390 × 500** | Keyboard Simulation | `380px` | `396px` | **`+16px`** | Dynamically shrunk | **PASSED (0 overlap)** |
| **1440 × 900** | Desktop Standard | `868px` | Hidden | Desktop sticky `bottom-6` | `510px` | **PASSED (0 overlap)** |

---

## 6. Verification Artifacts & Visual Proof

- **Modern Mobile (390×844)**: All 3 suggested action pathways ("Guide me through a calming breath", "Help me reframe this feeling", "What patterns do you notice?") are completely visible with 112.75px clearance above the chat input. The input has 16px clearance above BottomNav.
- **Compact Mobile (375×667)**: Scroll container cleanly encapsulates the conversation, smoothly scrolling to the bottom without spilling behind navigation.
- **Desktop (1440×900)**: Layout, top header navigation, and sticky bottom input remain completely unchanged.
- **Build Status**: TypeScript check (`tsc --noEmit`) and production bundle (`vite build && esbuild`) compiled with zero errors (exit code 0).
