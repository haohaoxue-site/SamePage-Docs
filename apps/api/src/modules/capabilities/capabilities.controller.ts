import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../decorators/public.decorator'
import { ApiRequestResponse } from '../../utils/swagger'
import { AuthCapabilitiesDto } from './capabilities.dto'
import { CapabilitiesService } from './capabilities.service'

@ApiTags('capabilities')
@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly capabilitiesService: CapabilitiesService) {}

  @ApiOperation({ summary: '获取认证能力' })
  @ApiRequestResponse(AuthCapabilitiesDto)
  @Public()
  @Get('auth')
  async getAuthCapabilities(): Promise<AuthCapabilitiesDto> {
    return this.capabilitiesService.getAuthCapabilities()
  }
}
