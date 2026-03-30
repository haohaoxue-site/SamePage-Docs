import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../decorators/public.decorator'
import { ApiRequestResponse } from '../../utils/swagger'

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  @ApiOperation({ summary: '健康检查' })
  @ApiRequestResponse(null)
  @Get()
  check(): null {
    return null
  }
}
