import { forwardRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * How a screen makes room for the keyboard. Android draws edge to edge now,
 * so the window no longer shrinks when the keyboard opens and a field near
 * the bottom stayed hidden under it while she typed (device QA 2026-10-20,
 * N-01). "height" shrinks the screen instead, and the ScrollView inside
 * keeps the focused field in view.
 */
export const KEYBOARD_BEHAVIOR = Platform.OS === "ios" ? "padding" : "height";

/**
 * How far a screen's root sits below the top of the window. The tab and
 * sign-in layouts pad every screen down by the status bar, and without this
 * the keyboard is measured that much short: the screen stayed 52 dp too tall
 * and a button under the field she typed in stayed under the keyboard
 * (device QA 2026-10-21, N-01).
 */
export function useKeyboardOffset(): number {
  return useSafeAreaInsets().top;
}

/** A tab screen's root that stays clear of the keyboard. */
export function KeyboardScreen({ children }: { children: ReactNode }) {
  const keyboardOffset = useKeyboardOffset();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={KEYBOARD_BEHAVIOR}
      keyboardVerticalOffset={keyboardOffset}
    >
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
