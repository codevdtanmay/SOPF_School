import express from "express"
import authorize from "../middleware/roleMiddleware.js"
import authMiddleware from "../middleware/authMiddleware.js"

const router = express.Router()

router.get("/admin", authMiddleware, authorize("admin"), (req,res)=>{
    res.json({
        message: "Welcome Admin"
    })
})
router.get("/teacher", authMiddleware, authorize("teacher","admin"), (req,res)=>{
    res.json({
        message: "Welcome Teacher"
    })
})
router.get("/student", authMiddleware, authorize("student", "teacher","admin"), (req,res)=>{
    res.json({
        message: "Welcome Student"
    })
})

export default router