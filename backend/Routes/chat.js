import express from 'express';
import { createChat,uploadImage,uploadVideo, getChatBetweenUsers,deleteMessage, getLastMessage, getNewMessages, markMessagesAsSeen,markMessagesAsSeenByUser, getActiveUsers, } from '../controllers/chat.js';
// import { uploadImage } from '../utils/upload.js';
const router = express.Router();

router.post('/', createChat);
router.post('/chat-image', uploadImage);  
router.post('/chat-video', uploadVideo); 
router.get('/between/:userAId/:userBId', getChatBetweenUsers); 
router.get('/lastMessage/:userAId/:userBId', getLastMessage);
router.delete('/deleteMessage/:chatId/:messageId', deleteMessage);
router.get('/newMessages/:userId', getNewMessages);
router.post('/markAsSeen', markMessagesAsSeen);  
router.post('/markAsSeenByUser', markMessagesAsSeenByUser);  
router.get('/activeUsers', getActiveUsers);  

export default router;