import axiosInstance from '../services/axiosInstance';

export interface FeeHistoryItem {
  id: string;
  receiptNo: string;
  studentId: string;
  name: string;
  admissionNo: string;
  className: string;
  amount: number;
  paymentMethod: string;
  date: string;
}

const mapPaymentResponse = (p: any): FeeHistoryItem => {
  const s = p.studentId || {};

  return {
    id: p._id || p.id,
    receiptNo: p.receiptNo,
    studentId: s._id || s.id || p.studentId,
    name: s.userId?.name || p.studentName || p.name,
    admissionNo: s.admissionNo || p.admissionNo,
    className: s.class
      ? `${s.class}-${s.section}`
      : p.className,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    date: p.paymentDate || p.date
  };
};

export const feeApi = {
  getFeeHistory: async (params?: {
    month?: number | string;
    year?: number | string;
    paymentMethod?: string;
    studentId?: string;
  }) => {
    let historyList: any[] = [];
    let totalCollection = 0;
    let totalPayments = 0;

    if (params?.studentId) {
      const response = await axiosInstance.get(
        `/fees/student/${params.studentId}/history`
      );

      const data = response.data;

      historyList = (data.history || []).map((item: any) => ({
        ...item,
        studentName: data.studentName,
        admissionNo: data.admissionNo
      }));
    } else {
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
const currentDate = new Date();

const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

const response = await axiosInstance.get(
  "/fees/monthly-report",
  {
    params: {
      month:
        typeof params?.month === "string"
          ? monthMap[params.month] || Number(params.month)
          : params?.month || currentMonth,

      year: params?.year || currentYear
    }
  }
);

      historyList = response.data.payments || [];
      totalCollection = response.data.totalCollection || 0;
      totalPayments = response.data.totalTransactions || 0;
    }

    if (
      params?.paymentMethod &&
      params.paymentMethod !== 'All'
    ) {
      historyList = historyList.filter(
        (item) => item.paymentMethod === params.paymentMethod
      );
    }

    const history = historyList.map(mapPaymentResponse);

    return {
      history,
      totalCollection:
        totalCollection ||
        history.reduce((sum, item) => sum + item.amount, 0),
      totalPayments:
        totalPayments || history.length
    };
  }
};