// src/commands/list-users.command.ts
import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
@Command({
  name: 'list-users',
  description: 'List all users',
})
export class ListUsersCommand extends CommandRunner {
  constructor(private readonly userService: UserService) {
    super();
  }

  async run(): Promise<void> {
    const users = await this.userService.findAll();
    
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log('\n=== Users List ===\n');
    console.table(
      users.map(user => ({
        ID: user.id,
        Username: user.username,
        Name: user.name,
        Permission: user.permission,
      }))
    );
    console.log(`\nTotal users: ${users.length}\n`);
  }
}