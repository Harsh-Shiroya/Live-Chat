import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  FiArrowLeft, FiPaperclip, FiMic, FiSmile, FiSearch,
  FiPhone, FiVideo, FiImage, FiX, FiSend
} from 'react-icons/fi';
import { BiCheckDouble } from 'react-icons/bi';
import EmojiPicker from 'emoji-picker-react';
import './css/Chat.css';

const socket = io('http://localhost:4000');

const formatChatDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const groupMessagesByDate = (msgs) => {
  const grouped = {};
  msgs.forEach((msg) => {
    const dateKey = formatChatDate(msg.timestamp);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(msg);
  });
  return grouped;
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recording, setRecording] = useState(false);
  const [showFriendcontact, setShowFriendcontact] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const fileInputRef = useRef(null);
  const [uploading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [chatId, setChatId] = useState(null);

  const toggleDropdown = () => setShowDropdown(prev => !prev);
  const closeDropdown = () => setShowDropdown(false);
  const videoInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');
  const userId = location.state?.userId;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleEmojiClick = (emojiData) => {
    setInput(prev => prev + emojiData.emoji);
    inputRef.current.focus();
  };

  useEffect(() => {
    const initChat = async () => {
      try {
        await fetch('http://localhost:4000/chat/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: currentUserId, recipientId: userId }),
        });
      } catch (err) {
        console.error('Failed to create or fetch chat:', err);
      }
    };

    initChat();
    if (currentUserId) socket.emit('register', currentUserId);
  }, [currentUserId, userId]);

  useEffect(() => {
    const fetchChat = async () => {
      try {
        const res = await fetch(`http://localhost:4000/chat/between/${currentUserId}/${userId}`);
        const chatData = await res.json();

        const transformedMessages = (chatData.messages || []).map(msg => ({
          ...msg,
          seen: msg.seenBy?.some(seenUserId => seenUserId.toString() === userId),
        }));

        setMessages(transformedMessages);

        if (chatData._id) {
          setChatId(chatData._id);
          await fetch('http://localhost:4000/chat/markAsSeen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: chatData._id, userId: currentUserId }),
          });

          (chatData.messages || []).forEach((msg) => {
            const alreadySeen = msg.seenBy?.some(id => id.toString() === currentUserId);
            if (!alreadySeen && msg.sender !== currentUserId) {
              socket.emit("message-seen", {
                chatId: chatData._id,
                messageId: msg._id,
                seenBy: currentUserId,
              });
            }
          });
        }
      } catch (err) {
        console.error('Failed to fetch chat:', err);
      }
    };

    fetchChat();
  }, [currentUserId, userId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob);

        const res = await fetch('http://localhost:4000/chat/uploadVoice', {
          method: 'POST',
          body: formData,
        });

        const { audioUrl } = await res.json();

        const message = {
          sender: currentUserId,
          recipientId: userId,
          audio: audioUrl,
          timestamp: new Date().toISOString(),
        };
        socket.emit('send_message', message);
        setMessages((prev) => [...prev, { ...message, seen: false }]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied or not available.');
      console.error('Mic error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch(`http://localhost:4000/user/user/${userId}`);
        const data = await res.json();
        setUserInfo(data);
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };

    const fetchOnlineStatus = async () => {
      try {
        const res = await fetch(`http://localhost:4000/user/online/${userId}`);
        const data = await res.json();
        setUserInfo(prev => ({ ...prev, isOnline: data.isOnline }));
      } catch (err) {
        console.error('Error fetching online status:', err);
      }
    };

    fetchUserInfo();
    fetchOnlineStatus();
  }, [userId]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, { ...data, seen: false }]);
    });

    socket.on('show_typing', () => setFriendTyping(true));
    socket.on('hide_typing', () => setFriendTyping(false));

    socket.on('message-seen', ({ messageId }) => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === messageId ? { ...msg, seen: true } : msg
        )
      );
    });

    return () => {
      socket.off('receive_message');
      socket.off('show_typing');
      socket.off('hide_typing');
      socket.off('message-seen');
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      socket.emit('typing', { to: userId });
    }

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('stop_typing', { to: userId });
      }
    }, 1000);
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    const message = {
      sender: currentUserId,
      message: input,
      recipientId: userId,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, { ...message, seen: false }]);
    socket.emit('send_message', message);
    setInput('');
    setIsTyping(false);
    socket.emit('stop_typing', { to: userId });
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleSearchMode = () => {
    setSearchMode(!searchMode);
    if (searchMode) setSearchTerm('');
  };

  const filteredMessages = searchTerm
    ? messages.filter(msg => msg.message?.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages;

  const groupedMessages = groupMessagesByDate(filteredMessages);

  const handleMessageClick = (message) => {
    setSelectedMessage(selectedMessage?._id === message._id ? null : message);
  };

  // image upload handler
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const tempMessage = {
      sender: currentUserId,
      recipientId: userId,
      image: previewUrl,
      timestamp: new Date().toISOString(),
      uploading: true,
      seen: false,
    };

    setMessages(prev => [...prev, tempMessage]);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('http://localhost:4000/chat/chat-image', {
        method: 'POST',
        body: formData,
      });

      const response = await res.json();
      if (response.imageUrl) {
        const realMessage = {
          sender: currentUserId,
          recipientId: userId,
          image: response.imageUrl,
          timestamp: new Date().toISOString(),
          seen: false,
        };

        socket.emit('send_message', realMessage);

        setMessages(prev => {
          const updated = [...prev];
          updated.pop();
          return [...updated, realMessage];
        });
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  };
  // video upload handler
  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    const tempMessage = {
      sender: currentUserId,
      recipientId: userId,
      video: previewUrl,
      timestamp: new Date().toISOString(),
      uploading: true,
      seen: false,
    };

    setMessages(prev => [...prev, tempMessage]);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch('http://localhost:4000/chat/chat-video', {
        method: 'POST',
        body: formData,
      });

      const { videoUrl } = await res.json();

      const realMessage = {
        sender: currentUserId,
        recipientId: userId,
        video: videoUrl,
        timestamp: new Date().toISOString(),
        seen: false,
      };

      socket.emit('send_message', realMessage);

      setMessages(prev => {
        const updated = [...prev];
        updated.pop();
        return [...updated, realMessage];
      });
    } catch (err) {
      console.error('Video upload failed:', err);
    }
  };

  // delete message handler
  const handleDeleteMessage = async (messageId) => {
    try {
      await fetch(`http://localhost:4000/chat/deleteMessage/${chatId}/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, message: null, deleted: true }
            : msg
        )
      );

      setSelectedMessage(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-wrapper')) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isMessageSent = (msg) => {
    return msg.sender === currentUserId ||
      (msg.sender && typeof msg.sender === 'object' && msg.sender._id === currentUserId);
  };


  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <FiArrowLeft size={20} />
          </button>

          <div className="user-avatar" onClick={() => setShowFriendcontact(true)}>
            <img src={userInfo?.profilePic} alt={userInfo?.fName} />
          </div>

          <div className="user-info" onClick={() => setShowFriendcontact(true)}>
            <h3>{userInfo?.fName || 'User'}</h3>
            <p>{friendTyping ? 'typing...' : userInfo?.isOnline ? 'online' : 'offline'}</p>
          </div>
        </div>

        <div className="header-actions">
          {selectedMessage ? (
            <button
              className="action-btn"
              onClick={() => handleDeleteMessage(selectedMessage._id)}
            >
              <i className="bi bi-trash" />
            </button>
          ) : (
            <>
              <button className="action-btn"><FiVideo size={20} /></button>
              <button className="action-btn"><FiPhone size={20} /></button>
              <button className={`action-btn ${searchMode ? 'active' : ''}`} onClick={toggleSearchMode}>
                <FiSearch size={20} />
              </button>
            </>
          )}
        </div>

      </header>
      {/* End of Header */}
      {searchMode && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <button className="search-close" onClick={toggleSearchMode}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {showFriendcontact && (
        <div className="contact-overlay">
          <div className="contact-sidebar">
            <div className="contact-header">
              <h3>Contact Info</h3>
              <button className="close-btn" onClick={() => setShowFriendcontact(false)}>
                <FiX size={24} />
              </button>
            </div>
            <div className="contact-content">
              <div className="contact-pic-container">
                <img src={userInfo?.profilePic} alt={userInfo?.fName} />
              </div>
              <div className="contact-details">
                <h4>{userInfo?.fName || 'User'}</h4>
                <p className="status">{userInfo?.isOnline ? 'Online' : 'Offline'}</p>
              </div>
              <div className="contact-info">
                <div className="info-item">
                  <span className="label">Phone</span>
                  <span className="value">{userInfo?.phone || 'Not available'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email</span>
                  <span className="value">{userInfo?.email || 'Not available'}</span>
                </div>
                <div className="info-item">
                  <span className="label">About</span>
                  <span className="value">{userInfo?.about || 'Not available'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        
      {/* Chat messages */}
      <main className="messages-container">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <React.Fragment key={date}>
            <div className="date-separator">
              <span>{date}</span>
            </div>
            {msgs.map((msg, i) => {
              const sent = isMessageSent(msg);

              return (
                <div
                  key={i}
                  className={`message-container ${sent ? 'sent' : 'received'} ${selectedMessage?._id === msg._id ? 'selected' : ''}`}
                >
                  <div
                    className={`message-bubble ${sent ? 'sent' : 'received'}`}
                    onClick={() => handleMessageClick(msg)}
                  >

                    {/* Audio message */}
                    {msg.audio && (
                      <audio controls src={msg.audio} className="audio-message" />
                    )}

                    {/* Text message */}
                    {msg.deleted ? (
                      <p className="deleted-message">
                        {isMessageSent(msg) ? "You deleted this message." : "This message was deleted."}
                      </p>
                    ) : msg.message && (
                      <p
                        dangerouslySetInnerHTML={{
                          __html: searchTerm
                            ? msg.message.replace(
                              new RegExp(`(${searchTerm})`, 'gi'),
                              '<span class="highlight">$1</span>'
                            )
                            : msg.message
                        }}
                      />
                    )}


                    {/* Image message */}
                    {msg.image && (
                      <div className="media-wrapper">
                        <img
                          src={msg.image}
                          alt="Sent content"
                          className={`media-content ${msg.uploading ? 'uploading' : ''}`}
                          onClick={() => !msg.uploading && setFullScreenImage(msg.image)}
                        />
                        {msg.uploading && <div className="upload-indicator">⏳ Uploading...</div>}
                      </div>
                    )}

                    {/* Video message */}
                    {msg.video && (
                      <div className="media-wrapper">
                        <video controls className="media-content">
                          <source src={msg.video} type="video/mp4" />
                        </video>
                        {msg.uploading && <div className="upload-indicator">⏳ Uploading...</div>}
                      </div>
                    )}

                    {/* Message metadata */}
                    <div className="message-meta">
                      <span className="time">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {sent && (
                        <BiCheckDouble className={`read-receipt ${msg.seen ? 'seen' : ''}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}

        {/* Full screen image overlay */}
        {fullScreenImage && (
          <div className="fullscreen-overlay" onClick={() => setFullScreenImage(null)}>
            <img src={fullScreenImage} alt="Full view" className="fullscreen-image" />
            <button className="close-fullscreen">
              <FiX size={30} />
            </button>
          </div>
        )}

        {/* Typing indicator */}
        {friendTyping && (
          <div className="typing-indicator received">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>
      {/* End of Chat messages */}

      {/* Input area */}
      <footer className="input-area">
        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width="50%"
              height={350}
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
              searchDisabled
            />
          </div>
        )}

        <div className="input-wrapper">
          <button
            className={`emoji-btn ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FiSmile size={24} />
          </button>

          <div className="file-upload-container">
            {/* Hidden file inputs */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                handleFileChange(e);
                closeDropdown();
              }}
            />
            <input
              type="file"
              accept="video/*"
              ref={videoInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                handleVideoChange(e);
                closeDropdown();
              }}
            />

            {/* Dropdown menu */}
            <div className="dropdown-wrapper">
              {showDropdown && (
                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => fileInputRef.current.click()}>
                    <FiImage /> Image
                  </button>
                  <button onClick={() => videoInputRef.current.click()}>
                    <FiVideo /> Video
                  </button>
                  <button onClick={() => { /* Handle document upload */ }}>
                    <FiPaperclip /> Document
                  </button>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown();
                }}
                disabled={uploading}
                className='file-upload-btn'
              >
                <FiPaperclip size={24} />
              </button>
            </div>

          </div>



          {/* <div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <input
              type="file"
              accept="video/*"
              ref={videoInputRef}
              style={{ display: 'none' }}
              onChange={handleVideoChange}
            />

            <button
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <FiPaperclip size={24} />
            </button>
            <button
              onClick={() => videoInputRef.current.click()}
              disabled={uploading}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <FiPaperclip size={24} />
            </button>
          </div> */}

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Type a message"
            className="message-input"
          />

          <button
            className={`send-btn ${input.trim() ? 'active' : ''}`}
            onClick={input.trim() ? sendMessage : (recording ? stopRecording : startRecording)}
          >
            {input.trim() ? (
              <FiSend size={20} />
            ) : recording ? (
              <div className="recording-indicator"></div>
            ) : (
              <FiMic size={20} />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Chat;