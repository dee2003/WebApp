export interface AuthUser {
  id: string;
  role: 'foreman' | 'supervisor' | 'project_engineer' | 'admin';
  username?: string;  // optional since backend doesn't send
}
