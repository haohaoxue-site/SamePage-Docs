import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { RbacModule } from '../rbac/rbac.module'
import { StorageModule } from '../storage/storage.module'
import { SystemEmailModule } from '../system-email/system-email.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [RbacModule, AuthModule, StorageModule, SystemEmailModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
