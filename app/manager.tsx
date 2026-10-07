import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import type { Session } from "@supabase/supabase-js";

import { MANAGER_DASHBOARD_URL } from "@/lib/env";
import { colors } from "@/lib/theme";
import { useSession } from "@/lib/session-context";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/services/supabase";
import { signOutHelper } from "@/services/api/auth";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StartupWait } from "@/components/ui/startup-wait";

// The web dashboard keeps its session under these localStorage keys, not
// Supabase's own storage -- must match ../LINARA/src/features/people/hooks/use-session.ts.
const TOKEN_KEY = "linara_manager_token";
const REFRESH_KEY = "linara_manager_refresh_token";
const USER_ID_KEY = "linara_manager_user_id";
const HOUSEHOLD_ID_KEY = "linara_manager_household_id";

type BridgeMessage =
  | { type: "session"; accessToken: string | null; refreshToken: string | null }
  | { type: "signed-out" }
  | { type: "session-lost" };

function tokensOf(session: Session | null) {
  return session
    ? {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        userId: session.user.id,
      }
    : null;
}

/** Writes this app's session where the web dashboard reads it, with the page's own setItem. */
function writeTokensScript(session: Session) {
  return `(function () {
  var t = ${JSON.stringify(tokensOf(session))};
  var ls = window.localStorage, set = window.__linaraSetItem || Storage.prototype.setItem;
  if (ls.getItem(${JSON.stringify(USER_ID_KEY)}) !== t.userId) ls.removeItem(${JSON.stringify(HOUSEHOLD_ID_KEY)});
  set.call(ls, ${JSON.stringify(TOKEN_KEY)}, t.accessToken);
  set.call(ls, ${JSON.stringify(REFRESH_KEY)}, t.refreshToken);
  set.call(ls, ${JSON.stringify(USER_ID_KEY)}, t.userId);
})();`;
}

/**
 * Runs at the start of every page load. Hands the dashboard this app's session
 * unless the page already holds a newer token for the same manager (after an
 * hourly refresh reload, the session baked in here is the older one), then
 * reports the dashboard's own sign-in and sign-out back to the app.
 *
 * The web wipes its token both when the manager taps Log out and when it
 * can't restore a session on load (expired token, flaky network). Only the
 * first should sign the app out, so a wipe right after a tap is "signed-out"
 * and any other is "session-lost", which the app answers with a fresh token.
 */
function bootScript(session: Session | null) {
  return `(function () {
  var t = ${JSON.stringify(tokensOf(session))};
  var TOKEN = ${JSON.stringify(TOKEN_KEY)}, REFRESH = ${JSON.stringify(REFRESH_KEY)};
  var USER = ${JSON.stringify(USER_ID_KEY)}, HOUSEHOLD = ${JSON.stringify(HOUSEHOLD_ID_KEY)};
  var ls = window.localStorage;
  var set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
  // Signed out of the app: drop whatever session this WebView kept from the
  // last manager, once (sessionStorage outlives reloads, not the WebView), so
  // the sign-up page never quietly resumes someone else's dashboard.
  if (!t && !window.sessionStorage.getItem("linara_app_cleared")) {
    remove.call(ls, TOKEN);
    remove.call(ls, REFRESH);
    remove.call(ls, USER);
    remove.call(ls, HOUSEHOLD);
    window.sessionStorage.setItem("linara_app_cleared", "1");
  }
  function post(m) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  function exp(jwt) {
    try {
      var part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(part)).exp || 0;
    } catch (e) { return 0; }
  }
  if (t) {
    var current = ls.getItem(TOKEN);
    var sameUser = ls.getItem(USER) === t.userId;
    if (!current || !sameUser || exp(t.accessToken) > exp(current)) {
      if (!sameUser) remove.call(ls, HOUSEHOLD);
      set.call(ls, TOKEN, t.accessToken);
      set.call(ls, REFRESH, t.refreshToken);
      set.call(ls, USER, t.userId);
      // Too late if the dashboard already read the old one: start over.
      if (document.readyState !== "loading" && current !== t.accessToken) { location.reload(); return; }
    }
  }
  if (window.__linaraSetItem) return;
  window.__linaraSetItem = set;
  // The dashboard writes the refresh token right after the access token.
  Storage.prototype.setItem = function (key, value) {
    set.apply(this, arguments);
    if (this === ls && key === REFRESH) post({ type: "session", accessToken: ls.getItem(TOKEN), refreshToken: value });
  };
  Storage.prototype.removeItem = function (key) {
    var had = this === ls && key === TOKEN && ls.getItem(TOKEN) !== null;
    remove.apply(this, arguments);
    if (!had) return;
    var tapped = !navigator.userActivation || navigator.userActivation.isActive;
    post({ type: tapped ? "signed-out" : "session-lost" });
  };
})();
true;`;
}

/**
 * The manager's side of the app: the LINARA web dashboard (Pass, Board, Money,
 * People, Schedule), shown whole in a WebView until it's rebuilt natively.
 * This app owns the Supabase session and its refresh; the dashboard only
 * borrows the tokens, since it never refreshes them itself.
 *
 * With `?signup=1` and no session, it opens the dashboard's own sign-up /
 * sign-in page, for a manager who has no account yet; once they're in, the
 * dashboard's tokens become this app's session.
 */
export default function ManagerDashboardScreen() {
  const { session, isLoading } = useSession();
  const { signup } = useLocalSearchParams<{ signup?: string }>();

  if (isLoading) {
    return <StartupWait />;
  }
  if (!session && !signup) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  return <Dashboard session={session} />;
}

function startFor(session: Session | null) {
  return {
    // No session only comes from "New manager? Set up your household".
    url: `${MANAGER_DASHBOARD_URL}${session ? "/manager/pass" : "/login?mode=signup"}`,
    script: bootScript(session),
  };
}

function Dashboard({ session }: { session: Session | null }) {
  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  // The token the page is using right now, so a refresh here reaches it once.
  const pageTokenRef = useRef<string | null>(session?.access_token ?? null);
  const recoveriesRef = useRef(0);
  const signingOutRef = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [webKey, setWebKey] = useState(0);

  // Fixed for the life of each WebView: later sessions reach it by injection.
  const [start, setStart] = useState(() => startFor(session));

  /** Hands the page a session, then reloads it -- or opens `landingUrl` directly, skipping the hop through /login's own signed-in forward. */
  const pushSession = useCallback((next: Session, landingUrl?: string) => {
    pageTokenRef.current = next.access_token;
    const go = landingUrl
      ? `location.replace(${JSON.stringify(landingUrl)});`
      : "location.reload();";
    webRef.current?.injectJavaScript(`${writeTokensScript(next)} ${go} true;`);
  }, []);

  // A refreshed token (roughly hourly) goes to the page, which holds its
  // token in memory, so it reloads to pick it up.
  useEffect(() => {
    if (session && pageTokenRef.current && session.access_token !== pageTokenRef.current) {
      pushSession(session);
    }
  }, [session, pushSession]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBackRef.current) return false;
      webRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    try {
      await signOutHelper();
    } catch (err) {
      console.warn("[manager] Sign-out incomplete:", err);
      await supabase.auth.signOut();
      queryClient.clear();
    }
    router.replace("/(auth)/sign-in");
  }, []);

  const onMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      let message: BridgeMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as BridgeMessage;
      } catch {
        return;
      }

      if (message.type === "session") {
        // The manager signed in on the dashboard's own page.
        const { accessToken, refreshToken } = message;
        if (!accessToken || !refreshToken || accessToken === session?.access_token) return;
        pageTokenRef.current = accessToken;
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) console.warn("[manager] Couldn't adopt the dashboard's session:", error.message);
        return;
      }

      if (message.type === "signed-out") {
        await signOut();
        return;
      }

      // session-lost: the page couldn't use the token it had. One fresh try
      // per screen visit; after that, the retry screen instead of a loop.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await signOut();
        return;
      }
      if (recoveriesRef.current >= 1) {
        setLoadFailed(true);
        return;
      }
      recoveriesRef.current += 1;
      pushSession(data.session, `${MANAGER_DASHBOARD_URL}/manager/pass`);
    },
    [session?.access_token, signOut, pushSession],
  );

  // Keep the dashboard in the app; anything else (a help link, say) opens outside it.
  const onShouldStartLoad = useCallback((request: WebViewNavigation) => {
    if (request.url.startsWith(MANAGER_DASHBOARD_URL) || request.url.startsWith("about:")) {
      return true;
    }
    void Linking.openURL(request.url);
    return false;
  }, []);

  if (loadFailed) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>{"Can't reach your dashboard"}</Text>
        <Text style={styles.body}>
          {"Check your internet connection, then try again. Your household's data is safe."}
        </Text>
        <PrimaryButton
          label="Try again"
          onPress={() => {
            recoveriesRef.current = 0;
            pageTokenRef.current = session?.access_token ?? null;
            setStart(startFor(session));
            setLoadFailed(false);
            setWebKey((k) => k + 1);
          }}
        />
        {session ? <PrimaryButton label="Sign out" variant="secondary" onPress={signOut} /> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <WebView
        key={webKey}
        ref={webRef}
        source={{ uri: start.url }}
        injectedJavaScriptBeforeContentLoaded={start.script}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        onNavigationStateChange={(nav) => {
          canGoBackRef.current = nav.canGoBack;
        }}
        onError={() => setLoadFailed(true)}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) setLoadFailed(true);
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.pineTeal} />
          </View>
        )}
        applicationNameForUserAgent="LinaraApp"
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={styles.flex}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sand,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: colors.sand,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.pineTeal,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
});
