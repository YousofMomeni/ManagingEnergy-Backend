// src/commands/create-admin.command.ts
import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as readline from 'readline';
import { promisify } from 'util';

interface ReadlineInterface extends readline.Interface {
  stdoutMuted?: boolean;
  _writeToOutput?: (stringToWrite: string) => void;
  output?: NodeJS.WritableStream;
}

@Injectable()
@Command({
  name: 'create-admin',
  description: 'Create an admin user',
})
export class CreateAdminCommand extends CommandRunner {
  constructor(private readonly userService: UserService) {
    super();
  }

  async run(
    passedParams: string[],
    options?: Record<string, any>
  ): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = promisify(rl.question).bind(rl);

    try {
      console.log('\n=== Create Admin User ===\n');

      // Get user input
      const username = await question('Username: ') as string;
      
      // Check if user already exists
      const existingUser = await this.userService.findByUsername(username);
      if (existingUser) {
        console.error(`\n❌ User with username "${username}" already exists!`);
        rl.close();
        process.exit(1);
      }

      const name = await question('Full Name: ') as string;
      
      // Get password without masking (simpler approach)
      const password = await question('Password: ') as string;
      const confirmPassword = await question('Confirm Password: ') as string;

      if (password !== confirmPassword) {
        console.error('\n❌ Passwords do not match!');
        rl.close();
        process.exit(1);
      }

      if (password.length < 6) {
        console.error('\n❌ Password must be at least 6 characters long!');
        rl.close();
        process.exit(1);
      }

      // Create admin user
      const user = await this.userService.create({
        username,
        name,
        password,
        permission: 'admin',
        verificationCode: this.generateVerificationCode(),
      });

      console.log('\n✅ Admin user created successfully!');
      console.log(`Username: ${user.username}`);
      console.log(`Name: ${user.name}`);
      console.log(`Permission: ${user.permission}`);
      console.log('\nYou can now login with these credentials.\n');

    } catch (error) {
      console.error('\n❌ Error creating admin user:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }
}