import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
   email: {
       required: [true, "Email is required"],
       type: String,
       lowercase: true,
       unique: true,
       trim: true,
    match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email"
    ]
},
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum : ["student", "teacher", "admin"],
        default: "student"
    },
    isDeleted: {
  type: Boolean,
  default: false
},

deletedAt: {
  type: Date,
  default: null
}

},{timestamps: true});

export default mongoose.model("User", userSchema)