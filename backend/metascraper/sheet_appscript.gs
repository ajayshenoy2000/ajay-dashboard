/**
 * MetaScraper → Google Sheets writer (Apps Script Web App).
 *
 * Paste this into the bound Apps Script of your sheet
 * (Extensions → Apps Script), set a SHEET_SECRET script property, deploy as a
 * Web App ("Execute as: Me", "Who has access: Anyone"), and put the resulting
 * /exec URL in the backend env var METASCRAPER_SHEET_WEBHOOK_URL (and the same
 * secret in METASCRAPER_SHEET_SECRET).
 *
 * The backend POSTs { secret, columns, key, rows } after each ingest. Rows are
 * UPSERTED by `key` (library_id) so weekly re-runs update existing rows in
 * place instead of duplicating.
 */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var expected = PropertiesService.getScriptProperties().getProperty('SHEET_SECRET');
    if (expected && body.secret !== expected) {
      return _json({ ok: false, error: 'bad secret' });
    }

    var columns = body.columns || [];
    var key = body.key || 'library_id';
    var rows = body.rows || [];

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Ensure the header row matches the expected columns.
    var lastCol = Math.max(sheet.getLastColumn(), columns.length);
    var header = sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      : [];
    var headerOk = columns.every(function (c, i) { return header[i] === c; });
    if (!headerOk) {
      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
      sheet.setFrozenRows(1);
    }

    var keyCol = columns.indexOf(key);

    // Map existing key -> row number (1-based, data starts at row 2).
    var existing = {};
    if (sheet.getLastRow() > 1 && keyCol >= 0) {
      var keyValues = sheet.getRange(2, keyCol + 1, sheet.getLastRow() - 1, 1).getValues();
      for (var r = 0; r < keyValues.length; r++) {
        existing[String(keyValues[r][0])] = r + 2;
      }
    }

    var updated = 0, appended = 0;
    for (var i = 0; i < rows.length; i++) {
      var row = columns.map(function (c) {
        var v = rows[i][c];
        return (v === null || v === undefined) ? '' : v;
      });
      var keyVal = String(rows[i][key]);
      if (existing[keyVal]) {
        sheet.getRange(existing[keyVal], 1, 1, row.length).setValues([row]);
        updated++;
      } else {
        sheet.appendRow(row);
        appended++;
      }
    }

    return _json({ ok: true, updated: updated, appended: appended });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
