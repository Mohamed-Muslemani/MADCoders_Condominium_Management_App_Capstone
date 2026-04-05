import axios, { type InternalAxiosRequestConfig } from 'axios';

export const TOKEN_KEY = 'condo_jwt';

const baseURL =
  import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
});

export function createMultipartFormData(
  fieldName: string,
  file: File,
): FormData {
  const formData = new FormData();
  formData.append(fieldName, file);
  return formData;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
