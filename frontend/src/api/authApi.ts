import axiosInstance from '../services/axiosInstance';

export const authApi = {
  login: async (credentials: any) => {
    const response = await axiosInstance.post('/auth/login', credentials);
    const data = response.data;
    if (data && data.user) {
      data.user.id = data.user._id || data.user.id;
    }
    return data;
  },
  
  register: async (userData: any) => {
    const response = await axiosInstance.post('/auth/register', userData);
    const data = response.data;
    if (data && data.user) {
      data.user.id = data.user._id || data.user.id;
    }
    return data;
  },

  getCurrentUser: async () => {
    const response = await axiosInstance.get('/auth/me');
    const data = response.data;
    if (data && data.user) {
      data.user.id = data.user._id || data.user.id;
    }
    return data;
  },

  logout: async () => {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  }
};

