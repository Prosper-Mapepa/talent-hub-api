import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  Query,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { AcceptEulaDto } from './dto/accept-eula.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('eula')
  @Public()
  @ApiOperation({
    summary: 'Get current EULA',
    description: 'Get the current active End User License Agreement',
  })
  @ApiOkResponse({
    description: 'EULA retrieved successfully',
    schema: {
      example: {
        id: 'uuid',
        version: 1,
        content: 'END USER LICENSE AGREEMENT...',
        active: true,
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  async getCurrentEula(@Res() res: Response) {
    const eula = await this.moderationService.getCurrentEulaVersion();
    res.locals.message = 'EULA retrieved successfully';
    return res.json({ data: eula });
  }

  @Post('eula/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept EULA',
    description: 'Accept the current End User License Agreement',
  })
  @ApiCreatedResponse({
    description: 'EULA accepted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async acceptEula(
    @CurrentUser() user: any,
    @Body() acceptEulaDto: AcceptEulaDto,
    @Res() res: Response,
  ) {
    if (!acceptEulaDto.accepted) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the terms to continue',
      });
    }

    await this.moderationService.acceptEula(
      user.userId,
      acceptEulaDto.version,
      res.req.ip,
    );
    res.locals.message = 'EULA accepted successfully';
    return res.json({ data: null, message: 'EULA accepted successfully' });
  }

  @Get('eula/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check EULA acceptance status',
    description: 'Check if the current user has accepted the current EULA',
  })
  @ApiOkResponse({
    description: 'EULA status retrieved successfully',
    schema: {
      example: {
        accepted: true,
      },
    },
  })
  async checkEulaAcceptance(@CurrentUser() user: any, @Res() res: Response) {
    const accepted = await this.moderationService.hasAcceptedCurrentEula(
      user.userId,
    );
    res.locals.message = 'EULA status retrieved successfully';
    return res.json({ data: { accepted } });
  }

  @Post('report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Report content or user',
    description: 'Report objectionable content or abusive user',
  })
  @ApiCreatedResponse({
    description: 'Report submitted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async createReport(
    @CurrentUser() user: any,
    @Body() createReportDto: CreateReportDto,
    @Res() res: Response,
  ) {
    const report = await this.moderationService.createReport(
      user.userId,
      createReportDto,
    );
    res.locals.message = 'Report submitted successfully';
    return res.json({ data: report, message: 'Report submitted successfully' });
  }

  @Post('block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Block a user',
    description: 'Block a user to prevent them from contacting you',
  })
  @ApiCreatedResponse({
    description: 'User blocked successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async blockUser(
    @CurrentUser() user: any,
    @Body() blockUserDto: BlockUserDto,
    @Res() res: Response,
  ) {
    const block = await this.moderationService.blockUser(
      user.userId,
      blockUserDto.userId,
    );
    res.locals.message = 'User blocked successfully';
    return res.json({ data: block, message: 'User blocked successfully' });
  }

  @Delete('block/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unblock a user',
    description: 'Unblock a previously blocked user',
  })
  @ApiNoContentResponse({
    description: 'User unblocked successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async unblockUser(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    await this.moderationService.unblockUser(user.userId, userId);
    res.locals.message = 'User unblocked successfully';
    return res.json({ data: null, message: 'User unblocked successfully' });
  }

  @Get('blocked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get blocked users',
    description: 'Get list of users blocked by the current user',
  })
  @ApiOkResponse({
    description: 'Blocked users retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getBlockedUsers(@CurrentUser() user: any, @Res() res: Response) {
    const blocked = await this.moderationService.getBlockedUsers(user.userId);
    res.locals.message = 'Blocked users retrieved successfully';
    return res.json({ data: blocked });
  }

  // Admin endpoints
  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all reports (Admin)',
    description: 'Get all content reports for admin review',
  })
  @ApiOkResponse({
    description: 'Reports retrieved successfully',
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
  })
  async getAllReports(
    @Res() res: Response,
    @Query('status') status: string | undefined,
  ) {
    const reports = status
      ? await this.moderationService.getPendingReports()
      : await this.moderationService.getAllReports();
    res.locals.message = 'Reports retrieved successfully';
    return res.json({ data: reports });
  }

  @Get('admin/reports/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending reports (Admin)',
    description: 'Get all pending reports that need review',
  })
  @ApiOkResponse({
    description: 'Pending reports retrieved successfully',
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
  })
  async getPendingReports(@Res() res: Response) {
    const reports = await this.moderationService.getPendingReports();
    res.locals.message = 'Pending reports retrieved successfully';
    return res.json({ data: reports });
  }

  @Get('admin/reports/user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get reports for a user (Admin)',
    description: 'Get all reports filed against a specific user',
  })
  @ApiOkResponse({
    description: 'User reports retrieved successfully',
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
  })
  async getReportsForUser(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const reports = await this.moderationService.getReportsForUser(userId);
    res.locals.message = 'User reports retrieved successfully';
    return res.json({ data: reports });
  }

  @Patch('admin/reports/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resolve a report (Admin)',
    description: 'Resolve a content report and take action',
  })
  @ApiOkResponse({
    description: 'Report resolved successfully',
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
  })
  async resolveReport(
    @CurrentUser() user: any,
    @Param('id') reportId: string,
    @Body() body: { actionTaken: string },
    @Res() res: Response,
  ) {
    const report = await this.moderationService.resolveReport(
      reportId,
      user.userId,
      body.actionTaken,
    );
    res.locals.message = 'Report resolved successfully';
    return res.json({ data: report, message: 'Report resolved successfully' });
  }

  @Patch('admin/reports/:id/dismiss')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dismiss a report (Admin)',
    description: 'Dismiss a content report as invalid',
  })
  @ApiOkResponse({
    description: 'Report dismissed successfully',
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
  })
  async dismissReport(
    @CurrentUser() user: any,
    @Param('id') reportId: string,
    @Body() body: { reason: string },
    @Res() res: Response,
  ) {
    const report = await this.moderationService.dismissReport(
      reportId,
      user.userId,
      body.reason,
    );
    res.locals.message = 'Report dismissed successfully';
    return res.json({
      data: report,
      message: 'Report dismissed successfully',
    });
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get moderation statistics (Admin)',
    description: 'Get moderation dashboard statistics',
  })
  @ApiOkResponse({
    description: 'Statistics retrieved successfully',
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
  })
  async getModerationStats(@Res() res: Response) {
    const stats = await this.moderationService.getModerationStats();
    res.locals.message = 'Statistics retrieved successfully';
    return res.json({ data: stats });
  }
}
