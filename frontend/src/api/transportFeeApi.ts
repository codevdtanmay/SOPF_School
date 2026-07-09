import axiosInstance from '../services/axiosInstance';

export interface TransportFeePayment {
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
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  remarks?: string;
  date: string;
}

const mapTransportPaymentResponse = (p: any): TransportFeePayment => {
  const s = p.studentId || {};
  const t = p.transportId || {};

  return {
    id: p._id || p.id,
    receiptNo: p.receiptNo,
    studentId: s._id || s.id || p.studentId,
    studentName: s.userId?.name || p.studentName,
    admissionNo: s.admissionNo || p.admissionNo,
    className: s.class
      ? `${s.class}-${s.section}`
      : p.className,
    routeName: t.routeName || p.routeName,
    pickupPoint: t.pickupPoint || p.pickupPoint,
    monthlyCharge: Number(t.monthlyCharge || p.monthlyCharge),
    month: String(p.month),
    year: String(p.year),
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    remarks: p.remarks,
    date: p.paymentDate || p.date
  };
};

export const transportFeeApi = {
  getHistory: async (): Promise<TransportFeePayment[]> => {
    const response = await axiosInstance.get('/transport-fees/history');

    const list = response.data.payments || response.data || [];

    return list.map(mapTransportPaymentResponse);
  },

  collectFee: async (
    paymentData: Omit<TransportFeePayment, 'id' | 'receiptNo' | 'date'>
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
      month:
        monthMap[paymentData.month] ||
        Number(paymentData.month),
      year: Number(paymentData.year),
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
  }
};