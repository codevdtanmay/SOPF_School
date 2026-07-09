import userModel from "../models/userSchema.model.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const register = async(req,res) => {
   try {
     
       
    const {name, email, password, role} = req.body;

    const isUserAlreadyExist = await userModel.findOne({email});
    if (isUserAlreadyExist){
        return res.status(409).json({
            
            message: "User Already Exists"
        })
    } 

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        name, email, password : hashedPassword, role
    })
    
   const token = jwt.sign({
     id: user._id,
   }, process.env.JWT_SECRET);

  res.cookie("token", token, {
  httpOnly: true,
  sameSite: "lax",
  secure: false, // localhost only
  maxAge: 7 * 24 * 60 * 60 * 1000
});


    res.status(201).json({
        message: "User Registered Successfully",
        user: {
           id: user._id,
           name: user.name,
           email: user.email,
           role: user.role 
  }
    })


   } catch (error) {
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)[0].message
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
   }
}

const login = async(req,res) => {
    try {
     const {email, password} = req.body;
     
     if(!email || !password){
        return res.status(400).json({
            success : false,
            message: "Email and password are required"
        })
     }

     const user = await userModel.findOne({email});
     if(!user){
        return res.status(401).json({
            success: false,
            message: "Invalid Credentials"
        })
     }

     const isMatch = await bcrypt.compare(
        password,
        user.password
     );

     if(!isMatch){
        return res.status(401).json({
            success: false,
            message: "Invalid Credentials"
        })
     }

    
     const token = jwt.sign({
        id: user._id,
        role: user.role
     },process.env.JWT_SECRET,{
        expiresIn: '7d'
     })
     
    res.cookie("token", token, {
  httpOnly: true,
  sameSite: "lax",
  secure: false, // localhost only
  maxAge: 7 * 24 * 60 * 60 * 1000
});

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
    } catch (error) {
    console.error("Login User Issue:", error);

    if (error.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    return res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
    }
}
  
const getme = async(req, res) => {
    const user = await userModel.findById(
        req.user.id
    ).select("-password")

    res.status(200).json({
        success:true,
          user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
    })
}

const logout = async(req, res) => {
    res.clearCookie("token")

    res.status(200).json({
        success: true,
        message: "Logged Out Successfully"
    })
}

export default {register, login, getme, logout}