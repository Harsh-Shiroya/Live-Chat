import userModel from '../model/user.js';
import bcrypt from 'bcrypt';
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

// create user
export const createUser = async (req, res) => {
  try {
    // Check if body exists
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }

    const { fName, email, phone, password, profilePic } = req.body;

    // Validate required fields
    if (!fName || !email || !phone || !password || !profilePic) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save new user
    const newUser = new userModel({
      fName,
      email,
      phone,
      password: hashedPassword,  
      profilePic,
      isOnline: false,  
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// login user
export const loginUser = async (req, res) => {
  try {
    // Check if body exists
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find user by email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    await userModel.findByIdAndUpdate(user._id, { isOnline: true });
    res.status(200).json({ message: 'Login successful', userId: user._id });

  } catch (error) {
    console.error('Login user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// get all users
export const getAllUsers = async (req, res) => {
  const currentUserId = req.query.currentUserId;

  try {
    const users = await userModel.find(
      { _id: { $ne: currentUserId } }, // 👈 Exclude logged-in user
      { password: 0 } // Exclude password
    );

    res.status(200).json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /user/:id 
export const getUserById = async (req, res) => {
try {
  const user = await userModel.findById(req.params.id).select('fName email phone profilePic about isOnline');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
} catch (err) {
  res.status(500).json({ message: 'Server error' });
}
};

//Get user online status
export const getUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userModel.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ isOnline: user.isOnline });
  } catch (error) {
    console.error('Get user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
 
// logout user
export const logoutUser = async (req, res) => {
  const { userId } = req.body;
  try {
    await userModel.findByIdAndUpdate(userId, { isOnline: false });
    res.status(200).json({ message: 'User logged out and offline' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

//edit user
export const editUser = async (req, res) => {
  try {
    const { userId, fName, email, phone, password, profilePic, about } = req.body;

    // Get current user
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let updatedFields = {
      fName,
      email,
      phone,
      profilePic,
      about
    };

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedFields.password = hashedPassword;
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      updatedFields,
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Edit user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// change password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.params.id;

  try {
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error resetting password" });
  }
};

// delete user
export const deleteUser = async (req, res) => {
  const userId = req.params.id;
  try {
    await userModel.findByIdAndDelete(userId);
    res.status(200).json({ message: "User deleted successfully" });
  }
  catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}