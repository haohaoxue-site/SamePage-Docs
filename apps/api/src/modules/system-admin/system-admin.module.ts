import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RbacModule } from '../rbac/rbac.module'
import { SystemAdminController } from './system-admin.controller'
import { SystemAdminService } from './system-admin.service'

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
})
export class SystemAdminModule {}
