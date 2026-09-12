type GoogleCalendarEvent = {
  title: string;
  start: Date;
  end?: Date;
  location?: string | null;
  details?: string | null;
};

function compactUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function googleCalendarUrl(event: GoogleCalendarEvent) {
  const end = event.end ?? new Date(event.start.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compactUtc(event.start)}/${compactUtc(end)}`,
  });

  if (event.location) params.set("location", event.location);
  if (event.details) params.set("details", event.details);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
