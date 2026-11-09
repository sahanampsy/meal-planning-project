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
