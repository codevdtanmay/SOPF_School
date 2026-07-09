import axiosInstance from '../services/axiosInstance';

export interface TransferCertificate {
  id: string;
  tcNumber: string;

  studentId: string;
  studentName: string;
  admissionNo: string;

  classLeaving: string;

  issueDate: string;

  reason: string;
  conduct: string;
  promotedTo: string;

  status: 'Issued' | 'Cancelled';
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
    data: Omit<
      TransferCertificate,
      'id' | 'tcNumber' | 'issueDate' | 'status'
    >
  ): Promise<TransferCertificate> => {
    const response = await axiosInstance.post('/tc', data);

    return response.data.tc || response.data;
  },

  cancelTC: async (id: string): Promise<TransferCertificate> => {
    const response = await axiosInstance.patch(`/tc/${id}/cancel`);

    return response.data.tc || response.data;
  }
};