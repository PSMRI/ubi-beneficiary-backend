import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from './decorators/roles.decorator';
import { UserRole, isValidRole } from './enums/roles.enum';

interface AuthenticatedRequest extends Request {
  user: {
    keycloak_id: string;
    resource_access?: {
      account?: {
        roles?: string[];
      };
      hasura?: {
        roles?: string[];
      };
    };
    // other properties from decoded JWT
  };
 
}

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    
    // Check if user is authenticated (AuthGuard should have already run)
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Extract roles from the already decoded JWT token (stored by AuthGuard)
    // Check mw_roles first (set by AuthGuard), then fallback to decoded token
    const userRoles: string[] = request?.user?.resource_access?.['beneficiary-app']?.roles ?? [];

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some(role => 
      userRoles.includes(role) && isValidRole(role)
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. User roles: ${userRoles.join(', ')}`
      );
    }

    return true;
  }
} 