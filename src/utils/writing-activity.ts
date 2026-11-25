const DAY = 86_400_000;
const koreanDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" });

export function buildWritingActivity(dates: Date[], year: number, today: string) {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year, 11, 31);
  const first = start - new Date(start).getUTCDay() * DAY;
  const weeks = Math.ceil(((end - first) / DAY + 1) / 7);
  const counts = new Map<string, number>();

  for (const date of dates) {
    if (!Number.isFinite(date.getTime())) continue;
    const key = koreanDate.format(date);
    if (Number(key.slice(0, 4)) !== year || key > today) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days = Array.from({ length: weeks * 7 }, (_, index) => {
    const timestamp = first + index * DAY;
    const date = timestamp < start || timestamp > end
      ? null : new Date(timestamp).toISOString().slice(0, 10);
    return { date, count: date ? counts.get(date) ?? 0 : 0, future: !!date && date > today };
  });

  return {
    days,
    weeks,
    year,
    total: [...counts.values()].reduce((sum, count) => sum + count, 0),
  };
}
