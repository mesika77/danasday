import axios from 'axios';

const base = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: base });

export const getBoards = () => api.get('/boards');
export const getBoard  = (id) => api.get(`/boards/${id}`);

export const createColumn = (data) => api.post('/columns', data);
export const updateColumn = (id, data) => api.patch(`/columns/${id}`, data);
export const deleteColumn = (id) => api.delete(`/columns/${id}`);

export const createTask   = (data) => api.post('/tasks', data);
export const updateTask   = (id, data) => api.patch(`/tasks/${id}`, data);
export const deleteTask   = (id) => api.delete(`/tasks/${id}`);
export const reorderTasks = (tasks) => api.patch('/tasks/reorder', { tasks });

export const getCourses    = () => api.get('/courses');
export const createCourse  = (data) => api.post('/courses', data);
export const updateCourse  = (id, data) => api.patch(`/courses/${id}`, data);
export const deleteCourse  = (id) => api.delete(`/courses/${id}`);
