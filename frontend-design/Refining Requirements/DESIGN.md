---
name: Aetheric Intelligence
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bacac5'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#859490'
  outline-variant: '#3c4a46'
  surface-tint: '#3cddc7'
  primary: '#57f1db'
  on-primary: '#003731'
  primary-container: '#2dd4bf'
  on-primary-container: '#00574d'
  inverse-primary: '#006b5f'
  secondary: '#ffb2b9'
  on-secondary: '#67001f'
  secondary-container: '#891933'
  on-secondary-container: '#ff97a3'
  tertiary: '#d5d7ff'
  on-tertiary: '#131e8c'
  tertiary-container: '#b3b9ff'
  on-tertiary-container: '#3641a9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#62fae3'
  primary-fixed-dim: '#3cddc7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#ffdadc'
  secondary-fixed-dim: '#ffb2b9'
  on-secondary-fixed: '#400010'
  on-secondary-fixed-variant: '#891933'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bdc2ff'
  on-tertiary-fixed: '#000767'
  on-tertiary-fixed-variant: '#2f3aa3'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 432px
  canvas-width: 1008px
  gutter: 24px
  container-padding: 32px
  stack-gap-sm: 8px
  stack-gap-md: 16px
  stack-gap-lg: 32px
---

## Brand & Style
The design system embodies a "Collaborative Intelligence" aesthetic, positioning the agent not as a black-box tool, but as a transparent, high-functioning partner. The visual language merges **Minimalism** with subtle **Glassmorphism** to create a sense of depth and clarity.

The target audience consists of high-growth talent partners and hiring managers who require precision and speed. The UI evokes a sense of "calm capability"—it is professional and sophisticated, yet approachable through soft organic shapes and warm accents. A futuristic touch is maintained through the use of monospaced accents for technical data and blurred background states that suggest a layer of deep processing occurring beneath the surface.

## Colors
The palette is built on a "Soft Dark" foundation to reduce eye strain during deep work.
- **Primary (Teal #2DD4BF):** Used for "Success," "Match," and active AI states. It represents growth and precision.
- **Secondary (Coral #FB7185):** Reserved for "Gaps," "Attention Needed," and highlights. It provides a warm, human contrast to the technical teal.
- **Tertiary (Indigo #818CF8):** Used for secondary actions and data visualization (e.g., radar charts).
- **Neutral (Slate/Navy):** The background is a deep navy (`#0F172A`), avoiding the harshness of pure black, while the sidebar uses a slightly lighter slate (`#1E293B`) to create structural separation.

## Typography
The typography strategy pairs **Geist** for technical precision and **Inter** for readability. 
- **Geist** is used for headings, labels, and match scores to emphasize the "Intelligence" aspect of the platform. Its geometric nature feels engineered and modern.
- **Inter** handles all body copy and candidate descriptions, ensuring high legibility during long-form reading sessions.
- **Data Accents:** Use the monospaced stylistic sets of Geist for ranking differences, percentages, and funnel counts to evoke a "live-feed" data feel.

## Layout & Spacing
The system utilizes a **Fixed Split-Pane Layout** optimized for 1440px displays.
- **Chat Sidebar (30% / 432px):** A fixed vertical container for the conversational interface. It uses a slight background blur (backdrop-filter) to distinguish itself from the main canvas.
- **Insight Canvas (70% / 1008px):** A dynamic area for deep-dive intelligence. Content is organized into a modular grid.
- **Spacing Rhythm:** Based on an 8px scale. Use 24px gutters between major modules and 32px padding for internal card content. 
- **Responsiveness:** On smaller viewports (Tablet), the sidebar collapses into a bottom-sheet or a toggle-drawer, allowing the Canvas to take priority.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Glassmorphism** rather than traditional heavy shadows.
- **Level 0 (Background):** Deep Navy (`#0F172A`).
- **Level 1 (Cards/Sidebar):** Slate (`#1E293B`) with a 1px subtle border in `rgba(255,255,255,0.1)`.
- **Level 2 (Modals/Popovers):** Slate with a 20px backdrop blur and a 10% white tint.
- **Shadows:** Use "Ambient Glows" for primary elements. Instead of black shadows, use a diffused teal glow (`rgba(45, 212, 191, 0.15)`) for high-score match cards to make them feel "pulsating" with relevance.

## Shapes
The shape language is **Rounded**, conveying a friendly and modern personality.
- **Standard Radius:** 8px for small components (chips, inputs).
- **Large Radius:** 16px for candidate cards and container modules.
- **Interactive Elements:** Buttons utilize a "Squircle" approach or a full pill-shape for primary CTA actions to make them feel more tactile and inviting.

## Components
- **Match Score Rings:** Circular progress indicators using the Primary Teal. Use a thick stroke (4px+) with a semi-transparent track. High scores (>85%) receive a subtle outer glow.
- **Candidate Cards:** 
  - *Compact:* Focuses on Name, Role, Score, and "Top 3 Skills."
  - *Expanded:* Slides open to reveal the "Strength/Gap" blocks and the timeline.
- **Strength/Gap Blocks:** Semi-transparent containers. Strengths use a Primary Teal left-border; Gaps use a Secondary Coral left-border.
- **Agent Timeline:** A vertical "Thinking" thread. Use monospaced font for "Agent Logic" steps (e.g., `> ANALYZING_RESUME_V3`). Each step has a small pulsing dot indicator.
- **Funnel Stages:** A horizontal "Pipeline" component showing the reduction of candidates (100 -> 10 -> 3). Use a tapered background shape to visually represent the narrowing focus.
- **Skill Chips:** Editable, rounded-md chips. On hover, show a "minus" icon to remove. The "Add" chip is a dashed-border outline.
- **Ranking-Diff Badges:** Small pill-shaped badges next to candidate names (e.g., `▲ 2` in Teal or `▼ 1` in Coral) to show movement after new criteria are added.