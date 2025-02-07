const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"], // Allow both frontend ports
  methods: ["GET", "POST", "PUT", "DELETE"], // Allow necessary methods
}));
app.use(express.json());

// Create the uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Video Schema
const VideoSchema = new mongoose.Schema({
  title: String,
  videoPath: String,
});
const Video = mongoose.model("Video", VideoSchema);

// Multer Storage
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Upload Video Route
app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const newVideo = new Video({ title: req.body.title, videoPath: req.file.filename });
    await newVideo.save();
    res.json({ message: "Video uploaded successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get All Videos with Pagination
app.get("/videos", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5; // Number of videos per page
  const skip = (page - 1) * limit;

  if (page <= 0) {
    return res.status(400).json({ message: "Invalid page number" });
  }

  try {
    const videos = await Video.find().skip(skip).limit(limit);
    const total = await Video.countDocuments();

    res.json({
      videos,
      total,
      pages: Math.ceil(total / limit), // Total pages based on the number of videos
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching videos" });
  }
});

// Stream Video Route
app.get("/stream/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Update Video Route
app.put("/update/:id", upload.single("video"), async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Update the title and video if provided
    if (req.body.title) {
      video.title = req.body.title;
    }

    if (req.file) {
      // Delete the old video file from the server if it exists
      const oldFilePath = path.join(__dirname, "uploads", video.videoPath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      } else {
        console.log("File not found, skipping deletion.");
      }

      // Update the video path with the new file
      video.videoPath = req.file.filename;
    }

    await video.save();
    res.json({ message: "Video updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Delete Video Route
app.delete("/delete/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Delete the video file from the server
    fs.unlinkSync(path.join(__dirname, "uploads", video.videoPath));

    await video.remove();
    res.json({ message: "Video deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Start Server
app.listen(5000, () => console.log("Server running on port 5000"));
