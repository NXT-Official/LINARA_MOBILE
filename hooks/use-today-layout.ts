import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * How she likes Today laid out, kept on this phone:
 *   - "focus":    one task at a time on the focus card, the day's list below (the default)
 *   - "list":     the day's checklist, open
 *   - "timeline": the same list with where "now" falls in it
 * Start, the Done photo and "Hindi ko magagawa ngayon" live on the focus card,
 * so the other two are for ticking off.
 */
export type TodayLayout = "focus" | "list" | "timeline";

const KEY = "linara.todayLayout";

export function useTodayLayout(): [TodayLayout, (next: TodayLayout) => void] {
  const [layout, setLayout] = useState<TodayLayout>("focus");
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === "focus" || v === "list" || v === "timeline") setLayout(v);
      })
      .catch(() => {});
  }, []);
  const set = (next: TodayLayout) => {
    setLayout(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  };
  return [layout, set];
}
