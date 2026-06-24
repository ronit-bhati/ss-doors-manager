---
name: SS Doors Manager
description: Warm, high-density Craftsman's Workshop ledger with monospace calculation grids.
colors:
  primary: "#292524"
  accent-amber: "#b45309"
  accent-emerald: "#15803d"
  accent-rose: "#c2410c"
  neutral-bg: "#f7f5f0"
  neutral-surface: "#ffffff"
  neutral-ink: "#1c1917"
  neutral-border: "#e7e5e4"
typography:
  display:
    fontFamily: "JetBrains Mono, IBM Plex Mono, monospace"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, IBM Plex Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  sm: "6px"
  md: "12px"
  lg: "18px"
components:
  button-primary:
    backgroundColor: "#292524"
    textColor: "#ffffff"
    rounded: "6px"
    padding: "8px 16px"
  card:
    backgroundColor: "#ffffff"
    rounded: "6px"
    padding: "16px"
---

# Design System: SS Doors Manager

## 1. Overview

**Creative North Star: "The Craftsman's Workshop"**

The visual identity is a warm, high-density, professional ledger that evokes the feel of a fine woodworking shop. It rejects both sterile high-contrast blueprint styles and over-decorated SaaS templates. The design uses standard soft corners (`border-radius: 6px` globally), subtle paper elevation shadows, warm walnut and cream tones, clear Lucide React icons, and a strict monospace font stack for numbers, invoices, and grids to present measurements with absolute alignment and precision.

**Key Characteristics:**
- **Warm Wood & Cream Palette:** Walnut brown primary, honey oak amber accents, and cream/latte backgrounds that are easy on the eyes in busy workshop settings.
- **Monospace Numerical Alignment:** JetBrains Mono is strictly used for all dimensions, calculations, rates, and costs to make mathematical figures scannable.
- **Lucide Icons with Standard Text:** Interactive buttons feature clear, recognizable icons alongside standard-case readable labels (avoiding raw brackets like `[ SAVE ]`).
- **Soft Structured Layering:** Cards and panels utilize a soft border radius (`6px`) and paper shadows to separate modules.

## 2. Colors

A natural, warm palette designed to be easy on the eyes under diverse shop lighting conditions.

### Primary
- **Deep Walnut** (#292524): Primary background panels, main headers, and button fills.
- **Natural Cream Latte** (#f7f5f0): The application workspace canvas background.

### Accent
- **Honey Oak Amber** (#b45309): Highlights warning states, active input focus, and invoice status tags.
- **Forest Green** (#15803d): Denotes positive states, completed invoices, and grand totals.
- **Terracotta Orange-Red** (#c2410c): Used for deletion alerts and validation errors.

### Neutral
- **Slate Black Ink** (#1c1917): Primary body text.
- **Warm Muted Gray** (#57534e): Subtitles, labels, and secondary details.
- **Wood-Dust Stone** (#e7e5e4): 1px borders separating tables and forms.
- **Paper White** (#ffffff): Card container backgrounds and table fields.

### Named Rules
**The Restrained Warmth Rule.** Background canvases use soft Natural Cream Latte (#f7f5f0). Saturated colors are strictly reserved for action controls, totals, and state tags, never for decorative backgrounds.

## 3. Typography

**Display Font:** JetBrains Mono, IBM Plex Mono, monospace
**Body Font:** Inter, system-ui, sans-serif
**Numerical/Mono Font:** JetBrains Mono, IBM Plex Mono, monospace

### Hierarchy
- **Display** (Bold, 1.5rem, monospace): Page-level titles and main ledger stats.
- **Headline** (Semi-bold, 1.15rem, monospace): Section headers and card panel titles.
- **Body** (Regular, 0.875rem, sans-serif): General labels, customer notes, instructions, and settings descriptions.
- **Mono / Input** (Regular/Medium, 0.875rem, monospace): Dimensions, quantities, prices, rates, and data table cell content.

---

## 4. Elevation

Surfaces use subtle paper-like depth instead of stark flat borders to organize dense information modules.

### Shadow Vocabulary
- **Paper Shadow** (`box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05)`): Applied to card containers, list headers, and navigation wrappers.
- **Floating Modal Shadow** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)`): Applied to dialog overlays and dropdown select lists.

---

## 5. Components

### Buttons
- **Shape:** Soft rounded corners (`border-radius: 6px`).
- **Style:** Compact with icon indicators. Primary buttons are solid Deep Walnut with white text. Secondary buttons are outline style.
- **Transitions:** Standard fast opacity shifts (`0.15s ease`).

### Cards / Containers
- **Corner Style:** Soft rounded (`border-radius: 6px`).
- **Border:** 1px solid Wood-Dust Stone (#e7e5e4).
- **Background:** Paper White (#ffffff).
- **Shadow:** Paper Shadow.

### Inputs / Fields
- **Style:** Rounded (`border-radius: 6px`), 1px solid Wood-Dust Stone (#e7e5e4), monospace text.
- **Focus:** Highlighted with a clear Honey Oak Amber outline.

### Tables
- **Style:** Bordered compact grid. Headers feature a light-tinted Stone background with Inter font labels. Cell inputs use JetBrains Mono.

---

## 6. Do's and Don'ts

### Do:
- **Do** use JetBrains Mono for all calculations, sqft areas, prices, and rates.
- **Do** pair Lucide icons with text for interactive controls (e.g. `<Users /> Clients`).
- **Do** align tables and forms to a strict modular spacing system.
- **Do** apply a standard `6px` border-radius on clickable components and card containers.

### Don't:
- **Don't** use raw text brackets (`[ SAVE ]`) or raw brackets for cancel/delete actions.
- **Don't** apply flat high-contrast pure black borders and `0px` radii.
- **Don't** use heavy gradients, neon accent lines, or dark theme backdrops.
- **Don't** use hardcoded black `#000000` text styles; utilize the semantic variables.
