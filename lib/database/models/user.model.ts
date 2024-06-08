import { Schema, model, models } from "mongoose";

// interface IUser extends Document{
//     clerkId: string;
//     email: string;
//     username: string;
//     photo: ImageData;
//     firstName: string;
//     lastName: string;
//     planId: number;
//     creditBalance: number;
// }


const UserSchema = new Schema({
    clerkId: { 
        type: String,
        required: true,
        unique: true
    },
    email: { 
        type: String,
        required: true, 
        unique: true
    },
    username: { 
        type: String, 
        required: true,
        unique: true
    },
    photo: { 
        type: Image,
        required: true
    },
    firstName: {
        type: String, 
    },
    lastName: {
        type: String,
    },
    planId: { 
        type: Number, 
        required: true, 
        default: 1},
    creditBalance: { 
        type: Number, 
        required: true, 
        default: 10}
});

const User = models?.User || model('User', UserSchema);

export default User;