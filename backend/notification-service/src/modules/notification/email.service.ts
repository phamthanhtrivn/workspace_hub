import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { SendProjectInvitationEmailDto } from "./dtos/send-project-invitation-email.dto";

@Injectable()
export class EmailService {
  async sendProjectInvitationEmail(
    dto: SendProjectInvitationEmailDto,
  ): Promise<void> {
    const host = process.env.MAIL_HOST;
    const port = Number(process.env.MAIL_PORT || 587);
    const username = process.env.MAIL_USERNAME;
    const password = process.env.MAIL_PASSWORD;
    const from = process.env.MAIL_FROM || username;

    if (!host || !username || !password || !from) {
      throw new ServiceUnavailableException(
        "SMTP email configuration is incomplete",
      );
    }

    if (!Number.isInteger(port) || port <= 0) {
      throw new ServiceUnavailableException("MAIL_PORT is invalid");
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: username,
        pass: password,
      },
    });

    const recipientName = dto.recipientName || "there";
    const inviterName = dto.inviterName || "A Workspace Hub member";
    const expiresText = dto.expiresAt
      ? `This invitation expires on ${new Date(dto.expiresAt).toLocaleString()}.`
      : "This invitation may expire according to the project settings.";

    await transporter.sendMail({
      from,
      to: dto.recipientEmail,
      subject: `${inviterName} invited you to join ${dto.projectName}`,
      text: [
        `Hello ${recipientName},`,
        "",
        `${inviterName} invited you to join the project "${dto.projectName}" on Workspace Hub.`,
        "",
        `Accept the invitation: ${dto.acceptUrl}`,
        expiresText,
        "",
        "If you did not expect this invitation, you can ignore this email.",
        "",
        "Workspace Hub",
      ].join("\n"),
      html: this.buildInvitationHtml(dto, recipientName, inviterName, expiresText),
    });
  }

  private buildInvitationHtml(
    dto: SendProjectInvitationEmailDto,
    recipientName: string,
    inviterName: string,
    expiresText: string,
  ): string {
    const recipient = this.escapeHtml(recipientName);
    const inviter = this.escapeHtml(inviterName);
    const project = this.escapeHtml(dto.projectName);
    const acceptUrl = this.escapeHtml(dto.acceptUrl);
    const expiry = this.escapeHtml(expiresText);

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto;">
        <h2>Project invitation</h2>
        <p>Hello ${recipient},</p>
        <p><strong>${inviter}</strong> invited you to join the project <strong>${project}</strong> on Workspace Hub.</p>
        <p>
          <a href="${acceptUrl}" style="display: inline-block; padding: 10px 18px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Accept invitation
          </a>
        </p>
        <p>${expiry}</p>
        <p>If you did not expect this invitation, you can ignore this email.</p>
        <p>Workspace Hub</p>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
