import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

// Sets allowed roles metadata so RolesGuard can enforce admin-only routes.
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
