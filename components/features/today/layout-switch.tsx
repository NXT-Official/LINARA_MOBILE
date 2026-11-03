import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/lib/theme";
import type { TodayLayout } from "@/hooks/use-today-layout";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/instance";

const OPTIONS: { key: TodayLayout; label: MessageKey }[] = [
  { key: "focus", label: "layout.focus" },
  { key: "list", label: "layout.list" },
  { key: "timeline", label: "layout.timeline" },
];

/** Her choice of how Today shows the day. */
export function LayoutSwitch({
  value,
  onChange,
}: {
  value: TodayLayout;
  onChange: (next: TodayLayout) => void;
}) {
  const t = useT();
  return (
    <View
      style={styles.wrap}
      accessibilityRole="tablist"
      accessibilityLabel={t("today.ayosNgNgayon")}
    >
      {OPTIONS.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            hitSlop={{ top: 4, bottom: 4 }}
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.option, on && styles.optionOn]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{t(o.label)}</Text>
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
    minHeight: 44,
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
