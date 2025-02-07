import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  // Fetch videos from the backend
  useEffect(() => {
    axios.get("http://localhost:5000/videos").then((res) => setVideos(res.data.videos));
  }, []);

  // Handle video upload
  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", title);
    formData.append("video", file);

    try {
      await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTitle("");
      setFile(null);
      // Fetch the updated list of videos after upload
      axios.get("http://localhost:5000/videos").then((res) => setVideos(res.data.videos));
    } catch (error) {
      console.error("Error uploading video:", error);
    }
  };

  // Handle video update
  const handleUpdate = async (e) => {
    e.preventDefault();
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
      // Fetch the updated list of videos after update
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
        // Fetch the updated list of videos after deletion
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

      {/* Upload or Update form */}
      <form onSubmit={editMode ? handleUpdate : handleUpload}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        {/* Allow file input only when not editing */}
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files[0])}
          required={!editMode && !file} // Only require file if in upload mode and no file selected
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
