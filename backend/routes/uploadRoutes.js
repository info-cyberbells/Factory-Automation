const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

// Configure upload path
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `upload-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});
const upload = multer({ storage });

// POST /api/upload - Upload a single file and return its URL
router.post('/', protect, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({
      success: true,
      fileUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'File upload failed', error: error.message });
  }
});

module.exports = router;
