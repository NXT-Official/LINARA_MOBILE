import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { colors } from "@/lib/theme";

/**
 * Labeled text input shared by the onboarding forms (welcome, flag-terms,
 * claim-account). Errors render inline below the field rather than as a
 * toast, matching the "warm, user-friendly Taglish text boxes" requirement
 * in Story 6's Definition of Done.
 */
export function TextField({
  label,
  error,
  hint,
  containerStyle,
  style,
  ...inputProps
}: TextInputProps & {
  label: string;
  error?: string | null;
  /** Plain help under the field, e.g. what to type; an error takes its place. */
  hint?: string;
  containerStyle?: ViewStyle;
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedInk}
        style={[styles.input, Boolean(error) && styles.inputError, style]}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
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
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.terracottaGold,
  },
  error: {
    fontSize: 13,
    color: colors.terracottaGold,
  },
  hint: {
    fontSize: 13,
    color: colors.mutedInk,
  },
});
