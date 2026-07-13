import axiosInstance from '../services/axiosInstance';
import { AcademicYear, FinancialHistoryEntry, PromotionHistoryEntry, Student } from '../types';

const mapStudentResponse = (s: any): Student => {
  if (!s) return s;
  
  // Extract name and email from userId populated field or direct attributes
  const isPopulated = s.userId && typeof s.userId === 'object';
  const resolvedName = isPopulated ? s.userId.name : (s.name || '');
  const resolvedEmail = isPopulated ? s.userId.email : (s.email || '');
  const userIdVal = isPopulated ? s.userId._id : (s.userId || '');

  return {
    id: s._id || s.id,
    userId: userIdVal,
    name: resolvedName,
    email: resolvedEmail,
    admissionNo: s.admissionNo || '',
    class: s.class || '',
    section: s.section || '',
    rollNo: s.rollNo != null ? Number(s.rollNo) : undefined,
    academicYear: s.academicYear || s.currentEnrollment?.academicYear?.label || s.currentEnrollment?.academicYear || '',
    lifecycleStatus: s.lifecycleStatus || 'Active',
    fatherName: s.fatherName || '',
    motherName: s.motherName || '',
    phone: s.phone || '',
    
    // Financial Ledger fields
    totalFee: s.totalFee != null ? Number(s.totalFee) : 0,
    paidAmount: s.paidAmount != null ? Number(s.paidAmount) : 0,
    dueAmount: s.dueAmount != null ? Number(s.dueAmount) : 0,
    status: s.status || 'Unpaid',
    paymentHistory: Array.isArray(s.paymentHistory) ? s.paymentHistory.map((val: any) => ({
      receiptNo: val.receiptNo || '',
      date: val.date || '',
      amount: val.amount != null ? Number(val.amount) : 0,
      paymentMethod: val.paymentMethod || 'Cash'
    })) : [],
    
    // Compatibility fields with existing charts & filters
    rollNumber: s.admissionNo || s.rollNumber || '',
    classCategory: s.class || '',
    gender: s.gender || 'Male',
    parentName: s.fatherName || s.parentName || '',
    contact: s.phone || s.contact || '',
    admissionDate: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : (s.admissionDate || ''),
    usesTransport: s.usesTransport ?? false,
    currentEnrollment: s.currentEnrollment
      ? {
          id: s.currentEnrollment._id || s.currentEnrollment.id,
          class: s.currentEnrollment.class || '',
          section: s.currentEnrollment.section || '',
          academicYear: s.currentEnrollment.academicYear?.label || s.currentEnrollment.academicYear || '',
          status: s.currentEnrollment.status || ''
        }
      : null,
    // New Demographics and Govt ID fields
    dateOfBirth: s.dateOfBirth || '',
    joiningDate: s.joiningDate || '',
    category: s.category || 'General',
    aadharNo: s.aadharNo || '',
    samagraId: s.samagraId || '',
    apaarId: s.apaarId || '',
    panNo: s.panNo || '',
    address: s.address ? {
      village: s.address.village || '',
      postOffice: s.address.postOffice || '',
      tehsil: s.address.tehsil || '',
      district: s.address.district || '',
      state: s.address.state || '',
      pincode: s.address.pincode || ''
    } : {
      village: '',
      postOffice: '',
      tehsil: '',
      district: '',
      state: '',
      pincode: ''
    },
    bankDetails: s.bankDetails ? {
      accountHolderName: s.bankDetails.accountHolderName || '',
      bankName: s.bankDetails.bankName || '',
      accountNumber: s.bankDetails.accountNumber || '',
      ifscCode: s.bankDetails.ifscCode || '',
      branchName: s.bankDetails.branchName || ''
    } : {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: ''
    }
  };
};

export const studentApi = {
  getStudents: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    village?: string;
    class?: string;
    section?: string;
    academicYear?: string;
    lifecycleStatus?: string;
    sortBy?: string;
    order?: string;
    search?: string;
  }): Promise<{ students: Student[]; pagination: { page: number; totalPages: number; totalStudents: number } }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        if (params.page !== undefined) queryParams.append('page', params.page.toString());
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.category && params.category !== 'All') queryParams.append('category', params.category);
        if (params.village) queryParams.append('village', params.village);
        if (params.class && params.class !== 'All') queryParams.append('class', params.class);
        if (params.section && params.section !== 'All') queryParams.append('section', params.section);
        if (params.academicYear && params.academicYear !== 'All') queryParams.append('academicYear', params.academicYear);
        if (params.lifecycleStatus && params.lifecycleStatus !== 'All') queryParams.append('lifecycleStatus', params.lifecycleStatus);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.order) queryParams.append('order', params.order);
        if (params.search) queryParams.append('search', params.search);
      }
      
      const response = await axiosInstance.get(`/student?${queryParams.toString()}`);
      const data = response.data;
      
      if (data && data.students && Array.isArray(data.students)) {
        return {
          students: data.students.map(mapStudentResponse),
          pagination: data.pagination || {
            page: params?.page || 1,
            totalPages: 1,
            totalStudents: data.students.length
          }
        };
      }
      
      const rawList = Array.isArray(data) ? data : (data && Array.isArray(data.students) ? data.students : (data && Array.isArray(data.data) ? data.data : []));
      return {
        students: rawList.map(mapStudentResponse),
        pagination: data?.pagination || {
          page: 1,
          totalPages: 1,
          totalStudents: rawList.length
        }
      };
    } catch (e) {
      console.warn('Backend student search failed or offline. Falling back to empty dataset.', e);
      return {
        students: [],
        pagination: { page: 1, totalPages: 1, totalStudents: 0 }
      };
    }
  },

  getPromotionAcademicYears: async (): Promise<AcademicYear[]> => {
    try {
      const response = await axiosInstance.get('/student/promotion/academic-years');
      const data = response.data;
      const academicYears = Array.isArray(data?.academicYearDetails)
        ? data.academicYearDetails
        : Array.isArray(data?.academicYears)
          ? data.academicYears
          : [];

      return academicYears.map((year: any) => ({
        id: year._id || year.id,
        label: year.label || '',
        startDate: year.startDate || '',
        endDate: year.endDate || '',
        isCurrent: Boolean(year.isCurrent)
      }));
    } catch (e) {
      return [];
    }
  },

  getAcademicYears: async (): Promise<AcademicYear[]> => {
    try {
      const response = await axiosInstance.get('/academic-years');
      const data = response.data;
      return Array.isArray(data?.academicYears)
        ? data.academicYears.map((year: any) => ({
            id: year._id || year.id,
            label: year.label || '',
            startDate: year.startDate || '',
            endDate: year.endDate || '',
            isCurrent: Boolean(year.isCurrent)
          }))
        : [];
    } catch (e) {
      return [];
    }
  },

  setCurrentAcademicYear: async (id: string): Promise<AcademicYear | null> => {
    const response = await axiosInstance.patch(`/academic-years/${id}/current`);
    const data = response.data;
    const year = data?.academicYear;

    return year
      ? {
          id: year._id || year.id,
          label: year.label || '',
          startDate: year.startDate || '',
          endDate: year.endDate || '',
          isCurrent: Boolean(year.isCurrent)
        }
      : null;
  },

  addNextAcademicYear: async (): Promise<{ message: string; academicYear: AcademicYear | null }> => {
    const response = await axiosInstance.post('/academic-years/next-session');
    const data = response.data;
    return {
      message: data?.message || '',
      academicYear: data?.academicYear
        ? {
            id: data.academicYear._id || data.academicYear.id,
            label: data.academicYear.label || '',
            startDate: data.academicYear.startDate || '',
            endDate: data.academicYear.endDate || '',
            isCurrent: Boolean(data.academicYear.isCurrent)
          }
        : null
    };
  },

  getPromotionHistory: async (): Promise<PromotionHistoryEntry[]> => {
    try {
      const response = await axiosInstance.get('/student/promotion/history');
      const data = response.data;
      const history = Array.isArray(data?.history) ? data.history : [];

      return history.map((entry: any) => ({
        id: entry.id || entry._id,
        promotionDate: entry.promotionDate || '',
        promotedBy: entry.promotedBy || '',
        promotedById: entry.promotedById || '',
        studentId: entry.studentId || '',
        studentName: entry.studentName || '',
        admissionNo: entry.admissionNo || '',
        oldClass: entry.oldClass || '',
        newClass: entry.newClass || '',
        oldSection: entry.oldSection || '',
        newSection: entry.newSection || '',
        oldAcademicYear: entry.oldAcademicYear || '',
        newAcademicYear: entry.newAcademicYear || '',
        reason: entry.reason || ''
      }));
    } catch (e) {
      return [];
    }
  },

  promoteStudents: async (payload: {
    currentAcademicYear: string;
    destinationAcademicYear: string;
    currentClass: string;
    currentSection?: string;
    destinationClass: string;
    destinationSection?: string;
    selectedStudentIds: string[];
    promoteAllStudents: boolean;
    reason?: string;
  }): Promise<{
    message: string;
    summary: {
      promoted: number;
      skipped: number;
      alreadyExisted: number;
      totalSelected: number;
      promoteAllStudents: boolean;
    };
    promotedStudents: any[];
    skippedStudents: any[];
    alreadyExistedStudents: any[];
  }> => {
    const response = await axiosInstance.post('/student/promotion', payload);
    return response.data;
  },

  getStudentFinancialHistory: async (studentId: string): Promise<FinancialHistoryEntry[]> => {
    const response = await axiosInstance.get(`/student/${studentId}/financial-history`);
    const data = response.data;
    return Array.isArray(data?.history) ? data.history : [];
  },

  addStudent: async (studentData: Omit<Student, 'id' | 'rollNumber' | 'admissionDate'>): Promise<Student> => {
    const response = await axiosInstance.post('/student/add', studentData);
    const data = response.data;
    
    // Support { success: true, student: {...} } envelope or direct object
    const rawStudent = data && data.student ? data.student : data;
    return mapStudentResponse(rawStudent);
  },

  getStudentDistribution: async (): Promise<Record<string, number>> => {
    try {
      const response = await axiosInstance.get('/dashboard/student-distribution');
      return response.data;
    } catch (e) {
      try {
        const res = await studentApi.getStudents({ limit: 1000 });
        const list = res.students;
        const counts: Record<string, number> = {};

list.forEach(s => {
  const cls = s.class || "Unknown";

  counts[cls] = (counts[cls] || 0) + 1;
});

return counts;
      } catch (err) {
        return {
          Foundation: 0,
          Primary: 0,
          'Middle School': 0,
          Secondary: 0
        };
      }
    }
  },

  getFeesOverview: async () => {
    try {
      const response = await axiosInstance.get('/dashboard/fee-summary');
      const data = response.data;
      if (data && data.success) {
        return {
          collected: data.collected || 0,
          pending: data.pending || 0,
          overdue: 0,
          monthlyTarget: data.total || 0,
        };
      }
      return data;
    } catch (e) {
      // Degrade gracefully with no mock numbers
      return {
        collected: 0,
        pending: 0,
        overdue: 0,
        monthlyTarget: 0,
      };
    }
  },

  collectFee: async (paymentData: {
    studentId: string;
    amountPaid: number;
    paymentMethod: string;
    academicYear?: string;
    className?: string;
    section?: string;
  }) => {
    const response = await axiosInstance.post('/fees/collect', paymentData);
    return response.data;
  },

  updateStudent: async (id: string, studentData: Partial<Student>): Promise<Student> => {
    // Backend expects PATCH method for student update: router.patch("/:id", ...)
    const response = await axiosInstance.patch(`/student/${id}`, studentData);
    const data = response.data;
    const rawStudent = data && data.student ? data.student : data;
    return mapStudentResponse(rawStudent);
  },

  deleteStudent: async (id: string): Promise<void> => {
    // Backend expects DELETE method: router.delete("/:id", ...)
    await axiosInstance.delete(`/student/${id}`);
  }
};
