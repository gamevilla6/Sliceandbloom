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
    text: '#17343B',
    tint: '#3EA6FF',

    // Core surfaces
    background: '#FFF3DC',
    foreground: '#17343B',

    // Cards / elevated surfaces
    card: '#FBE0B0',
    cardForeground: '#17343B',

    // Primary action color (buttons, links, active states)
    primary: '#3EA6FF',
    primaryForeground: '#FFFBF2',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#FBE0B0',
    secondaryForeground: '#17343B',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#FBE0B0',
    mutedForeground: '#4C6A70',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#FBE0B0',
    accentForeground: '#17343B',

    // Destructive actions (delete, error states)
    destructive: '#FF5D4D',
    destructiveForeground: '#FFFBF2',

    // Borders and input outlines
    border: '#17343B',
    input: '#17343B',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
