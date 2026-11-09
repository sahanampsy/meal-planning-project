/**
 * Sheets.gs — small helpers for reading and writing tabs.
 *
 * Every tab has a header row (row 1). We turn each following row into an
 * object keyed by those headers, e.g. { id: 'rajma-masala', name: 'Rajma masala', ... }.
 * Columns are found by header name, so you can reorder columns freely.
 */

function sheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/** Read a whole tab as an array of objects. Empty rows are skipped. Dates become 'yyyy-MM-dd'. */
function readTable_(name) {
  var sh = sheet_(name);
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(function (h) { return String(h).trim(); });
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

  return values.slice(1)
    .filter(function (row) { return row.some(function (c) { return c !== '' && c !== null; }); })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) {
        if (!h) return;
        var v = row[i];
        if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        obj[h] = v;
      });
      return obj;
    });
}

/** Return the header row of a tab as an array of strings. */
function headers_(name) {
  var sh = sheet_(name);
  if (!sh || sh.getLastColumn() === 0) return [];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

/** Append objects as new rows, putting each field under the matching header. */
function appendRows_(name, objects) {
  if (!objects.length) return;
  var sh = sheet_(name);
  var headers = headers_(name);
  var rows = objects.map(function (o) {
    return headers.map(function (h) { return o[h] === undefined ? '' : o[h]; });
  });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}

/** Replace every data row in a tab (keeps the header row). */
function replaceRows_(name, objects) {
  var sh = sheet_(name);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  appendRows_(name, objects);
}

/**
 * Sheet row numbers (1-based, so the first data row is 2) whose `key` column
 * matches `test(value)`. Dates are compared as 'yyyy-MM-dd' text.
 */
function findRows_(name, key, test) {
  var sh = sheet_(name);
  var col = headers_(name).indexOf(key);
  if (!sh || col < 0 || sh.getLastRow() < 2) return [];
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  var values = sh.getRange(2, col + 1, sh.getLastRow() - 1, 1).getValues();
  var rows = [];
  values.forEach(function (v, i) {
    var cell = v[0];
    if (cell instanceof Date) cell = Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
    if (test(String(cell).trim())) rows.push(i + 2);
  });
  return rows;
}

/** Overwrite some fields of one row, leaving the other columns alone. */
function updateRow_(name, rowNumber, fields) {
  var sh = sheet_(name);
  var headers = headers_(name);
  var range = sh.getRange(rowNumber, 1, 1, headers.length);
  var row = range.getValues()[0];
  headers.forEach(function (h, i) {
    if (Object.prototype.hasOwnProperty.call(fields, h)) row[i] = fields[h];
  });
  range.setValues([row]);
}

/** Delete rows by row number (bottom first, so the numbers stay valid). */
function deleteRows_(name, rowNumbers) {
  var sh = sheet_(name);
  rowNumbers.slice().sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
}

/** Run fn while holding the script lock, so two phones can't write at the same moment. */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw apiError_('busy', 'Someone else is saving right now. Try again in a moment.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}
