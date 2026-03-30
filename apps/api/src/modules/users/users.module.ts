import { Module } from '@nestjs/common'
import { RbacModule } from '../rbac/rbac.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [RbacModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
