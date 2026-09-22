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
var SHEET_EVENT = 'SuKien';
var SHEET_LESSON = 'BaiHoc';
var DIEM_GOC = 5;   // mốc khởi điểm mỗi tuần cho học tập và kỷ luật

// Lịch chương trình cả năm, trích từ file "CT Giáo lý 2026-2027".
// Dùng để gợi ý sẵn hoạt động của mỗi Chúa Nhật khi Huynh Trưởng soạn bài.
var LICH_CHUONG_TRINH = [
  ['2026-08-16', "Tập trung theo lớp mới, phân công nhiệm vụ, sinh hoạt Chi đoàn"],
  ['2026-08-23', "Tập nghi thức Tuyên hứa, sinh hoạt Chi đoàn"],
  ['2026-08-30', "Nghi thức Trao Khăn & Tuyên hứa"],
  ['2026-09-06', "THÁNH LỄ KHAI GIẢNG & Nhận tác vụ HT"],
  ['2026-09-12', "Họp Phụ huynh đầu năm"],
  ['2026-09-13', "Bài học Giáo lý 1"],
  ['2026-09-20', "Bài học Giáo lý 2"],
  ['2026-09-25', "Thiếu nhi vui Trung Thu (buổi tối)"],
  ['2026-09-27', "Bài học Giáo lý 3"],
  ['2026-10-04', "Bài học Giáo lý 4\nKiểm tra 1 - HK1"],
  ['2026-10-11', "Bài học Giáo lý 5"],
  ['2026-10-18', "Bài học Giáo lý 6"],
  ['2026-10-25', "Bài học Giáo lý 7"],
  ['2026-11-01', "Bài học Giáo lý 8\nKiểm tra 2 - HK1"],
  ['2026-11-08', "Bài học Giáo lý 9"],
  ['2026-11-15', "Sinh hoạt kỹ năng"],
  ['2026-11-22', "Bài học Giáo lý 10"],
  ['2026-11-29', "Sinh hoạt kỹ năng"],
  ['2026-12-06', "Ôn tập HK1"],
  ['2026-12-13', "Kiểm tra HK1"],
  ['2026-12-20', "Sinh hoạt ngoại khóa kỹ năng"],
  ['2026-12-25', "Lễ Chúa Giáng Sinh"],
  ['2026-12-27', "Sinh hoạt kỹ năng"],
  ['2027-01-03', "Bài học Giáo lý 11"],
  ['2027-01-10', "Bài học Giáo lý 12"],
  ['2027-01-17', "Bài học Giáo lý 13"],
  ['2027-01-24', "Bài học Giáo lý 14\nKiểm tra 1 - HK2"],
  ['2027-01-31', "Hội Chợ Tết, phát quà Tết"],
  ['2027-02-01', "Thiếu nhi Đi Bác Ái"],
  ['2027-02-07', "Nghỉ Tết"],
  ['2027-02-10', "Mùng 9 Tết"],
  ['2027-02-14', "Sinh hoạt kỹ năng"],
  ['2027-02-21', "Bài học Giáo lý 15"],
  ['2027-02-28', "Bài học Giáo lý 16"],
  ['2027-03-07', "Kiểm tra 2 - HK2\nBài học Giáo lý 17"],
  ['2027-03-14', "Bài học Giáo lý 18"],
  ['2027-03-21', "Bài học Giáo lý 19"],
  ['2027-03-28', "Chúa Nhật Phục Sinh"],
  ['2027-04-04', "Bài học Giáo lý 20"],
  ['2027-04-11', "Bài học Giáo lý 21"],
  ['2027-04-18', "Sinh hoạt kỹ năng"],
  ['2027-04-25', "Bài học Giáo lý 22"],
  ['2027-05-02', "Ôn tập HK2"],
  ['2027-05-09', "Kiểm tra HK2"],
  ['2027-05-15', "Thánh Lễ ban Bí tích Thêm Sức"],
  ['2027-05-16', "Sinh hoạt kỹ năng"],
  ['2027-05-23', "Sinh hoạt kỹ năng"],
  ['2027-05-30', "Thánh Lễ Rước Lễ Lần Đầu"],
  ['2027-06-06', "THÁNH LỄ BẾ GIẢNG"]
];

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
  // PHẢI kiểm tra kết quả khoá: nếu bỏ qua, hai lượt lưu chạy chồng nhau sẽ
  // ghi đè và làm mất dữ liệu điểm danh của nhau.
  if (!lock.tryLock(25000)) {
    return json_({ ok: false, error: 'Hệ thống đang bận ghi dữ liệu, vui lòng bấm Lưu lại sau vài giây.' });
  }
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

    if (action === 'addEvents') {
      var r3 = verifyPin_(cfg, body.pin);
      if (!r3 || r3.role !== 'ht') return json_({ ok: false, error: 'Chỉ Huynh Trưởng mới được cộng/trừ điểm' });
      addEvents_(body.ngay, body.events || [], r3);
      return json_({ ok: true, data: getAllData_() });
    }

    if (action === 'undoEvent') {
      var r4 = verifyPin_(cfg, body.pin);
      if (!r4 || r4.role !== 'ht') return json_({ ok: false, error: 'Chỉ Huynh Trưởng mới được hoàn tác' });
      if (!undoLastEvent_(body.ngay, body.doi, body.tieuChi)) {
        return json_({ ok: false, error: 'Không còn lần bấm nào để hoàn tác' });
      }
      return json_({ ok: true, data: getAllData_() });
    }

    if (action === 'saveLesson') {
      var r5 = verifyPin_(cfg, body.pin);
      if (!r5 || r5.role !== 'ht') return json_({ ok: false, error: 'Chỉ Huynh Trưởng mới được soạn bài học' });
      saveLesson_(body.ngay, body.bai || {}, r5);
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
  suaDinhDang_();
  Logger.log('Đã tạo/kiểm tra các sheet DiemDanh, ChamDiem, CaiDat.');
}

/** Ép cột Ngay và MaHV về dạng chữ để Sheets thôi tự đổi "1-05" thành ngày. */
function suaDinhDang_() {
  var s = ss_().getSheetByName(SHEET_ATT);
  if (!s) return;
  s.getRange('A2:A').setNumberFormat('@');
  s.getRange('C2:C').setNumberFormat('@');
}

/**
 * Chạy tay MỘT LẦN để cứu dữ liệu điểm danh cũ.
 * Đưa cột Ngay và MaHV về dạng chữ chuẩn ("2026-09-13", "1-05"), bất kể chúng
 * đang là chuỗi gốc, giá trị kiểu Ngày, hay chuỗi ngày tháng do bị ghi lại.
 * Sau khi chạy, dữ liệu không thể bị Sheets diễn giải sai thêm lần nào nữa.
 */
function suaMaHocVien() {
  ensureSheets_();
  var sheet = ss_().getSheetByName(SHEET_ATT);
  var last = sheet.getLastRow();
  if (last < 2) { Logger.log('DiemDanh chưa có dữ liệu.'); return; }

  var rows = sheet.getRange(2, 1, last - 1, 8).getValues();
  var doi = 0, sua = 0, hong = 0, viDu = [];
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][0] && !rows[i][1]) continue;
    var cu = rows[i][2];
    var moi = idFromCell_(cu, rows[i][1]);
    if (!moi) {
      hong++;
      if (viDu.length < 5) viDu.push('dòng ' + (i + 2) + ': "' + String(cu) + '"');
      continue;
    }
    if (String(cu) !== moi) sua++;
    rows[i][2] = moi;
    rows[i][0] = toISO_(rows[i][0]);
    doi++;
  }

  suaDinhDang_();
  sheet.getRange(2, 1, rows.length, 8).setValues(rows);

  Logger.log('Đã duyệt ' + doi + ' dòng, chuẩn hoá lại ' + sua + ' mã học viên.');
  if (hong) { Logger.log('KHÔNG đọc được ' + hong + ' dòng: ' + viDu.join(' | ')); }
  else { Logger.log('Tất cả mã đều đọc được. Chạy tiếp hàm kiemTra để xác nhận.'); }
}

/**
 * Chạy tay trong editor để soi dữ liệu điểm danh. Không sửa gì, chỉ in log.
 * Phân biệt rõ hai trường hợp rất dễ nhầm nhau:
 *   - em đã NGHỈ LUÔN  -> bỏ qua có chủ ý, hệ thống chạy đúng
 *   - mã không đọc được -> lỗi thật, cần xử lý
 */
function kiemTra() {
  ensureSheets_();
  var roster = getRoster_();
  var dangHoc = {}, daNghi = {}, siSo = 0, soNghi = 0;
  roster.forEach(function (t) {
    t.members.forEach(function (m) {
      if (m.active) { dangHoc[m.id] = m.hoTen; siSo++; }
      else { daNghi[m.id] = m.hoTen; soNghi++; }
    });
  });

  var rows = ss_().getSheetByName(SHEET_ATT).getDataRange().getValues();
  var kieuNgay = 0, kieuChu = 0, tinh = 0, boQua = 0, loi = 0, viDu = [], tenNghi = {};
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var doi = Number(rows[i][1]), cell = rows[i][2];
    if (cell instanceof Date) kieuNgay++; else kieuChu++;
    var id = idFromCell_(cell, doi);
    if (dangHoc[id]) tinh++;
    else if (daNghi[id]) { boQua++; tenNghi[id] = daNghi[id]; }
    else { loi++; if (viDu.length < 5) viDu.push('đội ' + doi + ' -> "' + id + '" (' + String(rows[i][3]) + ')'); }
  }

  Logger.log('DANH SÁCH LỚP: ' + siSo + ' em đang sinh hoạt, ' + soNghi + ' em đã nghỉ luôn, ' + roster.length + ' đội');
  Logger.log('SHEET DiemDanh: ' + (kieuChu + kieuNgay) + ' dòng (' + kieuNgay + ' dòng kiểu Ngày đã khôi phục, ' + kieuChu + ' dòng dạng chữ)');
  Logger.log('-> ĐƯỢC TÍNH        : ' + tinh + ' dòng');
  Logger.log('-> BỎ QUA (đã nghỉ) : ' + boQua + ' dòng — bình thường, không phải lỗi');
  if (boQua) Logger.log('   Gồm các em: ' + Object.keys(tenNghi).map(function (k) { return tenNghi[k]; }).join(', '));
  Logger.log('-> LỖI KHÔNG ĐỌC ĐƯỢC: ' + loi + ' dòng');
  if (loi) Logger.log('   Ví dụ: ' + viDu.join(' | '));
  else Logger.log('   Không có lỗi. Hệ thống đang tính đúng toàn bộ dữ liệu.');
}

/**
 * Chạy tay trong editor để dọn dữ liệu bị trùng do lỗi ghi chồng trước đây.
 * Với mỗi (Ngay, Doi, MaHV) chỉ giữ lại dòng ghi sau cùng.
 */
function donDep() {
  ensureSheets_();
  var sheet = ss_().getSheetByName(SHEET_ATT);
  var last = sheet.getLastRow();
  if (last < 2) { Logger.log('DiemDanh chưa có dữ liệu.'); return; }

  var rows = sheet.getRange(2, 1, last - 1, 8).getValues();
  var seen = {}, kept = [];
  for (var i = rows.length - 1; i >= 0; i--) {          // duyệt ngược: giữ bản ghi mới nhất
    var r = rows[i];
    if (!r[0] && !r[1]) continue;
    var key = toISO_(r[0]) + '|' + Number(r[1]) + '|' + idFromCell_(r[2], Number(r[1]));
    if (seen[key]) continue;
    seen[key] = 1;
    kept.unshift(r);
  }
  if (kept.length) sheet.getRange(2, 1, kept.length, 8).setValues(kept);
  var extra = (last - 1) - kept.length;
  if (extra > 0) sheet.getRange(kept.length + 2, 1, extra, 8).clearContent();
  Logger.log('Đã xoá ' + extra + ' dòng trùng, còn lại ' + kept.length + ' dòng.');
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
    // Giữ dạng chữ, nếu không Sheets sẽ tự đổi "1-05" thành ngày tháng
    s.getRange('A2:A').setNumberFormat('@');
    s.getRange('C2:C').setNumberFormat('@');
  }
  if (!ss.getSheetByName(SHEET_SCORE)) {
    var s2 = ss.insertSheet(SHEET_SCORE);
    s2.appendRow(['Ngay', 'Doi', 'HocTap', 'KyLuat', 'GhiChu', 'ThoiGian']);
    s2.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_EVENT)) {
    var se = ss.insertSheet(SHEET_EVENT);
    se.appendRow(['Ngay', 'Doi', 'TieuChi', 'Diem', 'LyDo', 'NguoiGhi', 'ThoiGian']);
    se.setFrozenRows(1);
    se.getRange('A2:A').setNumberFormat('@');
  }
  if (!ss.getSheetByName(SHEET_LESSON)) {
    var sl = ss.insertSheet(SHEET_LESSON);
    sl.appendRow(['Ngay', 'TenBai', 'LoiChua', 'TrichDan', 'YChinh', 'CauHoi', 'NguoiGhi', 'ThoiGian']);
    sl.setFrozenRows(1);
    sl.getRange('A2:A').setNumberFormat('@');
    sl.setColumnWidth(2, 240); sl.setColumnWidth(3, 320); sl.setColumnWidth(5, 400); sl.setColumnWidth(6, 320);
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
    if (!rows[i][0]) continue;
    var key = String(rows[i][0]).trim();
    var val = rows[i][1];
    // Google Sheets tự đổi "2026-08-16" thành kiểu Ngày. String(Date) cho ra
    // chuỗi kiểu "Sun Aug 16 2026 ..." khiến trình duyệt không đọc được -> ép về ISO.
    cfg[key] = (val instanceof Date) ? toISO_(val) : String(val).trim();
  }
  if (cfg.NGAY_BAT_DAU) cfg.NGAY_BAT_DAU = toISO_(cfg.NGAY_BAT_DAU);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.NGAY_BAT_DAU || '')) cfg.NGAY_BAT_DAU = '';
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

/**
 * Đọc mã học viên ở cột MaHV và trả về dạng chuẩn "doi-stt".
 *
 * Mã gốc có dạng "1-05". Google Sheets hiểu đó là ngày tháng nên ô có thể ở
 * một trong ba trạng thái, tuỳ việc sheet đã bị ghi lại mấy lần:
 *   1. còn nguyên chuỗi "1-05"
 *   2. đã thành giá trị kiểu Ngày
 *   3. đã thành chuỗi ngày tháng, ví dụ "01/05/2026", do bị ghi lại vào ô
 *      đã đặt định dạng chữ
 * Cả ba đều khôi phục được: trong cặp (tháng, ngày) luôn có một số chính là
 * số đội — lấy từ cột Doi bên cạnh — số còn lại là số thứ tự của em trong đội.
 */
function idFromCell_(cell, doi) {
  var m = 0, d = 0;

  if (cell instanceof Date) {
    m = cell.getMonth() + 1; d = cell.getDate();
  } else {
    var s = String(cell).trim();
    if (!s) return '';
    if (/^\d{1,2}-\d{1,2}$/.test(s)) {                 // mã gốc, giữ nguyên
      var pr = s.split('-');
      return Number(pr[0]) + '-' + pad2_(Number(pr[1]));
    }
    var sl = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-]\d{4}/);   // 01/05/2026
    if (sl) { d = Number(sl[1]); m = Number(sl[2]); }
    else {
      var dt = new Date(s);                                   // Mon Jan 05 2026 …
      if (isNaN(dt.getTime())) return s;
      m = dt.getMonth() + 1; d = dt.getDate();
    }
  }

  doi = Number(doi);
  var stt = (m === doi) ? d : (d === doi ? m : 0);
  return stt ? doi + '-' + pad2_(stt) : '';
}

function getAttendance_() {
  var rows = ss_().getSheetByName(SHEET_ATT).getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var doi = Number(rows[i][1]);
    out.push({
      ngay: toISO_(rows[i][0]),
      doi: doi,
      id: idFromCell_(rows[i][2], doi),
      hoTen: String(rows[i][3]),
      coMat: Number(rows[i][4]) === 1,
      ghiChu: String(rows[i][5] || '')
    });
  }
  return out;
}

/**
 * records: [{id, hoTen, coMat, ghiChu}]
 * Thay toàn bộ bản ghi của (ngay, doi) bằng danh sách mới.
 * Dùng MỘT lần đọc + MỘT lần ghi thay cho vòng lặp deleteRow: nhanh hơn nhiều
 * và không có khoảng thời gian nào chỉ số dòng bị lệch.
 */
function saveAttendance_(ngay, doi, records, who) {
  ngay = toISO_(ngay);
  if (!ngay) throw new Error('Thiếu ngày');
  var sheet = ss_().getSheetByName(SHEET_ATT);
  suaDinhDang_();
  var now = new Date();
  var author = who.role === 'ht' ? 'HT' : 'ĐT Đội ' + who.doi;
  var added = records.map(function (r) {
    return [ngay, doi, String(r.id), r.hoTen, r.coMat ? 1 : 0, r.ghiChu || '', author, now];
  });
  rewriteBlock_(sheet, 8, added, function (row) {
    return toISO_(row[0]) === ngay && Number(row[1]) === doi;
  }, function (row) {
    // Các dòng cũ được ghi lại nguyên xi. Nếu ô mã đang ở dạng Ngày mà cột đã
    // đặt định dạng chữ, Sheets sẽ biến nó thành chuỗi ngày tháng và mã gốc
    // mất luôn. Vì vậy đưa mã về dạng chuẩn "1-05" TRƯỚC khi ghi lại.
    row[0] = toISO_(row[0]);
    row[2] = idFromCell_(row[2], row[1]) || String(row[2]);
    return row;
  });
}

/**
 * Giữ lại mọi dòng KHÔNG khớp isTarget, nối thêm addedRows, rồi ghi đè một lần.
 * fixRow (tuỳ chọn) chuẩn hoá từng dòng cũ trước khi ghi lại, để việc ghi lại
 * không làm biến dạng dữ liệu.
 */
function rewriteBlock_(sheet, cols, addedRows, isTarget, fixRow) {
  var last = sheet.getLastRow();
  var old = last > 1 ? sheet.getRange(2, 1, last - 1, cols).getValues() : [];
  var kept = [];
  old.forEach(function (row) {
    if (!row[0] && !row[1]) return;          // bỏ dòng rỗng
    if (isTarget(row)) return;
    kept.push(fixRow ? fixRow(row) : row);
  });
  var out = kept.concat(addedRows);
  if (out.length) sheet.getRange(2, 1, out.length, cols).setValues(out);
  var extra = (last - 1) - out.length;
  if (extra > 0) sheet.getRange(out.length + 2, 1, extra, cols).clearContent();
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

/** scores: [{doi, hocTap, kyLuat, ghiChu}] – thay bản ghi của (ngay, doi) */
function saveScores_(ngay, scores) {
  ngay = toISO_(ngay);
  if (!ngay) throw new Error('Thiếu ngày');
  var sheet = ss_().getSheetByName(SHEET_SCORE);
  var now = new Date();
  var touched = {};
  var added = scores.map(function (s) {
    var doi = Number(s.doi);
    touched[doi] = 1;
    return [ngay, doi, clamp_(s.hocTap), clamp_(s.kyLuat), s.ghiChu || '', now];
  });
  rewriteBlock_(sheet, 6, added, function (row) {
    return toISO_(row[0]) === ngay && touched[Number(row[1])];
  });
}

function clamp_(v) {
  if (v === null || v === undefined || v === '') return '';
  v = Number(v);
  if (isNaN(v)) return '';
  return Math.max(0, Math.min(10, Math.round(v * 10) / 10));
}

/* ------------------------------------------------------------ */
/* Sự kiện cộng/trừ điểm                                         */
/* ------------------------------------------------------------ */

function getEvents_() {
  var sheet = ss_().getSheetByName(SHEET_EVENT);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var rows = sheet.getRange(2, 1, last - 1, 7).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    out.push({
      ngay: toISO_(rows[i][0]),
      doi: Number(rows[i][1]),
      tieuChi: String(rows[i][2]).trim().toLowerCase(),   // 'ht' hoặc 'kl'
      diem: Number(rows[i][3]),
      lyDo: String(rows[i][4] || ''),
      nguoiGhi: String(rows[i][5] || ''),
      thoiGian: rows[i][6] instanceof Date ? rows[i][6].toISOString() : String(rows[i][6] || '')
    });
  }
  return out;
}

/**
 * Chỉ NỐI THÊM dòng, không ghi đè dòng nào. Nhờ vậy hai Huynh Trưởng cùng
 * bấm một lúc cũng không xoá mất thao tác của nhau.
 * events: [{doi, tieuChi, diem, lyDo}]
 */
function addEvents_(ngay, events, who) {
  ngay = toISO_(ngay);
  if (!ngay) throw new Error('Thiếu ngày');
  if (!events.length) return;
  var sheet = ss_().getSheetByName(SHEET_EVENT);
  var now = new Date();
  var author = who.role === 'ht' ? 'HT' : 'ĐT Đội ' + who.doi;
  var rows = events.map(function (e) {
    var tc = String(e.tieuChi).toLowerCase() === 'kl' ? 'kl' : 'ht';
    var d = Number(e.diem) > 0 ? 1 : -1;
    return [ngay, Number(e.doi), tc, d, e.lyDo || '', author, now];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
}

/** Xoá dòng sự kiện ghi sau cùng của (ngay, doi, tieuChi). */
function undoLastEvent_(ngay, doi, tieuChi) {
  ngay = toISO_(ngay);
  var sheet = ss_().getSheetByName(SHEET_EVENT);
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var rows = sheet.getRange(2, 1, last - 1, 7).getValues();
  var tc = String(tieuChi).toLowerCase() === 'kl' ? 'kl' : 'ht';
  for (var i = rows.length - 1; i >= 0; i--) {
    if (toISO_(rows[i][0]) === ngay && Number(rows[i][1]) === Number(doi)
        && String(rows[i][2]).trim().toLowerCase() === tc) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------ */
/* Bài học (sổ tay ôn tập)                                       */
/* ------------------------------------------------------------ */

function getLessons_() {
  var sheet = ss_().getSheetByName(SHEET_LESSON);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var rows = sheet.getRange(2, 1, last - 1, 8).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    out.push({
      ngay: toISO_(rows[i][0]),
      tenBai: String(rows[i][1] || ''),
      loiChua: String(rows[i][2] || ''),
      trichDan: String(rows[i][3] || ''),
      // mỗi ý chính một dòng
      yChinh: String(rows[i][4] || '').split('\n').map(function (x) { return x.trim(); })
                .filter(function (x) { return x; }),
      cauHoi: String(rows[i][5] || ''),
      nguoiGhi: String(rows[i][6] || '')
    });
  }
  return out;
}

/** Mỗi Chúa Nhật một bài: có rồi thì sửa, chưa có thì thêm. */
function saveLesson_(ngay, bai, who) {
  ngay = toISO_(ngay);
  if (!ngay) throw new Error('Thiếu ngày');
  var sheet = ss_().getSheetByName(SHEET_LESSON);
  var row = [
    ngay,
    String(bai.tenBai || '').trim(),
    String(bai.loiChua || '').trim(),
    String(bai.trichDan || '').trim(),
    (bai.yChinh || []).map(function (x) { return String(x).trim(); })
      .filter(function (x) { return x; }).join('\n'),
    String(bai.cauHoi || '').trim(),
    who.role === 'ht' ? 'HT' : 'ĐT Đội ' + who.doi,
    new Date()
  ];
  rewriteBlock_(sheet, 8, [row], function (r) { return toISO_(r[0]) === ngay; });
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
    events: getEvents_(),
    lessons: getLessons_(),
    schedule: LICH_CHUONG_TRINH,
    diemGoc: DIEM_GOC,
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
