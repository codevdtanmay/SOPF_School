import axiosInstance from '../services/axiosInstance';
import { Teacher } from '../types';

const mapTeacherResponse = (t: any): Teacher => {
  if (!t) return t;

  // Extract name and email from userId populated field or direct attributes
  const isPopulated = t.userId && typeof t.userId === 'object';
  const resolvedName = isPopulated ? t.userId.name : (t.name || '');
  const resolvedEmail = isPopulated ? t.userId.email : (t.email || '');
  const userIdVal = isPopulated ? t.userId._id : (t.userId || '');

  return {
    id: t._id || t.id,
    userId: userIdVal,
    name: resolvedName,
    email: resolvedEmail,
    subject: t.qualification || t.subject || '',
    department: t.department || '',
    contact: t.phone || t.contact || '',
    joiningDate: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : (t.joiningDate || ''),
    status: t.status || 'Active'
  };
};

export const teacherApi = {
  getTeachers: async (): Promise<Teacher[]> => {
    try {
      const response = await axiosInstance.get('/teachers');
      const data = response.data;
      const rawList = Array.isArray(data) ? data : (data && Array.isArray(data.teachers) ? data.teachers : (data && Array.isArray(data.data) ? data.data : []));
      return rawList.map(mapTeacherResponse);
    } catch (e) {
      console.warn('Backend teacher search failed or offline. Falling back to empty dataset.', e);
      return [];
    }
  },

  addTeacher: async (teacherData: Omit<Teacher, 'id' | 'joiningDate' | 'status'>): Promise<Teacher> => {
    // Map frontend properties back to backend's required teacher Schema structure
    const payload = {
      name: teacherData.name,
      email: teacherData.email,
      password: (teacherData as any).password || 'password123',
      employeeId: (teacherData as any).employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000).toString()}`,
      department: teacherData.department || 'Science',
      qualification: teacherData.subject || '',
      phone: teacherData.contact || ''
    };
    
    const response = await axiosInstance.post('/teachers', payload);
    const data = response.data;
    const rawTeacher = data && data.teacher ? data.teacher : data;
    return mapTeacherResponse(rawTeacher);
  },

  updateTeacher: async (id: string, teacherData: Partial<Teacher>): Promise<Teacher> => {
    // Map compatible fields for updating via standard teacher patch endpoint
    const payload = {
      name: teacherData.name,
      email: teacherData.email,
      department: teacherData.department,
      qualification: teacherData.subject,
      phone: teacherData.contact
    };
    
    // Backend expects PATCH method: router.patch("/:id", ...)
    const response = await axiosInstance.patch(`/teachers/${id}`, payload);
    const data = response.data;
    const rawTeacher = data && data.teacher ? data.teacher : data;
    return mapTeacherResponse(rawTeacher);
  },

  deleteTeacher: async (id: string): Promise<void> => {
    // Backend expects DELETE method: router.delete("/:id", ...)
    await axiosInstance.delete(`/teachers/${id}`);
  }
};
