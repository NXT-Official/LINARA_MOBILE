import { useEffect } from "react";
import { useSegments } from "expo-router";

import { routeTemplate } from "./config";
import { logScreenOpened } from "./sentry";

/**
 * Sends one "Screen opened" log each time the route changes, so a helper's
 * path through the app can be read back in Sentry next to her errors. Uses the
 * file segments (`(app)/today`), never the pathname, which can hold ids.
 */
export function useScreenOpenedLog(): void {
  const route = routeTemplate(useSegments());

  useEffect(() => {
    logScreenOpened(route);
  }, [route]);
}
