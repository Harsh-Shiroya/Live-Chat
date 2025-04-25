import ChatModel from "../model/chat.js";  
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
    cloud_name: process.env.cloudinary_name,
    api_key: process.env.cloudinary_api_key,
    api_secret: process.env.cloudinary_api_secret,
});

// upload image to cloudinary
export const uploadToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'chat-app',
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Image upload failed');
  }
};

// upload image
export const uploadImage = async (req, res) => {
  try {
    const image = req.files?.image;
    if (!image) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imageUrl = await uploadToCloudinary(image.tempFilePath);
    res.status(200).json({ imageUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    res.status(500).json({ error: err.message });
  }
};

// upload video
export const uploadVideo = async (req, res) => {
  try {
    const video = req.files?.video;
    if (!video) {
      return res.status(400).json({ error: 'No video uploaded' });
    }

    const videoUrl = await uploadToCloudinary(video.tempFilePath);
    res.status(200).json({ videoUrl });
  } catch (err) {
    console.error('Upload route error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Create or get existing chat
export const createChat = async (req, res) => {
  try {
    const { senderId, recipientId } = req.body;

    const existingChat = await ChatModel.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    // Create new chat if not found
    const newChat = new ChatModel({
      participants: [senderId, recipientId],
    });

    await newChat.save();
    res.status(201).json(newChat);
  } catch (error) {
    console.error("Error creating chat:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get chat between two users 
export const getChatBetweenUsers = async (req, res) => {
  try {
    const { userAId, userBId } = req.params;

    const chat = await ChatModel.findOne({
      participants: { $all: [userAId, userBId] },
    }).populate("messages.sender", "name email");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// get a last message between two users
export const getLastMessage = async (req, res) => {
  try {
    const { userAId, userBId } = req.params;

    const chat = await ChatModel.findOne({
      participants: { $all: [userAId, userBId] },
    }).populate("messages.sender", "name email");

    if (!chat) {
      return res.status(404).json({ message: " " });
    }

    if (!chat.messages.length) {
      return res.status(200).json({ message: " " });
    }

    const lastMessage = chat.messages.sort((a, b) => b.timestamp - a.timestamp)[0];
    res.status(200).json(lastMessage);
  } catch (error) {
    console.error("Error fetching last message:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// delete only one message
export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const chat = await ChatModel.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const messageIndex = chat.messages.findIndex((msg) => msg._id.toString() === messageId);
    if (messageIndex === -1) return res.status(404).json({ message: "Message not found" });
 
    chat.messages.splice(messageIndex, 1);
    await chat.save();
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// get only new massages notifications  
export const getNewMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const chats = await ChatModel.find({
      participants: userId,
    })
      .populate("messages.sender", "fName email") // or name
      .lean();

    // Filter messages that are:
    // - Not sent by current user
    // - Not seen by current user
    const unseenMessages = [];

    chats.forEach((chat) => {
      chat.messages.forEach((msg) => {
        const isSender = msg.sender._id.toString() === userId;
        const hasSeen = msg.seenBy?.some(
          (seenUserId) => seenUserId.toString() === userId
        );

        if (!isSender && !hasSeen) {
          unseenMessages.push({
            chatId: chat._id,
            message: msg,
          });
        }
      });
    });

    res.status(200).json(unseenMessages);
  } catch (error) {
    console.error("Error fetching new messages:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Mark messages as seen by the user
export const markMessagesAsSeen = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await ChatModel.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    chat.messages.forEach((msg) => {
      if (
        msg.sender.toString() !== userId &&
        !msg.seenBy.includes(userId)
      ) {
        msg.seenBy.push(userId);
      }
    });

    await chat.save();
    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    console.error("Error marking messages as seen:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// seen messages by the user
export const markMessagesAsSeenByUser = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await ChatModel
      .findById(chatId)
      .populate("messages.sender", "fName email"); // or name
    if (!chat) return res.status(404).json({ message: "Chat not found" });


    chat.messages.forEach((msg) => {
      if (
        msg.sender._id.toString() !== userId &&
        !msg.seenBy.includes(userId)
      ) {
        msg.seenBy.push(userId);
      }
    }
    );
    await chat.save();
    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    console.error("Error marking messages as seen:", error.message);
    res.status(500).json({ message: error.message });
  }
}

// active users
export const getActiveUsers = async (req, res) => {
  try {
    const activeUsers = await ChatModel.find({}).populate("participants", "fName email");
    res.status(200).json(activeUsers);
  } catch (error) {
    console.error("Error fetching active users:", error.message);
    res.status(500).json({ message: error.message });
  }
};