import { Controller, Post } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  async sendTestEmail() {
    await this.emailService.sendUnpaidDuesReminder(
      process.env.SMTP_USER || '',
      'Chris Jamo',
      'Unit 101',
      '450.00',
      '2026-04-15',
    );

    return { message: 'Test email sent successfully' };
  }
}