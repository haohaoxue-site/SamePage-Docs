import { Module } from '@nestjs/common'
import { RbacModule } from '../rbac/rbac.module'
import { SystemAdminController } from './system-admin.controller'
import { SystemAdminService } from './system-admin.service'

@Module({
  imports: [RbacModule],
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
})
export class SystemAdminModule {}
