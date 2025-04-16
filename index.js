require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { getOrCreateFolder, uploadFile } = require("./drive");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "temp/" });  // Multer config for file uploads
const UPLOADS_FILE = path.join(__dirname, "uploads.json");

// Load or initialize leaderboard
function loadLeaderboard() {
  if (!fs.existsSync(UPLOADS_FILE)) return {};  // Initialize if no file exists
  return JSON.parse(fs.readFileSync(UPLOADS_FILE, "utf-8"));
}
function saveLeaderboard(data) {
  fs.writeFileSync(UPLOADS_FILE, JSON.stringify(data, null, 2));  // Save leaderboard
}

app.post("/upload", upload.array("photos"), async (req, res) => {
  const rollNumber = req.body.rollNumber;  // Roll number from the form
  const files = req.files;  // Files uploaded

  if (!rollNumber || !files.length)
    return res.status(400).json({ error: "Missing roll number or files" });

  try {
    // Get or create the folder for the roll number
    const folderId = await getOrCreateFolder(
      rollNumber,
      process.env.GOOGLE_FOLDER_ID
    );

    // Upload each file to the Google Drive folder
    for (let file of files) {
      await uploadFile(file, folderId);
    }

    // Update the leaderboard
    const leaderboard = loadLeaderboard();
    leaderboard[rollNumber] = (leaderboard[rollNumber] || 0) + files.length;
    saveLeaderboard(leaderboard);

    // Sort leaderboard
    const sorted = Object.entries(leaderboard)
      .map(([roll, uploads]) => ({ rollNumber: roll, uploads }))
      .sort((a, b) => b.uploads - a.uploads);

    res.json({ message: "Uploaded successfully", leaderboard: sorted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/leaderboard", (req, res) => {
  const leaderboard = loadLeaderboard();
  const sorted = Object.entries(leaderboard)
    .map(([roll, uploads]) => ({ rollNumber: roll, uploads }))
    .sort((a, b) => b.uploads - a.uploads);

  res.json(sorted);  // Return sorted leaderboard
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
