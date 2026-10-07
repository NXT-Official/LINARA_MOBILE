import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";
import type { TodayLayout } from "@/hooks/use-today-layout";

const OPTIONS: { key: TodayLayout; label: string }[] = [
  { key: "focus", label: "Isa-isa" },
  { key: "list", label: "Listahan" },
  { key: "timeline", label: "Oras" },
];

/** Her choice of how Today shows the day. */
export function LayoutSwitch({
  value,
  onChange,
}: {
  value: TodayLayout;
  onChange: (next: TodayLayout) => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist" accessibilityLabel="Ayos ng Ngayon">
      {OPTIONS.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.option, on && styles.optionOn]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    padding: 3,
    gap: 2,
  },
  option: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: "center",
  },
  optionOn: {
    backgroundColor: colors.pineTeal,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedInk,
  },
  textOn: {
    color: colors.cardCream,
  },
});
