type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function calendarDate(value: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(value);

  function numberPart(type: "year" | "month" | "day") {
    return Number(parts.find((part) => part.type === type)?.value || 0);
  }

  return {
    year: numberPart("year"),
    month: numberPart("month"),
    day: numberPart("day"),
  };
}

function birthdayTimestamp(year: number, month: number, day: number) {
  if (month === 2 && day === 29) {
    const candidate = new Date(Date.UTC(year, 1, 29));

    if (candidate.getUTCMonth() !== 1) {
      return Date.UTC(year, 1, 28);
    }
  }

  return Date.UTC(year, month - 1, day);
}

export function birthdayInfo(
  birthDate: Date,
  now: Date,
  timeZone: string,
) {
  const today = calendarDate(now, timeZone);

  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth() + 1;
  const birthDay = birthDate.getUTCDate();

  const todayTimestamp = Date.UTC(
    today.year,
    today.month - 1,
    today.day,
  );

  let birthdayYear = today.year;
  let nextBirthday = birthdayTimestamp(
    birthdayYear,
    birthMonth,
    birthDay,
  );

  if (nextBirthday < todayTimestamp) {
    birthdayYear += 1;
    nextBirthday = birthdayTimestamp(
      birthdayYear,
      birthMonth,
      birthDay,
    );
  }

  const days = Math.round(
    (nextBirthday - todayTimestamp) / 86400000,
  );

  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(nextBirthday));

  return {
    days,
    age: birthdayYear - birthYear,
    dateLabel,
  };
}