/**
 * Brand color tokens for the native shell, matching the web dashboard's
 * `--sand` / `--pine` / `--terracotta` custom properties (see
 * ../LINARA/src/styles.css) and the literal hex values given in
 * roadmap/Story_5_MobileShellAndBottomNavigationTabs.md's Explicit Inputs.
 */
export const colors = {
  sand: "#F7F3EC",
  pineTeal: "#1F5A54",
  cardCream: "#FDFBF6",
  terracottaGold: "#D99A6C",
  /** Terracotta for words on cream (5.6:1); plain terracottaGold is 2.3:1 there. Matches ../LINARA's --terracotta-ink. */
  terracottaInk: "#9F5021",
  ink: "#1C2E2C",
  mutedInk: "#5C6B69",
  border: "#E4DCCB",
} as const;

/**
 * Custom typography (roadmap Story 11 step 4): Fraunces for display
 * headers/figures, Nunito Sans for everything else. Loaded via `useFonts`
 * in app/_layout.tsx; these family names must match the keys passed there.
 */
export const fonts = {
  display: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
  body: "NunitoSans_400Regular",
  bodyBold: "NunitoSans_700Bold",
} as const;
