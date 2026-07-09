import axiosInstance from "../../../services/axiosInstance";
import {
  Transport,
  TransportPayment,
  TransportDashboard,
  PendingTransportStudent
} from "../types/transport.types";

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

const reverseMonthMap: Record<number, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December"
};

const mapTransport = (t: any): Transport => ({
  id: t.id || t._id,

  studentId: t.studentId,

  name: t.name,

  admissionNo: t.admissionNo,

  className: t.className,

  routeName: t.routeName,

  pickupPoint: t.pickupPoint,

  monthlyCharge: Number(t.monthlyCharge),

  joiningDate: t.joiningDate,

  status: t.status
});

const mapPayment = (p: any): TransportPayment => ({
  id: p._id,

  receiptNo: p.receiptNo,

  studentId: p.studentId?._id,

  studentName: p.studentId?.userId?.name,

  admissionNo: p.studentId?.admissionNo,

  className: `${p.studentId?.class}-${p.studentId?.section}`,

  routeName: p.transportId?.routeName,

  pickupPoint: p.transportId?.pickupPoint,

  monthlyCharge: Number(
    p.transportId?.monthlyCharge
  ),

  month: reverseMonthMap[p.month],

  year: String(p.year),

  amount: Number(p.amount),

  paymentMethod: p.paymentMethod,

  remarks: p.remarks,

  date: p.paymentDate
});

export const transportApi = {

  //--------------------------
  // TRANSPORT STUDENTS
  //--------------------------

  async getStudents(): Promise<Transport[]> {

    const res =
      await axiosInstance.get("/transport");

    return (res.data.transports || [])
      .map(mapTransport);

  },

  async addStudent(data: any) {

    const res =
      await axiosInstance.post(
        "/transport",
        data
      );

    return mapTransport(res.data.transport);

  },

  async updateStudent(
    id: string,
    data: any
  ) {

    const res =
      await axiosInstance.put(
        `/transport/${id}`,
        data
      );

    return mapTransport(res.data.transport);

  },

  async deleteStudent(id: string) {

    await axiosInstance.delete(
      `/transport/${id}`
    );

  },

  //--------------------------
  // PAYMENTS
  //--------------------------

  async getHistory(): Promise<TransportPayment[]> {

    const res =
      await axiosInstance.get(
        "/transport-fees/history"
      );

    return (res.data.payments || [])
      .map(mapPayment);

  },

  async collectFee(data: any) {

    const res =
      await axiosInstance.post(
        "/transport-fees/collect",
        {
          ...data,
          month:
            monthMap[data.month],
          year:
            Number(data.year)
        }
      );

    return mapPayment(res.data.payment);

  },

  //--------------------------
  // DASHBOARD
  //--------------------------

  async getDashboard():
  Promise<TransportDashboard> {

    const res =
      await axiosInstance.get(
        "/transport-fees/dashboard"
      );

    return res.data;

  },

  //--------------------------
  // MONTHLY REPORT
  //--------------------------

  async getMonthlyReport(
    month: string,
    year: string
  ) {

    const res =
      await axiosInstance.get(
        "/transport-fees/monthly-report",
        {
          params: {
            month:
              monthMap[month],
            year
          }
        }
      );

    return (res.data.payments || [])
      .map(mapPayment);

  },

  async getRouteReport(
  month: string,
  year: string
) {
  const res = await axiosInstance.get(
    "/transport-fees/route-report",
    {
      params: {
        month: monthMap[month],
        year
      }
    }
  );

  return res.data.report || [];
},

  //--------------------------
  // PENDING
  //--------------------------

  async getPending():
  Promise<PendingTransportStudent[]> {

    const res =
      await axiosInstance.get(
        "/transport-fees/pending"
      );

    return res.data.pending || [];

  }

};