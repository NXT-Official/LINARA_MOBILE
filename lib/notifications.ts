import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/services/supabase";

/**
 * Push notifications (../LINARA/KNOWN_GAPS.md O7). The web app decides when to
 * send (../LINARA/src/features/notifications/push.ts): a manager's explicit
 * override or emergency, and an appointment move while she is on shift.
 * Nothing here pings her on its own.
 *
 * Registration is best-effort: no permission, Expo Go on Android (no remote
 * push there since SDK 53), or no network all leave the app working exactly
 * as before -- she sees everything the next time she opens it.
 */

/** Must match `channelId` in the web sender. */
export const ALERTS_CHANNEL = "alerts";

const TOKEN_KEY = "linara.pushToken";

// Shown while the app is open too: an emergency shouldn't wait for her to
// notice the screen changed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Asks once for permission, gets this phone's Expo push token and records it
 * against her account. Safe to call on every app open: the server upserts.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      // Android 13+ needs a channel before it will show the permission prompt.
      await Notifications.setNotificationChannelAsync(ALERTS_CHANNEL, {
        name: "Mga utos at pagbabago sa schedule",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase.rpc("register_push_token", {
      p_token: token,
      p_platform: Platform.OS === "ios" ? "ios" : "android",
    });
    if (error) throw new Error(error.message);
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn("[push] Not registered for notifications:", err);
  }
}

/**
 * Drops this phone's token from her account before signing out, so whoever
 * signs in next on a shared phone doesn't get her notifications.
 */
export async function unregisterForPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.rpc("unregister_push_token", { p_token: token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn("[push] Token not removed:", err);
  }
}
