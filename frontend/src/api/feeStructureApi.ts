import axiosInstance from '../services/axiosInstance';
import { FeeStructure } from '../types';

export const feeStructureApi = {
  getFeeStructures: async (): Promise<FeeStructure[]> => {
    try {
      const response = await axiosInstance.get('/fee-structures');
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.feeStructures)) {
        return data.feeStructures;
      }
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch (e) {
      return [];
    }
  },

  addFeeStructure: async (fsData: Omit<FeeStructure, 'id' | 'totalFee'>): Promise<FeeStructure> => {
    try {
      const response = await axiosInstance.post('/fee-structures', fsData);
      const data = response.data;
      if (data && data.feeStructure) {
        return data.feeStructure;
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

  updateFeeStructure: async (id: string, fsData: Partial<FeeStructure>): Promise<FeeStructure> => {
    try {
      const response = await axiosInstance.patch(`/fee-structures/${id}`, fsData);
      const data = response.data;
      if (data && data.feeStructure) {
        return data.feeStructure;
      }
      return data;
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
