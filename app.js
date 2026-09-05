/* Bảng thi đua Nghĩa 3 – logic dùng chung cho 3 trang */
(function () {
  'use strict';

  var LS_API = 'nghia3_api_url';
  var LS_PIN = 'nghia3_pin';
  var TEAM_COLORS = { 1: '#2F6FB5', 2: '#3E8E6B', 3: '#C8552E', 4: '#7A4FA8' };

  /* ---------------- API ---------------- */
  function apiUrl() {
    var fromCfg = (window.NGHIA3_API_URL || '').trim();
    var fromLS = (localStorage.getItem(LS_API) || '').trim();
    var fromQuery = new URLSearchParams(location.search).get('api');
    if (fromQuery) { localStorage.setItem(LS_API, fromQuery); return fromQuery; }
    return fromCfg || fromLS;
  }

  function ensureApiUrl() {
    var url = apiUrl();
    if (url) return url;
    url = prompt('Dán URL Web App của Google Apps Script (kết thúc bằng /exec):');
    if (url) { url = url.trim(); localStorage.setItem(LS_API, url); }
    return url;
  }

  function apiGet(action) {
    var url = ensureApiUrl();
    if (!url) return Promise.reject(new Error('Chưa cấu hình URL API'));
    return fetch(url + '?action=' + action + '&t=' + Date.now(), { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(unwrap);
  }

  function apiPost(payload) {
    var url = ensureApiUrl();
    if (!url) return Promise.reject(new Error('Chưa cấu hình URL API'));
    // Không đặt Content-Type để tránh CORS preflight (Apps Script không hỗ trợ OPTIONS)
    return fetch(url, { method: 'POST', body: JSON.stringify(payload), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(unwrap);
  }

  function unwrap(res) {
    if (!res || !res.ok) throw new Error((res && res.error) || 'Lỗi không xác định');
    return res;
  }

  /* ---------------- Dates ---------------- */
  function toISO(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function fromISO(s) {
    var p = s.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function fmtVN(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  function fmtShort(iso) {
    var p = iso.split('-');
    return p[2] + '/' + p[1];
  }
  /** Danh sách Chúa Nhật từ ngày bắt đầu đến CN kế tiếp hôm nay */
  function sundays(startISO) {
    var out = [];
    var d = startISO ? fromISO(startISO) : new Date();
    // đẩy tới Chúa Nhật gần nhất
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    var limit = new Date(); limit.setDate(limit.getDate() + 7);
    while (d <= limit) { out.push(toISO(d)); d.setDate(d.getDate() + 7); }
    return out;
  }
  /** Chúa Nhật gần nhất (hôm nay nếu là CN, ngược lại CN vừa qua) */
  function latestSunday() {
    var d = new Date();
    while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
    return toISO(d);
  }

  /* ---------------- Scoring ---------------- */
  /**
   * Trả về:
   * {
   *   dates: [iso...] (chỉ những ngày có dữ liệu, tăng dần),
   *   teams: { doi: { doi, name, members, active, weekly: {iso: {cc, ht, kl, total, present, recorded}}, season: {...}, rank } }
   *   ranking: [doi...] theo tổng giảm dần
   * }
   */
  function compute(data) {
    var w = data.settings.weights;
    var teams = {};
    data.roster.forEach(function (t) {
      teams[t.doi] = {
        doi: t.doi, name: 'Đội ' + t.doi, color: TEAM_COLORS[t.doi] || '#444',
        members: t.members, active: t.members.filter(function (m) { return m.active; }),
        weekly: {}, season: null, rank: 0
      };
    });

    var dateSet = {};
    var attByKey = {}; // ngay|doi -> [records]
    data.attendance.forEach(function (a) {
      if (!teams[a.doi]) return;
      var k = a.ngay + '|' + a.doi;
      (attByKey[k] = attByKey[k] || []).push(a);
      dateSet[a.ngay] = 1;
    });
    var scoreByKey = {};
    data.scores.forEach(function (s) {
      if (!teams[s.doi]) return;
      scoreByKey[s.ngay + '|' + s.doi] = s;
      if (s.hocTap !== null || s.kyLuat !== null) dateSet[s.ngay] = 1;
    });
    var dates = Object.keys(dateSet).sort();

    Object.keys(teams).forEach(function (doi) {
      var t = teams[doi];
      var sum = { cc: 0, ht: 0, kl: 0, total: 0, weeks: 0, ccWeeks: 0, htWeeks: 0, klWeeks: 0, present: 0, recorded: 0 };
      dates.forEach(function (iso) {
        var att = attByKey[iso + '|' + doi] || [];
        var sc = scoreByKey[iso + '|' + doi] || {};
        var present = att.filter(function (a) { return a.coMat; }).length;
        var cc = att.length ? Math.round((present / att.length) * 100) / 10 : null;
        var ht = (sc.hocTap === undefined || sc.hocTap === null) ? null : sc.hocTap;
        var kl = (sc.kyLuat === undefined || sc.kyLuat === null) ? null : sc.kyLuat;
        var total = Math.round(((w.cc * (cc || 0)) + (w.ht * (ht || 0)) + (w.kl * (kl || 0))) / 100 * 100) / 100;
        var has = cc !== null || ht !== null || kl !== null;
        t.weekly[iso] = { cc: cc, ht: ht, kl: kl, total: total, present: present, recorded: att.length, hasData: has, ghiChu: sc.ghiChu || '', attendance: att };
        if (has) {
          sum.total += total; sum.weeks++;
          if (cc !== null) { sum.cc += cc; sum.ccWeeks++; }
          if (ht !== null) { sum.ht += ht; sum.htWeeks++; }
          if (kl !== null) { sum.kl += kl; sum.klWeeks++; }
          sum.present += present; sum.recorded += att.length;
        }
      });
      t.season = {
        total: Math.round(sum.total * 100) / 100,
        weeks: sum.weeks,
        avg: sum.weeks ? Math.round(sum.total / sum.weeks * 100) / 100 : 0,
        cc: sum.ccWeeks ? Math.round(sum.cc / sum.ccWeeks * 10) / 10 : null,
        ht: sum.htWeeks ? Math.round(sum.ht / sum.htWeeks * 10) / 10 : null,
        kl: sum.klWeeks ? Math.round(sum.kl / sum.klWeeks * 10) / 10 : null,
        ccSum: Math.round(sum.cc * 10) / 10, htSum: Math.round(sum.ht * 10) / 10, klSum: Math.round(sum.kl * 10) / 10,
        present: sum.present, recorded: sum.recorded,
        rate: sum.recorded ? Math.round(sum.present / sum.recorded * 100) : null
      };
    });

    var ranking = Object.keys(teams).map(Number).sort(function (a, b) {
      var A = teams[a].season, B = teams[b].season;
      return (B.total - A.total) || ((B.ht || 0) - (A.ht || 0)) || (a - b);
    });
    ranking.forEach(function (doi, i) { teams[doi].rank = i + 1; });

    return { dates: dates, teams: teams, ranking: ranking, weights: w };
  }

  /** Xếp hạng theo 1 tiêu chí ('cc'|'ht'|'kl') dùng tổng điểm tiêu chí đó */
  function rankBy(model, key) {
    var sumKey = key + 'Sum';
    return Object.keys(model.teams).map(Number).sort(function (a, b) {
      return (model.teams[b].season[sumKey] - model.teams[a].season[sumKey]) || (a - b);
    });
  }

  /* ---------------- PIN ---------------- */
  function savedPin() { return sessionStorage.getItem(LS_PIN) || ''; }
  function savePin(p) { sessionStorage.setItem(LS_PIN, p); }
  function clearPin() { sessionStorage.removeItem(LS_PIN); }

  /* ---------------- DOM utils ---------------- */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'style' && typeof attrs[k] === 'object') Object.keys(attrs[k]).forEach(function (sk) { if (sk.indexOf('--') === 0) el.style.setProperty(sk, attrs[k][sk]); else el.style[sk] = attrs[k][sk]; });
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function fmt(n, d) { if (n === null || n === undefined) return '–'; return Number(n).toFixed(d === undefined ? 1 : d); }
  function toast(msg, kind) {
    var el = document.getElementById('toast');
    if (!el) { el = h('div', { id: 'toast' }); document.body.appendChild(el); }
    el.textContent = msg; el.className = 'show ' + (kind || '');
    clearTimeout(el._t); el._t = setTimeout(function () { el.className = ''; }, 3200);
  }
  function setBusy(on) { document.body.classList.toggle('busy', !!on); }

  window.N3 = {
    apiGet: apiGet, apiPost: apiPost, apiUrl: apiUrl, resetApi: function () { localStorage.removeItem(LS_API); },
    toISO: toISO, fromISO: fromISO, fmtVN: fmtVN, fmtShort: fmtShort, sundays: sundays, latestSunday: latestSunday,
    compute: compute, rankBy: rankBy, TEAM_COLORS: TEAM_COLORS,
    savedPin: savedPin, savePin: savePin, clearPin: clearPin,
    h: h, fmt: fmt, toast: toast, setBusy: setBusy
  };
})();
