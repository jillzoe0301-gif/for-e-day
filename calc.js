(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DateCalc = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;

  function parseISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) return null;
    return date;
  }

  function toISODate(date) {
    return [
      String(date.getUTCFullYear()).padStart(4, '0'),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  function formatDate(date) {
    return `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }

  function formatROCDate(date) {
    return `民國${date.getUTCFullYear() - 1911}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
  }

  function addDays(date, days) {
    return new Date(date.getTime() + Number(days) * DAY_MS);
  }

  function daysInMonth(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  function addYearsMonthsClamped(date, years, months) {
    const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + Number(years) * 12 + Number(months);
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;
    const targetDay = Math.min(date.getUTCDate(), daysInMonth(targetYear, targetMonth));
    return new Date(Date.UTC(targetYear, targetMonth, targetDay));
  }

  function addDuration(date, years, months, days) {
    const shifted = addYearsMonthsClamped(date, Number(years), Number(months));
    return addDays(shifted, Number(days));
  }

  function inclusiveDays(start, end) {
    if (end < start) throw new Error('迄日不可早於起日');
    return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  }

  function calendarDiffInclusive(start, end) {
    if (end < start) throw new Error('迄日不可早於起日');
    const target = addDays(end, 1);

    let years = target.getUTCFullYear() - start.getUTCFullYear();
    let cursor = addDuration(start, years, 0, 0);
    if (cursor > target) {
      years -= 1;
      cursor = addDuration(start, years, 0, 0);
    }

    let months = (target.getUTCFullYear() - cursor.getUTCFullYear()) * 12 +
      (target.getUTCMonth() - cursor.getUTCMonth());
    let monthCursor = addDuration(cursor, 0, months, 0);
    if (monthCursor > target) {
      months -= 1;
      monthCursor = addDuration(cursor, 0, months, 0);
    }

    const days = Math.round((target.getTime() - monthCursor.getTime()) / DAY_MS);
    return { years, months, days };
  }

  function daysToYMD(totalDays) {
    const total = Math.trunc(Number(totalDays));
    if (!Number.isFinite(total) || total < 0) throw new Error('天數必須是 0 以上的整數');
    const years = Math.floor(total / 365);
    const remainderAfterYears = total % 365;
    const months = Math.floor(remainderAfterYears / 30);
    const days = remainderAfterYears % 30;
    return { years, months, days };
  }

  function formatYMD(duration, omitZero) {
    const parts = [
      [duration.years, '年'],
      [duration.months, '月'],
      [duration.days, '日']
    ];
    const text = parts
      .filter(([value]) => !omitZero || Number(value) !== 0)
      .map(([value, unit]) => `${Number(value)}${unit}`)
      .join('');
    return text || '0日';
  }

  return {
    DAY_MS,
    parseISODate,
    toISODate,
    formatDate,
    formatROCDate,
    addDays,
    addDuration,
    inclusiveDays,
    calendarDiffInclusive,
    daysToYMD,
    formatYMD
  };
});
