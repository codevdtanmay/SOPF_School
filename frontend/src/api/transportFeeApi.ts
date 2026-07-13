import axiosInstance from '../services/axiosInstance';

const reverseMonthMap: Record<number, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December'
};

export interface TransportFeePayment {
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
  amount: number;       // Monthly Charge
  paidAmount: number;
  dueAmount: number;
  status: "Paid" | "Partial" | "Pending";
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  remarks?: string;
  date: string;
  currentPaidAmount?: number;
}

const mapTransportPaymentResponse = (p: any): TransportFeePayment => {
  const s = p.studentId || {};
  const t = p.transportId || {};
  const numericMonth = Number(p.month);
  const mappedMonth = reverseMonthMap[numericMonth] || String(p.month);

  return {
  id: p._id || p.id,
  receiptNo: p.receiptNo,

  studentId: s._id || s.id || p.studentId,
  studentName: p.studentName || s.userId?.name,
  admissionNo: p.admissionNo || s.admissionNo,

  className: p.className || s.class,
  section: p.section || s.section,
  academicYear: p.academicYear || s.academicYear,

  routeName: p.routeName || t.routeName,
  pickupPoint: p.pickupPoint || t.pickupPoint,
  monthlyCharge: Number(p.monthlyCharge ?? t.monthlyCharge ?? p.amount ?? 0),

  month: mappedMonth,
  year: String(p.year),

  amount: Number(p.amount),
  paidAmount: Number(p.paidAmount ?? p.amount),
  dueAmount: Number(p.dueAmount ?? 0),
  status: p.status ?? "Pending",
  currentPaidAmount: p.currentPaidAmount != null ? Number(p.currentPaidAmount) : undefined,

  paymentMethod: p.paymentMethod,
  remarks: p.remarks,
  date: p.paymentDate || p.date
};
};

export interface CollectTransportFeePayload {
  studentId: string;
  month: string;
  year: string;
  paidAmount: number;
  paymentMethod: TransportFeePayment["paymentMethod"];
  remarks?: string;
}

export const transportFeeApi = {
  getHistory: async (): Promise<TransportFeePayment[]> => {
    const response = await axiosInstance.get('/transport-fees/history');

    const list = response.data.payments || response.data || [];

    return list.map(mapTransportPaymentResponse);
  },

  collectFee: async (
    paymentData: CollectTransportFeePayload
  ): Promise<TransportFeePayment> => {

    const monthMap: Record<string, number> = {
      January: 1,
      February: 2,
      March: 3,
      April: 4,
      May: 5,
      June: 6,
      July: 7,
      August: 8,
      September: 9,
      October: 10,
      November: 11,
      December: 12
    };

   const payload = {
  studentId: paymentData.studentId,
  month: monthMap[paymentData.month] || Number(paymentData.month),
  year: Number(paymentData.year),
  paidAmount: Number(paymentData.paidAmount),
  paymentMethod: paymentData.paymentMethod,
  remarks: paymentData.remarks
};

    const response = await axiosInstance.post(
      '/transport-fees/collect',
      payload
    );

    return mapTransportPaymentResponse(response.data.payment);
  },

  getDashboardStats: async () => {
    const response = await axiosInstance.get(
      '/transport-fees/dashboard'
    );

    return response.data;
  },

  getMonthlyReport: async (
    month: string,
    year: string
  ): Promise<TransportFeePayment[]> => {

    const monthMap: Record<string, number> = {
      January: 1,
      February: 2,
      March: 3,
      April: 4,
      May: 5,
      June: 6,
      July: 7,
      August: 8,
      September: 9,
      October: 10,
      November: 11,
      December: 12
    };

    const response = await axiosInstance.get(
      `/transport-fees/monthly-report?month=${monthMap[month]}&year=${year}`
    );

    return (response.data.payments || []).map(
      mapTransportPaymentResponse
    );
  },

  getPendingReport: async () => {
    const response = await axiosInstance.get(
      '/transport-fees/pending'
    );

    return response.data.pending || [];
  },

  sendReceiptToWhatsapp: async (receiptNo: string) => {
    const response = await axiosInstance.post(`/transport-fees/${receiptNo}/whatsapp`);
    return response.data;
  }
};
