// src/commands/create-user.command.ts
import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

interface CreateUserOptions {
  username: string;
  name: string;
  password: string;
  permission?: string;
}

@Injectable()
@Command({
  name: 'create-user',
  description: 'Create a regular user',
})
export class CreateUserCommand extends CommandRunner {
  constructor(private readonly userService: UserService) {
    super();
  }

  async run(
    passedParams: string[],
    options?: CreateUserOptions
  ): Promise<void> {
    if (!options || !options.username || !options.name || !options.password) {
      console.error('❌ Required options missing. Use --help for usage information.');
      process.exit(1);
    }

    try {
      // Check if user already exists
      const existingUser = await this.userService.findByUsername(options.username);
      if (existingUser) {
        console.error(`❌ User with username "${options.username}" already exists!`);
        process.exit(1);
      }

      const user = await this.userService.create({
        username: options.username,
        name: options.name,
        password: options.password,
        permission: options.permission || 'user',
        verificationCode: this.generateVerificationCode(),
      });

      console.log('✅ User created successfully!');
      console.log(`Username: ${user.username}`);
      console.log(`Name: ${user.name}`);
      console.log(`Permission: ${user.permission}`);
    } catch (error) {
      console.error('❌ Error creating user:', error.message);
      process.exit(1);
    }
  }

  @Option({
    flags: '-u, --username <username>',
    description: 'Username',
    required: true,
  })
  parseUsername(val: string): string {
    return val;
  }

  @Option({
    flags: '-n, --name <name>',
    description: 'Full name',
    required: true,
  })
  parseName(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'Password',
    required: true,
  })
  parsePassword(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --permission <permission>',
    description: 'Permission level (admin/user)',
    defaultValue: 'user',
  })
  parsePermission(val: string): string {
    if (!['admin', 'user'].includes(val)) {
      console.error('❌ Permission must be either "admin" or "user"');
      process.exit(1);
    }
    return val;
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }
}