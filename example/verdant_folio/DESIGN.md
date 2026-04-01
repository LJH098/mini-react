# Design System: Editorial Botanical

## 1. Overview & Creative North Star: "The Digital Conservatory"
This design system is built on the philosophy of **"The Digital Conservatory."** We are not building a standard social feed; we are curating a high-end, botanical-inspired editorial experience. The goal is to make the user feel as though they are leafing through a premium, heavy-stock linen magazine.

To achieve this, we move away from the "app-like" density of traditional platforms. We embrace **intentional asymmetry**, where large serif headlines anchor the page and card-based content flows with generous breathing room. By utilizing a "layered paper" approach rather than a "flat screen" approach, we create a sense of tactile luxury.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is rooted in nature. We use deep evergreens to ground the experience and soft, atmospheric sages to provide light.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections or containers. Lines create a "boxed-in" feeling that destroys the editorial flow.
- **Boundaries:** Define changes in content by shifting background colors. Use `surface-container-low` for a section background sitting atop a `surface` page.
- **Nesting:** To create depth, nest a `surface-container-lowest` card inside a `surface-container` section. This creates a soft, natural "lift" through color alone.

### Glass & Texture
- **Signature Gradients:** For primary CTAs and hero headers, use a subtle linear gradient transitioning from `primary` (#173829) to `primary_container` (#2E4F3F). This adds a "silk" finish that flat color cannot replicate.
- **Glassmorphism:** For navigation bars or floating action menus, use `surface_container_lowest` at 80% opacity with a `24px` backdrop-blur. This allows botanical imagery to bleed through the interface, keeping it organic.

---

## 3. Typography: The Editorial Scale
We use a high-contrast typographic pairing to establish authority and elegance.

*   **Headlines (Newsreader Serif):** This is our "Voice." Headlines should be oversized to create an editorial impact. The serif's organic curves mirror botanical shapes.
    *   *Usage:* Use `display-lg` for landing hero sections. Use `headline-md` for card titles.
*   **Body (Manrope Sans-Serif):** Our "Function." Manrope provides a clean, modern contrast. It is highly legible even at small scales.
    *   *Usage:* `body-lg` for article introductions; `body-md` for standard post content.
*   **Labels (Manrope All-Caps):** Use `label-md` with +5% letter spacing for category tags and metadata to create a "technical-chic" aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "digital." We use **Tonal Layering** to define the Z-axis.

*   **The Layering Principle:** 
    1.  **Base:** `surface` (#f9f9f7)
    2.  **Sectioning:** `surface-container-low` (#f4f4f2)
    3.  **Content Cards:** `surface-container-lowest` (#ffffff)
*   **Ambient Shadows:** If a card must float (e.g., a hover state), use a shadow tinted with `primary`: `0px 20px 40px rgba(23, 56, 41, 0.06)`. This mimics soft, natural light filtered through a canopy.
*   **The Ghost Border:** If accessibility requires a container edge, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Curated Elements

### Cards & Information Architecture
*   **The Card:** Cards must have a `DEFAULT` (0.25rem) or `md` (0.375rem) corner radius. Avoid overly rounded "bubble" corners.
*   **Spacing:** Use `spacing-6` (2rem) between cards. Content within cards should never feel "trapped."
*   **No Dividers:** Never use a horizontal rule `<hr>` between list items. Use a `1.4rem` (`spacing-4`) vertical gap or a subtle `surface-container` background shift.

### Buttons
*   **Primary:** `primary` background with `on_primary` text. No border. Soft-sharp corners (`md`).
*   **Secondary:** `surface_container_high` background. This creates a "tone-on-tone" look that feels sophisticated.
*   **Tertiary (Ghost):** `on_surface` text with no background. On hover, apply a `primary_fixed_dim` underline (2px height).

### Input Fields & Controls
*   **Inputs:** Use a "Minimalist Ledger" style. Only a bottom border (using `outline_variant`) that transitions to `primary` on focus. No heavy boxes.
*   **Chips:** Use `secondary_container` with `on_secondary_container` text. These should look like small, botanical labels.

### Custom Component: The "Botanical Hero"
A layout-breaking component where an image (using `xl` rounding) overlaps two different background surface colors, anchored by a `display-lg` headline.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Negative Space:** If a layout feels crowded, increase the spacing by two increments on our scale.
*   **Use Asymmetry:** Place images slightly off-center from the text to create a magazine-style rhythm.
*   **Tone-on-Tone:** Use `secondary_fixed_dim` for background elements to create a sophisticated, low-contrast "Sage" environment.

### Don't:
*   **No Pink:** Under no circumstances should any pink or warm-red tones enter the system.
*   **No Heavy Borders:** Do not use dark or 100% opaque borders. They are the enemy of the editorial vibe.
*   **No Generic Grids:** Avoid the "3-column card grid" that looks like a template. Vary card widths (e.g., 60% wide card next to a 40% image) to maintain visual interest.
*   **No Standard Shadows:** Never use pure black `#000000` for shadows. Always tint them with our Forest Green.