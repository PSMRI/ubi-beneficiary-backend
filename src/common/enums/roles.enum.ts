export enum UserRole {
  ADMIN = 'admin',
  BENEFICIARY = 'beneficiary'
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
    [UserRole.ADMIN]: 'admin',
    [UserRole.BENEFICIARY]: 'beneficiary'
  };
  
  return displayNames[role] || role;
}; 