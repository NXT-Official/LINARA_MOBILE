import { useState } from "react";
import {
  Image,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { colors } from "@/lib/theme";
import { useSopSlides } from "@/hooks/use-sop-slides";
import type { FocusTaskSop } from "@/services/api/tickets";

/**
 * Swipable House Standard (SOP) slide deck inside the Active Focus Card
 * (roadmap Story 7, step 3). Uses a plain paging ScrollView rather than a
 * carousel library -- the web reference (src/components/ui/carousel.tsx)
 * is embla-carousel, which is DOM-only and has no React Native build, and
 * RN's built-in `pagingEnabled` ScrollView already gives a fluid swipe with
 * zero added dependencies.
 */
export function SopCarousel({ sop }: { sop: FocusTaskSop }) {
  const { width: windowWidth } = useWindowDimensions();
  const [slideWidth, setSlideWidth] = useState(windowWidth);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useSopSlides(sop);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth <= 0) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), slides.length - 1));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sopTitle}>{sop.title}</Text>
      <View onLayout={(e) => setSlideWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
        >
          {slides.map((slide) => (
            <View key={slide.key} style={[styles.slide, { width: slideWidth }]}>
              {slide.imageUrl ? (
                <Image
                  source={{ uri: slide.imageUrl }}
                  style={styles.slideImage}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.slideText}>{slide.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {slides.length > 1 && (
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View key={slide.key} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: colors.sand,
    overflow: "hidden",
  },
  sopTitle: {
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: colors.mutedInk,
  },
  slide: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  slideImage: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  slideText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.pineTeal,
    width: 16,
  },
});
