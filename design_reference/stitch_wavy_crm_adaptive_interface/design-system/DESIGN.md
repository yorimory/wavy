---
name: Wavy Design System
colors:
  surface: '#fdf7ff'
  surface-dim: '#ded8e0'
  surface-bright: '#fdf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2fa'
  surface-container: '#f2ecf4'
  surface-container-high: '#ece6ee'
  surface-container-highest: '#e6e0e9'
  on-surface: '#1d1b20'
  on-surface-variant: '#494551'
  inverse-surface: '#322f35'
  inverse-on-surface: '#f5eff7'
  outline: '#7a7582'
  outline-variant: '#cbc4d2'
  surface-tint: '#6750a4'
  primary: '#4f378a'
  on-primary: '#ffffff'
  primary-container: '#6750a4'
  on-primary-container: '#e0d2ff'
  inverse-primary: '#cfbcff'
  secondary: '#63597c'
  on-secondary: '#ffffff'
  secondary-container: '#e1d4fd'
  on-secondary-container: '#645a7d'
  tertiary: '#765b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c9a74d'
  on-tertiary-container: '#503d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#4f378a'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cdc0e9'
  on-secondary-fixed: '#1f1635'
  on-secondary-fixed-variant: '#4b4263'
  tertiary-fixed: '#ffdf93'
  tertiary-fixed-dim: '#e7c365'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#fdf7ff'
  on-background: '#1d1b20'
  surface-variant: '#e6e0e9'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h1-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

## Brand & Style
The design system is built for the modern independent professional. It prioritizes mental clarity through a "Less but Better" approach, utilizing generous whitespace and a restricted color palette to reduce cognitive load. The aesthetic is clean and airy, characterized by high-legibility typography and soft, fluid transitions that mimic the organic movement of water. 

This design system evokes a sense of calm authority—positioning the product as an invisible, intelligent partner rather than a complex tool. It balances professional reliability with a touch of creative energy through its signature gradient accents.

## Colors
The palette is dominated by a pure white background to maintain an "airy" feel. The primary accent is a soft, sophisticated gradient from calm blue to purple, used sparingly for high-intent actions, progress indicators, and active states. 

A secondary, brighter gradient (#4facfe to #00f2fe) can be used for secondary data visualizations or subtle "intelligent" features. Neutrals are kept cool-toned to complement the blue-purple primary, ensuring that the interface feels cohesive and modern.

## Typography
This design system utilizes **Inter** for its exceptional legibility on digital screens and its neutral, systematic character. We rely on optical hierarchy rather than excessive font weights. 

Headlines use tight tracking and bold weights to ground the page, while body copy remains spacious to ensure long-form CRM data remains readable. Mobile typography shifts to slightly smaller font sizes for H1 and Display styles to maintain layout integrity on narrow viewports.

## Layout & Spacing
The layout follows a fluid 12-column grid on desktop, transitioning to 8 columns on tablet and 4 on mobile. For CRM dashboards, use a **3-4 column grid** for card layouts on desktop.

- **Desktop:** 32px gutters, 48px margins.
- **Tablet:** 24px gutters, 32px margins.
- **Mobile:** 16px gutters, 16px margins.

Spacing is governed by an 8pt rhythm. The "airy" feel is achieved by using 'huge' (80px) vertical spacing between major sections and 'xl' (32px) padding within primary containers.

## Elevation & Depth
This design system uses **Ambient Shadows** to create a sense of height without visual clutter. 
- **Default state:** Cards use a very soft, multi-layered shadow (0px 4px 20px rgba(0, 0, 0, 0.04)).
- **Hover state:** On interaction, cards "lift" using a smooth 0.2s transition. The shadow deepens (0px 12px 30px rgba(0, 0, 0, 0.08)) and the element scales slightly (1.02x).
- **Surface layers:** Backgrounds are `#FFFFFF`, while "wells" or secondary areas use `#F9FAFB` with no border to define areas by tone alone.

## Shapes
The shape language is friendly and approachable. We use a high degree of rounding to contrast with the technical nature of CRM data.
- **Cards:** Fixed at 20px to provide a soft container for data.
- **Buttons:** 40px (full pill-shaped) to maximize clickability and distinguish actions from data containers.
- **Form Inputs:** 12px to maintain a balance between the card and button aesthetics.

## Components
- **Buttons:** Primary buttons use the `primary_gradient` with white text. Secondary buttons are outline-only with a 1px border. All buttons are pill-shaped (40px).
- **Cards:** Pure white background, 20px border radius, and the standard ambient shadow. On hover, apply the "lift" interaction.
- **Inputs:** Minimalist style; 1px border in `#E5E7EB`. On focus, the border transitions to the primary gradient or a solid blue equivalent.
- **Icons:** Use thin, linear icons (1.5px stroke width). Icons should be monochromatic (muted neutral) unless they are active, in which case they take the primary blue color.
- **Chips/Badges:** Small, pill-shaped elements with a subtle tinted background (e.g., 10% opacity of the status color) and high-contrast text.
- **Lists:** Clean rows with 1px bottom dividers. Ensure 16px padding between list items to maintain the airy feel.