# Design system

## Theme

A citizen reviews a tax return at a desk in bright daytime light, moving carefully between dense official records and a browser agent's proposed corrections. The interface uses crisp white working surfaces, deep indigo structure, restrained gold detail, and red only for blocking warnings.

Color strategy: Restrained product palette. Cultural identity comes from line work, proportions, and indigo-gold accents rather than a tinted beige page.

## Colors

```css
:root {
  --bg: oklch(0.985 0 0);
  --surface: oklch(1 0 0);
  --surface-muted: oklch(0.955 0.008 250);
  --ink: oklch(0.205 0.035 255);
  --muted: oklch(0.46 0.025 255);
  --primary: oklch(0.43 0.14 250);
  --primary-hover: oklch(0.36 0.13 250);
  --accent: oklch(0.72 0.12 82);
  --accent-soft: oklch(0.93 0.04 82);
  --danger: oklch(0.50 0.19 28);
  --danger-soft: oklch(0.94 0.04 28);
  --success: oklch(0.45 0.12 155);
  --success-soft: oklch(0.94 0.035 155);
  --border: oklch(0.86 0.012 250);
  --focus: oklch(0.65 0.16 250);
}
```

## Typography

Use the system sans stack for the complete product. Tax forms need stable, familiar labels more than a display typeface.

- Page title: 2rem, 700, 1.15 line height.
- Section title: 1.25rem, 700, 1.25 line height.
- Body: 1rem, 400, 1.55 line height, maximum 72ch for prose.
- Label and table header: 0.875rem, 650, 1.35 line height.
- Supporting text: 0.875rem, 400, 1.5 line height.
- Numeric tax values use `font-variant-numeric: tabular-nums`.

## Layout

- Mobile first with a single content column and sticky bottom actions.
- At 768px, use a compact top navigation and two-column summary layouts.
- At 1040px, use a 240px filing navigation beside a maximum 920px work area.
- Group related fields tightly at 8px to 12px. Separate form sections by 32px to 48px.
- Tables become labelled record blocks below 720px without hiding fields.
- The activity history sits after the affected form on small screens and beside it on wide screens.

## Cultural details

- Use a thin kawung-derived geometric line pattern only in the global header and page margins.
- Use small symmetrical embroidery-like line endings on major section dividers.
- Never place motifs behind labels, inputs, tables, warnings, or legal text.
- Do not use cultural illustrations, costume drawings, flags, seals, or fake government marks.

## Components

- Buttons use 8px radius, 44px minimum height, and specific verb-object labels.
- Inputs use native controls, persistent labels, 8px radius, and visible help or errors below the field.
- Panels use a solid background and either a border or a short shadow with no more than 8px blur.
- Status uses text, icon or symbol, and color together.
- Confirmations appear inline beside the proposed change. Destructive removal also provides undo.
- Legal guidance uses native `details` and `summary` elements.
- Loading states use short skeleton rows. Motion lasts 150ms to 220ms and becomes instant under reduced motion.

## Voice

Direct and respectful. Lead with English labels and explanations. Include official Indonesian tax terms as secondary references only when useful. Errors state what happened and how to fix it. Avoid jokes, promotional language, vague success messages, and claims that the simulation provides tax advice.
