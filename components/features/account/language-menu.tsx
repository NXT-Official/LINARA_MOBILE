import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";
import { LOCALES, localeLabel } from "@/lib/i18n/locales";
import { useLocale, useT } from "@/lib/i18n/locale-context";

/**
 * Picks the app's language, as the Business Console's menu does. Opens in
 * place rather than as a dialog, so hardware Back never has a sheet to close.
 * Each option is written in its own language.
 */
export function LanguageMenu() {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t("language.current", { language: localeLabel(locale) })}
        hitSlop={8}
        style={styles.toggle}
      >
        <Ionicons name="language-outline" size={18} color={colors.pineTeal} />
        <Text style={styles.toggleText}>
          {t("language.current", { language: localeLabel(locale) })}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedInk} />
      </Pressable>
      {open ? (
        <View style={styles.list} accessibilityRole="radiogroup">
          {LOCALES.map((l) => {
            const selected = l.code === locale;
            return (
              <Pressable
                key={l.code}
                onPress={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={styles.option}
              >
                <Text style={[styles.optionText, selected && styles.optionSelected]}>
                  {l.label}
                </Text>
                {selected ? <Ionicons name="checkmark" size={18} color={colors.pineTeal} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    minHeight: 44,
  },
  toggleText: { fontSize: 14, fontWeight: "700", color: colors.pineTeal },
  list: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: 15, color: colors.ink },
  optionSelected: { fontWeight: "700", color: colors.pineTeal },
});
