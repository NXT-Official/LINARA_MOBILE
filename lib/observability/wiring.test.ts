import { describe, expect, it } from "vitest";

import layoutSource from "../../app/_layout.tsx?raw";
import easJsonSource from "../../eas.json?raw";
import sessionSource from "../session-context.tsx?raw";
import screenLogSource from "./use-screen-opened-log.ts?raw";

/**
 * The hooks and effects that call the adapter can't be rendered here (no React
 * Native renderer in this repo), so these read their source: each guard fails
 * if the wiring that keeps ids out of logs, or the user tag on, is removed.
 */

describe("screen-opened log", () => {
  it("names the route from file segments", () => {
    expect(screenLogSource).toMatch(/routeTemplate\(useSegments\(\)\)/);
  });

  it("never reads the concrete path or its params, which hold ids", () => {
    expect(screenLogSource).not.toMatch(
      /usePathname|useLocalSearchParams|useGlobalSearchParams|useUnstableGlobalHref|useRouteInfo/,
    );
  });
});

describe("SessionProvider", () => {
  it("hands every session change to Sentry, which keeps the id only", () => {
    expect(sessionSource).toMatch(
      /useEffect\(\(\) => \{\s*setSentryUser\(session\);\s*\}, \[session\]\);/,
    );
  });
});

describe("root layout", () => {
  it("imports the Sentry adapter before anything else, so init runs first", () => {
    const firstImport = layoutSource.split("\n").find((line) => line.startsWith("import "));
    expect(firstImport).toBe('import { wrapRootLayout } from "@/lib/observability/sentry";');
  });

  it("wraps the default export and logs screen changes", () => {
    expect(layoutSource).toMatch(/export default wrapRootLayout\(RootLayout\);/);
    expect(layoutSource).toMatch(/useScreenOpenedLog\(\);/);
  });
});

describe("eas.json", () => {
  const profiles = (
    JSON.parse(easJsonSource) as { build: Record<string, { env?: Record<string, string> }> }
  ).build;

  it("names the Sentry environment after each store-bound profile", () => {
    expect(profiles.preview?.env?.EXPO_PUBLIC_SENTRY_ENVIRONMENT).toBe("preview");
    expect(profiles.production?.env?.EXPO_PUBLIC_SENTRY_ENVIRONMENT).toBe("production");
  });

  it("leaves it off the dev client, whose JS comes from local Metro and never sees it", () => {
    expect(profiles.development?.env?.EXPO_PUBLIC_SENTRY_ENVIRONMENT).toBeUndefined();
  });
});
