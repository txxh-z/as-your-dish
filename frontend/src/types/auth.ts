export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser | null;
}
