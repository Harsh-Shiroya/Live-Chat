import mongoose from "mongoose";
const userSchema = mongoose.Schema(
    {
        fName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        profilePic: {
            type: String, 
            required: true,
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        about: {
            type: String,
            default: "Hey there! I am using Chat App",
        },
    },
    { timestamps: true }
);

const userModel = mongoose.model("User", userSchema);
export default userModel;
