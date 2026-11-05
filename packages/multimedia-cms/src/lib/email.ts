import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter } from 'payload'

export const email: EmailAdapter = process.env.SMTP_HOST
  ? await nodemailerAdapter({
      defaultFromAddress: process.env.SMTP_FROM || 'editor@example.invalid',
      defaultFromName: process.env.SMTP_FROM_NAME || 'Multimedia CMS',
      skipVerify: true,
      transportOptions: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_PORT === '465',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      },
    })
  : () => ({
      name: 'disabled',
      defaultFromAddress: 'editor@example.invalid',
      defaultFromName: 'Multimedia CMS',
      sendEmail: async () => {
        throw new Error('Configure SMTP before sending CMS emails.')
      },
    })
