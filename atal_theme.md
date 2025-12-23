# ATAL AI Theme A Implementation Guide
## Orange + Cyan Color System

---

## 📋 TABLE OF CONTENTS

1. [Color Palette Reference](#1-color-palette-reference)
2. [CSS Variables Setup](#2-css-variables-setup)
3. [Tailwind Configuration](#3-tailwind-configuration)
4. [Theme.ts Constants](#4-themets-constants)
5. [Component Implementation Guide](#5-component-implementation-guide)
   - [Buttons](#51-buttons)
   - [Cards](#52-cards)
   - [Input Fields](#53-input-fields)
   - [Navigation & Tabs](#54-navigation--tabs)
   - [Progress Bars](#55-progress-bars)
   - [Badges & Tags](#56-badges--tags)
   - [Alerts & Info Boxes](#57-alerts--info-boxes)
   - [Headers & App Bars](#58-headers--app-bars)
   - [Bottom Navigation](#59-bottom-navigation)
   - [Modals & Dialogs](#510-modals--dialogs)
   - [Achievement Cards](#511-achievement-cards)
   - [Stats Cards](#512-stats-cards)
   - [Course Cards](#513-course-cards)
   - [Quiz Components](#514-quiz-components)
6. [Background & Layout](#6-background--layout)
7. [Shadows & Effects](#7-shadows--effects)
8. [Typography Colors](#8-typography-colors)
9. [Icons & Illustrations](#9-icons--illustrations)
10. [Do's and Don'ts](#10-dos-and-donts)
11. [File-by-File Migration Checklist](#11-file-by-file-migration-checklist)

---

## 1. COLOR PALETTE REFERENCE

### Primary Colors (Orange Family)
| Name | Hex Code | RGB | Usage |
|------|----------|-----|-------|
| Primary Lightest | `#FFF5EB` | rgb(255, 245, 235) | Subtle backgrounds, hover states |
| Primary Lighter | `#FFE4CC` | rgb(255, 228, 204) | Light backgrounds, selected states |
| Primary Light | `#FFCFA3` | rgb(255, 207, 163) | Soft accents |
| **Primary (Base)** | `#F98819` | rgb(249, 136, 25) | Main buttons, links, active states |
| Primary Dark | `#E07510` | rgb(224, 117, 16) | Hover states, emphasis |
| Primary Darker | `#C66610` | rgb(198, 102, 16) | Pressed states |
| Primary Darkest | `#8B4A0B` | rgb(139, 74, 11) | Text on light backgrounds |

### Secondary Colors (Cyan Family)
| Name | Hex Code | RGB | Usage |
|------|----------|-----|-------|
| Cyan Lightest | `#E8F7FB` | rgb(232, 247, 251) | Info backgrounds |
| Cyan Lighter | `#C5EBF5` | rgb(197, 235, 245) | Soft accents |
| Cyan Light | `#7DD4EC` | rgb(125, 212, 236) | Progress indicators |
| **Cyan (Base)** | `#24B0D7` | rgb(36, 176, 215) | Secondary actions, info |
| Cyan Dark | `#1E95B6` | rgb(30, 149, 182) | Hover states |
| Cyan Darker | `#187A96` | rgb(24, 122, 150) | Pressed states |
| Cyan Darkest | `#0F4F61` | rgb(15, 79, 97) | Text on light backgrounds |

### Neutral Colors
| Name | Hex Code | Usage |
|------|----------|-------|
| Text Primary | `#2D2A26` | Headings, important text |
| Text Secondary | `#57534E` | Body text, descriptions |
| Text Tertiary | `#78716C` | Subtle text, placeholders |
| Text Muted | `#A8A29E` | Disabled text |
| Border | `#E8E4E0` | Card borders, dividers |
| Border Light | `#F3F0ED` | Subtle separators |
| Cream | `#FFFBF7` | Page backgrounds |
| White | `#FFFFFF` | Card backgrounds |

### Semantic Colors
| Name | Hex Code | Light | Dark | Usage |
|------|----------|-------|------|-------|
| Success | `#22C55E` | `#DCFCE7` | `#16A34A` | Correct answers, completion |
| Error | `#EF4444` | `#FEE2E2` | `#DC2626` | Wrong answers, errors |
| Warning | `#F59E0B` | `#FEF3C7` | `#D97706` | Alerts, cautions |
| Info | `#24B0D7` | `#E8F7FB` | `#1E95B6` | Tips, information |

---

## 2. CSS VARIABLES SETUP

Add to `apps/web/src/app/globals.css`:

```css
:root {
  /* ========== PRIMARY (ORANGE) ========== */
  --primary-lightest: #FFF5EB;
  --primary-lighter: #FFE4CC;
  --primary-light: #FFCFA3;
  --primary: #F98819;
  --primary-dark: #E07510;
  --primary-darker: #C66610;
  --primary-darkest: #8B4A0B;
  
  /* ========== SECONDARY (CYAN) ========== */
  --cyan-lightest: #E8F7FB;
  --cyan-lighter: #C5EBF5;
  --cyan-light: #7DD4EC;
  --cyan: #24B0D7;
  --cyan-dark: #1E95B6;
  --cyan-darker: #187A96;
  --cyan-darkest: #0F4F61;
  
  /* ========== NEUTRALS ========== */
  --text-primary: #2D2A26;
  --text-secondary: #57534E;
  --text-tertiary: #78716C;
  --text-muted: #A8A29E;
  --border: #E8E4E0;
  --border-light: #F3F0ED;
  --cream: #FFFBF7;
  --white: #FFFFFF;
  
  /* ========== SEMANTIC ========== */
  --success: #22C55E;
  --success-light: #DCFCE7;
  --success-dark: #16A34A;
  --error: #EF4444;
  --error-light: #FEE2E2;
  --error-dark: #DC2626;
  --warning: #F59E0B;
  --warning-light: #FEF3C7;
  --warning-dark: #D97706;
  --info: #24B0D7;
  --info-light: #E8F7FB;
  --info-dark: #1E95B6;
  
  /* ========== GRADIENTS ========== */
  --gradient-primary: linear-gradient(135deg, #F98819 0%, #FFAB4A 100%);
  --gradient-cyan: linear-gradient(135deg, #24B0D7 0%, #7DD4EC 100%);
  --gradient-header: linear-gradient(135deg, #F98819 0%, #FFAB4A 100%);
  
  /* ========== SHADOWS ========== */
  --shadow-primary: 0 8px 24px rgba(249, 136, 25, 0.3);
  --shadow-primary-sm: 0 4px 12px rgba(249, 136, 25, 0.2);
  --shadow-cyan: 0 8px 24px rgba(36, 176, 215, 0.3);
  --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-card-hover: 0 8px 30px rgba(0, 0, 0, 0.12);
  
  /* ========== SPACING ========== */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-full: 9999px;
}
```

---

## 3. TAILWIND CONFIGURATION

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary (Orange)
        primary: {
          lightest: 'var(--primary-lightest)',
          lighter: 'var(--primary-lighter)',
          light: 'var(--primary-light)',
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
          darker: 'var(--primary-darker)',
          darkest: 'var(--primary-darkest)',
        },
        // Secondary (Cyan)
        cyan: {
          lightest: 'var(--cyan-lightest)',
          lighter: 'var(--cyan-lighter)',
          light: 'var(--cyan-light)',
          DEFAULT: 'var(--cyan)',
          dark: 'var(--cyan-dark)',
          darker: 'var(--cyan-darker)',
          darkest: 'var(--cyan-darkest)',
        },
        // Neutrals
        cream: 'var(--cream)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        // Semantic
        success: {
          light: 'var(--success-light)',
          DEFAULT: 'var(--success)',
          dark: 'var(--success-dark)',
        },
        error: {
          light: 'var(--error-light)',
          DEFAULT: 'var(--error)',
          dark: 'var(--error-dark)',
        },
        warning: {
          light: 'var(--warning-light)',
          DEFAULT: 'var(--warning)',
          dark: 'var(--warning-dark)',
        },
        info: {
          light: 'var(--info-light)',
          DEFAULT: 'var(--info)',
          dark: 'var(--info-dark)',
        },
      },
      boxShadow: {
        'primary': 'var(--shadow-primary)',
        'primary-sm': 'var(--shadow-primary-sm)',
        'cyan': 'var(--shadow-cyan)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-cyan': 'var(--gradient-cyan)',
        'gradient-header': 'var(--gradient-header)',
      },
    },
  },
  plugins: [],
}
```

---

## 4. THEME.TS CONSTANTS

Update `packages/ui/theme.ts`:

```typescript
// ============================================
// ATAL AI THEME A - ORANGE + CYAN
// ============================================

export const COLORS = {
  // Primary (Orange)
  primary: {
    lightest: '#FFF5EB',
    lighter: '#FFE4CC',
    light: '#FFCFA3',
    DEFAULT: '#F98819',
    dark: '#E07510',
    darker: '#C66610',
    darkest: '#8B4A0B',
  },
  
  // Secondary (Cyan)
  cyan: {
    lightest: '#E8F7FB',
    lighter: '#C5EBF5',
    light: '#7DD4EC',
    DEFAULT: '#24B0D7',
    dark: '#1E95B6',
    darker: '#187A96',
    darkest: '#0F4F61',
  },
  
  // Neutrals
  text: {
    primary: '#2D2A26',
    secondary: '#57534E',
    tertiary: '#78716C',
    muted: '#A8A29E',
  },
  
  background: {
    cream: '#FFFBF7',
    white: '#FFFFFF',
  },
  
  border: {
    DEFAULT: '#E8E4E0',
    light: '#F3F0ED',
  },
  
  // Semantic
  success: {
    light: '#DCFCE7',
    DEFAULT: '#22C55E',
    dark: '#16A34A',
  },
  error: {
    light: '#FEE2E2',
    DEFAULT: '#EF4444',
    dark: '#DC2626',
  },
  warning: {
    light: '#FEF3C7',
    DEFAULT: '#F59E0B',
    dark: '#D97706',
  },
  info: {
    light: '#E8F7FB',
    DEFAULT: '#24B0D7',
    dark: '#1E95B6',
  },
} as const;

export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #F98819 0%, #FFAB4A 100%)',
  cyan: 'linear-gradient(135deg, #24B0D7 0%, #7DD4EC 100%)',
  header: 'linear-gradient(135deg, #F98819 0%, #FFAB4A 100%)',
} as const;

export const SHADOWS = {
  primary: '0 8px 24px rgba(249, 136, 25, 0.3)',
  primarySm: '0 4px 12px rgba(249, 136, 25, 0.2)',
  cyan: '0 8px 24px rgba(36, 176, 215, 0.3)',
  card: '0 4px 20px rgba(0, 0, 0, 0.08)',
  cardHover: '0 8px 30px rgba(0, 0, 0, 0.12)',
} as const;

// Tailwind class mappings for quick reference
export const TW = {
  // Backgrounds
  bgPrimary: 'bg-primary',
  bgPrimaryLight: 'bg-primary-lighter',
  bgCyan: 'bg-cyan',
  bgCyanLight: 'bg-cyan-lightest',
  bgCream: 'bg-cream',
  bgWhite: 'bg-white',
  
  // Text
  textPrimary: 'text-text-primary',
  textSecondary: 'text-text-secondary',
  textTertiary: 'text-text-tertiary',
  textOrange: 'text-primary',
  textCyan: 'text-cyan',
  
  // Borders
  borderDefault: 'border-border',
  borderPrimary: 'border-primary',
  borderCyan: 'border-cyan',
  
  // Shadows
  shadowPrimary: 'shadow-primary',
  shadowCyan: 'shadow-cyan',
  shadowCard: 'shadow-card',
} as const;
```

---

## 5. COMPONENT IMPLEMENTATION GUIDE

### 5.1 BUTTONS

#### Primary Button (Main CTA)
```tsx
// Use for: Sign In, Submit, Continue, Next, Save
<button className="
  bg-gradient-primary
  text-white
  font-semibold
  py-3 px-6
  rounded-xl
  shadow-primary
  hover:scale-[1.02]
  hover:shadow-primary-sm
  active:scale-[0.98]
  transition-all
  duration-200
">
  Sign In
</button>
```

**Tailwind Classes:**
- Background: `bg-gradient-primary` OR `bg-primary`
- Text: `text-white`
- Shadow: `shadow-primary`
- Hover: `hover:scale-[1.02]`
- Border Radius: `rounded-xl`

#### Secondary Button (Outline)
```tsx
// Use for: Cancel, Skip, Review, Back
<button className="
  bg-transparent
  border-2 border-primary
  text-primary
  font-semibold
  py-3 px-6
  rounded-xl
  hover:bg-primary-lighter
  active:bg-primary-light
  transition-all
  duration-200
">
  Skip
</button>
```

**Tailwind Classes:**
- Background: `bg-transparent`
- Border: `border-2 border-primary`
- Text: `text-primary`
- Hover: `hover:bg-primary-lighter`

#### Tertiary Button (Ghost)
```tsx
// Use for: Links, minor actions
<button className="
  bg-transparent
  text-primary
  font-semibold
  py-2 px-4
  rounded-lg
  hover:bg-primary-lightest
  transition-all
">
  Learn More
</button>
```

#### Cyan Secondary Button
```tsx
// Use for: Info actions, teacher UI, secondary flows
<button className="
  bg-cyan
  text-white
  font-semibold
  py-3 px-6
  rounded-xl
  shadow-cyan
  hover:bg-cyan-dark
  transition-all
">
  View Details
</button>
```

#### Disabled Button
```tsx
<button 
  disabled
  className="
    bg-border
    text-text-muted
    font-semibold
    py-3 px-6
    rounded-xl
    cursor-not-allowed
    opacity-60
  "
>
  Submit
</button>
```

#### Button Size Variants
| Size | Padding | Font | Radius |
|------|---------|------|--------|
| Small | `py-2 px-4` | `text-sm` | `rounded-lg` |
| Medium | `py-3 px-6` | `text-base` | `rounded-xl` |
| Large | `py-4 px-8` | `text-lg` | `rounded-xl` |

---

### 5.2 CARDS

#### Base Card
```tsx
// Standard white card
<div className="
  bg-white
  rounded-2xl
  p-5
  shadow-card
  border border-border-light
">
  {/* Content */}
</div>
```

#### Card with Primary Accent (Left Border)
```tsx
// Use for: Course cards, highlighted content
<div className="
  bg-white
  rounded-xl
  p-4
  shadow-card
  border-l-4 border-primary
">
  {/* Content */}
</div>
```

#### Card with Cyan Accent
```tsx
// Use for: Info cards, secondary content
<div className="
  bg-white
  rounded-xl
  p-4
  shadow-card
  border-l-4 border-cyan
">
  {/* Content */}
</div>
```

#### Card with Top Gradient Border
```tsx
// Use for: Featured content
<div className="
  bg-white
  rounded-2xl
  shadow-card
  relative
  overflow-hidden
">
  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>
  <div className="p-5">
    {/* Content */}
  </div>
</div>
```

#### Interactive Card (Hover Effect)
```tsx
<div className="
  bg-white
  rounded-2xl
  p-5
  shadow-card
  hover:shadow-card-hover
  hover:scale-[1.02]
  transition-all
  duration-200
  cursor-pointer
">
  {/* Content */}
</div>
```

#### Auth Card (Login/Signup)
```tsx
<div className="
  bg-white
  rounded-3xl
  p-6
  shadow-card
  border-2 border-primary/10
">
  {/* Form content */}
</div>
```

---

### 5.3 INPUT FIELDS

#### Default Input
```tsx
<div className="mb-4">
  <label className="text-sm text-text-secondary mb-1 block">
    Email
  </label>
  <div className="
    border-2 border-border
    rounded-xl
    p-3
    focus-within:border-primary
    focus-within:shadow-primary-sm
    transition-all
  ">
    <input 
      type="email"
      placeholder="student@school.edu"
      className="
        w-full
        outline-none
        text-text-primary
        placeholder:text-text-muted
        bg-transparent
      "
    />
  </div>
</div>
```

**States:**
| State | Border | Shadow |
|-------|--------|--------|
| Default | `border-border` | none |
| Focus | `border-primary` | `shadow-primary-sm` |
| Error | `border-error` | none |
| Disabled | `border-border` | none, `bg-gray-50` |

#### Input with Icon
```tsx
<div className="
  border-2 border-border
  rounded-xl
  p-3
  flex items-center gap-3
  focus-within:border-primary
">
  <span className="text-text-tertiary">📧</span>
  <input 
    type="email"
    placeholder="Email address"
    className="flex-1 outline-none text-text-primary"
  />
</div>
```

#### Error State Input
```tsx
<div className="
  border-2 border-error
  rounded-xl
  p-3
  bg-error-light/30
">
  <input 
    type="email"
    className="w-full outline-none text-text-primary bg-transparent"
  />
</div>
<p className="text-sm text-error mt-1">Please enter a valid email</p>
```

---

### 5.4 NAVIGATION & TABS

#### Tab Navigation
```tsx
<div className="flex gap-1 bg-border-light rounded-xl p-1">
  {/* Active Tab */}
  <button className="
    flex-1
    py-2 px-4
    rounded-lg
    bg-primary
    text-white
    font-medium
  ">
    Email
  </button>
  
  {/* Inactive Tab */}
  <button className="
    flex-1
    py-2 px-4
    rounded-lg
    bg-transparent
    text-text-secondary
    hover:text-primary
    hover:bg-white
    transition-all
  ">
    Phone
  </button>
</div>
```

#### Pill Tabs
```tsx
<div className="flex gap-2">
  {/* Active */}
  <button className="
    px-4 py-2
    rounded-full
    bg-primary
    text-white
    font-medium
    shadow-primary-sm
  ">
    All
  </button>
  
  {/* Inactive */}
  <button className="
    px-4 py-2
    rounded-full
    bg-primary-lightest
    text-primary
    font-medium
    hover:bg-primary-lighter
  ">
    Math
  </button>
</div>
```

---

### 5.5 PROGRESS BARS

#### Primary Progress Bar
```tsx
<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
  <div 
    className="h-full bg-gradient-primary rounded-full transition-all duration-500"
    style={{ width: '75%' }}
  />
</div>
```

#### Cyan Progress Bar (Secondary/Science)
```tsx
<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
  <div 
    className="h-full bg-cyan rounded-full"
    style={{ width: '50%' }}
  />
</div>
```

#### Progress with Label
```tsx
<div>
  <div className="flex justify-between mb-1">
    <span className="text-sm text-text-secondary">Progress</span>
    <span className="text-sm font-medium text-primary">75%</span>
  </div>
  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
    <div className="h-full w-3/4 bg-gradient-primary rounded-full" />
  </div>
</div>
```

#### Step Progress (Quiz)
```tsx
<div className="flex gap-1">
  {/* Completed */}
  <div className="w-6 h-1.5 rounded-full bg-primary" />
  <div className="w-6 h-1.5 rounded-full bg-primary" />
  <div className="w-6 h-1.5 rounded-full bg-primary" />
  {/* Current */}
  <div className="w-6 h-1.5 rounded-full bg-primary animate-pulse" />
  {/* Remaining */}
  <div className="w-6 h-1.5 rounded-full bg-gray-200" />
  <div className="w-6 h-1.5 rounded-full bg-gray-200" />
</div>
```

---

### 5.6 BADGES & TAGS

#### Subject Badge
```tsx
// Primary (Orange)
<span className="
  inline-block
  px-3 py-1
  bg-primary-lighter
  text-primary-darkest
  text-xs font-semibold
  rounded-full
">
  Mathematics
</span>

// Cyan
<span className="
  inline-block
  px-3 py-1
  bg-cyan-lightest
  text-cyan-darkest
  text-xs font-semibold
  rounded-full
">
  Science
</span>
```

#### Level Badge
```tsx
<span className="
  inline-flex items-center gap-1
  px-3 py-1
  bg-cyan-lightest
  text-cyan-dark
  text-xs font-semibold
  rounded-full
">
  ⭐ Level 5
</span>
```

#### Status Badges
```tsx
// Success
<span className="px-3 py-1 bg-success-light text-success-dark text-xs font-semibold rounded-full">
  Completed
</span>

// Warning
<span className="px-3 py-1 bg-warning-light text-warning-dark text-xs font-semibold rounded-full">
  In Progress
</span>

// Error
<span className="px-3 py-1 bg-error-light text-error-dark text-xs font-semibold rounded-full">
  Failed
</span>
```

---

### 5.7 ALERTS & INFO BOXES

#### Info Box (Cyan)
```tsx
<div className="
  bg-cyan-lightest
  border-l-4 border-cyan
  rounded-xl
  p-4
">
  <p className="text-sm text-cyan-darkest">
    <strong>💡 Tip:</strong> Use your school email for quick access
  </p>
</div>
```

#### Hint Box (for Quiz)
```tsx
<div className="
  bg-cyan-lightest
  border border-cyan/20
  rounded-xl
  p-4
  flex items-start gap-3
">
  <span className="text-xl">💡</span>
  <div>
    <p className="text-sm font-semibold text-cyan-darkest">Need a hint?</p>
    <p className="text-xs text-cyan-dark">First, find the common denominator</p>
  </div>
</div>
```

#### Success Alert
```tsx
<div className="
  bg-success-light
  border-l-4 border-success
  rounded-xl
  p-4
">
  <p className="text-sm text-success-dark">
    <strong>✓ Success!</strong> Your answer is correct.
  </p>
</div>
```

#### Error Alert
```tsx
<div className="
  bg-error-light
  border-l-4 border-error
  rounded-xl
  p-4
">
  <p className="text-sm text-error-dark">
    <strong>✗ Incorrect.</strong> Try again!
  </p>
</div>
```

#### Warning Alert
```tsx
<div className="
  bg-warning-light
  border-l-4 border-warning
  rounded-xl
  p-4
">
  <p className="text-sm text-warning-dark">
    <strong>⚠ Warning:</strong> Time is running out!
  </p>
</div>
```

---

### 5.8 HEADERS & APP BARS

#### Gradient Header
```tsx
<header className="
  bg-gradient-primary
  p-6 pb-16
  rounded-b-[32px]
">
  <div className="flex justify-between items-start">
    <div>
      <p className="text-white/80 text-sm">Good Morning!</p>
      <h1 className="text-white text-xl font-bold">Welcome, Arjun 👋</h1>
    </div>
    <button className="
      w-10 h-10
      bg-white/20
      rounded-full
      flex items-center justify-center
    ">
      <span className="text-white">🔔</span>
    </button>
  </div>
</header>
```

#### Simple App Bar
```tsx
<header className="
  bg-white
  p-4
  border-b border-border
  flex items-center justify-between
">
  <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
    ←
  </button>
  <h1 className="font-semibold text-text-primary">Quiz</h1>
  <div className="w-10 h-10 rounded-full bg-primary-lighter flex items-center justify-center">
    <span className="text-primary font-bold text-sm">2:30</span>
  </div>
</header>
```

---

### 5.9 BOTTOM NAVIGATION

```tsx
<nav className="
  bg-white
  border-t border-border
  px-6 py-4
  flex justify-around
">
  {/* Active Item */}
  <button className="text-center">
    <div className="text-primary text-xl">🏠</div>
    <p className="text-xs text-primary font-medium">Home</p>
  </button>
  
  {/* Inactive Items */}
  <button className="text-center">
    <div className="text-text-tertiary text-xl">📖</div>
    <p className="text-xs text-text-tertiary">Learn</p>
  </button>
  
  <button className="text-center">
    <div className="text-text-tertiary text-xl">📊</div>
    <p className="text-xs text-text-tertiary">Progress</p>
  </button>
  
  <button className="text-center">
    <div className="text-text-tertiary text-xl">👤</div>
    <p className="text-xs text-text-tertiary">Profile</p>
  </button>
</nav>
```

**States:**
| State | Icon Color | Text Color |
|-------|------------|------------|
| Active | `text-primary` | `text-primary font-medium` |
| Inactive | `text-text-tertiary` | `text-text-tertiary` |

---

### 5.10 MODALS & DIALOGS

#### Modal Container
```tsx
<div className="
  fixed inset-0
  bg-black/50
  flex items-center justify-center
  p-4
  z-50
">
  <div className="
    bg-white
    rounded-3xl
    p-6
    w-full max-w-md
    shadow-card
    relative
    overflow-hidden
  ">
    {/* Optional top gradient */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>
    
    {/* Content */}
    <h2 className="text-xl font-bold text-text-primary mt-2">Modal Title</h2>
    <p className="text-text-secondary mt-2">Modal content here...</p>
    
    {/* Actions */}
    <div className="flex gap-3 mt-6">
      <button className="flex-1 py-3 rounded-xl border-2 border-border text-text-secondary font-semibold">
        Cancel
      </button>
      <button className="flex-1 py-3 rounded-xl bg-gradient-primary text-white font-semibold shadow-primary">
        Confirm
      </button>
    </div>
  </div>
</div>
```

---

### 5.11 ACHIEVEMENT CARDS

```tsx
<div className="
  bg-white
  rounded-xl
  p-4
  shadow-card
  flex items-center gap-4
  border-l-4 border-cyan
">
  <div className="
    w-14 h-14
    bg-cyan
    rounded-xl
    flex items-center justify-center
    flex-shrink-0
  ">
    <span className="text-2xl">🌟</span>
  </div>
  <div>
    <h3 className="font-semibold text-text-primary">Quick Learner</h3>
    <p className="text-sm text-text-tertiary">Completed in under 5 minutes</p>
  </div>
</div>
```

**Achievement Border Colors by Type:**
| Type | Border | Icon Background |
|------|--------|-----------------|
| Learning | `border-cyan` | `bg-cyan` |
| Streak | `border-primary` | `bg-gradient-primary` |
| Level Up | `bg-success` | `bg-success` |
| Special | `border-primary` | `bg-gradient-primary` |

---

### 5.12 STATS CARDS

```tsx
<div className="
  bg-white
  rounded-2xl
  p-4
  shadow-card
  grid grid-cols-3 gap-4
">
  {/* Stat 1 */}
  <div className="text-center">
    <div className="
      w-10 h-10
      mx-auto
      bg-primary-lighter
      rounded-xl
      flex items-center justify-center
      mb-2
    ">
      <span className="text-primary">📚</span>
    </div>
    <p className="text-xl font-bold text-text-primary">12</p>
    <p className="text-xs text-text-tertiary">Lessons</p>
  </div>
  
  {/* Stat 2 - Cyan */}
  <div className="text-center">
    <div className="
      w-10 h-10
      mx-auto
      bg-cyan-lightest
      rounded-xl
      flex items-center justify-center
      mb-2
    ">
      <span className="text-cyan">⭐</span>
    </div>
    <p className="text-xl font-bold text-text-primary">85%</p>
    <p className="text-xs text-text-tertiary">Score</p>
  </div>
  
  {/* Stat 3 - Success */}
  <div className="text-center">
    <div className="
      w-10 h-10
      mx-auto
      bg-success-light
      rounded-xl
      flex items-center justify-center
      mb-2
    ">
      <span className="text-success">🏆</span>
    </div>
    <p className="text-xl font-bold text-text-primary">5</p>
    <p className="text-xs text-text-tertiary">Badges</p>
  </div>
</div>
```

---

### 5.13 COURSE CARDS

```tsx
<div className="
  bg-white
  rounded-xl
  p-4
  shadow-card
  border-l-4 border-primary
">
  <div className="flex gap-4">
    {/* Icon */}
    <div className="
      w-14 h-14
      bg-gradient-primary
      rounded-xl
      flex items-center justify-center
      flex-shrink-0
    ">
      <span className="text-2xl">🔢</span>
    </div>
    
    {/* Content */}
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-text-primary">Mathematics</h3>
      <p className="text-sm text-text-tertiary">Chapter 5: Fractions</p>
      
      {/* Progress */}
      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full w-3/4 bg-gradient-primary rounded-full" />
      </div>
    </div>
  </div>
</div>
```

**Subject Colors:**
| Subject | Border | Icon BG |
|---------|--------|---------|
| Math | `border-primary` | `bg-gradient-primary` |
| Science | `border-cyan` | `bg-cyan` |
| English | `border-primary` | `bg-primary` |
| Hindi | `border-cyan` | `bg-cyan` |

---

### 5.14 QUIZ COMPONENTS

#### Quiz Option (Default)
```tsx
<button className="
  w-full
  p-4
  rounded-xl
  border-2 border-border
  text-left
  hover:border-primary
  hover:bg-primary-lightest
  transition-all
">
  <div className="flex items-center gap-3">
    <div className="
      w-8 h-8
      rounded-full
      border-2 border-border
      flex items-center justify-center
      font-semibold
      text-text-secondary
    ">
      A
    </div>
    <span className="font-medium text-text-primary">Answer text</span>
  </div>
</button>
```

#### Quiz Option (Selected)
```tsx
<button className="
  w-full
  p-4
  rounded-xl
  border-2 border-primary
  bg-primary-lighter
  text-left
  shadow-primary-sm
">
  <div className="flex items-center gap-3">
    <div className="
      w-8 h-8
      rounded-full
      bg-primary
      flex items-center justify-center
      font-semibold
      text-white
    ">
      B
    </div>
    <span className="font-medium text-text-primary">Selected answer</span>
  </div>
</button>
```

#### Quiz Option (Correct)
```tsx
<button className="
  w-full
  p-4
  rounded-xl
  border-2 border-success
  bg-success-light
  text-left
">
  <div className="flex items-center gap-3">
    <div className="
      w-8 h-8
      rounded-full
      bg-success
      flex items-center justify-center
      font-semibold
      text-white
    ">
      ✓
    </div>
    <span className="font-medium text-text-primary">Correct answer</span>
  </div>
</button>
```

#### Quiz Option (Incorrect)
```tsx
<button className="
  w-full
  p-4
  rounded-xl
  border-2 border-error
  bg-error-light
  text-left
">
  <div className="flex items-center gap-3">
    <div className="
      w-8 h-8
      rounded-full
      bg-error
      flex items-center justify-center
      font-semibold
      text-white
    ">
      ✗
    </div>
    <span className="font-medium text-text-primary">Wrong answer</span>
  </div>
</button>
```

---

## 6. BACKGROUND & LAYOUT

### Page Background
```tsx
// All pages should use cream background
<div className="min-h-screen bg-cream">
  {/* Page content */}
</div>
```

### Content Containers
```tsx
// Max width container
<div className="max-w-md mx-auto px-4">
  {/* Content */}
</div>
```

### Negative Margin Card Overlap
```tsx
// Header with overlapping card (like dashboard)
<header className="bg-gradient-primary p-6 pb-16 rounded-b-[32px]">
  {/* Header content */}
</header>
<div className="px-6 -mt-10">
  <div className="bg-white rounded-2xl p-4 shadow-card">
    {/* Overlapping card */}
  </div>
</div>
```

---

## 7. SHADOWS & EFFECTS

| Element | Shadow Class | CSS Value |
|---------|--------------|-----------|
| Primary Button | `shadow-primary` | `0 8px 24px rgba(249, 136, 25, 0.3)` |
| Primary Button (sm) | `shadow-primary-sm` | `0 4px 12px rgba(249, 136, 25, 0.2)` |
| Cyan Button | `shadow-cyan` | `0 8px 24px rgba(36, 176, 215, 0.3)` |
| Cards | `shadow-card` | `0 4px 20px rgba(0, 0, 0, 0.08)` |
| Cards (hover) | `shadow-card-hover` | `0 8px 30px rgba(0, 0, 0, 0.12)` |

### Hover Scale Effect
```tsx
className="hover:scale-[1.02] active:scale-[0.98] transition-transform"
```

---

## 8. TYPOGRAPHY COLORS

| Element | Color | Class |
|---------|-------|-------|
| Headings | `#2D2A26` | `text-text-primary` |
| Body Text | `#57534E` | `text-text-secondary` |
| Captions | `#78716C` | `text-text-tertiary` |
| Placeholders | `#A8A29E` | `text-text-muted` |
| Links | `#F98819` | `text-primary` |
| Links (hover) | `#E07510` | `text-primary-dark` |
| Error Text | `#DC2626` | `text-error-dark` |
| Success Text | `#16A34A` | `text-success-dark` |

---

## 9. ICONS & ILLUSTRATIONS

### Icon Containers
```tsx
// Primary
<div className="w-12 h-12 bg-primary-lighter rounded-xl flex items-center justify-center">
  <span className="text-primary text-xl">📚</span>
</div>

// Cyan
<div className="w-12 h-12 bg-cyan-lightest rounded-xl flex items-center justify-center">
  <span className="text-cyan text-xl">🔬</span>
</div>

// Gradient
<div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
  <span className="text-white text-xl">🔢</span>
</div>
```

### Avatar/Logo Container
```tsx
<div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-primary">
  <span className="text-4xl">🤖</span>
</div>
```

---

## 10. DO'S AND DON'TS

### ✅ DO's

1. **Use CSS Variables** - Always reference `var(--primary)` instead of hardcoding `#F98819`
2. **Use Tailwind Classes** - Use `bg-primary` instead of inline styles
3. **Consistent Shadows** - Use `shadow-primary` for orange elements, `shadow-cyan` for cyan
4. **Proper Contrast** - Dark text on light backgrounds, white text on colored backgrounds
5. **Gradients for CTAs** - Use `bg-gradient-primary` for main buttons
6. **Cream Background** - Use `bg-cream` for page backgrounds
7. **White Cards** - Use `bg-white` for card backgrounds
8. **Border Accents** - Use `border-l-4` for card accents

### ❌ DON'TS

1. **Don't hardcode hex values** - Never use `bg-[#F98819]` directly
2. **Don't use orange for errors** - Errors should use `error` colors
3. **Don't mix orange and cyan text** - Use for backgrounds/accents only
4. **Don't skip hover states** - Always include `:hover` styles
5. **Don't use pure black** - Use `text-primary` (#2D2A26) instead
6. **Don't use gray backgrounds** - Use `cream` for warmth
7. **Don't overuse gradients** - Reserve for headers and primary CTAs

### Color Usage Rules

| Color | ✅ Use For | ❌ Never Use For |
|-------|-----------|-----------------|
| Orange | CTAs, links, active states, brand | Errors, disabled states |
| Cyan | Info, secondary, progress | Errors, destructive actions |
| Success Green | Correct, complete, positive | Primary actions |
| Error Red | Errors, wrong, delete | Primary actions |

---

## 11. FILE-BY-FILE MIGRATION CHECKLIST

### Priority 1: UI Components (`packages/ui/`)

| File | Changes Required |
|------|------------------|
| `button.tsx` | Replace hardcoded colors with CSS variables |
| `input.tsx` | Update focus states to use `primary` |
| `progress.tsx` | Use `bg-gradient-primary` for fill |
| `card.tsx` | Use `shadow-card`, `border-border` |
| `dialog.tsx` | Add gradient top border |
| `badge.tsx` | Use semantic color variants |

### Priority 2: Auth Components (`apps/web/src/components/auth/`)

| File | Changes Required |
|------|------------------|
| `AuthCard.tsx` | `border-2 border-primary/10`, `shadow-card` |
| `InfoBox.tsx` | `bg-cyan-lightest`, `border-l-4 border-cyan` |
| `SignInEmailForm.tsx` | Input focus: `border-primary`, Button: `bg-gradient-primary` |
| `SignInPhoneForm.tsx` | Same as above |
| `SignUpEmailFlow.tsx` | Same as above |
| `SignUpPhoneFlow.tsx` | Same as above |
| `TabNavigation.tsx` | Active: `bg-primary text-white` |

### Priority 3: Assessment Components

| File | Changes Required |
|------|------------------|
| `AssessmentRunner.tsx` | Progress: `bg-gradient-primary`, Options: border states |
| `AssessmentSummary.tsx` | Score: `text-primary`, Stats: colored backgrounds |
| `QuizOption.tsx` | Implement all 4 states (default, selected, correct, wrong) |

### Priority 4: Dashboard & Pages

| File | Changes Required |
|------|------------------|
| `apps/web/src/app/page.tsx` | `bg-cream`, header gradient |
| `dashboard/page.tsx` | `bg-gradient-primary` header, stat cards |
| `join/page.tsx` | Fix rgba shadow values |
| `admin/login/page.tsx` | Auth card styling |
| `admin/schools/page.tsx` | Fix rgba shadow values |

### Find & Replace Commands

```bash
# Find all hardcoded colors
grep -rn "#F98819\|#FF7E33\|#24B0D7\|#FFE4CC\|#E8F7FB" apps/web/src --include="*.tsx"

# Find wrong rgba values
grep -rn "rgba(255,140" apps/web/src --include="*.tsx"

# Verify after migration
npm run type-check
npm run lint
npm run build
```

---

## QUICK REFERENCE CARD

```
PRIMARY ORANGE: #F98819 → bg-primary, text-primary, border-primary
PRIMARY LIGHT:  #FFE4CC → bg-primary-lighter
CYAN:           #24B0D7 → bg-cyan, text-cyan, border-cyan
CYAN LIGHT:     #E8F7FB → bg-cyan-lightest

GRADIENT:       bg-gradient-primary (135deg, #F98819 → #FFAB4A)
SHADOW:         shadow-primary (orange glow)
                shadow-cyan (cyan glow)
                shadow-card (neutral)

TEXT:           text-text-primary (#2D2A26)
                text-text-secondary (#57534E)
                text-text-tertiary (#78716C)

BACKGROUND:     bg-cream (#FFFBF7) - pages
                bg-white - cards

BORDER:         border-border (#E8E4E0)
                border-primary (accent)
```

---

**Document Version:** 1.0  
**Theme:** A - Orange + Cyan  
**Last Updated:** December 2024  
**For:** ATAL AI PWA