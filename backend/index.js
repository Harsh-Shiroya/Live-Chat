// server.js
import express from 'express';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import userRoutes from './routes/user.js';
import chatRoutes from './routes/chat.js';
import ChatModel from './model/chat.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// DB Connection
mongoose.connect(process.env.MongoURI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Failed:', err.message));

  app.post('/upload', async (req, res) => {
    try {
      const image = req.files?.image;
      if (!image) return res.status(400).send('No image uploaded');
  
      const imageUrl = await uploadImage(image.tempFilePath);
      res.json({ imageUrl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
// HTTP & Socket.io Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const users = {};  

//Socket Connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register user
  socket.on('register', (userId) => {
    users[userId] = socket.id;
    console.log(`Registered user ${userId} with socket ${socket.id}`);
  });

  // Send Message
  socket.on('send_message', async (message) => { 
    const { sender, message: text, recipientId, image, audio, video } = message;

    try {
      const chat = await ChatModel.findOne({
        participants: { $all: [sender, recipientId] },
      });

      if (!chat) {
        console.error("Chat not found between users");
        return;
      }

      const newMsg = {
        sender,
        message: text,
        image: image || null,   
        audio: audio || null,
        video: video || null,
        timestamp: new Date(),
        seen: false,
        seenBy: [],
      };

      chat.messages.push(newMsg);
      await chat.save();

      const savedMessage = chat.messages[chat.messages.length - 1];

      const fullMessage = {
        _id: savedMessage._id,
        sender,
        message: text,
        recipientId,
        image: savedMessage.image,
        video: savedMessage.video,
        timestamp: savedMessage.timestamp,
      };

      const receiverSocketId = users[recipientId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', fullMessage);
      }
    } catch (err) {
      console.error("Error saving message:", err.message);
    }
  });

  // Message Seen
  socket.on("message-seen", async ({ chatId, messageId, seenBy }) => {
    try {
      const updatedChat = await ChatModel.findByIdAndUpdate(
        chatId,
        {
          $set: { "messages.$[elem].seen": true },
          $addToSet: { "messages.$[elem].seenBy": seenBy },
        },
        {
          arrayFilters: [{ "elem._id": messageId }],
          new: true,
        }
      );
  
      if (updatedChat) {
        const msg = updatedChat.messages.find(m => m._id.toString() === messageId);
        const senderSocketId = users[msg?.sender?.toString()];
        if (senderSocketId) {
          io.to(senderSocketId).emit("message-seen", { messageId });
        }
      }
    } catch (err) {
      console.error("Error marking message as seen:", err.message);
    }
  });
  
  // Typing Indicators
  socket.on('typing', ({ to }) => {
    const receiverSocketId = users[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('show_typing');
    }
  });

  socket.on('stop_typing', ({ to }) => {
    const receiverSocketId = users[to];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('hide_typing');
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
  });
});

// API Routes
app.use('/user', userRoutes);
app.use('/chat', chatRoutes);

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});