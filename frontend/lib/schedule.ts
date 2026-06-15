export const SHEET_ID = "1v7eb4olwzKJnem0oJy0N1J3y9SY5_KNqNvFsqKuYV4Q";
export const TARGET_NAME = "アジャイ";

export function currentSheetName() {
  const n = new Date();
  return `${n.getFullYear()}/${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export function gvizUrl(sheetName: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

export function parseGvizRows(text: string): string[][] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no json");
  const json = JSON.parse(match[0]);
  if (!json.table?.rows) throw new Error("no table");
  return json.table.rows.map((row: { c: ({ v: unknown } | null)[] } | null) =>
    (row?.c ?? []).map((cell) => (cell?.v != null ? String(cell.v).trim() : ""))
  );
}

/** Returns {dayNumber: shiftString}. First-occurrence-wins prevents next-month spillover. */
export function extractDayMap(rows: string[][], targetName: string): Record<number, string> {
  const map: Record<number, string> = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameCol = row.indexOf("名前");
    if (nameCol === -1 || !row.includes("職種")) continue;
    for (let j = i + 1; j < rows.length; j++) {
      const r = rows[j];
      if (r.includes("名前") && r.includes("職種")) break;
      if (!r.includes(targetName)) continue;
      for (let c = nameCol + 1; c < row.length; c++) {
        const d = parseInt(row[c], 10);
        if (isNaN(d) || d < 1 || d > 31 || d in map) continue;
        map[d] = r[c] || "";
      }
      break;
    }
  }
  return map;
}

export async function fetchDayMap(): Promise<Record<number, string>> {
  const res = await fetch(gvizUrl(currentSheetName()), { cache: "no-store" });
  if (!res.ok) throw new Error(`gviz fetch failed: HTTP ${res.status}`);
  return extractDayMap(parseGvizRows(await res.text()), TARGET_NAME);
}

export type ShiftStatus = "work" | "off" | "unknown";

export function shiftStatus(val: string | null): ShiftStatus {
  if (val === null) return "unknown";
  return val === "公休" ? "off" : "work";
}

export function shiftLabel(val: string | null): string {
  if (!val) return "Work — L'or Clinic";
  if (val === "公休") return "Day Off";
  const loc = val.includes("CL") ? "Clinic" : val.includes("Wib") ? "Wibro" : "";
  const time = val.match(/\d+:\d+~\d+:\d+/)?.[0] ?? "";
  return loc ? `${loc} · ${time}` : val;
}

export interface WeekDay {
  date: Date;
  dayNum: number;
  isToday: boolean;
  status: ShiftStatus;
  shift: string | null;
}

export async function fetchWeekSchedule() {
  const dayMap = await fetchDayMap();
  const today = new Date();
  const dow = today.getDay();
  const monOffset = dow === 0 ? -6 : 1 - dow;
  const week: WeekDay[] = Array.from({ length: 7 }, (_, d) => {
    const date = new Date(today);
    date.setDate(today.getDate() + monOffset + d);
    const dayNum = date.getDate();
    const val = date.getMonth() === today.getMonth() ? (dayMap[dayNum] ?? null) : null;
    return {
      date, dayNum,
      isToday: date.toDateString() === today.toDateString(),
      status: shiftStatus(val),
      shift: val,
    };
  });
  const todayVal = dayMap[today.getDate()] ?? null;
  return { status: shiftStatus(todayVal), label: shiftLabel(todayVal), week, dayMap };
}
