import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { queryClient } from "@/lib/query-client";
import { registerForPush } from "@/lib/notifications";
import { useSession } from "@/lib/session-context";

const ROUTES = ["/today", "/week"] as const;
type PushRoute = (typeof ROUTES)[number];

function openFrom(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (!ROUTES.includes(url as PushRoute)) return;
  // What the push announced may not be in the cache yet.
  void queryClient.invalidateQueries();
  router.push(url as PushRoute);
  Notifications.clearLastNotificationResponse();
}

/**
 * Registers this phone for pushes once she is signed in, and opens the screen
 * a tapped notification points at -- including the tap that launched the app.
 */
export function usePushNotifications() {
  const { session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) void registerForPush();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    openFrom(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(openFrom);
    return () => subscription.remove();
  }, [userId]);
}
