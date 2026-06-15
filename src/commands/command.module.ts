// src/commands/command.module.ts
import { Module } from '@nestjs/common';
import { CreateAdminCommand } from './create-admin.command';
import { CreateAdminInteractiveCommand } from './create-admin-interactive.command';
import { CreateUserCommand } from './create-user.command';
import { ListUsersCommand } from './list-users.command';
import { DeleteUserCommand } from './delete-user.command';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [
    CreateAdminCommand,
    CreateAdminInteractiveCommand,
    CreateUserCommand,
    ListUsersCommand,
    DeleteUserCommand,
  ],
})
export class CommandModule {}