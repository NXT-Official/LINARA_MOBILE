import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { colors } from "@/lib/theme";
import {
  formatHmLabel,
  formatIsoDateLabel,
  parseHm,
  parseIsoDate,
  toHm,
  toIsoDate,
} from "@/lib/datetime-fields";

/**
 * A labeled field that opens the platform's own date or time picker, styled to
 * match TextField so a form can mix the two without looking assembled.
 *
 * Session E / E3b. The rest-off form previously took `YYYY-MM-DD` and `HH:MM`
 * as typed text -- on a phone, with a kasambahay as the user. It validated the
 * shape, so a typo became an error message rather than bad data, but every typo
 * was still a round trip through failure. A picker removes the class of error
 * instead of reporting it.
 *
 * The VALUE stays a string in wire format. Everything downstream -- the RPCs,
 * the advisory past-date check, the balance preview -- keeps working on
 * `YYYY-MM-DD` / `HH:MM` exactly as before, and lib/datetime-fields.ts does the
 * conversion without ever going through UTC (see that file: a picker is the
 * most natural place to reintroduce C38).
 *
 * Platform difference worth knowing: on iOS the picker is inline and stays open
 * until dismissed, so it is wrapped in its own confirm affordance; on Android it
 * is a modal dialog that closes itself and fires once. `event.type` tells us
 * which happened -- a dismissed Android dialog reports "dismissed" and must not
 * be read as a value.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  minimumIsoDate,
  placeholder,
  containerStyle,
}: {
  label: string;
  mode: "date" | "time";
  /** `YYYY-MM-DD` for date, `HH:MM` for time. Empty string means unset. */
  value: string;
  onChange: (next: string) => void;
  /** Earliest selectable day, `YYYY-MM-DD`. Date mode only. */
  minimumIsoDate?: string;
  placeholder?: string;
  containerStyle?: ViewStyle;
}) {
  const [open, setOpen] = useState(false);

  const parsed = mode === "date" ? parseIsoDate(value) : parseHm(value);
  // An unset or unparseable value opens the picker on a sensible spot rather
  // than on Invalid Date, which renders as a blank wheel on both platforms.
  const pickerValue = parsed ?? new Date();

  const label_ = value
    ? mode === "date"
      ? formatIsoDateLabel(value)
      : formatHmLabel(value)
    : (placeholder ?? "Pumili");

  const handleChange = (event: DateTimePickerEvent, next?: Date) => {
    // Android's dialog manages its own dismissal and fires exactly once.
    if (Platform.OS !== "ios") setOpen(false);

    // "dismissed" means the user backed out. Writing a value here would turn
    // a cancel into a silent selection of whatever the wheel happened to show.
    if (event.type === "dismissed" || !next) return;

    onChange(mode === "date" ? toIsoDate(next) : toHm(next));
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? label_ : "wala pang napipili"}`}
        style={styles.field}
      >
        <Text style={[styles.valueText, !value && styles.placeholderText]}>{label_}</Text>
      </Pressable>

      {open && (
        <>
          <DateTimePicker
            value={pickerValue}
            mode={mode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={
              mode === "date" && minimumIsoDate
                ? (parseIsoDate(minimumIsoDate) ?? undefined)
                : undefined
            }
            onChange={handleChange}
          />
          {/* iOS keeps the wheel on screen, so it needs an explicit way out.
              Android's dialog supplies its own buttons. */}
          {Platform.OS === "ios" && (
            <Pressable onPress={() => setOpen(false)} style={styles.done}>
              <Text style={styles.doneText}>Tapos</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  field: {
    minHeight: 52,
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    paddingHorizontal: 16,
  },
  valueText: {
    fontSize: 16,
    color: colors.ink,
  },
  placeholderText: {
    color: colors.mutedInk,
  },
  done: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  doneText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.pineTeal,
  },
});
