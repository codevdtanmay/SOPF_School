# Technical Specification: School Fees & Installment Backend Engine
## Production Schema, REST Endpoints, & Database Controller Design Blueprint

This document specifies the database schemas, API endpoints, and processing logic required to build a fully capable Express.js (Node.js) backend matching the frontend installment calculations and fee structure system.

---

## 1. Database Schema Specifications (Mongoose Models)

### 1.1 `FeeStructure` Schema
The `FeeStructure` dictates terms, totals, and installment values for specific academic grade categories.

```typescript
import { Schema, model, Document } from 'mongoose';

export interface IFeeStructure extends Document {
  class: string;                // e.g., "Class 10", "Class 6"
  admissionFee: number;
  tuitionFee: number;
  computerFee: number;
  examFee: number;
  culturalActivityFee: number;
  totalFee: number;             // Pre-calculated sum
  academicSession: string;      // e.g., "2026-27"
  juneAmount: number;           // Quarter 1 Installment Target
  septemberAmount: number;       // Quarter 2 Installment Target
  decemberAmount: number;        // Quarter 3 Installment Target
  marchAmount: number;          // Quarter 4 Installment Target
  createdAt: Date;
  updatedAt: Date;
}

const FeeStructureSchema = new Schema<IFeeStructure>({
  class: { type: String, required: true, trim: true },
  admissionFee: { type: Number, default: 0 },
  tuitionFee: { type: Number, default: 0 },
  computerFee: { type: Number, default: 0 },
  examFee: { type: Number, default: 0 },
  culturalActivityFee: { type: Number, default: 0 },
  totalFee: { type: Number, required: true, default: 0 },
  academicSession: { type: String, required: true },
  juneAmount: { type: Number, default: 0 },
  septemberAmount: { type: Number, default: 0 },
  decemberAmount: { type: Number, default: 0 },
  marchAmount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Middleware to compute totalFee before save
FeeStructureSchema.pre('save', function (next) {
  this.totalFee = 
    this.admissionFee + 
    this.tuitionFee + 
    this.computerFee + 
    this.examFee + 
    this.culturalActivityFee;
  next();
});

export const FeeStructureModel = model<IFeeStructure>('FeeStructure', FeeStructureSchema);
```

---

### 1.2 `Student` (Fees Extension) Schema
This represents how payment history and outstanding records map relative to active structures.

```typescript
export interface IFeePayment {
  receiptNo: string;
  amount: number;
  date: string;       // YYYY-MM-DD
  paymentMethod: string; // "Cash", "Card", "UPI", "Bank Transfer"
}

export interface IStudent extends Document {
  name: string;
  admissionNo: string; // Unique identifier
  class: string;
  section: string;
  fatherName: string;
  phone: string;
  // Financial Ledger
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  paymentHistory: IFeePayment[];
}

const StudentSchema = new Schema<IStudent>({
  name: { type: String, required: true },
  admissionNo: { type: String, required: true, unique: true },
  class: { type: String, required: true },
  section: { type: String, required: true },
  fatherName: { type: String },
  phone: { type: String },
  totalFee: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Paid', 'Partial', 'Unpaid'], default: 'Unpaid' },
  paymentHistory: [{
    receiptNo: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    paymentMethod: { type: String, required: true }
  }]
}, {
  timestamps: true
});

// Middleware to enforce matching ledger calculation
StudentSchema.pre('save', function (next) {
  this.dueAmount = Math.max(0, this.totalFee - this.paidAmount);
  if (this.paidAmount >= this.totalFee) {
    this.status = 'Paid';
  } else if (this.paidAmount > 0) {
    this.status = 'Partial';
  } else {
    this.status = 'Unpaid';
  }
  next();
});

export const StudentModel = model<IStudent>('Student', StudentSchema);
```

---

## 2. API Endpoints Specifications

### 2.1 Get Overall Fees Statistics `GET /dashboard/fees`
Returns dynamic charts summaries in high performance.

- **URL:** `/api/dashboard/fees`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <token>`
- **Response Shape:**
```json
{
  "collected": 320000,
  "pending": 48000,
  "overdue": 12000,
  "monthlyTarget": 400000
}
```

### 2.2 List Fee Structures `GET /fee-structures`
Retrieves registered fee configurations.

- **URL:** `/api/fee-structures`
- **Method:** `GET`
- **Response Shape:**
```json
[
  {
    "_id": "fs-6893623594",
    "class": "Class 10",
    "admissionFee": 5000,
    "tuitionFee": 12000,
    "computerFee": 1500,
    "examFee": 1000,
    "culturalActivityFee": 500,
    "totalFee": 20000,
    "academicSession": "2026-27",
    "juneAmount": 5000,
    "septemberAmount": 5000,
    "decemberAmount": 5000,
    "marchAmount": 5000
  }
]
```

### 2.3 Create/Update Fee Structure `POST /fee-structures` / `PUT /fee-structures/:id`
Admin methods for structures.

- **URL:** `/api/fee-structures`
- **Method:** `POST`
- **Body Options:** `class`, `admissionFee`, `tuitionFee`, `computerFee`, `examFee`, `culturalActivityFee`, `academicSession`, `juneAmount`, `septemberAmount`, `decemberAmount`, `marchAmount`.

---

## 3. Transaction/Payment Logic (`POST /fees/collect`)
When a student pays an arbitrary sum, the system registers the cash transaction, allocates paid amount, updates status, and logs activities.

- **URL:** `/api/fees/collect`
- **Method:** `POST`
- **Payload:**
```json
{
  "studentId": "std-98247",
  "amountPaid": 6000,
  "paymentMethod": "UPI"
}
```

### 3.1 Fully Scaled Express Route Logic

```typescript
import { Request, Response, Router } from 'express';
import { StudentModel } from '../models/Student';
import { FeeStructureModel } from '../models/FeeStructure';

const router = Router();

router.post('/collect', async (req: Request, res: Response) => {
  try {
    const { studentId, amountPaid, paymentMethod } = req.body;

    if (!studentId || !amountPaid || amountPaid <= 0) {
      return res.status(400).json({ error: 'Valid Student ID and payment amount are required' });
    }

    // 1. Locate student
    const student = await StudentModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Validate outstanding
    if (amountPaid > student.dueAmount) {
      return res.status(400).json({ error: `Amount exceeds open balance of ₹${student.dueAmount}` });
    }

    // 2. Register receipt
    const receiptNo = `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toISOString().split('T')[0];

    const paymentRecord = {
      receiptNo,
      amount: amountPaid,
      date: today,
      paymentMethod: paymentMethod || 'Cash'
    };

    // 3. Apply financial adjustments
    student.paidAmount += amountPaid;
    student.dueAmount = Math.max(0, student.totalFee - student.paidAmount);
    
    // Set matching status
    if (student.paidAmount >= student.totalFee) {
      student.status = 'Paid';
    } else if (student.paidAmount > 0) {
      student.status = 'Partial';
    } else {
      student.status = 'Unpaid';
    }

    student.paymentHistory.push(paymentRecord);
    await student.save();

    // 4. Return calculated state & receipt
    return res.status(200).json({
      success: true,
      message: 'Payment received successfully',
      receiptDetail: {
        receiptNo,
        studentName: student.name,
        amount: amountPaid,
        date: today,
        paymentMethod: paymentRecord.paymentMethod,
        class: student.class,
        admissionNo: student.admissionNo,
        dueAmountRemaining: student.dueAmount,
        totalFee: student.totalFee,
        paidAmountTotal: student.paidAmount
      }
    });

  } catch (error: any) {
    console.error('Fee collection error:', error);
    return res.status(500).json({ error: 'Internal system transaction failure' });
  }
});

export default router;
```

---

## 4. Installment Waterfall Computation (Advanced Billing Context)
How to determine installment breakdowns on demand on the server (equivalent to the frontend layout calculation):

```typescript
export function computeInstallmentDetails(cumulativePaid: number, structure: any) {
  const J = structure.juneAmount || 0;
  const S = structure.septemberAmount || 0;
  const D = structure.decemberAmount || 0;
  const M = structure.marchAmount || 0;

  let temp = cumulativePaid;

  const junePaid = Math.min(temp, J);
  temp = Math.max(0, temp - J);

  const septPaid = Math.min(temp, S);
  temp = Math.max(0, temp - S);

  const decPaid = Math.min(temp, D);
  temp = Math.max(0, temp - D);

  const marchPaid = Math.min(temp, M);

  return {
    june: {
      target: J,
      paid: junePaid,
      status: junePaid >= J ? 'Paid' : junePaid > 0 ? 'Partial' : 'Pending',
      remaining: J - junePaid,
    },
    september: {
      target: S,
      paid: septPaid,
      status: septPaid >= S ? 'Paid' : septPaid > 0 ? 'Partial' : 'Pending',
      remaining: S - septPaid,
    },
    december: {
      target: D,
      paid: decPaid,
      status: decPaid >= D ? 'Paid' : decPaid > 0 ? 'Partial' : 'Pending',
      remaining: D - decPaid,
    },
    march: {
      target: M,
      paid: marchPaid,
      status: marchPaid >= M ? 'Paid' : marchPaid > 0 ? 'Partial' : 'Pending',
      remaining: M - marchPaid,
    }
  };
}
```

---

## 💡 How to generate a clean PDF from this specification
1. Open this file `BACKEND_FEES_SPECIFICATION.md` in any Markdown Editor (e.g., VS Code or Typora).
2. Export directly: **File > Export As > PDF**.
3. Alternatively, drag and drop this markdown file into a browser converter or render with a markdown lint compiler (`npx markdown-pdf`) to immediately yield a beautifully structured technical reference file.
