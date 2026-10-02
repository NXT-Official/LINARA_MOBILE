import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";

// How far a drag has to go to count as a swipe to the next or previous task.
const SWIPE_DISTANCE = 60;
// Where the incoming card starts its slide in from.
const ENTER_OFFSET = 120;

/**
 * Lets her swipe the focus card through today's open tasks (tester feedback:
 * people don't work in order, and tasks overlap). The arrows do the same for
 * anyone who doesn't swipe. A drag that starts inside something that scrolls
 * sideways itself, like the SOP deck, stays with that.
 */
export function FocusDeck({
  count,
  index,
  onIndexChange,
  children,
}: {
  count: number;
  index: number;
  onIndexChange: (next: number) => void;
  children: ReactNode;
}) {
  // The responder is built once; it reads the latest props from `latest`.
  const latest = useRef({ count, index, onIndexChange });
  useEffect(() => {
    latest.current = { count, index, onIndexChange };
  });

  // Built once so a re-render mid-drag doesn't reset the gesture. `latest` is
  // only read inside the gesture and arrow callbacks, never while rendering.
  // eslint-disable-next-line react-hooks/refs -- see above
  const [deck] = useState(() => {
    const dx = new Animated.Value(0);
    const settle = () => Animated.spring(dx, { toValue: 0, useNativeDriver: true }).start();

    const goTo = (next: number) => {
      const { count: total, index: current, onIndexChange: change } = latest.current;
      if (next !== current && next >= 0 && next < total) {
        change(next);
        dx.setValue(next > current ? ENTER_OFFSET : -ENTER_OFFSET);
      }
      settle();
    };

    const responder = PanResponder.create({
      // Clearly sideways drags only; up and down stays with the page.
      onMoveShouldSetPanResponder: (_e, g) =>
        latest.current.count > 1 && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        const { count: total, index: current } = latest.current;
        const pastEnd = (g.dx > 0 && current === 0) || (g.dx < 0 && current === total - 1);
        dx.setValue(pastEnd ? g.dx / 4 : g.dx);
      },
      onPanResponderRelease: (_e, g) => {
        const current = latest.current.index;
        goTo(
          g.dx <= -SWIPE_DISTANCE ? current + 1 : g.dx >= SWIPE_DISTANCE ? current - 1 : current,
        );
      },
      onPanResponderTerminate: settle,
    });

    return { dx, goTo, handlers: responder.panHandlers };
  });

  return (
    <View style={styles.wrap}>
      {count > 1 ? (
        <View style={styles.nav}>
          <Pressable
            onPress={() => deck.goTo(index - 1)}
            disabled={index === 0}
            accessibilityRole="button"
            accessibilityLabel="Nakaraang task"
            hitSlop={8}
            style={[styles.arrow, index === 0 && styles.arrowOff]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.pineTeal} />
          </Pressable>
          <Text style={styles.position} accessibilityLiveRegion="polite">
            Task {index + 1} sa {count} · i-swipe para lumipat
          </Text>
          <Pressable
            onPress={() => deck.goTo(index + 1)}
            disabled={index === count - 1}
            accessibilityRole="button"
            accessibilityLabel="Susunod na task"
            hitSlop={8}
            style={[styles.arrow, index === count - 1 && styles.arrowOff]}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.pineTeal} />
          </Pressable>
        </View>
      ) : null}
      <Animated.View {...deck.handlers} style={{ transform: [{ translateX: deck.dx }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrowOff: { opacity: 0.35 },
  position: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedInk,
  },
});
