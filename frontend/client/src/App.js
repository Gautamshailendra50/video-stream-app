import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [error, setError] = useState(""); // Validation error state

  // Fetch videos from the backend
  useEffect(() => {
    axios.get("http://localhost:5000/videos").then((res) => setVideos(res.data.videos));
  }, []);

  // Validate file before setting it
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      setError("Please select a video file.");
      return;
    }

    const validExtensions = ["video/mp4", "video/avi", "video/mkv"];
    if (!validExtensions.includes(selectedFile.type)) {
      setError("Invalid file format. Only MP4, AVI, and MKV are allowed.");
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB limit
    if (selectedFile.size > maxSize) {
      setError("File size exceeds 50MB limit.");
      return;
    }

    setFile(selectedFile);
    setError(""); // Clear any previous errors
  };

  // Validate inputs before upload/update
  const validateForm = () => {
    if (!title.trim()) {
      setError("Title is required.");
      return false;
    }
    if (!editMode && !file) {
      setError("Please select a video file.");
      return false;
    }
    return true;
  };

  // Handle video upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append("title", title);
    formData.append("video", file);

    try {
      await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTitle("");
      setFile(null);
      setError("");
      axios.get("http://localhost:5000/videos").then((res) => setVideos(res.data.videos));
    } catch (error) {
      console.error("Error uploading video:", error);
    }
  };

  // Handle video update
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append("title", title);
    if (file) {
      formData.append("video", file);
    }

    try {
      await axios.put(`http://localhost:5000/update/${currentVideoId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setTitle("");
      setFile(null);
      setEditMode(false);
      setCurrentVideoId(null);
      setError("");
      axios.get("http://localhost:5000/videos").then((res) => setVideos(res.data.videos));
    } catch (error) {
      console.error("Error updating video:", error);
    }
  };

  // Handle video delete
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this video?");
    if (confirmDelete) {
      try {
        await axios.delete(`http://localhost:5000/delete/${id}`);
        axios.get("http://localhost:5000/videos").then((res) => setVideos(res.data.videos));
      } catch (error) {
        console.error("Error deleting video:", error);
      }
    }
  };

  // Set form to edit mode with existing video details
  const handleEdit = (video) => {
    setEditMode(true);
    setCurrentVideoId(video._id);
    setTitle(video.title);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Video Streaming App</h1>

      {/* Error Message */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Upload or Update form */}
      <form onSubmit={editMode ? handleUpdate : handleUpload}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        {/* File input only enabled when not in edit mode */}
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          required={!editMode && !file}
        />
        <button type="submit">{editMode ? "Update Video" : "Upload Video"}</button>
      </form>

      <h2>Videos</h2>
      {videos.map((video) => (
        <div key={video._id}>
          <h3>{video.title}</h3>
          <video width="400" controls>
            <source src={`http://localhost:5000/stream/${video.videoPath}`} type="video/mp4" />
          </video>
          <div className="edit-delete-buttons">
            <button onClick={() => handleEdit(video)}>Edit</button>
            <button className="delete-btn" onClick={() => handleDelete(video._id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
