/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#14275C',
    tint: '#247BEB',

    // Core surfaces
    background: '#FFF5D6',
    foreground: '#14275C',

    // Cards / elevated surfaces
    card: '#FFE79A',
    cardForeground: '#14275C',

    // Primary action color (buttons, links, active states)
    primary: '#247BEB',
    primaryForeground: '#FFFBF2',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#FFE79A',
    secondaryForeground: '#14275C',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#FFE79A',
    mutedForeground: '#4C6A70',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#FFE79A',
    accentForeground: '#14275C',

    // Destructive actions (delete, error states)
    destructive: '#FF5D4D',
    destructiveForeground: '#FFFBF2',

    // Borders and input outlines
    border: '#14275C',
    input: '#14275C',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
