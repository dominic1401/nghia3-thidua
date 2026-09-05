/**
 * BẢNG THI ĐUA LỚP NGHĨA 3 – Backend (Google Apps Script)
 * ------------------------------------------------------------
 * Gắn vào Google Sheet "DANH SÁCH LỚP NGHĨA 3 (2026-2027)".
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me   |   Who has access: Anyone
 *
 * Sheet dùng:
 *   - Sheet đầu tiên (danh sách lớp)  : chỉ đọc
 *   - DiemDanh   : điểm danh từng em theo ngày
 *   - ChamDiem   : điểm Học tập / Kỷ luật theo đội theo ngày
 *   - CaiDat     : PIN, chủ đề, trọng số
 */

var SHEET_ATT = 'DiemDanh';
var SHEET_SCORE = 'ChamDiem';
var SHEET_CFG = 'CaiDat';

var DEFAULT_CFG = [
  ['CHU_DE', 'MÔN ĐỆ NHỎ LOAN TIN MỪNG', 'Chủ đề năm học hiển thị trên bảng thi đua'],
  ['LOP', 'Nghĩa 3', 'Tên lớp'],
  ['XU_DOAN', 'Đoàn Thiếu Nhi Thánh Tâm – Giáo xứ Gia Định', 'Tên Xứ Đoàn'],
  ['NAM_HOC', '2026-2027', 'Năm học'],
  ['NGAY_BAT_DAU', '2026-08-16', 'Chúa Nhật đầu tiên của năm học (yyyy-mm-dd)'],
  ['W_CC', '30', 'Trọng số chuyên cần (%)'],
  ['W_HT', '50', 'Trọng số học tập (%)'],
  ['W_KL', '20', 'Trọng số kỷ luật (%)'],
  ['PIN_HT', '2026', 'PIN Huynh Trưởng (đổi ngay!)'],
  ['PIN_DOI1', '1111', 'PIN Đội trưởng Đội 1'],
  ['PIN_DOI2', '2222', 'PIN Đội trưởng Đội 2'],
  ['PIN_DOI3', '3333', 'PIN Đội trưởng Đội 3'],
  ['PIN_DOI4', '4444', 'PIN Đội trưởng Đội 4']
];

/* ------------------------------------------------------------ */
/* Entry points                                                  */
/* ------------------------------------------------------------ */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'data';
  try {
    ensureSheets_();
    if (action === 'data') return json_({ ok: true, data: getAllData_() });
    if (action === 'ping') return json_({ ok: true, time: new Date().toISOString() });
    return json_({ ok: false, error: 'Không hiểu action: ' + action });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    ensureSheets_();
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action;
    var cfg = getConfig_();

    if (action === 'verify') {
      var role = verifyPin_(cfg, body.pin);
      if (!role) return json_({ ok: false, error: 'PIN không đúng' });
      return json_({ ok: true, role: role });
    }

    if (action === 'saveAttendance') {
      var r = verifyPin_(cfg, body.pin);
      var doi = Number(body.doi);
      if (!r) return json_({ ok: false, error: 'PIN không đúng' });
      if (r.role === 'doi' && r.doi !== doi) return json_({ ok: false, error: 'PIN này chỉ điểm danh được Đội ' + r.doi });
      saveAttendance_(body.ngay, doi, body.records || [], r);
      return json_({ ok: true, data: getAllData_() });
    }

    if (action === 'saveScores') {
      var r2 = verifyPin_(cfg, body.pin);
      if (!r2 || r2.role !== 'ht') return json_({ ok: false, error: 'Chỉ Huynh Trưởng mới được chấm điểm' });
      saveScores_(body.ngay, body.scores || []);
      return json_({ ok: true, data: getAllData_() });
    }

    return json_({ ok: false, error: 'Không hiểu action: ' + action });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Chạy tay 1 lần trong editor để tạo sheet và cấp quyền. */
function setup() {
  ensureSheets_();
  Logger.log('Đã tạo/kiểm tra các sheet DiemDanh, ChamDiem, CaiDat.');
}

/* ------------------------------------------------------------ */
/* Sheets                                                        */
/* ------------------------------------------------------------ */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function ensureSheets_() {
  var ss = ss_();
  if (!ss.getSheetByName(SHEET_ATT)) {
    var s = ss.insertSheet(SHEET_ATT);
    s.appendRow(['Ngay', 'Doi', 'MaHV', 'HoTen', 'CoMat', 'GhiChu', 'NguoiGhi', 'ThoiGian']);
    s.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_SCORE)) {
    var s2 = ss.insertSheet(SHEET_SCORE);
    s2.appendRow(['Ngay', 'Doi', 'HocTap', 'KyLuat', 'GhiChu', 'ThoiGian']);
    s2.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_CFG)) {
    var s3 = ss.insertSheet(SHEET_CFG);
    s3.appendRow(['Khoa', 'GiaTri', 'GhiChu']);
    DEFAULT_CFG.forEach(function (row) { s3.appendRow(row); });
    s3.setFrozenRows(1);
    s3.setColumnWidth(3, 320);
  }
}

function getConfig_() {
  var rows = ss_().getSheetByName(SHEET_CFG).getDataRange().getValues();
  var cfg = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) cfg[String(rows[i][0]).trim()] = String(rows[i][1]).trim();
  }
  return cfg;
}

function verifyPin_(cfg, pin) {
  pin = String(pin || '').trim();
  if (!pin) return null;
  if (pin === cfg.PIN_HT) return { role: 'ht' };
  for (var d = 1; d <= 4; d++) {
    if (pin === cfg['PIN_DOI' + d]) return { role: 'doi', doi: d };
  }
  return null;
}

/* ------------------------------------------------------------ */
/* Roster: đọc từ sheet danh sách lớp                            */
/* ------------------------------------------------------------ */

function getRoster_() {
  var sheet = ss_().getSheets()[0];
  var rows = sheet.getDataRange().getValues();
  var teams = {};
  var currentTeam = null;
  var counter = 0;

  for (var i = 0; i < rows.length; i++) {
    var a = String(rows[i][0] || '').trim();
    var m = a.match(/^ĐỘI\s*(\d+)/i);
    if (m) {
      currentTeam = Number(m[1]);
      counter = 0;
      teams[currentTeam] = { doi: currentTeam, members: [] };
      continue;
    }
    if (!currentTeam) continue;
    var name = String(rows[i][2] || '').trim();
    if (!name || !/^\d+$/.test(a)) continue;
    counter++;
    var status = String(rows[i][5] || '').trim().toUpperCase();
    var active = status.indexOf('NGHỈ') === -1;
    var role = '';
    if (status.indexOf('ĐỘI TRƯỞNG') > -1) role = 'Đội trưởng';
    else if (status.indexOf('ĐỘI PHÓ') > -1) role = 'Đội phó';

    teams[currentTeam].members.push({
      id: currentTeam + '-' + pad2_(Number(a)),
      stt: Number(a),
      tenThanh: String(rows[i][1] || '').trim(),
      hoTen: name,
      gioi: String(rows[i][3] || '').trim(),
      role: role,
      active: active
    });
  }
  return Object.keys(teams).map(function (k) { return teams[k]; });
}

function pad2_(n) { return (n < 10 ? '0' : '') + n; }

/* ------------------------------------------------------------ */
/* Attendance                                                    */
/* ------------------------------------------------------------ */

function getAttendance_() {
  var rows = ss_().getSheetByName(SHEET_ATT).getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    out.push({
      ngay: toISO_(rows[i][0]),
      doi: Number(rows[i][1]),
      id: String(rows[i][2]),
      hoTen: String(rows[i][3]),
      coMat: Number(rows[i][4]) === 1,
      ghiChu: String(rows[i][5] || '')
    });
  }
  return out;
}

/**
 * records: [{id, hoTen, coMat, ghiChu}]
 * Ghi đè toàn bộ bản ghi của (ngay, doi) rồi thêm lại.
 */
function saveAttendance_(ngay, doi, records, who) {
  ngay = toISO_(ngay);
  if (!ngay) throw new Error('Thiếu ngày');
  var sheet = ss_().getSheetByName(SHEET_ATT);
  var rows = sheet.getDataRange().getValues();

  // xoá từ dưới lên để index không lệch
  for (var i = rows.length - 1; i >= 1; i--) {
    if (toISO_(rows[i][0]) === ngay && Number(rows[i][1]) === doi) sheet.deleteRow(i + 1);
  }
  var now = new Date();
  var author = who.role === 'ht' ? 'HT' : 'ĐT Đội ' + who.doi;
  var newRows = records.map(function (r) {
    return [ngay, doi, r.id, r.hoTen, r.coMat ? 1 : 0, r.ghiChu || '', author, now];
  });
  if (newRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 8).setValues(newRows);
  }
}

/* ------------------------------------------------------------ */
/* Scores                                                        */
/* ------------------------------------------------------------ */

function getScores_() {
  var rows = ss_().getSheetByName(SHEET_SCORE).getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    out.push({
      ngay: toISO_(rows[i][0]),
      doi: Number(rows[i][1]),
      hocTap: rows[i][2] === '' ? null : Number(rows[i][2]),
      kyLuat: rows[i][3] === '' ? null : Number(rows[i][3]),
      ghiChu: String(rows[i][4] || '')
    });
  }
  return out;
}

/** scores: [{doi, hocTap, kyLuat, ghiChu}] – upsert theo (ngay, doi) */
function saveScores_(ngay, scores) {
  ngay = toISO_(ngay);
  if (!ngay) throw new Error('Thiếu ngày');
  var sheet = ss_().getSheetByName(SHEET_SCORE);
  var rows = sheet.getDataRange().getValues();
  var now = new Date();

  scores.forEach(function (s) {
    var doi = Number(s.doi);
    var ht = clamp_(s.hocTap), kl = clamp_(s.kyLuat);
    var found = -1;
    for (var i = 1; i < rows.length; i++) {
      if (toISO_(rows[i][0]) === ngay && Number(rows[i][1]) === doi) { found = i + 1; break; }
    }
    var values = [[ngay, doi, ht, kl, s.ghiChu || '', now]];
    if (found > 0) sheet.getRange(found, 1, 1, 6).setValues(values);
    else sheet.appendRow(values[0]);
  });
}

function clamp_(v) {
  if (v === null || v === undefined || v === '') return '';
  v = Number(v);
  if (isNaN(v)) return '';
  return Math.max(0, Math.min(10, Math.round(v * 10) / 10));
}

/* ------------------------------------------------------------ */
/* Aggregate payload                                             */
/* ------------------------------------------------------------ */

function getAllData_() {
  var cfg = getConfig_();
  return {
    settings: {
      chuDe: cfg.CHU_DE, lop: cfg.LOP, xuDoan: cfg.XU_DOAN, namHoc: cfg.NAM_HOC,
      ngayBatDau: cfg.NGAY_BAT_DAU,
      weights: { cc: Number(cfg.W_CC) || 30, ht: Number(cfg.W_HT) || 50, kl: Number(cfg.W_KL) || 20 }
    },
    roster: getRoster_(),
    attendance: getAttendance_(),
    scores: getScores_(),
    generatedAt: new Date().toISOString()
  };
}

/* ------------------------------------------------------------ */
/* Utils                                                         */
/* ------------------------------------------------------------ */

function toISO_(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + pad2_(Number(m[2])) + '-' + pad2_(Number(m[1]));
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
