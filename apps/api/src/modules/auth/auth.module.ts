import { Module } from '@nestjs/common'
import { RbacModule } from '../rbac/rbac.module'
import { SystemEmailModule } from '../system-email/system-email.module'
import { AuthMailerService } from './auth-mailer.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { OAuthProviderService } from './providers/oauth-provider.service'
import { SystemAuthService } from './system-auth.service'

@Module({
  imports: [RbacModule, SystemEmailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthMailerService, OAuthProviderService, SystemAuthService],
  exports: [AuthMailerService, AuthService, SystemAuthService],
})
export class AuthModule {}
