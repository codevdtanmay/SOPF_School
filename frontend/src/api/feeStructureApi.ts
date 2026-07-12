import axiosInstance from '../services/axiosInstance';
import { FeeStructure } from '../types';

export const feeStructureApi = {
getFeeStructures: async (): Promise<FeeStructure[]> => {
  try {
    const response = await axiosInstance.get('/fee-structures');

    const data = response.data;

    const feeStructures = Array.isArray(data)
      ? data
      : data.feeStructures || data.data || [];

    return feeStructures.map((fs: any) => ({
      ...fs,
      section: fs.section || '',
      academicYear: fs.academicYear || fs.academicSession || '',
      monthlyFee: fs.monthlyFee || 0,
      id: fs._id
    }));
  } catch (e) {
    return [];
  }
},

  addFeeStructure: async (fsData: Omit<FeeStructure, 'id' | 'totalFee'>): Promise<FeeStructure> => {
    try {
      const response = await axiosInstance.post('/fee-structures', fsData);
      const data = response.data;
      if (data && data.feeStructure) {
  return {
  ...data.feeStructure,
  section: data.feeStructure.section || '',
  academicYear: data.feeStructure.academicYear || data.feeStructure.academicSession || '',
  monthlyFee: data.feeStructure.monthlyFee || 0,
  id: data.feeStructure._id
};
      }
      return data;
    } catch (e) {
      const total = (Number(fsData.admissionFee) || 0) + 
                    (Number(fsData.tuitionFee) || 0) + 
                    (Number(fsData.computerFee) || 0) + 
                    (Number(fsData.examFee) || 0) + 
                    (Number(fsData.culturalActivityFee) || 0);
      return {
        id: `fs-${Date.now()}`,
        ...fsData,
        totalFee: total
      } as FeeStructure;
    }
  },

updateFeeStructure: async (
  id: string,
  fsData: Partial<FeeStructure>
): Promise<FeeStructure> => {
  try {
    const response = await axiosInstance.patch(`/fee-structures/${id}`, fsData);

    const data = response.data;

    if (data && data.feeStructure) {
      return {
        ...data.feeStructure,
        section: data.feeStructure.section || '',
        academicYear: data.feeStructure.academicYear || data.feeStructure.academicSession || '',
        monthlyFee: data.feeStructure.monthlyFee || 0,
        id: data.feeStructure._id
      };
    }

    return {
      ...data,
      id: data._id
    };
  } catch (e) {
    return {
      id,
      ...fsData
    } as FeeStructure;
  }
},

  deleteFeeStructure: async (id: string): Promise<void> => {
    try {
      await axiosInstance.delete(`/fee-structures/${id}`);
    } catch (e) {
      console.warn('Backend fee structure deletion failed or missing endpoint:', e);
    }
  }
};
