import axiosInstance from '../services/axiosInstance';

export interface TransferCertificate {
  id: string;
  tcNumber: string;

  studentId: string;
  studentName: string;
  admissionNo: string;

  classLeaving: string;
  section?: string;
  fatherName?: string;
  motherName?: string;
  joiningDate?: string;
  category?: string;

  issueDate: string;

  reason: string;
  conduct: string;
  lastAttendanceDate?: string;
  promotedTo: string;
  remarks?: string;
  issuedBy?: string;

  status: 'Issued' | 'Cancelled';
}

export interface GenerateTransferCertificatePayload {
  studentId: string;
  reason: string;
  conduct: string;
  lastAttendanceDate: string;
  promotedTo: string;
  remarks?: string;
  issuedBy: string;
}

export const tcApi = {
  getAllTCs: async (): Promise<TransferCertificate[]> => {
    const response = await axiosInstance.get('/tc');

    const data = response.data;

    return Array.isArray(data)
      ? data
      : data?.tcs || data?.data || [];
  },

  getTCById: async (id: string): Promise<TransferCertificate> => {
    const response = await axiosInstance.get(`/tc/${id}`);

    return response.data.tc || response.data;
  },

  generateTC: async (
    data: GenerateTransferCertificatePayload
  ): Promise<TransferCertificate> => {
    const response = await axiosInstance.post('/tc', data);

    return response.data.tc || response.data;
  },

  cancelTC: async (id: string): Promise<TransferCertificate> => {
    const response = await axiosInstance.patch(`/tc/${id}/cancel`);

    return response.data.tc || response.data;
  }
};
