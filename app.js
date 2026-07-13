(function () {
  'use strict';
  const D = window.DateCalc;
  const STORAGE_KEY = 'days-calculator-history-v1';
  const copyValues = {};

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

  function setInitialDates() {
    const today = todayISO();
    ['#rangeStart', '#rangeEnd', '#addYmdStart', '#addDaysStart'].forEach((id) => { $(id).value = today; });
    $('#todayText').textContent = currentTimeText();
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
          convert: ['#convertResult', '#convertError']
        };
        hideResult(map[type][0]);
        clearError(map[type][1]);
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
    $('#clearHistory').addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      renderHistory();
      toast('計算紀錄已清除');
    });
  }

  init();
})();
