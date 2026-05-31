const FOLDER_ID = "REPLACE_WITH_DRIVE_FOLDER_ID";

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const filename = payload.filename;
    const mimeType = payload.mimeType;
    const data = payload.data;

    const bytes = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(bytes, mimeType, filename);

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, fileId: file.getId() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
