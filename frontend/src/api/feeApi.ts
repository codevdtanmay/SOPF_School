import axiosInstance from '../services/axiosInstance';

const normalizeClassLabel = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^class\s+/i, '')
    .trim();

export interface FeeHistoryItem {
  id: string;
  receiptNo: string;
  studentId: string;
  name: string;
  admissionNo: string;
  className: string;
  month?: string;
  section?: string;
  academicYear?: string;
  amount: number;
  paidAmount?: number;
  dueAmount?: number;
  status?: string;
  paymentMethod: string;
  date: string;
}

const mapPaymentResponse = (p: any): FeeHistoryItem => {
  return {
    id: p._id || p.id,
    receiptNo: p.receiptNo,
    studentId: p.studentId?._id || p.studentId || p.id,
    name: p.studentName || p.studentId?.userId?.name || p.name,
    admissionNo: p.admissionNo || p.studentId?.admissionNo,
    className: p.className || p.studentId?.class || '',
    month: p.month || '',
    section: p.section || p.studentId?.section || '',
    academicYear: p.academicYear || p.studentId?.academicYear || '',
    amount: Number(p.amount ?? p.paidAmount ?? 0),
    paidAmount: Number(p.paidAmount ?? p.amount ?? 0),
    dueAmount: Number(p.dueAmount ?? 0),
    status: p.status,
    paymentMethod: p.paymentMethod,
    date: p.paymentDate || p.date
  };
};

export const feeApi = {
  getStudentFeeDetails: async (studentId: string, academicYear?: string) => {
    const queryParams = new URLSearchParams();
    if (academicYear && academicYear !== 'All') {
      queryParams.append('academicYear', academicYear);
    }

    const response = await axiosInstance.get(
      `/fees/student/${studentId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },

  getFeeLedger: async (params?: {
    class?: string;
    section?: string;
    academicYear?: string;
    status?: string;
    admissionType?: string;
    feeCategory?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.class && params.class !== 'All') queryParams.append('class', params.class);
    if (params?.section && params.section !== 'All') queryParams.append('section', params.section);
    if (params?.academicYear && params.academicYear !== 'All') queryParams.append('academicYear', params.academicYear);
    if (params?.status && params.status !== 'All') queryParams.append('status', params.status);
    if (params?.admissionType && params.admissionType !== 'All') queryParams.append('admissionType', params.admissionType);
    if (params?.feeCategory && params.feeCategory !== 'All') queryParams.append('feeCategory', params.feeCategory);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.search) queryParams.append('search', params.search);

    const response = await axiosInstance.get(`/fees?${queryParams.toString()}`);
    const data = response.data;
    return {
      students: Array.isArray(data?.students) ? data.students : [],
      pagination: data?.pagination || null
    };
  },

  getFeeHistory: async (params?: {
    month?: number | string;
    year?: number | string;
    academicYear?: string;
    paymentMethod?: string;
    studentId?: string;
    className?: string;
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
              academicYear: params?.academicYear,
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

    let history = historyList.map(mapPaymentResponse);

    if (params?.className && params.className !== 'All') {
      const selectedClass = normalizeClassLabel(params.className);

      history = history.filter((item) => {
        const itemClass = normalizeClassLabel(`${item.className || ''}${item.section ? `-${item.section}` : ''}`);
        return (
          itemClass === selectedClass ||
          itemClass.includes(selectedClass) ||
          selectedClass.includes(itemClass)
        );
      });
    }

    return {
      history,
      totalCollection:
        params?.className && params.className !== 'All'
          ? history.reduce((sum, item) => sum + item.amount, 0)
          : totalCollection ||
        history.reduce((sum, item) => sum + item.amount, 0),
      totalPayments:
        params?.className && params.className !== 'All'
          ? history.length
          : totalPayments || history.length
    };
  },

  sendReceiptToWhatsapp: async (receiptNo: string) => {
    const response = await axiosInstance.post(`/fees/${receiptNo}/whatsapp`);
    return response.data;
  }
};
