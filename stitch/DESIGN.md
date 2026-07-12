---
name: Cognitive Clarity
colors:
  surface: '#f8f9fd'
  surface-dim: '#d9dade'
  surface-bright: '#f8f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3f7'
  surface-container: '#edeef2'
  surface-container-high: '#e7e8ec'
  surface-container-highest: '#e1e2e6'
  on-surface: '#191c1f'
  on-surface-variant: '#464650'
  inverse-surface: '#2e3134'
  inverse-on-surface: '#eff1f5'
  outline: '#777682'
  outline-variant: '#c7c5d2'
  surface-tint: '#5557a0'
  primary: '#5557a0'
  on-primary: '#ffffff'
  primary-container: '#a5a6f6'
  on-primary-container: '#383881'
  inverse-primary: '#c1c1ff'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e5e2e1'
  on-secondary-container: '#656464'
  tertiary: '#705d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c6ac41'
  on-tertiary-container: '#4e4000'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1dfff'
  primary-fixed-dim: '#c1c1ff'
  on-primary-fixed: '#0f0d5a'
  on-primary-fixed-variant: '#3d3e87'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c9c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#fee170'
  tertiary-fixed-dim: '#e1c557'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#544600'
  background: '#f8f9fd'
  on-background: '#191c1f'
  surface-variant: '#e1e2e6'
  border-subtle: '#E5E7EB'
  surface-card: '#FFFFFF'
  text-muted: '#6B7280'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  baseline: 4px
  container-max: 1280px
  sidebar-width: 280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
This design system focuses on cognitive ease and deep work. The brand personality is "The Intelligent Architect"—structured, silent, and highly capable. It targets knowledge workers, researchers, and students who require an interface that recedes into the background to prioritize content, while surfacing AI capabilities through intentional, sophisticated accents.

The design style is **Minimalism** blended with **Corporate Modern**. It utilizes heavy whitespace to reduce visual noise, a monochromatic foundation to establish structure, and a singular "electric" accent to denote AI intelligence. The interface feels like a high-end physical notebook reimagined for the digital age: organized, tactile through subtle depth, and premium.

## Colors
The palette is dominated by a "Paper & Ink" philosophy. The background uses a soft, off-white (`#F4F5F9`) to reduce eye strain compared to pure white, while the primary text uses a near-black (`#0E0E0E`) for maximum legibility. 

The primary accent (`#A5A6F6`) is reserved exclusively for AI-driven interactions, primary actions, and focus states. This "Periwinkle" hue provides a modern, energetic contrast to the otherwise neutral environment, signaling a "smart" layer within the interface. Secondary surfaces and borders use a cool gray scale to maintain a crisp, professional structure.

## Typography
The typographic strategy balances editorial authority with technical precision. 

**Hanken Grotesk** is used for headlines to provide a sharp, contemporary feel that remains highly readable. **Inter** handles the heavy lifting for body copy and long-form notes due to its exceptional clarity and neutral tone. **JetBrains Mono** is introduced for metadata, labels, and AI-generated citations, providing a "technical" aesthetic that distinguishes between human-written content and machine-generated data. 

Hierarchy is established through tight leading in headlines and generous line-height in body text to facilitate comfortable reading sessions.

## Layout & Spacing
This design system utilizes a **Fixed Grid** for the main content area to ensure optimal line lengths for reading, while the sidebar remains fixed to the left. 

A 12-column system is used for the desktop dashboard view, while the note-taking interface centers a 720px wide "focus column." Spacing follows a 4px baseline grid, with 24px gutters between major UI blocks. On mobile, margins shrink to 16px and the sidebar transforms into a bottom-drawer or a full-screen overlay to maximize writing space.

## Elevation & Depth
The system uses **Tonal Layers** as its primary depth mechanism. The main application background is at the lowest level. Content cards and the main note area sit slightly above this on a white surface with a very soft, diffused shadow (12% opacity, 8px blur) to suggest tangibility.

AI-related panels or modals utilize a "Glassmorphism" approach with a subtle backdrop blur (12px) and a thin, 1px semi-transparent border (`#FFFFFF` at 20% opacity) to feel like an ephemeral, intelligent overlay on top of the static content. Interaction states use "low-contrast outlines" in the primary periwinkle color to indicate focus without overwhelming the layout.

## Shapes
The shape language is "Softly Geometric." A 0.5rem (8px) base radius is applied to standard UI elements like buttons, input fields, and cards. This provides a approachable, modern feel that isn't as aggressive as sharp corners nor as casual as full pill-shapes. 

Smaller components like tags or chips may use the `rounded-lg` (16px) setting to differentiate them as interactive snippets within text-heavy environments.

## Components
- **Buttons:** Primary buttons are solid `#A5A6F6` with white text. Secondary buttons use a white background with a `#E5E7EB` border. Ghost buttons are reserved for utility actions in the sidebar.
- **AI Chat/Input:** A persistent input field at the bottom of the note view. It should have a subtle gradient border using a fade of the primary color to distinguish it from standard text inputs.
- **Notebook Cards:** Used in the dashboard. Large white surfaces with `label-sm` metadata at the top and a preview of the note content in `body-sm`.
- **Sidebar:** A clean, vertical list with high-contrast active states. The active item should have a 3px vertical "indicator" bar on the left using the primary color.
- **Citations:** Small, `label-sm` tags using the mono font. On hover, these should trigger a small, glassmorphic popover showing the source text.
- **Input Fields:** Minimalist design with no background, only a bottom border that transitions to a full 1px periwinkle outline when focused.