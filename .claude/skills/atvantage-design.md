# ATVANTAGE Design System Skill

When creating or modifying web pages and components for ATVANTAGE projects,
apply these design system guidelines automatically.

## Quick Reference

### Color Palette

- **Primary CTAs**: `.btn-dark` (#343E3F) - main call-to-actions (like
  atvantage.com)
- **Secondary CTAs**: `.btn-secondary` (#FF5401) - orange accent buttons
- **Primary Color**: #2C3E50 - navigation, headers
- **Tertiary/Light Blue**: #C8D5E3 - secondary UI elements
- **Light Blue Background**: #DDE4EE - alternating section backgrounds
- **Body Background**: #F7F7F7 (light mode), #141c25 (dark mode)

**Section Backgrounds** - alternate between:

- White (default body)
- `.bg-light` (#F7F7F7)
- `.bg-light-blue` (#DDE4EE)
- `.bg-primary` (for hero/feature sections)

### Typography

- **Headings**: Outfit font (auto-applied to h1-h6)
  - H1: 64px/32px (desktop/mobile), font-weight 600
  - H2: 47.88px/28px, font-weight 600
  - H3: 36px/20px, font-weight 500
- **Body**: Inter font, 1.125rem (18px), line-height 1.62
- **Code**: Chivo Mono (auto-applied)

### Layout Standards

- **Containers**: Use `.container` (max-width 1200px) for centered content
- **Section Spacing**: `py-5` (3rem top/bottom)
- **Grid Pattern**:
  - Mobile: `col-12`
  - Tablet: `col-md-6`
  - Desktop: `col-lg-4` or `col-lg-3`
- **Grid Gaps**: `g-3` or `g-4`

### Component Styles

- **Border Radius**: 0.5rem (8px) standard for buttons, cards, inputs
- **Card Shadows**: Standard shadow with hover effect
- **Button Padding**: `.3em 2.9em` (from atvantage.com)
- **Card Headers**: `.card-header.bg-primary.text-white` for branded cards

## Implementation Rules

### 1. Structure Every Page

```html
<!-- Hero Section with Primary Background -->
<div class="bg-primary text-white py-5">
  <div class="container">
    <h1 class="display-3 fw-bold mb-3">Main Heading</h1>
    <p class="lead mb-4">Supporting text...</p>
    <button class="btn btn-secondary btn-lg">CTA</button>
  </div>
</div>

<!-- Content Section -->
<div class="container my-5">
  <h2 class="display-5 fw-bold mb-4">Section Title</h2>
  <!-- content -->
</div>

<!-- Alternate Background Section -->
<div class="bg-light-blue py-5">
  <div class="container">
    <!-- content -->
  </div>
</div>
```

### 2. Card Grids

- Always use `.h-100` for consistent card heights
- Apply `g-3` or `g-4` for gaps
- Pattern: `col-12 col-md-6 col-lg-4`

### 3. Buttons

- Primary CTAs: `.btn-dark` (matches atvantage.com)
- Accent/Secondary: `.btn-secondary` (orange)
- Outline variants for tertiary actions
- Always use appropriate sizing: `.btn-sm`, `.btn`, `.btn-lg`

### 4. Typography Hierarchy

- One H1 per page
- Use `.display-3` to `.display-6` for hero headings
- Use `.lead` for introduction paragraphs
- Limit text blocks to max-width 768px for readability

### 5. Forms

- Always show labels
- Use validation states: `.is-valid`, `.is-invalid`
- Border radius: 0.5rem
- Submit buttons: `.btn-dark`

### 6. Navigation

- Navbar: `.navbar.bg-primary.sticky-top` with `data-bs-theme="dark"`
- Brand: `.navbar-brand.fw-bold`
- Mobile: Hamburger menu with `.navbar-toggler`

### 7. Dark Mode

- Add `data-bs-theme="dark"` to `<html>` tag
- Custom dark colors already defined
- Toggle mechanism should use localStorage

### 8. Accessibility

- Semantic HTML: `<nav>`, `<section>`, `<article>`
- Proper heading hierarchy (H1 → H2 → H3, don't skip)
- ARIA labels for icon-only buttons
- Alt text for images
- Ensure WCAG AA contrast compliance

## Font Loading (Required)

```html

<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap">
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap">
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Chivo+Mono:ital,wght@0,100..900;1,100..900&display=swap">
```

## Anti-Patterns to Avoid

- Don't use standard Bootstrap blue - use ATVANTAGE colors
- Don't use system fonts - Outfit/Inter are brand fonts
- Don't create single-color pages - alternate backgrounds
- Don't skip container wrappers
- Don't use inconsistent spacing - stick to Bootstrap scale
- Don't make text blocks too wide - max 768px

## When to Apply This Skill

Automatically apply these guidelines when:

- Creating new HTML pages
- Adding Bootstrap components
- Styling forms, buttons, cards
- Building landing pages
- Implementing navigation
- Setting up page layouts

Always prioritize ATVANTAGE branding consistency over generic Bootstrap
defaults.

## Reference

Full documentation: DESIGN-SYSTEM.md
