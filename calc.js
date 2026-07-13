(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DateCalc = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;

  function createValidUTCDate(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    if (y < 1 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    if (
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() !== m - 1 ||
      date.getUTCDate() !== d
    ) return null;
    return date;
  }

  function parseISODate(value) {
    const text = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const [year, month, day] = text.split('-').map(Number);
    return createValidUTCDate(year, month, day);
  }

  function parseFlexibleDate(value) {
    const text = String(value || '').trim();
    if (!text) return null;

    let year;
    let month;
    let day;
    const separated = text.match(/^(\d{3,4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
    if (separated) {
      year = Number(separated[1]);
      month = Number(separated[2]);
      day = Number(separated[3]);
      if (separated[1].length === 3) year += 1911;
    } else if (/^\d{8}$/.test(text)) {
      year = Number(text.slice(0, 4));
      month = Number(text.slice(4, 6));
      day = Number(text.slice(6, 8));
    } else if (/^\d{7}$/.test(text)) {
      year = Number(text.slice(0, 3)) + 1911;
      month = Number(text.slice(3, 5));
      day = Number(text.slice(5, 7));
    } else {
      return null;
    }

    return createValidUTCDate(year, month, day);
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

  function formatWeekday(date) {
    return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getUTCDay()];
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

  function generateMonthIntervals(start, end, intervalMonths) {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) throw new Error('起日格式不正確');
    if (!(end instanceof Date) || Number.isNaN(end.getTime())) throw new Error('迄日格式不正確');
    if (end < start) throw new Error('迄日不可早於起日');
    const months = Number(intervalMonths);
    if (!Number.isInteger(months) || months < 1) throw new Error('區間月份必須為 1 以上整數');

    const intervals = [];
    let cursor = new Date(start.getTime());
    let guard = 0;
    while (cursor <= end) {
      const nextStart = addDuration(cursor, 0, months, 0);
      const intervalEnd = nextStart > end ? new Date(end.getTime()) : addDays(nextStart, -1);
      intervals.push({ start: new Date(cursor.getTime()), end: intervalEnd });
      cursor = addDays(intervalEnd, 1);
      guard += 1;
      if (guard > 240) throw new Error('計算區間過長，請確認日期');
    }
    return intervals;
  }

  function findIntervalIndex(intervals, date) {
    return intervals.findIndex((interval) => date >= interval.start && date <= interval.end);
  }

  return {
    DAY_MS,
    parseISODate,
    parseFlexibleDate,
    toISODate,
    formatDate,
    formatROCDate,
    formatWeekday,
    addDays,
    addDuration,
    inclusiveDays,
    calendarDiffInclusive,
    daysToYMD,
    formatYMD,
    generateMonthIntervals,
    findIntervalIndex
  };
});
