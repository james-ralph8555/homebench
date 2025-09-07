import { EditorView } from "@codemirror/view";

// Brand colors
const BRAND_ORANGE = "#FD9A43";
const BRAND_PURPLE = "#742D83";
const BRAND_ACCENT = "#78D8CD";

// Diagonal ramp + subtle top accent glow
const brandTextGradient = `
  radial-gradient(60% 90% at 50% 0%,
    ${BRAND_ACCENT}99 0%,
    ${BRAND_ACCENT}66 18%,
    ${BRAND_ACCENT}00 46%
  ),
  linear-gradient(135deg, ${BRAND_ORANGE} 0%, ${BRAND_PURPLE} 100%)
`;

// Note: JetBrains Mono preferred, otherwise use existing system monospace
const MONO_STACK =
  'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

export const hbPlaceholderSkin = EditorView.theme(
  {
    // Ensure our theme root overrides earlier root-scoped background rules
    "&": {
      backgroundColor: "transparent",
    },

    // Make editor surfaces transparent to inherit page background
    ".cm-editor": { backgroundColor: "transparent" },
    ".cm-scroller": { backgroundColor: "transparent" },
    ".cm-gutters": { backgroundColor: "transparent" },

    // Preserve ASCII alignment; CM will still wrap when .cm-lineWrapping is present
    ".cm-content": {
      whiteSpace: "pre",
      tabSize: "4",
      paddingTop: "10px",
      fontFamily: MONO_STACK,
    },

    // Style the EXISTING built-in placeholder span
    ".cm-placeholder": {
      whiteSpace: "pre",
      backgroundImage: brandTextGradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      opacity: "0.97",
      fontFamily: MONO_STACK,
      fontSize: "12px",
      lineHeight: "1.1",
      userSelect: "none",
      pointerEvents: "none",
      // Optional: mitigate faint haloing on some FF/GPU combos
      WebkitTextStroke: "0.2px rgba(0,0,0,0.15)" as any,
    },

    // Slightly tint selection to avoid fighting the gradient (optional)
    ".cm-focused .cm-selectionBackground, & ::selection": {
      backgroundColor: "rgba(120,216,205,0.28)", // BRAND_ACCENT with alpha
    },
  }
);
