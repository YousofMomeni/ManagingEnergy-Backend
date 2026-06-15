// src/commands/create-admin-interactive.command.ts
import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import prompts from 'prompts';

@Injectable()
@Command({
  name: 'create-admin-interactive',
  description: 'Create an admin user interactively with password masking',
})
export class CreateAdminInteractiveCommand extends CommandRunner {
  constructor(private readonly userService: UserService) {
    super();
  }

  async run(): Promise<void> {
    try {
      console.log('\n=== Create Admin User ===\n');

      const response = await prompts([
        {
          type: 'text',
          name: 'username',
          message: 'Username:',
          validate: async (value) => {
            if (!value || value.length < 3) {
              return 'Username must be at least 3 characters';
            }
            const existing = await this.userService.findByUsername(value);
            if (existing) {
              return `Username "${value}" already exists`;
            }
            return true;
          }
        },
        {
          type: 'text',
          name: 'name',
          message: 'Full Name:',
          validate: value => value && value.length > 0 ? true : 'Name is required'
        },
        {
          type: 'text',
          name: 'email',
          message: 'Email (optional):',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password:',
          validate: value => {
            if (!value || value.length < 6) {
              return 'Password must be at least 6 characters';
            }
            return true;
          }
        },
        {
          type: 'password',
          name: 'confirmPassword',
          message: 'Confirm Password:',
          validate: (value, values) => {
            if (value !== values.password) {
              return 'Passwords do not match';
            }
            return true;
          }
        }
      ]);

      if (!response.username || !response.password) {
        console.error('\n❌ User creation cancelled');
        process.exit(1);
      }

      // Create admin user
      const user = await this.userService.create({
        username: response.username,
        name: response.name,
        password: response.password,
        permission: 'admin',
        verificationCode: this.generateVerificationCode(),
      });

      console.log('\n✅ Admin user created successfully!');
      console.log(`Username: ${user.username}`);
      console.log(`Name: ${user.name}`);
      console.log(`Permission: ${user.permission}`);
      console.log('\nYou can now login with these credentials.\n');

    } catch (error) {
      if (error.message === 'canceled') {
        console.log('\n❌ User creation cancelled');
      } else {
        console.error('\n❌ Error creating admin user:', error.message);
      }
      process.exit(1);
    }
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }
}