import '@mui/material/styles';

// Extend MUI's Palette to include Material Design 3 colors
declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
    surface: Palette['primary'];
    surfaceContainer: Palette['primary'];
    onPrimaryContainer: Palette['primary'];
    onSecondaryContainer: Palette['primary'];
    onTertiaryContainer: Palette['primary'];
    onSurface: Palette['primary'];
    onSurfaceVariant: Palette['primary'];
    outline: Palette['primary'];
    outlineVariant: Palette['primary'];
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
    surface?: PaletteOptions['primary'];
    surfaceContainer?: PaletteOptions['primary'];
    onPrimaryContainer?: PaletteOptions['primary'];
    onSecondaryContainer?: PaletteOptions['primary'];
    onTertiaryContainer?: PaletteOptions['primary'];
    onSurface?: PaletteOptions['primary'];
    onSurfaceVariant?: PaletteOptions['primary'];
    outline?: PaletteOptions['primary'];
    outlineVariant?: PaletteOptions['primary'];
  }

  // Add Material Design 3 Typography variants
  interface TypographyVariants {
    displayLarge: React.CSSProperties;
    displayMedium: React.CSSProperties;
    displaySmall: React.CSSProperties;
    headlineLarge: React.CSSProperties;
    headlineMedium: React.CSSProperties;
    headlineSmall: React.CSSProperties;
    titleLarge: React.CSSProperties;
    titleMedium: React.CSSProperties;
    titleSmall: React.CSSProperties;
    bodyLarge: React.CSSProperties;
    bodyMedium: React.CSSProperties;
    bodySmall: React.CSSProperties;
    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    displayLarge?: React.CSSProperties;
    displayMedium?: React.CSSProperties;
    displaySmall?: React.CSSProperties;
    headlineLarge?: React.CSSProperties;
    headlineMedium?: React.CSSProperties;
    headlineSmall?: React.CSSProperties;
    titleLarge?: React.CSSProperties;
    titleMedium?: React.CSSProperties;
    titleSmall?: React.CSSProperties;
    bodyLarge?: React.CSSProperties;
    bodyMedium?: React.CSSProperties;
    bodySmall?: React.CSSProperties;
    labelLarge?: React.CSSProperties;
    labelMedium?: React.CSSProperties;
    labelSmall?: React.CSSProperties;
  }
}

// Update Typography props to include custom variants
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    displayLarge: true;
    displayMedium: true;
    displaySmall: true;
    headlineLarge: true;
    headlineMedium: true;
    headlineSmall: true;
    titleLarge: true;
    titleMedium: true;
    titleSmall: true;
    bodyLarge: true;
    bodyMedium: true;
    bodySmall: true;
    labelLarge: true;
    labelMedium: true;
    labelSmall: true;
  }
}

// Extend Button colors to include tertiary
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    tertiary: true;
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    tertiary: true;
  }
}

declare module '@mui/material/Fab' {
  interface FabPropsColorOverrides {
    tertiary: true;
  }
}
