export interface Transport {
  id: string;
  studentId: string;
  name: string;
  admissionNo: string;
  className: string;

  routeName: string;
  pickupPoint: string;

  monthlyCharge: number;

  joiningDate: string;

  status: "Active" | "Inactive";
}

export interface TransportPayment {
  id: string;

  receiptNo: string;

  studentId: string;

  studentName: string;

  admissionNo: string;

  className: string;

  routeName: string;

  pickupPoint: string;

  monthlyCharge: number;

  month: string;

  year: string;

  amount: number;

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