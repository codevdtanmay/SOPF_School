import jwt from "jsonwebtoken"

const authMiddleware = async(req, res, next)=>{
   try {
    const token = req.cookies.token;
    
    if(!token){
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
            
        })
    }

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
    );

    req.user = decoded;

     next();

   } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
   }
}

export default authMiddleware
