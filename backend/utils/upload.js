// import cloudinary from 'cloudinary'; 
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.cloudinary_name,
  api_key: process.env.cloudinary_api_key,
  api_secret: process.env.cloudinary_api_secret,
});
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