(function () {
  'use strict';
  const D = window.DateCalc;
  const STORAGE_KEY = 'days-calculator-history-v1';
  const MEETING_DATES_STORAGE_KEY = 'days-calculator-meeting-dates-v1';
  const copyValues = {};
  let meetingDateDrafts = loadMeetingDateDrafts();
  let activeLaborMeetingState = null;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function todayISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function currentTimeText() {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    }).format(new Date());
  }

  function integerValue(id, min) {
    const raw = $(id).value;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) throw new Error(`請輸入 ${min} 以上的整數`);
    return n;
  }

  function dateValue(id, label) {
    const date = D.parseISODate($(id).value);
    if (!date) throw new Error(`請選擇${label}`);
    return date;
  }

  function monthValue(id, label) {
    const raw = $(id).value;
    if (!/^\d{4}-\d{2}$/.test(raw)) throw new Error(`請選擇${label}`);
    const [year, month] = raw.split('-').map(Number);
    if (!Number.isInteger(year) || month < 1 || month > 12) throw new Error(`${label}格式不正確`);
    return { year, month };
  }

  function monthToSerial(value) {
    return value.year * 12 + value.month - 1;
  }

  function serialToMonth(serial) {
    return {
      year: Math.floor(serial / 12),
      month: ((serial % 12) + 12) % 12 + 1
    };
  }

  function addMonthsValue(value, months) {
    return serialToMonth(monthToSerial(value) + Number(months));
  }

  function formatYearMonth(value) {
    return `${value.year}年${value.month}月`;
  }

  function formatROCYearMonth(value) {
    return `民國${value.year - 1911}年${value.month}月`;
  }

  function showError(id, message) {
    const el = $(id);
    el.textContent = message;
    el.classList.add('show');
  }

  function clearError(id) {
    const el = $(id);
    el.textContent = '';
    el.classList.remove('show');
  }

  function showResult(id) { $(id).classList.add('show'); }
  function hideResult(id) { $(id).classList.remove('show'); }

  let toastTimer;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function loadMeetingDateDrafts() {
    try { return JSON.parse(localStorage.getItem(MEETING_DATES_STORAGE_KEY) || '{}'); }
    catch (_) { return {}; }
  }

  function saveMeetingDateDrafts() {
    try { localStorage.setItem(MEETING_DATES_STORAGE_KEY, JSON.stringify(meetingDateDrafts)); }
    catch (_) {
      // 儲存受限時仍可在目前畫面使用，不影響計算。
    }
  }

  function getMeetingDateDraft(termKey, index) {
    return meetingDateDrafts[termKey]?.[String(index)] || '';
  }

  function setMeetingDateDraft(termKey, index, value) {
    if (!meetingDateDrafts[termKey]) meetingDateDrafts[termKey] = {};
    if (value) meetingDateDrafts[termKey][String(index)] = value;
    else delete meetingDateDrafts[termKey][String(index)];
    saveMeetingDateDrafts();
  }

  function saveHistory(type, summary) {
    try {
      const list = getHistory();
      list.unshift({ type, summary, time: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
      renderHistory();
    } catch (_) {
      // 部分瀏覽器或隱私模式可能停用儲存；不影響主要計算功能。
    }
  }

  function renderHistory() {
    const listEl = $('#historyList');
    listEl.textContent = '';
    const items = getHistory();
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = '尚無計算紀錄。完成計算後，結果會自動保留在這台裝置。';
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'history-item';
      const type = document.createElement('div');
      type.className = 'history-type';
      type.textContent = item.type;
      const summary = document.createElement('div');
      summary.className = 'history-summary';
      summary.textContent = item.summary;
      const time = document.createElement('div');
      time.className = 'history-time';
      time.textContent = new Intl.DateTimeFormat('zh-TW', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).format(new Date(item.time));
      card.append(type, summary, time);
      listEl.appendChild(card);
    });
  }

  function createResultTable(titleText, headers, rows, noteText) {
    const section = document.createElement('section');
    section.className = 'result-table-section';

    const heading = document.createElement('div');
    heading.className = 'result-table-heading';
    const title = document.createElement('h3');
    title.textContent = titleText;
    heading.appendChild(title);
    if (noteText) {
      const note = document.createElement('span');
      note.textContent = noteText;
      heading.appendChild(note);
    }

    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement('tbody');
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    table.append(thead, tbody);
    wrap.appendChild(table);
    section.append(heading, wrap);
    return section;
  }

  function updateMeetingDateRow(input, weekday, status, row, interval) {
    row.classList.remove('meeting-row-valid', 'meeting-row-invalid');
    status.className = 'meeting-status empty';
    if (!input.value) {
      weekday.textContent = '—';
      status.textContent = '尚未填寫';
      return;
    }

    const meetingDate = D.parseISODate(input.value);
    if (!meetingDate) {
      weekday.textContent = '—';
      status.className = 'meeting-status invalid';
      status.textContent = '日期格式錯誤';
      row.classList.add('meeting-row-invalid');
      return;
    }

    weekday.textContent = D.formatWeekday(meetingDate);
    const isWithin = meetingDate >= interval.start && meetingDate <= interval.end;
    status.className = `meeting-status ${isWithin ? 'valid' : 'invalid'}`;
    status.textContent = isWithin ? '符合區間' : '超出區間';
    row.classList.add(isWithin ? 'meeting-row-valid' : 'meeting-row-invalid');
  }

  function createMeetingTermTable(term) {
    const section = document.createElement('section');
    section.className = `result-table-section meeting-term-section ${term.scope}`;

    const heading = document.createElement('div');
    heading.className = 'result-table-heading meeting-term-heading';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'meeting-term-title-wrap';
    const badge = document.createElement('span');
    badge.className = `term-scope-badge ${term.scope}`;
    badge.textContent = term.scopeLabel;
    const title = document.createElement('h3');
    title.textContent = term.termNo ? `第${term.termNo}屆勞資會議區間` : `${term.scopeLabel}勞資會議區間`;
    titleWrap.append(badge, title);
    const note = document.createElement('span');
    note.textContent = `${D.formatDate(term.start)} ～ ${D.formatDate(term.end)}｜共 ${term.intervals.length} 次`;
    heading.append(titleWrap, note);

    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    const table = document.createElement('table');
    table.className = 'data-table meeting-data-table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['次數', '預計開會日期', '星期', '起日', '迄日', '區間確認'].forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement('tbody');
    term.intervals.forEach((interval, index) => {
      const row = document.createElement('tr');
      const countCell = document.createElement('td');
      countCell.className = 'meeting-count-cell';
      countCell.textContent = `第${index + 1}次`;

      const dateCell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'date';
      input.className = 'meeting-date-input';
      input.min = D.toISODate(interval.start);
      input.max = D.toISODate(interval.end);
      input.value = getMeetingDateDraft(term.key, index);
      input.setAttribute('aria-label', `${term.scopeLabel}第${index + 1}次預計開會日期`);
      dateCell.appendChild(input);

      const weekdayCell = document.createElement('td');
      weekdayCell.className = 'meeting-weekday-cell';
      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.setAttribute('aria-live', 'polite');
      statusCell.appendChild(status);

      const startCell = document.createElement('td');
      startCell.textContent = D.formatDate(interval.start);
      const endCell = document.createElement('td');
      endCell.textContent = D.formatDate(interval.end);

      row.append(countCell, dateCell, weekdayCell, startCell, endCell, statusCell);
      updateMeetingDateRow(input, weekdayCell, status, row, interval);

      const onDateChange = () => {
        setMeetingDateDraft(term.key, index, input.value);
        updateMeetingDateRow(input, weekdayCell, status, row, interval);
        refreshLaborMeetingCopy();
      };
      input.addEventListener('input', onDateChange);
      input.addEventListener('change', onDateChange);
      tbody.appendChild(row);
    });

    table.append(thead, tbody);
    wrap.appendChild(table);
    section.append(heading, wrap);
    return section;
  }

  function createLaborTerm(scope, scopeLabel, termNo, start, end) {
    const intervals = D.generateMonthIntervals(start, end, 3);
    return {
      scope,
      scopeLabel,
      termNo,
      start,
      end,
      intervals,
      key: `${scope}-${termNo || 'na'}-${D.toISODate(start)}-${D.toISODate(end)}`
    };
  }

  function optionalLaborTerm(startSelector, endSelector, scope, scopeLabel, termNo) {
    const startRaw = $(startSelector).value;
    const endRaw = $(endSelector).value;
    if (!startRaw && !endRaw) return null;
    if (!startRaw || !endRaw) throw new Error(`請完整選擇${scopeLabel}的屆期起日與迄日`);
    const start = D.parseISODate(startRaw);
    const end = D.parseISODate(endRaw);
    if (!start || !end) throw new Error(`${scopeLabel}日期格式不正確`);
    return createLaborTerm(scope, scopeLabel, termNo, start, end);
  }

  function meetingLabel(term) {
    return term.termNo ? `第${term.termNo}屆` : term.scopeLabel;
  }

  function findMeetingIntervalLabel(terms, date) {
    for (const term of terms) {
      const index = D.findIntervalIndex(term.intervals, date);
      if (index >= 0) return `${meetingLabel(term)} 第${index + 1}次`;
    }
    return '';
  }

  function refreshLaborMeetingCopy() {
    if (!activeLaborMeetingState) return;
    const lines = [];
    activeLaborMeetingState.terms.forEach((term, termIndex) => {
      if (termIndex) lines.push('');
      lines.push(`${term.scopeLabel}｜${meetingLabel(term)}：${D.formatDate(term.start)}～${D.formatDate(term.end)}`);
      term.intervals.forEach((interval, index) => {
        const raw = getMeetingDateDraft(term.key, index);
        let meetingText = '未填預計開會日期';
        if (raw) {
          const meetingDate = D.parseISODate(raw);
          if (meetingDate) {
            const within = meetingDate >= interval.start && meetingDate <= interval.end;
            meetingText = `預計開會 ${D.formatDate(meetingDate)} ${D.formatWeekday(meetingDate)}｜${within ? '符合區間' : '超出區間'}`;
          }
        }
        lines.push(`第${index + 1}次｜${D.formatDate(interval.start)}～${D.formatDate(interval.end)}｜${meetingText}`);
      });
    });

    if (activeLaborMeetingState.filing) {
      const filing = activeLaborMeetingState.filing;
      lines.push('', `預計送件日：${D.formatDate(filing.date)}`);
      lines.push(`送件日前一年區間：${D.formatDate(filing.start)}～${D.formatDate(filing.end)}`);
      filing.rows.forEach((row) => lines.push(`${row[0]}｜${row[1]}～${row[2]}`));
    }
    copyValues.laborMeeting = lines.join('\n');
  }

  function setInitialDates() {
    const today = todayISO();
    ['#rangeStart', '#rangeEnd', '#addYmdStart', '#addDaysStart'].forEach((id) => { $(id).value = today; });
    $('#todayText').textContent = currentTimeText();

    $('#laborTermNo').value = '3';
    $('#laborTermStart').value = '2022-12-04';
    $('#laborTermEnd').value = '2026-12-03';
    $('#laborPrevStart').value = '2017-08-01';
    $('#laborPrevEnd').value = '2021-07-31';
    $('#laborNextStart').value = '';
    $('#laborNextEnd').value = '';
    $('#laborFilingDate').value = '2026-06-06';
    $('#insuranceApplicationMonth').value = today.slice(0, 7);
  }

  function handleRange(event) {
    event.preventDefault();
    clearError('#rangeError');
    try {
      const start = dateValue('#rangeStart', '起日');
      const end = dateValue('#rangeEnd', '迄日');
      const total = D.inclusiveDays(start, end);
      const duration = D.calendarDiffInclusive(start, end);
      const ymd = D.formatYMD(duration, false);
      const summary = `${D.formatDate(start)} 至 ${D.formatDate(end)}，共 ${total} 天（${ymd}）`;

      $('#rangeMain').textContent = `${total.toLocaleString('zh-TW')} 天`;
      $('#rangeSub').textContent = ymd;
      $('#rangeMeta').textContent = `${D.formatDate(start)} ～ ${D.formatDate(end)}｜包含起日與迄日`;
      copyValues.range = summary;
      showResult('#rangeResult');
      saveHistory('日期區間', summary);
    } catch (error) {
      hideResult('#rangeResult');
      showError('#rangeError', error.message || '無法完成計算');
    }
  }

  function handleAddYmd(event) {
    event.preventDefault();
    clearError('#addYmdError');
    try {
      const start = dateValue('#addYmdStart', '起日');
      const years = integerValue('#addYears', 0);
      const months = integerValue('#addMonths', 0);
      const days = integerValue('#addDays', 0);
      const end = D.addDuration(start, years, months, days);
      const durationText = D.formatYMD({ years, months, days }, false);
      const summary = `${D.formatDate(start)} 加 ${durationText}，迄日為 ${D.formatDate(end)}`;

      $('#addYmdMain').textContent = D.formatDate(end);
      $('#addYmdSub').textContent = D.formatROCDate(end);
      $('#addYmdMeta').textContent = `起日 ${D.formatDate(start)} ＋ ${durationText}`;
      copyValues.addYmd = summary;
      showResult('#addYmdResult');
      saveHistory('年月日推算', summary);
    } catch (error) {
      hideResult('#addYmdResult');
      showError('#addYmdError', error.message || '無法完成計算');
    }
  }

  function handleAddDays(event) {
    event.preventDefault();
    clearError('#addDaysError');
    try {
      const start = dateValue('#addDaysStart', '起日');
      const days = integerValue('#durationDays', 1);
      const end = D.addDays(start, days - 1);
      const summary = `${D.formatDate(start)} 起算第 ${days} 天為 ${D.formatDate(end)}`;

      $('#addDaysMain').textContent = D.formatDate(end);
      $('#addDaysSub').textContent = D.formatROCDate(end);
      $('#addDaysMeta').textContent = `起日算第 1 天｜共 ${days.toLocaleString('zh-TW')} 天`;
      copyValues.addDays = summary;
      showResult('#addDaysResult');
      saveHistory('天數推算', summary);
    } catch (error) {
      hideResult('#addDaysResult');
      showError('#addDaysError', error.message || '無法完成計算');
    }
  }

  function handleConvert(event) {
    event.preventDefault();
    clearError('#convertError');
    try {
      const total = integerValue('#convertDays', 0);
      const duration = D.daysToYMD(total);
      const ymd = D.formatYMD(duration, false);
      const summary = `${total.toLocaleString('zh-TW')} 天＝${ymd}`;

      $('#convertMain').textContent = ymd;
      $('#convertSub').textContent = `${total.toLocaleString('zh-TW')} 天`;
      $('#convertMeta').textContent = '換算基準：1 年＝365 天、1 月＝30 天';
      copyValues.convert = summary;
      showResult('#convertResult');
      saveHistory('天數換算', summary);
    } catch (error) {
      hideResult('#convertResult');
      showError('#convertError', error.message || '無法完成計算');
    }
  }

  function handleLaborMeeting(event) {
    event.preventDefault();
    clearError('#laborMeetingError');
    try {
      const termNo = integerValue('#laborTermNo', 1);
      const currentStart = dateValue('#laborTermStart', '當屆屆期起日');
      const currentEnd = dateValue('#laborTermEnd', '當屆屆期迄日');
      const currentTerm = createLaborTerm('current', '當屆', termNo, currentStart, currentEnd);
      const previousTerm = optionalLaborTerm('#laborPrevStart', '#laborPrevEnd', 'previous', '上一屆', termNo > 1 ? termNo - 1 : null);
      const nextTerm = optionalLaborTerm('#laborNextStart', '#laborNextEnd', 'next', '下一屆', termNo + 1);
      const terms = [currentTerm, previousTerm, nextTerm].filter(Boolean);
      const tableContainer = $('#laborMeetingTables');
      tableContainer.textContent = '';
      terms.forEach((term) => tableContainer.appendChild(createMeetingTermTable(term)));

      let filing = null;
      const filingRaw = $('#laborFilingDate').value;
      if (filingRaw) {
        const filingDate = D.parseISODate(filingRaw);
        if (!filingDate) throw new Error('預計送件日格式不正確');
        const filingStart = D.addDuration(filingDate, -1, 0, 0);
        const filingEnd = D.addDays(filingDate, -1);
        const filingIntervals = D.generateMonthIntervals(filingStart, filingEnd, 3);
        const filingRows = filingIntervals.map((interval, index) => {
          const matchedLabel = findMeetingIntervalLabel(terms, interval.start);
          return [matchedLabel || `區間${index + 1}`, D.formatDate(interval.start), D.formatDate(interval.end)];
        });
        tableContainer.appendChild(createResultTable(
          '預計送件日前一年勞資會議區間',
          ['對應次數', '起日', '迄日'],
          filingRows,
          `${D.formatDate(filingStart)} ～ ${D.formatDate(filingEnd)}`
        ));
        filing = { date: filingDate, start: filingStart, end: filingEnd, rows: filingRows };
      }

      const totalMeetings = terms.reduce((sum, term) => sum + term.intervals.length, 0);
      $('#laborMeetingMain').textContent = `顯示 ${terms.length} 屆｜共 ${totalMeetings} 次`;
      $('#laborMeetingSub').textContent = terms.map((term) => `${term.scopeLabel} ${meetingLabel(term)}`).join('、');
      $('#laborMeetingMeta').textContent = '每 3 個月 1 個區間｜預計開會日期會自動帶出星期並確認是否符合區間';
      activeLaborMeetingState = { terms, filing };
      refreshLaborMeetingCopy();
      showResult('#laborMeetingResult');
      const filingSummary = filing ? `；送件日前一年 ${D.formatDate(filing.start)}～${D.formatDate(filing.end)}` : '';
      saveHistory('勞資會議區間', `${terms.map((term) => `${term.scopeLabel}${meetingLabel(term)}`).join('、')}，共${totalMeetings}次${filingSummary}`);
    } catch (error) {
      activeLaborMeetingState = null;
      hideResult('#laborMeetingResult');
      showError('#laborMeetingError', error.message || '無法完成計算');
    }
  }

  function handleInsurance(event) {
    event.preventDefault();
    clearError('#insuranceError');
    try {
      const applicationMonth = monthValue('#insuranceApplicationMonth', '申請月份');
      const months = Array.from({ length: 6 }, (_, index) => addMonthsValue(applicationMonth, index - 8));
      const start = months[0];
      const end = months[months.length - 1];
      const container = $('#insuranceMonths');
      container.textContent = '';

      const list = document.createElement('div');
      list.className = 'month-card-grid';
      months.forEach((month, index) => {
        const card = document.createElement('div');
        card.className = 'month-card';
        const order = document.createElement('div');
        order.className = 'month-card-order';
        order.textContent = `第 ${index + 1} 個月`;
        const value = document.createElement('div');
        value.className = 'month-card-value';
        value.textContent = formatYearMonth(month);
        const roc = document.createElement('div');
        roc.className = 'month-card-roc';
        roc.textContent = formatROCYearMonth(month);
        card.append(order, value, roc);
        list.appendChild(card);
      });
      container.appendChild(list);

      const summary = `申請月份 ${formatYearMonth(applicationMonth)}，勞保人數提供區間為 ${formatYearMonth(start)}～${formatYearMonth(end)}（共6個月份）`;
      $('#insuranceMain').textContent = `${formatYearMonth(start)} ～ ${formatYearMonth(end)}`;
      $('#insuranceSub').textContent = `${formatROCYearMonth(start)} ～ ${formatROCYearMonth(end)}`;
      $('#insuranceMeta').textContent = `申請月份：${formatYearMonth(applicationMonth)}｜往前第 8 個月至第 3 個月｜共 6 個月份`;
      copyValues.insurance = `${summary}\n提供月份：${months.map(formatYearMonth).join('、')}`;
      showResult('#insuranceResult');
      saveHistory('勞保人數區間', summary);
    } catch (error) {
      hideResult('#insuranceResult');
      showError('#insuranceError', error.message || '無法完成計算');
    }
  }

  function bindTabs() {
    $$('.tab-button').forEach((button) => {
      button.addEventListener('click', () => {
        $$('.tab-button').forEach((item) => item.classList.toggle('active', item === button));
        $$('.tab-content').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${button.dataset.tab}`));
      });
    });

    $$('.mode-button').forEach((button) => {
      button.addEventListener('click', () => {
        $$('.mode-button').forEach((item) => item.classList.toggle('active', item === button));
        $$('.mode-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `mode-${button.dataset.mode}`));
      });
    });
  }

  function bindQuickActions() {
    $$('[data-range-days]').forEach((button) => {
      button.addEventListener('click', () => {
        const start = D.parseISODate($('#rangeStart').value) || D.parseISODate(todayISO());
        $('#rangeEnd').value = D.toISODate(D.addDays(start, Number(button.dataset.rangeDays) - 1));
      });
    });

    $('#swapRange').addEventListener('click', () => {
      const temp = $('#rangeStart').value;
      $('#rangeStart').value = $('#rangeEnd').value;
      $('#rangeEnd').value = temp;
    });

    $$('[data-add-days]').forEach((button) => {
      button.addEventListener('click', () => { $('#durationDays').value = button.dataset.addDays; });
    });

    $$('[data-convert-days]').forEach((button) => {
      button.addEventListener('click', () => { $('#convertDays').value = button.dataset.convertDays; });
    });

  }

  function bindReset() {
    $$('[data-reset]').forEach((button) => {
      button.addEventListener('click', () => {
        const type = button.dataset.reset;
        const map = {
          range: ['#rangeResult', '#rangeError'],
          addYmd: ['#addYmdResult', '#addYmdError'],
          addDays: ['#addDaysResult', '#addDaysError'],
          convert: ['#convertResult', '#convertError'],
          laborMeeting: ['#laborMeetingResult', '#laborMeetingError'],
          insurance: ['#insuranceResult', '#insuranceError']
        };
        hideResult(map[type][0]);
        clearError(map[type][1]);
        if (type === 'laborMeeting') {
          activeLaborMeetingState = null;
          copyValues.laborMeeting = '';
        }
      });
    });
  }

  function bindCopy() {
    $$('[data-copy-target]').forEach((button) => {
      button.addEventListener('click', async () => {
        const text = copyValues[button.dataset.copyTarget];
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          toast('已複製計算結果');
        } catch (_) {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          textarea.remove();
          toast('已複製計算結果');
        }
      });
    });
  }

  function init() {
    setInitialDates();
    bindTabs();
    bindQuickActions();
    bindReset();
    bindCopy();
    renderHistory();
    $('#rangeForm').addEventListener('submit', handleRange);
    $('#addYmdForm').addEventListener('submit', handleAddYmd);
    $('#addDaysForm').addEventListener('submit', handleAddDays);
    $('#convertForm').addEventListener('submit', handleConvert);
    $('#laborMeetingForm').addEventListener('submit', handleLaborMeeting);
    $('#insuranceForm').addEventListener('submit', handleInsurance);
    $('#clearHistory').addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      renderHistory();
      toast('計算紀錄已清除');
    });
  }

  init();
})();
