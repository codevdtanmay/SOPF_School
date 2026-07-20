export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  department?: string;
  className?: string;
}

export interface Student {
  id: string;
  userId?: string;
  name: string;
  email: string;
  admissionNo?: string;
  class?: string;
  section?: string;
  rollNo?: number;
  academicYear?: string;
  admissionType?: 'new' | 'old';
  feeCategory?: 'REGULAR' | 'RTE' | 'STAFF_CHILD' | 'SCHOLARSHIP' | 'OTHER';
  concessions?: {
    type: 'RTE' | 'SIBLING' | 'STAFF_WARD' | 'SCHOLARSHIP' | 'OTHER';
    discountType: 'percentage' | 'flat' | 'full_waiver';
    value?: number;
    appliesTo?: string[];
    academicYear?: string;
    remarks?: string;
    createdBy?: string;
    createdAt?: string;
    autoManaged?: boolean;
  }[];
  lifecycleStatus?: 'Active' | 'Left' | 'Alumni' | 'Transferred';
  fatherName?: string;
  motherName?: string;
  phone?: string;
  
  // Financial Ledger fields
  totalFee?: number;
  paidAmount?: number;
  dueAmount?: number;
  status?: 'Paid' | 'Partial' | 'Unpaid' | 'Pending';
  paymentHistory?: { receiptNo?: string; date: string; amount: number; paymentMethod?: string }[];
  
  // Existing fields for compatibility with charts and mock datasets
  rollNumber: string;
  classCategory: 'Foundation' | 'Primary' | 'Middle School' | 'Secondary';
  gender: string;
  parentName: string;
  contact: string;
  admissionDate: string;
  
  // New Demographics and Govt ID fields
  dateOfBirth?: string;
  joiningDate?: string;
  category?: 'General' | 'OBC' | 'SC' | 'ST';
  aadharNo?: string;
  samagraId?: string;
  apaarId?: string;
  panNo?: string;
  address?: {
    village: string;
    postOffice: string;
    tehsil: string;
    district: string;
    state: string;
    pincode: string;
  };
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
  };
  usesTransport?: boolean;
  currentEnrollment?: {
    id?: string;
    class?: string;
    section?: string;
    academicYear?: string;
    status?: string;
  } | null;
}

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface PromotionHistoryEntry {
  id: string;
  promotionDate: string;
  promotedBy: string;
  promotedById?: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  oldClass: string;
  newClass: string;
  oldSection?: string;
  newSection?: string;
  oldAcademicYear: string;
  newAcademicYear: string;
  reason?: string;
}

export interface FinancialReceiptEntry {
  receiptNo: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  className: string;
  section?: string;
  academicYear: string;
  admissionNo: string;
  studentName: string;
}

export interface FinancialInstallmentEntry {
  month: string;
  status: 'Paid' | 'Partial' | 'Pending';
  paidAmount: number;
  dueAmount: number;
  receipts: FinancialReceiptEntry[];
}

export interface FinancialHistoryEntry {
  academicYear: string;
  className: string;
  section?: string;
  admissionType?: 'new' | 'old';
  feeCategory?: 'REGULAR' | 'RTE' | 'STAFF_CHILD' | 'SCHOLARSHIP' | 'OTHER' | string;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  status: 'Paid' | 'Partial' | 'Pending';
  feeSnapshot?: {
    academicYear?: string;
    admissionType?: 'new' | 'old';
    feeCategory?: 'REGULAR' | 'RTE' | 'STAFF_CHILD' | 'SCHOLARSHIP' | 'OTHER' | string;
    totalBeforeDiscount?: number;
    totalDiscount?: number;
    finalAmount?: number;
    concessions?: FinancialReceiptEntry[] | { type?: string; discountType?: string; value?: number; amountDeducted?: number }[];
    concessionsApplied?: { type?: string; discountType?: string; value?: number; amountDeducted?: number }[];
    feeStructureSnapshot?: Record<string, unknown>;
    componentBreakdown?: Record<string, { original?: number; final?: number }>;
  };
  installments: FinancialInstallmentEntry[];
  payments: FinancialReceiptEntry[];
  receipts: FinancialReceiptEntry[];
}

export interface Teacher {
  id: string;
  userId?: string;
  name: string;
  email: string;
  password?: string;
  subject: string;
  department: string;
  contact: string;
  joiningDate: string;
  status: 'Active' | 'On Leave';
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'High' | 'Medium' | 'Low';
  publishedBy: string;
}

export interface Activity {
  id: string;
  activity: string;
  user: string;
  time: string;
  type: 'student' | 'teacher' | 'fee' | 'notice';
}

export interface FeeSummary {
  collected: number;
  pending: number;
  overdue: number;
  monthlyTarget: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  feesCollected: number;
  activeNotices: number;
  studentsGrowth: number;
  teachersGrowth: number;
  feesGrowth: number;
}

export interface FeeStructure {
  id: string;
  class: string;
  section?: string;
  admissionFee: number;
  tuitionFee: number;
  computerFee: number;
  examFee: number;
  culturalActivityFee: number;
  totalFee: number;
  monthlyFee?: number;
  academicYear: string;
  academicSession: string;
  juneAmount: number;
  septemberAmount: number;
  decemberAmount: number;
  marchAmount: number;
  juneStatus?: 'Paid' | 'Pending';
  septemberStatus?: 'Paid' | 'Pending';
  decemberStatus?: 'Paid' | 'Pending';
  marchStatus?: 'Paid' | 'Pending';
}

export interface Transport {
  id: string;

  studentId: string;

  name: string;

  email: string;

  admissionNo: string;

  className: string;

  routeName: string;

  pickupPoint: string;

  monthlyCharge: number;

  joiningDate: string;

  // Current month's payment info
  status: "Pending" | "Partial" | "Paid";

  paidAmount: number;

  dueAmount: number;

  receiptNo?: string;

  paymentDate?: string;
}
