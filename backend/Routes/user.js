import express from 'express';
import {  createUser, getAllUsers, loginUser, getUserById, uploadImage, getUserStatus, logoutUser, editUser, changePassword, deleteUser} from '../controllers/user.js';

const router = express.Router();

router.post('/register', createUser);
router.post('/upload', uploadImage);  
router.get('/users', getAllUsers);
router.post('/login', loginUser);
router.get('/user/:id', getUserById);  
router.put('/edit/:id', editUser);  
router.get('/online/:userId', getUserStatus); 
router.post('/logout', logoutUser);  
router.put('/change-password/:id', changePassword);  
router.delete('/delete/:id', deleteUser);
export default router;