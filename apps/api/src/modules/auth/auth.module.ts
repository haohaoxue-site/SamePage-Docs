import { Module } from '@nestjs/common'
import { RbacModule } from '../rbac/rbac.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { OAuthProviderService } from './providers/oauth-provider.service'

@Module({
  imports: [RbacModule],
  controllers: [AuthController],
  providers: [AuthService, OAuthProviderService],
})
export class AuthModule {}
