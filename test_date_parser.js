function safeParseDateTime(fechaHoraRaw) {
  if (!fechaHoraRaw) return null;
  
  const match = fechaHoraRaw.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\s*(?:-\s*|\s+)(\d{1,2}):(\d{2})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const hour = parseInt(match[4], 10);
    const min = parseInt(match[5], 10);

    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2035 && hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
      const d = new Date(year, month, day, hour, min);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

const samples = [
  "18-10-2025 - 10:00",
  "18/10/2025 - 10:00",
  "18-10-2025 10:00",
  "18-10-2025-10:00",
  "18.10.2025 - 10:00",
  "25-10-2025 - 12:30"
];

samples.forEach(s => {
  const parsed = safeParseDateTime(s);
  console.log(`Input: "${s}" => Parsed:`, parsed ? parsed.toISOString() : "INVALID");
});
