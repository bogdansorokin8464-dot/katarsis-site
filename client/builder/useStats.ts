import { useCallback, useEffect, useState } from "react";
import { readStats, type StatsSnapshot } from "./stats";
/* The legacy engine renders into nodes it owns. React reads them and also
   refreshes immediately after each action so fast clicking stays accurate. */
export function useStats(): {
  snapshot: StatsSnapshot | null;
  refresh: () => void;
} {
  const [snapshot, setSnapshot] = useState<StatsSnapshot | null>(() =>
    readStats(),
  );
  const refresh = useCallback(() => setSnapshot(readStats()), []);
  useEffect(() => {
    const schedule = () => refresh();
    const observer = new MutationObserver(schedule);
    const boxes = [
      "stats-pending",
      "stats-progress",
      "stats-history",
      "stats-target",
      "stats-native-warning",
      "omen-select",
    ];
    for (const id of boxes) {
      const node = document.getElementById(id);
      if (node)
        observer.observe(node, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
        });
    }
    for (const id of [
      "stats-roll",
      "stats-assign",
      "stats-undo",
      "stats-reset",
    ]) {
      const node = document.getElementById(id);
      if (node) observer.observe(node, { attributes: true });
    }
    for (const radio of document.querySelectorAll("[name=stats-method]"))
      observer.observe(radio, { attributes: true });
    document.addEventListener("change", schedule);
    document.addEventListener("katarsis:active-character", schedule);
    return () => {
      observer.disconnect();
      document.removeEventListener("change", schedule);
      document.removeEventListener("katarsis:active-character", schedule);
    };
  }, [refresh]);
  return { snapshot, refresh };
}
