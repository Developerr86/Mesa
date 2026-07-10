export const Theme = {
  colors: {
    // Canvas (the "moment" layer - camera, hero photo, greeting): dark polar tone
    canvasBackground: '#141312', // Warm near-black
    canvasText: '#F7F4EF', // Off-white text for canvas readability
    canvasTextMuted: '#9A958F', // Muted text for canvas secondary text

    // Sheet (the "task" layer - confirm, detail, list): light polar tone
    sheetBackground: '#FAF8F5', // Warm near-white/cream
    sheetText: '#1C1B1A', // Dark near-black text for high contrast on sheet
    sheetTextMuted: '#7E7A75', // Muted text for sheet secondary text
    sheetBorder: '#EFECE6', // Subtle separator lines within the sheet

    // Single accent color (used sparingly: capture action, drag handle, confirmation states)
    accent: '#E76F51', // Elegant warm coral-orange
    accentMuted: 'rgba(231, 111, 81, 0.1)',
  },

  typography: {
    // Two weights only across the whole app (no light/book weights, no semi-bolds)
    weights: {
      regular: '400' as const,
      bold: '700' as const,
    },
    sizes: {
      hero: 80, // Hero numerals
      title: 24, // Page/section title
      body: 16, // Default text
      caption: 13, // Smaller details
    },
  },

  layout: {
    // Signature corner radius matching the physical corner radius of modern phone screens
    deviceCornerRadius: 40,
    // Horizontal padding for screens/sheets
    screenPadding: 24,
  },
};
