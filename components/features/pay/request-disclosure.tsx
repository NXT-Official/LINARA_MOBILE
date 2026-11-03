import { useEffect, type ReactNode } from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";

import { colors, fonts } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";

/**
 * The fields of a request form on My Pay, folded behind one button until she
 * wants to ask for something. My Pay is where she checks her pay, and three
 * always-open forms (day off, leave, vale) buried it. Only the fields fold:
 * her balance, what she's waiting on, and anything asking for her answer stay
 * on the card. Closing keeps what she typed.
 */
export function RequestDisclosure({
  open,
  onOpenChange,
  openLabel,
  disabled,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Says what she'd be asking for, e.g. "Humiling ng vale". */
  openLabel: string;
  /** Nothing to ask for yet, e.g. no rest owed left. */
  disabled?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  // Back folds an open form, like its own "Huwag na lang", instead of
  // leaving the app with her typing still on screen.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onOpenChange(false);
      return true;
    });
    return () => sub.remove();
  }, [open, onOpenChange]);

  if (!open) {
    return (
      <PrimaryButton
        label={openLabel}
        variant="secondary"
        onPress={() => onOpenChange(true)}
        disabled={disabled}
      />
    );
  }

  return (
    <View style={styles.fields}>
      {children}
      <Pressable
        onPress={() => onOpenChange(false)}
        hitSlop={8}
        accessibilityRole="button"
        style={styles.close}
      >
        <Text style={styles.closeText}>{t("pay.huwagNaLang")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 10,
  },
  close: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.mutedInk,
  },
});
