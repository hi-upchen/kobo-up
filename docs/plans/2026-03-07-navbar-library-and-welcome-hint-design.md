# Navbar Library Position & Welcome Back Hint Design

**Goal:** Move the Library link next to the logo in the navbar, and show a "welcome back" hint on the landing page when a user already has stored database data.

**Architecture:** Two small UI changes — one in AppNavbar (layout tweak) and one in the landing page (conditional hint banner). Both use existing `hasStoredData()` check.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Catalyst Navbar components.

---

## Change 1: Move Library Link Next to Logo

Move the Library `NavbarItem` from the right side (after `NavbarSpacer`) to the left-side `NavbarSection`, immediately after the "Kobo Note Up" link. Remove the `NavbarSpacer` since the right side will be empty.

**Before:**
```
[Kobo Note Up]                              [📖 Library]
```

**After:**
```
[Kobo Note Up]  [📖 Library]
```

- Library link still conditionally shown only when `hasData` is true.
- `current` prop still highlights when on `/book*` routes.

## Change 2: Landing Page Welcome Back Hint

When `KoboService.hasStoredData()` returns true, show a compact callout banner in the hero section between the subtitle text and the CTA buttons.

**Placement:** After "Trusted by thousands..." text, before the CTA button row.

**Content:** "Your library is loaded." with a "View your books →" link to `/books`.

**Styling (dark + light theme aware):**
- Light: `bg-indigo-50 text-indigo-700` with `text-indigo-600` link
- Dark: `bg-indigo-950/50 text-indigo-300` with `text-indigo-400` link
- Rounded pill shape, centered, compact padding
- Subtle but noticeable within the hero flow

**Behavior:**
- Hidden for new users (no stored data)
- Shown on page load after async `hasStoredData()` check
- Link navigates to `/books`

## What Stays the Same

- All existing landing page content and CTAs remain unchanged
- Navbar conditional logic (show Library only when data exists)
- Mobile responsive behavior (hamburger menu)
