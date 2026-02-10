
/**
 * Construction Management Backend for Google Sheets
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete existing code and paste this.
 * 4. Create sheets named: Projects, Clients, Workers, Invoices, Purchases, Expenses, Tasks, Attendance.
 * 5. Deploy as Web App, set access to "Anyone".
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheet;
  
  if (action === "read") {
    return ContentService.createTextOutput(JSON.stringify(readData(sheetName))).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("Invalid Action").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const sheetName = data.sheet;
  const payload = data.payload;
  
  if (action === "create") {
    appendData(sheetName, payload);
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  }
  
  return ContentService.createTextOutput("Error").setMimeType(ContentService.MimeType.TEXT);
}

function readData(sheetName) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendData(sheetName, data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(h => data[h] || "");
  sheet.appendRow(newRow);
}
