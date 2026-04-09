import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OwnerService } from './owner.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('OWNER')
@Controller('owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: { user: { userId: string } }) {
    return this.ownerService.getDashboard(req.user.userId);
  }

  @Get('documents')
  async getDocuments() {
    return this.ownerService.getDocuments();
  }
}
