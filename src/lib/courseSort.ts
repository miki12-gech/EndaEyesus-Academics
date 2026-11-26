export type CourseSortOption =
  | "name"
  | "most_absent"
  | "most_late"
  | "highest_pct";

export interface SortableRosterItem {
  full_name: string;
  present_count: number;
  late_count: number;
}

export function computeAttendanceMetrics(
  item: SortableRosterItem,
  heldDaysCount: number
) {
  const present = Number(item.present_count || 0);
  const late = Number(item.late_count || 0);
  const attended = present + late;
  const absent = Math.max(0, heldDaysCount - attended);
  const pct =
    heldDaysCount > 0 ? Math.round((attended / heldDaysCount) * 100) : 100;
  return { present, late, attended, absent, pct };
}

export function sortCourseRoster<T extends SortableRosterItem>(
  rows: T[],
  heldDaysCount: number,
  sortBy: CourseSortOption
): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const ma = computeAttendanceMetrics(a, heldDaysCount);
    const mb = computeAttendanceMetrics(b, heldDaysCount);

    if (sortBy === "most_absent") {
      if (mb.absent !== ma.absent) return mb.absent - ma.absent;
      if (mb.late !== ma.late) return mb.late - ma.late;
    } else if (sortBy === "most_late") {
      if (mb.late !== ma.late) return mb.late - ma.late;
      if (mb.absent !== ma.absent) return mb.absent - ma.absent;
    } else if (sortBy === "highest_pct") {
      if (mb.pct !== ma.pct) return mb.pct - ma.pct;
      if (mb.present !== ma.present) return mb.present - ma.present;
    }

    return a.full_name.localeCompare(b.full_name, "am");
  });
  return copy;
}
