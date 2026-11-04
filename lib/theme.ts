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
  /** Rest-day wash: half ../LINARA's --terracotta-soft, half cream, so muted and terracotta text stay 4.5:1 on it. */
  terracottaWash: "#F8E5D5",
  ink: "#1C2E2C",
  mutedInk: "#5C6B69",
  border: "#E4DCCB",
  /** ../LINARA DESIGN.md "Late": emergencies and over budget. Fill / tint / words, as there. */
  statusLate: "#C43B15",
  statusLateSoft: "#FFDACD",
  statusLateInk: "#8C1E00",
  /** The on-shift dot on the pine header: light enough to read against pine. */
  shiftDot: "#8FE3C4",
} as const;

/**
 * Typography matching the web dashboard (../LINARA/DESIGN.md): Literata for
 * headings and figures, Nunito Sans for everything read or tapped, Fraunces
 * only for the "linara" wordmark. Loaded via `useFonts` in app/_layout.tsx;
 * these family names must match the keys passed there. Body text gets its
 * family from components/ui/text.tsx, so screens only set a weight.
 */
export const fonts = {
  display: "Literata_400Regular",
  displayBold: "Literata_600SemiBold",
  wordmark: "Fraunces_600SemiBold",
  body: "NunitoSans_400Regular",
  bodySemiBold: "NunitoSans_600SemiBold",
  bodyBold: "NunitoSans_700Bold",
} as const;
