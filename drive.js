const fs = require("fs");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive"];  // Permission to interact with Google Drive

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",  // Path to the credentials file
  scopes: SCOPES,
});

const drive = google.drive({ version: "v3", auth });

// Create folder if it doesn't exist
async function getOrCreateFolder(rollNumber, parentFolderId) {
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and name='${rollNumber}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });

  if (res.data.files.length > 0) return res.data.files[0].id;

  const fileMetadata = {
    name: rollNumber,  // Name of the folder (roll number in this case)
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentFolderId],  // Parent folder where the subfolders will be created
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });

  return folder.data.id;  // Return the ID of the created folder
}

// Upload file
async function uploadFile(file, folderId) {
  const fileMetadata = {
    name: file.originalname,  // Name of the uploaded file
    parents: [folderId],  // Folder where the file will be stored
  };
  const media = {
    mimeType: file.mimetype,  // MIME type of the file
    body: fs.createReadStream(file.path),  // Read the file from the local path
  };

  const uploaded = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id",
  });

  fs.unlinkSync(file.path);  // Clean up temporary file after upload
  return uploaded.data.id;  // Return the ID of the uploaded file
}

module.exports = { getOrCreateFolder, uploadFile };
