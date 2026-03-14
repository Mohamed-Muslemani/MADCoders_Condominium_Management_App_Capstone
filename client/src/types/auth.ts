export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'OWNER';
  active: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
