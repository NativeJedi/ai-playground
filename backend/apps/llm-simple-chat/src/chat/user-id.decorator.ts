import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

// Stand-in for real auth: later the id will come from a verified token instead.
export const UserId = createParamDecorator(
  (_: unknown, context: ExecutionContext): string => {
    const userId = context
      .switchToHttp()
      .getRequest<Request>()
      .header('x-user-id');
    if (!userId) throw new UnauthorizedException('Missing X-User-Id header');
    return userId;
  },
);
