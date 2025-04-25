import React, { useState } from 'react'; 

import './css/Register.css'; 

const Register = () => {
  const [formData, setFormData] = useState({
    fName: '',
    email: '',
    phone: '',
    password: '',
    profilePic: '',
  });



  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const uploadImageToCloudinary = async () => {
    const form = new FormData();
    form.append('image', imageFile);

    try {
      setUploading(true);
      const res = await fetch('http://localhost:4000/user/upload', {
        method: 'POST',
        body: form,
      });

      const data = await res.json();
      setUploading(false);

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      return data.imageUrl;
    } catch (err) {
      setUploading(false);
      alert('Image upload failed: ' + err.message);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = formData.profilePic;
    if (imageFile) {
      imageUrl = await uploadImageToCloudinary();
      if (!imageUrl) return;
    }

    const userPayload = {
      ...formData,
      profilePic: imageUrl,
    };

    try {
      const res = await fetch('http://localhost:4000/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPayload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Registration failed');

      alert(data.message);
      setFormData({
        fName: '',
        email: '',
        phone: '',
        password: '',
        profilePic: '',
      });
      setImageFile(null); 
        window.location.href = '/';  
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="register-container">
      <h2 className="register-title">Create Account</h2>
      <form onSubmit={handleSubmit} className="register-form">
        <div className="register-form-group">
          <label className="register-label">Full Name</label>
          <input
            type="text"
            name="fName"
            className="register-input"
            value={formData.fName}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="register-form-group">
          <label className="register-label">Email</label>
          <input
            type="email"
            name="email"
            className="register-input"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="register-form-group">
          <label className="register-label">Phone</label>
          <input
            type="tel"
            name="phone"
            className="register-input"
            value={formData.phone}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="register-form-group">
          <label className="register-label">Password</label>
          <input
            type="password"
            name="password"
            className="register-input"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="register-form-group">
          <label className="register-label">Profile Picture</label>
          <input
            type="file"
            className="register-file-input"
            onChange={handleImageChange}
            accept="image/*"
          />
          {uploading && <p className="register-upload-status">Uploading image...</p>}
        </div>
        
        <button type="submit" className="register-submit-btn" disabled={uploading}>
          {uploading ? 'Processing...' : 'Register'}
        </button>

        <div className="register-footer">
            <p>Already have an account? <a href="/" className="login-link">Sign in</a></p>
          </div>
      </form>
    </div>
  );
};

export default Register;