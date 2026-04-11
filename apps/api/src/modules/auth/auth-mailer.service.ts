import { Injectable, Logger } from '@nestjs/common'

interface RegistrationVerificationMailPayload {
  email: string
  verificationUrl: string
}

@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name)

  async sendRegistrationVerificationEmail(payload: RegistrationVerificationMailPayload): Promise<void> {
    this.logger.log(`Registration verification link for ${payload.email}: ${payload.verificationUrl}`)
  }
}
