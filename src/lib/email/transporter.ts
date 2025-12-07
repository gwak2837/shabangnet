import nodemailer from 'nodemailer'
import 'server-only'

import { SMTP_DEFAULT_PORT } from './common'

export interface Options {
  email: string
  host: string
  password: string
}

export async function createTransporter({ email, password, host }: Options) {
  return nodemailer.createTransport({
    host,
    port: SMTP_DEFAULT_PORT,
    secure: false,
    requireTLS: true,
    auth: {
      user: email,
      pass: password,
    },
    tls: { rejectUnauthorized: true },
  })
}
