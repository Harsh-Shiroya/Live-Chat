import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import Chat from './Chat';
import './css/Sidebar.css';

const Sidebar = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const userId = localStorage.getItem('userId');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isAllUsersOpen, setIsAllUsersOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [editProfile, setEditProfile] = useState({
    fName: '',
    email: '',
    phone: '',
    password: '',
    profilePic: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const navigate = useNavigate();

  // Fetch all users except current user
  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    fetch(`http://localhost:4000/user/users?currentUserId=${userId}`)
      .then((res) => res.json())
      .then(async (data) => {
        // Filter users based on whether they have had a conversation with the current user
        const usersWithMessages = await Promise.all(
          data.map(async (user) => {
            try {
              const res = await fetch(`http://localhost:4000/chat/lastMessage/${userId}/${user._id}`);
              const lastMessageData = await res.json();

              const hasMessage =
                lastMessageData?.message ||
                lastMessageData?.image ||
                lastMessageData?.video ||
                lastMessageData?.audio;

              if (!hasMessage) return null;

              return {
                ...user,
                lastMessage:
                  lastMessageData?.image
                    ? 'Photo'
                    : lastMessageData?.video
                      ? 'Video'
                      : lastMessageData?.audio
                        ? 'Audio'
                        : lastMessageData?.message
                          ? lastMessageData.message
                          : 'Start a new conversation',
              };
            } catch (error) {
              console.error('Error fetching last message for user:', user._id, error);
              return null;
            }
          })
        );

        const filteredChatUsers = usersWithMessages.filter(Boolean); // Filter out null values
        setChatUsers(filteredChatUsers);

        // Fetch all users to display in "All Users" section
        setAllUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch users:', err);
        setLoading(false);
      });
  }, [userId]);

  // Fetch current user data
  useEffect(() => {
    if (userId) {
      fetch(`http://localhost:4000/user/user/${userId}`)
        .then((res) => res.json())
        .then((data) => setCurrentUser(data))
        .catch((err) => console.error('Failed to fetch current user:', err));
    }
  }, [userId]);

  // Update edit profile when current user changes
  useEffect(() => {
    if (currentUser) {
      setEditProfile({
        fName: currentUser.fName,
        email: currentUser.email,
        phone: currentUser.phone,
        password: '',
        profilePic: currentUser.profilePic,
        about: currentUser.about
      });
    }
  }, [currentUser]);

  // Logout function
  const logout = async () => {
    const userId = localStorage.getItem("userId");

    try {
      const res = await fetch('http://localhost:4000/user/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        localStorage.clear();
        window.location.href = '/';
      } else {
        console.error('Failed to logout user');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const startChat = (selectedUserId) => {
    setActiveChat(selectedUserId);
    navigate('/chat', { state: { userId: selectedUserId } });
  };

  // Upload image to Cloudinary
  const uploadImageToCloudinary = async () => {
    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const res = await fetch("http://localhost:4000/user/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Image upload failed:", error);
      return null;
    }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();

    reader.onloadend = () => {
      setEditProfile(prev => ({ ...prev, profilePic: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    let imageUrl = editProfile.profilePic;

    if (imageFile) {
      imageUrl = await uploadImageToCloudinary();
      if (!imageUrl) return;
    }

    const dataToSend = {
      userId,
      fName: editProfile.fName,
      email: editProfile.email,
      phone: editProfile.phone,
      profilePic: imageUrl,
      about: editProfile.about,
    };

    if (editProfile.password) {
      dataToSend.password = editProfile.password;
    }

    try {
      const res = await fetch(`http://localhost:4000/user/edit/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setCurrentUser(updatedUser);
        setIsProfileOpen(false);
        setImageFile(null);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      alert('Error updating profile');
    }
  };

  // change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = editProfile;

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/user/change-password/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        alert('Password changed successfully!');
        setIsChangePasswordOpen(false);
        setEditProfile(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      alert('Error changing password');
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const confirmDelete = window.confirm("Are you sure you want to delete your account?");
    if (!confirmDelete) return;
    try {
      const res = await fetch(`http://localhost:4000/user/delete/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        localStorage.clear();
        window.location.href = '/';
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Error deleting user');
    }
  };

  const filteredUsers = chatUsers.filter(user =>
    user.fName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-layout">
      {/* LEFT ICON BAR */}
      <div className="left-icon-bar">
        <div className="icon-wrapper" onClick={() => setIsProfileOpen(true)}>
          <img
            src={currentUser?.profilePic || '/default-profile.png'}
            alt={currentUser?.fName}
            className='profile-pic-icon'
          />
        </div>
        <div className="icon-wrapper active">
          <i className="bi bi-chat-left-dots-fill"></i>
        </div>
        <div className="icon-wrapper" onClick={() => setIsAllUsersOpen(true)}>
          <i className="bi bi-people-fill"></i>
        </div>

        <div className="icon-wrapper">
          <i className="bi bi-circle-half"></i>
        </div>
        <div className="icon-wrapper logout-icon" onClick={logout}>
          <i className="bi bi-box-arrow-right"></i>
        </div>
        <div className="icon-wrapper" onClick={() => setIsChangePasswordOpen(true)}>
          <i class="bi bi-gear"></i>
        </div>
      </div>

      {/* Sidebar on the left */}
      <div className="sidebar-container">
        <div className="sidebar-header">
          <div className="sidebar-user-info">
            <div className="user-greeting">
              <h4>Hello <span>{currentUser?.fName || 'User'}</span></h4>
            </div>
          </div>

          <div className="sidebar-search">
            <div className="search-container">
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="sidebar-chats">
          {loading ? (
            <div className="loading-spinner">
              <i className="bi bi-arrow-repeat"></i>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user._id}
                className={`chat-item ${activeChat === user._id ? 'active' : ''}`}
                onClick={() => startChat(user._id)}
              >
                <div className="chat-avatar">
                  <img
                    src={user.profilePic || '/default-profile.png'}
                    alt={user.fName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-profile.png';
                    }}
                  />
                  {user.isOnline && <span className="online-badge"></span>}
                </div>

                <div className="chat-content">
                  <div className="chatt-header">
                    <span className="chat-name">{user.fName}</span>
                  </div>
                  <div className="chat-preview">
                    <p>{user.lastMessage || 'Start a new conversation'}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <i className="bi bi-emoji-frown"></i>
              <p>No users found</p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Sidebar */}
      {isProfileOpen && (
        <div className="profile-sidebar-overlay">
          <div className="profile-sidebar">
            <div className="profile-header">
              <h3>Edit Profile</h3>
              <button
                className="close-btn"
                onClick={() => setIsProfileOpen(false)}
                aria-label="Close profile"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form className="profile-form" onSubmit={handleProfileUpdate}>
              <div className="form-group profile-pic-group">
                <label htmlFor="profile-pic-upload" className="profile-pic-label">
                  <img
                    src={editProfile.profilePic || '/default-profile.png'}
                    className="profile-large"
                    alt="Profile"
                  />
                  <div className="upload-overlay">
                    <i className="bi bi-camera-fill"></i>
                  </div>
                </label>
                <input
                  id="profile-pic-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicUpload}
                  className="hidden-input"
                />
              </div>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editProfile.fName}
                  onChange={(e) => setEditProfile({ ...editProfile, fName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editProfile.email}
                  onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={editProfile.phone}
                  onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>About</label>
                <input
                  type="text"
                  value={editProfile.about}
                  onChange={(e) => setEditProfile({ ...editProfile, about: e.target.value })}
                />
              </div>
              <button type="submit" className="save-btn">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* all user show */}
      {isAllUsersOpen && (
        <div className="profile-sidebar-overlay">
          <div className="profile-sidebar">
            <div className="profile-header">
              <h3>All Users</h3>
              <button
                className="close-btn"
                onClick={() => setIsAllUsersOpen(false)}
                aria-label="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="sidebar-search">
              <div className="search-container">
                <i className="bi bi-search"></i>
                <input
                  type="text"
                  placeholder="Search users"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="sidebar-chats">
              {allUsers.length > 0 ? (
                allUsers.map((user) => (
                  <div
                    key={user._id}
                    className="chat-item"
                    onClick={() => {
                      startChat(user._id);
                      setIsAllUsersOpen(false);
                    }}
                  >
                    <div className="chat-avatar">
                      <img src={user.profilePic || '/default-profile.png'} alt={user.fName} />
                      {user.isOnline && <span className="online-badge"></span>}
                    </div>
                    <div className="chat-content">
                      <div className="chatt-header">
                        <span className="chat-name">{user.fName}</span>
                      </div>
                      <div className="chat-preview">
                        <p>{user.about || 'No status yet'}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">
                  <p>No users found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )} 

      {/*Change Password */}
      {isChangePasswordOpen && (
        <div className="profile-sidebar-overlay">
          <div className="profile-sidebar">
            <div className="profile-header">
              <h3>Change Password</h3>
              <button
                className="close-btn"
                onClick={() => setIsChangePasswordOpen(false)}
                aria-label="Close profile"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form className="profile-form" onSubmit={handleChangePassword}>

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={editProfile.currentPassword}
                  onChange={(e) => setEditProfile({ ...editProfile, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={editProfile.newPassword}
                  onChange={(e) => setEditProfile({ ...editProfile, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={editProfile.confirmPassword}
                  onChange={(e) => setEditProfile({ ...editProfile, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button type="submit" className="save-btn">
                Change Password
              </button>

              <button type="button" className="delete-btn" onClick={handleDeleteUser}>
                Delete Account
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Chat renders on the right side */}
      <Routes>
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </div>
  );
};

export default Sidebar;