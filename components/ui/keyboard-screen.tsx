import { forwardRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from "react-native";

/**
 * How a screen makes room for the keyboard. Android draws edge to edge now,
 * so the window no longer shrinks when the keyboard opens and a field near
 * the bottom stayed hidden under it while she typed (device QA 2026-10-20,
 * N-01). "height" shrinks the screen instead, and the ScrollView inside
 * keeps the focused field in view.
 */
export const KEYBOARD_BEHAVIOR = Platform.OS === "ios" ? "padding" : "height";

/** A tab screen's root that stays clear of the keyboard. */
export function KeyboardScreen({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_BEHAVIOR}>
      {children}
    </KeyboardAvoidingView>
  );
}

/** A screen's root ScrollView that stays clear of the keyboard. */
export const KeyboardScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardScrollView(props, ref) {
    return (
      <KeyboardScreen>
        <ScrollView ref={ref} {...props} />
      </KeyboardScreen>
    );
  },
);

const styles = StyleSheet.create({ flex: { flex: 1 } });
