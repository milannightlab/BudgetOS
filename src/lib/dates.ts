import { endOfMonth, format, startOfMonth } from "date-fns";

export function currentYearMonth(date = new Date()) {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function monthBounds(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}
