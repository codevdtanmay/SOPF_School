# Backend API Integration & Database Mapping Guide

This document is a technical blueprint for the backend engineer to connect the React-based frontend of **The School of Pansy Flowers** to a MongoDB database using Node.js/Express and Mongoose.

---

## 1. Quick Switch to Live Mode
To toggle the application from local in-memory mock storage to a live API server:
1. Open `/src/services/axiosInstance.ts`.
2. Change the `enableMock` flag to `false`:
   ```typescript
   const enableMock = false;
   ```
3. Update or define the backend API URL inside your `.env` (development environment variables):
   ```env
   VITE_API_URL="https://your-backend-api.com/api"
   ```

All Axios request configurations will automatically include the Bearer Token header once authentication succeeds: `Authorization: Bearer <token>`.

---

## 2. Recommended Database Schema (Mongoose / MongoDB)

To support the user accounts, roles, and child entities, use a **Reference Pattern** in Mongoose. Each student or teacher is created by first registering a baseline `User` document and then referencing its `_id`.

### A. User Schema (`models/User.js`)
```javascript
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
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
      enum: ["student", "teacher", "admin"],
      default: "student"
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
```

### B. Student Schema (`models/Student.js`)
```javascript
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    admissionNo: {
      type: String,
      required: true,
      unique: true
    },
    class: {
      type: String,
      required: true
    },
    section: {
      type: String,
      required: true
    },
    rollNo: {
      type: Number,
      required: true
    }, 
    fatherName: {
      type: String
    },
    motherName: {
      type: String
    },
    phone: {
      type: String
    }
    // --- FUTURE EXPANSIONS GO HERE ---
    // (See Section 4 for instructions on adding Aadhar, Blood group, or address details)
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
```

### C. Teacher Schema (`models/Teacher.js`)
```javascript
import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    department: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    phone: {
      type: String
    },
    joiningDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["Active", "On Leave", "Suspended"],
      default: "Active"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Teacher", teacherSchema);
```

---

## 3. Operational Workflow: Adding a Student/Teacher

To preserve transaction integrity and ensure passwords are encrypted properly, follow this multi-step flow when saving a new Student or Teacher record via operational endpoints (`POST /students` or `POST /teachers`).

### Step-by-Step Flow:
1. **Receive HTTP Request**: The client hits the `/api/students` endpoint with fields like `name`, `email`, `class`, `section`, `fatherName`, etc.
2. **Hash & Save baseline User**:
   * Generate an automated password (e.g., lowercase first name + `123`, or let them register it).
   * Hash the password with `bcrypt` (e.g., using `10` salt rounds).
   * Create and write the `User` representation card:
     ```javascript
     const newUser = await User.create({
       name: req.body.name,
       email: req.body.email,
       password: hashedSecurePassword,
       role: "student" // or "teacher"
     });
     ```
3. **Save Child Information**:
   * Create the complementary `Student` document, mapping `userId` to the newly created `User._id`:
     ```javascript
     const newStudent = await Student.create({
       userId: newUser._id,
       admissionNo: req.body.admissionNo || "SOPF" + Date.now().toString().slice(-4),
       class: req.body.class,
       section: req.body.section,
       rollNo: req.body.rollNo,
       fatherName: req.body.fatherName,
       motherName: req.body.motherName,
       phone: req.body.phone
     });
     ```
4. **Return Formatted Response**: Return a combined payload to the client so that lists and logs are immediately synchronized.

---

## 4. Future Expansion Guide: How to Add Custom Fields (e.g., Aadhar Card No, Address, Blood Group)

As the database grows, you will inevitably need to capture school compliance parameters like Aadhar Card numbers, blood groups, addresses, or medical cards.

Follow these 3 easy steps to integrate a new field:

### Step 1: Update Mongoose Schema Def
Add the field directly to the relevant mongoose schema. Make sure to define proper validation and parameters. For example, to add an **Aadhar Card Number**:

```javascript
// In models/Student.js:
const studentSchema = new mongoose.Schema({
  // ... current fields ...
  aadharNo: {
    type: String,
    sparse: true, // Allows nulls for older records while keeping search indices optimal
    validate: {
      validator: function(v) {
        // Validation regex for standard 12-digit Indian Aadhar card format
        return !v || /^\d{12}$/.test(v); 
      },
      message: props => `${props.value} is not a valid 12-digit Aadhaar Card number!`
    }
  },
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
    default: "Unknown"
  }
});
```

### Step 2: Include the fields in Creation Controllers
Update your request controller in `controllers/studentController.js` to accept and write the properties:

```javascript
const admitStudent = async (req, res) => {
  const { name, email, class: cl, section, rollNo, aadharNo, bloodGroup } = req.body;
  
  // 1. Create baseline user...
  // 2. Create student record...
  const student = new Student({
    userId: user._id,
    class: cl,
    section,
    rollNo,
    aadharNo, // Map aadhar card directly
    bloodGroup // Map blood group
  });
  
  await student.save();
  // ... return response
};
```

### Step 3: Update Frontend Forms & API
When ready to expose this in the React UI:
1. Open the form inside the relevant component (e.g., the *Admit Student* modal).
2. Code a new input element binding state:
   ```jsx
   <input 
     type="text" 
     placeholder="Enter 12-Digit Aadhar No" 
     value={aadharNo} 
     onChange={e => setAadharNo(e.target.value)} 
   />
   ```
3. Append `aadharNo` inside the Axios payload parameter payload argument in `src/api/studentApi.ts`.

---

## 5. Summary of Main Endpoint Registrations
Ensure your express router in `server.js` exposes:

* `POST /api/auth/login` - Authenticates user, signs JWT with role parameters.
* `GET /api/students` - Returns students populated with user accounts info:
  * Express Controller logic: `Student.find().populate('userId')`
* `POST /api/students` - Handles student creation workflow.
* `GET /api/teachers` - Returns teachers details:
  * Express logic: `Teacher.find().populate('userId')`
* `POST /api/teachers` - Handles teacher creation workflow.
* `POST /api/fees/collect` - Saves a ledger record for tuition settlements.
