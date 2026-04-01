import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  async sendUnpaidDuesReminder(
    to: string,
    ownerName: string,
    unitNumber: string,
    amountDue: string,
    dueDate: string,
  ): Promise<void> {
    const subject = 'Unpaid Condo Dues Reminder';

    const html = `
      <h2>Condo Dues Reminder</h2>
      <p>Hello ${ownerName},</p>
      <p>This is a reminder that your condominium dues are currently unpaid.</p>
      <p><strong>Unit:</strong> ${unitNumber}</p>
      <p><strong>Amount Due:</strong> $${amountDue}</p>
      <p><strong>Due Date:</strong> ${dueDate}</p>
      <p>Please make your payment as soon as possible.</p>
      <p>Thank you,<br />Condo Management</p>
    `;

    await this.sendEmail(to, subject, html);
  }
}