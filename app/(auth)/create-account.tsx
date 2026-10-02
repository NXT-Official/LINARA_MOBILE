import type { ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * "Gumawa ng account": the one place a new person says which kind they are,
 * like an employer / job-seeker switch in a job app. Sign-in itself is shared
 * (sign-in.tsx): the account's type decides where it lands.
 */
export default function CreateAccountScreen() {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>Gumawa ng account</Text>
        <Text style={styles.subtitle}>Alin ka sa dalawa?</Text>
      </View>

      <Choice
        icon="person-outline"
        title="Kasambahay ako"
        body="Nagtatrabaho ako sa isang bahay. Sasali ako gamit ang invite code galing sa employer ko."
        onPress={() => router.push("/(auth)/welcome")}
      />
      <Choice
        icon="home-outline"
        title="Employer ako"
        body="I run a household. Set it up, then invite the people who work in it."
        onPress={() => router.push({ pathname: "/manager", params: { signup: "1" } })}
      />

      <Pressable
        onPress={() => router.replace("/(auth)/sign-in")}
        hitSlop={8}
        accessibilityRole="button"
        style={styles.linkWrap}
      >
        <Text style={styles.link}>May account ka na? Mag-sign in</Text>
      </Pressable>
    </ScrollView>
  );
}

function Choice({
  icon,
  title,
  body,
  onPress,
}: {
  icon: IconName;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
    >
      <View style={styles.choiceIcon}>
        <Ionicons name={icon} size={22} color={colors.pineTeal} />
      </View>
      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceBody}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.sand },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 14 },
  hero: { marginBottom: 10, gap: 8 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.pineTeal },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.mutedInk },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 88,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardCream,
  },
  choicePressed: { borderColor: colors.pineTeal },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
  },
  choiceText: { flex: 1, gap: 4 },
  choiceTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  choiceBody: { fontSize: 14, lineHeight: 20, color: colors.mutedInk },
  linkWrap: { marginTop: 12, minHeight: 44, justifyContent: "center" },
  link: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
});
