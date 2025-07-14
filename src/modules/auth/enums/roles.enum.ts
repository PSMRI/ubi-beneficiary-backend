export enum UserRole {
  ADMIN = 'Benefit Admin',
  USER = 'user',
  MODERATOR = 'moderator',
  SUPER_ADMIN = 'super-admin',
  AUTHOR = 'author',
  VIEWER = 'viewer',
  EDITOR = 'editor',
  MANAGER = 'manager',
  SUPPORT = 'support',
  ANALYST = 'analyst',
}

// Helper function to get all roles
export const getAllRoles = (): string[] => {
  return Object.values(UserRole);
};

// Helper function to check if a role is valid
export const isValidRole = (role: string): boolean => {
  return Object.values(UserRole).includes(role as UserRole);
};

// Helper function to get role display name
export const getRoleDisplayName = (role: UserRole): string => {
  const displayNames: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.USER]: 'User',
    [UserRole.MODERATOR]: 'Moderator',
    [UserRole.SUPER_ADMIN]: 'Super Administrator',
    [UserRole.AUTHOR]: 'Author',
    [UserRole.VIEWER]: 'Viewer',
    [UserRole.EDITOR]: 'Editor',
    [UserRole.MANAGER]: 'Manager',
    [UserRole.SUPPORT]: 'Support',
    [UserRole.ANALYST]: 'Analyst',
  };
  
  return displayNames[role] || role;
}; 