import { AuthGuard } from '@nestjs/passport';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext) {
    try {
      const isActivated = await super.canActivate(context);
      return isActivated as boolean;
    } catch (e: any) {
      throw new UnauthorizedException({
        message: 'Unauthorized',
      });
    }
  }
}
