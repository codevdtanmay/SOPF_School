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
  admissionFee: number;
  tuitionFee: number;
  computerFee: number;
  examFee: number;
  culturalActivityFee: number;
  totalFee: number;
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
  status: "Active" | "Inactive";
}

