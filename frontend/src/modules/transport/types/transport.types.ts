export interface Transport {
  id: string;
  studentId: string;
  name: string;
  admissionNo: string;
  className: string;
  section?: string;
  academicYear?: string;

  routeName: string;
  pickupPoint: string;

  monthlyCharge: number;

  joiningDate: string;

  status: "Active" | "Inactive";
  paymentStatus?: "Paid" | "Partial" | "Pending";
  paidAmount?: number;
  dueAmount?: number;
  receiptNo?: string | null;
  paymentDate?: string | null;
}

export interface TransportPayment {
  id: string;

  receiptNo: string;

  studentId: string;

  studentName: string;

  admissionNo: string;

  className: string;
  section?: string;
  academicYear?: string;

  routeName: string;

  pickupPoint: string;

  monthlyCharge: number;

  month: string;

  year: string;

  amount: number;
  paidAmount: number;
  dueAmount: number;
  status: "Paid" | "Partial" | "Pending";

  paymentMethod:
    | "Cash"
    | "UPI"
    | "Card"
    | "Bank Transfer";

  remarks?: string;

  date: string;
}

export interface TransportDashboard {
  success: boolean;

  totalStudents: number;

  totalCollection: number;

  currentMonthCollection: number;
}

export interface PendingTransportStudent {
  student: string;

  admissionNo: string;

  route: string;

  monthlyCharge: number;
}
