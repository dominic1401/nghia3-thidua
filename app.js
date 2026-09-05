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

  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; reject(new Error('Máy chủ không phản hồi sau ' + (ms / 1000) + ' giây. Kiểm tra mạng rồi bấm Tải lại.')); } }, ms);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } },
             function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
    });
  }

  function apiGet(action) {
    var url = ensureApiUrl();
    if (!url) return Promise.reject(new Error('Chưa cấu hình URL API'));
    return withTimeout(fetch(url + '?action=' + action + '&t=' + Date.now(), { redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(unwrap), 30000);
  }

  function apiPost(payload) {
    var url = ensureApiUrl();
    if (!url) return Promise.reject(new Error('Chưa cấu hình URL API'));
    // Không đặt Content-Type để tránh CORS preflight (Apps Script không hỗ trợ OPTIONS)
    return withTimeout(fetch(url, { method: 'POST', body: JSON.stringify(payload), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(unwrap), 30000);
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
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(s || ''))) return null;
    var p = String(s).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2].slice(0, 2)));
    return isNaN(d.getTime()) ? null : d;
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
  /**
   * Danh sách Chúa Nhật từ ngày bắt đầu đến Chúa Nhật kế tiếp hôm nay.
   * Nếu ngày bắt đầu trống/sai định dạng thì lùi về 12 tuần gần nhất,
   * và mọi vòng lặp đều có trần lặp để trang không bao giờ bị treo.
   */
  function sundays(startISO) {
    var limit = new Date(); limit.setDate(limit.getDate() + 7);
    var d = fromISO(startISO);
    if (!d) { d = new Date(); d.setDate(d.getDate() - 84); }
    if (d > limit) d = new Date(limit);
    for (var i = 0; i < 7 && d.getDay() !== 0; i++) d.setDate(d.getDate() + 1);
    var out = [];
    for (var n = 0; n < 260 && d <= limit; n++) { out.push(toISO(d)); d.setDate(d.getDate() + 7); }
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
      var activeIds = {};
      t.members.forEach(function (m) { if (m.active) activeIds[m.id] = 1; });
      teams[t.doi] = {
        doi: t.doi, name: 'Đội ' + t.doi, color: TEAM_COLORS[t.doi] || '#444',
        members: t.members, active: t.members.filter(function (m) { return m.active; }),
        activeIds: activeIds, weekly: {}, season: null, rank: 0
      };
    });

    var dateSet = {};
    var attByKey = {}; // ngay|doi -> [records]
    var dropped = 0;
    data.attendance.forEach(function (a) {
      var t = teams[a.doi];
      if (!t) return;
      // Em đã chuyển sang NGHỈ LUÔN thì bỏ khỏi mọi phép tính, kể cả các tuần
      // đã điểm danh trước đó, để chuyên cần luôn phản ánh sĩ số hiện tại.
      if (!t.activeIds[a.id]) { dropped++; return; }
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

    return { dates: dates, teams: teams, ranking: ranking, weights: w, droppedRecords: dropped };
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

  /* ---------------- Menu vai trò (góc dưới phải) ---------------- */
  /**
   * opts: { role: null | {role:'ht'} | {role:'doi', doi:n},
   *         page: 'index'|'huynhtruong'|'doitruong',
   *         onReload: fn, onLogout: fn }
   */
  function mountRoleMenu(opts) {
    opts = opts || {};
    var open = false, scrim = null, sheet = null;

    var fab = h('button', { class: 'fab', type: 'button', 'aria-label': 'Mở menu', 'aria-expanded': 'false', text: '☰' });
    fab.onclick = function () { open ? close() : show(); };
    // Trang nào có thanh cố định ở đáy thì gắn nút vào đó để không đè lên nút Lưu
    var host = opts.anchor ? document.querySelector(opts.anchor) : null;
    if (host) { fab.classList.add('inline'); host.appendChild(fab); }
    else document.body.appendChild(fab);

    function close() {
      open = false; fab.setAttribute('aria-expanded', 'false'); fab.hidden = false;
      if (scrim) scrim.remove(); if (sheet) sheet.remove();
      scrim = sheet = null; fab.focus();
    }

    function whoText() {
      if (!opts.role) return 'Bạn đang xem với tư cách <b>khách</b>.';
      if (opts.role.role === 'ht') return 'Bạn đang đăng nhập là <b>Huynh Trưởng</b>.';
      return 'Bạn đang đăng nhập là <b>Đội trưởng Đội ' + opts.role.doi + '</b>.';
    }

    function show() {
      open = true; fab.setAttribute('aria-expanded', 'true'); fab.hidden = true;
      scrim = h('div', { class: 'scrim', onclick: close });
      sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu' });
      sheet.appendChild(h('h2', { text: 'Lớp Nghĩa 3' }));
      sheet.appendChild(h('p', { class: 'who', html: whoText() }));

      var row = h('div', { class: 'row' });
      if (!opts.role) {
        // Nhập PIN một lần, hệ thống tự đưa đúng trang theo vai trò
        var err = h('p', { class: 'err', hidden: 'hidden' });
        var pin = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Nhập PIN của bạn' });
        var go = h('button', { class: 'btn gold', type: 'button', text: 'Đăng nhập' });
        go.onclick = function () {
          var v = pin.value.trim();
          if (!v) { err.hidden = false; err.textContent = 'Bạn chưa nhập PIN.'; return; }
          go.textContent = 'Đang kiểm tra…'; go.disabled = true; err.hidden = true;
          apiPost({ action: 'verify', pin: v }).then(function (res) {
            savePin(v);
            location.href = res.role.role === 'ht' ? 'huynhtruong.html' : 'doitruong.html';
          }).catch(function (e) {
            err.hidden = false; err.textContent = e.message;
            go.textContent = 'Đăng nhập'; go.disabled = false;
          });
        };
        pin.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
        row.appendChild(h('div', { class: 'field' }, [h('label', { text: 'PIN Huynh Trưởng hoặc Đội trưởng' }), pin]));
        row.appendChild(go);
        row.appendChild(err);
        setTimeout(function () { pin.focus(); }, 60);
      } else {
        if (opts.page !== 'huynhtruong' && opts.role.role === 'ht') row.appendChild(h('a', { class: 'btn ghost', href: 'huynhtruong.html', text: 'Chấm điểm tuần' }));
        if (opts.page !== 'doitruong') row.appendChild(h('a', { class: 'btn ghost', href: 'doitruong.html', text: opts.role.role === 'ht' ? 'Điểm danh thay đội' : 'Điểm danh Đội ' + opts.role.doi }));
      }
      if (opts.page !== 'index') row.appendChild(h('a', { class: 'btn ghost', href: 'index.html', text: 'Xem bảng thi đua' }));
      if (opts.onReload) {
        var rl = h('button', { class: 'btn ghost', type: 'button', text: 'Tải lại dữ liệu' });
        rl.onclick = function () { close(); opts.onReload(); };
        row.appendChild(rl);
      }
      if (opts.role) {
        var lo = h('button', { class: 'btn danger', type: 'button', text: 'Đăng xuất' });
        lo.onclick = function () {
          if (!confirm('Đăng xuất khỏi thiết bị này? Lần sau bạn sẽ phải nhập lại PIN.')) return;
          close(); (opts.onLogout || function () { clearPin(); location.reload(); })();
        };
        row.appendChild(lo);
      }
      sheet.appendChild(row);
      document.body.appendChild(scrim);
      document.body.appendChild(sheet);
    }

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) close(); });
    return { setRole: function (r) { opts.role = r; if (open) { close(); show(); } }, close: close };
  }

  /* ---------------- Thanh chọn Chúa Nhật ---------------- */
  /** Gắn nút ‹ › vào hai bên thẻ select để đổi tuần bằng một chạm */
  function wireWeekStepper(selectEl, prevBtn, nextBtn, onChange) {
    function sync() {
      prevBtn.disabled = selectEl.selectedIndex >= selectEl.options.length - 1;
      nextBtn.disabled = selectEl.selectedIndex <= 0;
    }
    // Danh sách xếp giảm dần: index lớn hơn = tuần cũ hơn
    prevBtn.onclick = function () { if (selectEl.selectedIndex < selectEl.options.length - 1) { selectEl.selectedIndex++; sync(); onChange(); } };
    nextBtn.onclick = function () { if (selectEl.selectedIndex > 0) { selectEl.selectedIndex--; sync(); onChange(); } };
    selectEl.addEventListener('change', function () { sync(); onChange(); });
    return sync;
  }

  window.N3 = {
    apiGet: apiGet, apiPost: apiPost, apiUrl: apiUrl, resetApi: function () { localStorage.removeItem(LS_API); },
    toISO: toISO, fromISO: fromISO, fmtVN: fmtVN, fmtShort: fmtShort, sundays: sundays, latestSunday: latestSunday,
    compute: compute, rankBy: rankBy, TEAM_COLORS: TEAM_COLORS,
    savedPin: savedPin, savePin: savePin, clearPin: clearPin,
    mountRoleMenu: mountRoleMenu, wireWeekStepper: wireWeekStepper,
    h: h, fmt: fmt, toast: toast, setBusy: setBusy
  };
})();
