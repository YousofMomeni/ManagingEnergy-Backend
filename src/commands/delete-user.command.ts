// src/commands/delete-user.command.ts
import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
@Command({
  name: 'delete-user',
  description: 'Delete a user by username',
})
export class DeleteUserCommand extends CommandRunner {
  constructor(private readonly userService: UserService) {
    super();
  }

  async run(
    passedParams: string[],
    options?: { username?: string }
  ): Promise<void> {
    if (!options || !options.username) {
      console.error('❌ Username is required. Use --username or -u flag.');
      process.exit(1);
    }

    try {
      const user = await this.userService.findByUsername(options.username);
      if (!user) {
        console.error(`❌ User with username "${options.username}" not found!`);
        process.exit(1);
      }

      await this.userService.remove(user.id);
      console.log(`✅ User "${options.username}" deleted successfully!`);
    } catch (error) {
      console.error('❌ Error deleting user:', error.message);
      process.exit(1);
    }
  }

  @Option({
    flags: '-u, --username <username>',
    description: 'Username to delete',
    required: true,
  })
  parseUsername(val: string): string {
    return val;
  }
}