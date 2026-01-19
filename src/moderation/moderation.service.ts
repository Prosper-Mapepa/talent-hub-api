import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentReport, ReportStatus, ReportType, ReportReason } from './entities/content-report.entity';
import { BlockedUser } from './entities/blocked-user.entity';
import { EulaVersion } from './entities/eula-version.entity';
import { UserEulaAcceptance } from './entities/user-eula-acceptance.entity';
import { User } from '../users/entities/user.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UsersService } from '../users/users.service';
import { UserStatus } from '../users/enums/user-status.enum';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(ContentReport)
    private readonly contentReportRepository: Repository<ContentReport>,
    @InjectRepository(BlockedUser)
    private readonly blockedUserRepository: Repository<BlockedUser>,
    @InjectRepository(EulaVersion)
    private readonly eulaVersionRepository: Repository<EulaVersion>,
    @InjectRepository(UserEulaAcceptance)
    private readonly userEulaAcceptanceRepository: Repository<UserEulaAcceptance>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    @Optional() @Inject(forwardRef(() => 'EmailService')) private readonly emailService?: any,
  ) {}

  /**
   * Get current active EULA version
   */
  async getCurrentEulaVersion(): Promise<EulaVersion> {
    const eula = await this.eulaVersionRepository.findOne({
      where: { active: true },
      order: { version: 'DESC' },
    });

    if (!eula) {
      throw new NotFoundException('No active EULA version found');
    }

    return eula;
  }

  /**
   * Accept EULA for a user
   */
  async acceptEula(
    userId: string,
    version: number,
    ipAddress?: string,
  ): Promise<UserEulaAcceptance> {
    const eulaVersion = await this.eulaVersionRepository.findOne({
      where: { version, active: true },
    });

    if (!eulaVersion) {
      throw new NotFoundException(
        `EULA version ${version} not found or is not active`,
      );
    }

    // Check if user already accepted this version
    const existing = await this.userEulaAcceptanceRepository.findOne({
      where: { userId, eulaVersionId: eulaVersion.id },
    });

    if (existing) {
      return existing;
    }

    // Create acceptance record
    const acceptance = this.userEulaAcceptanceRepository.create({
      userId,
      eulaVersionId: eulaVersion.id,
      ipAddress,
    });

    const savedAcceptance = await this.userEulaAcceptanceRepository.save(
      acceptance,
    );

    // Update user's agreed_to_terms flag
    await this.userRepository.update(userId, { agreedToTerms: true });

    return savedAcceptance;
  }

  /**
   * Check if user has accepted current EULA
   */
  async hasAcceptedCurrentEula(userId: string): Promise<boolean> {
    const currentEula = await this.getCurrentEulaVersion();
    const acceptance = await this.userEulaAcceptanceRepository.findOne({
      where: { userId, eulaVersionId: currentEula.id },
    });

    return !!acceptance;
  }

  /**
   * Create a content report
   */
  async createReport(
    reporterId: string,
    createReportDto: CreateReportDto,
  ): Promise<ContentReport> {
    // Validate that reported user exists if provided
    if (createReportDto.reportedUserId) {
      const reportedUser = await this.userRepository.findOne({
        where: { id: createReportDto.reportedUserId },
      });

      if (!reportedUser) {
        throw new NotFoundException('Reported user not found');
      }

      // Prevent self-reporting
      if (reportedUser.id === reporterId) {
        throw new BadRequestException('You cannot report yourself');
      }
    }

    const report = this.contentReportRepository.create({
      reporterId,
      reportedUserId: createReportDto.reportedUserId || null,
      type: createReportDto.type,
      contentId: createReportDto.contentId || null,
      reason: createReportDto.reason,
      description: createReportDto.description || null,
      status: ReportStatus.PENDING,
    });

    const savedReport = await this.contentReportRepository.save(report);

    // Notify admin via email
    await this.notifyAdminOfReport(savedReport);

    return savedReport;
  }

  /**
   * Block a user
   */
  async blockUser(
    blockerId: string,
    blockedUserId: string,
  ): Promise<BlockedUser> {
    // Prevent self-blocking
    if (blockerId === blockedUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    // Check if user exists
    const blockedUser = await this.userRepository.findOne({
      where: { id: blockedUserId },
    });

    if (!blockedUser) {
      throw new NotFoundException('User to block not found');
    }

    // Check if already blocked
    const existing = await this.blockedUserRepository.findOne({
      where: { blockerId, blockedUserId },
    });

    if (existing) {
      return existing;
    }

    const blocked = this.blockedUserRepository.create({
      blockerId,
      blockedUserId,
      developerNotified: false,
    });

    const savedBlock = await this.blockedUserRepository.save(blocked);

    // Notify developer
    await this.notifyDeveloperOfBlock(savedBlock);

    return savedBlock;
  }

  /**
   * Unblock a user
   */
  async unblockUser(
    blockerId: string,
    blockedUserId: string,
  ): Promise<void> {
    const block = await this.blockedUserRepository.findOne({
      where: { blockerId, blockedUserId },
    });

    if (!block) {
      throw new NotFoundException('User is not blocked');
    }

    await this.blockedUserRepository.remove(block);
  }

  /**
   * Get all blocked users for a user
   */
  async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
    return this.blockedUserRepository.find({
      where: { blockerId: userId },
      relations: ['blockedUser'],
    });
  }

  /**
   * Check if a user is blocked by another user
   */
  async isBlocked(
    blockerId: string,
    potentiallyBlockedUserId: string,
  ): Promise<boolean> {
    const block = await this.blockedUserRepository.findOne({
      where: {
        blockerId,
        blockedUserId: potentiallyBlockedUserId,
      },
    });

    return !!block;
  }

  /**
   * Get pending reports (admin only)
   */
  async getPendingReports(): Promise<ContentReport[]> {
    return this.contentReportRepository.find({
      where: { status: ReportStatus.PENDING },
      relations: ['reporter', 'reportedUser'],
      order: { createdAt: 'ASC' }, // Oldest first
    });
  }

  /**
   * Get all reports (admin only)
   */
  async getAllReports(): Promise<ContentReport[]> {
    return this.contentReportRepository.find({
      relations: ['reporter', 'reportedUser', 'reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Resolve a report (admin only)
   */
  async resolveReport(
    reportId: string,
    reviewerId: string,
    actionTaken: string,
  ): Promise<ContentReport> {
    const report = await this.contentReportRepository.findOne({
      where: { id: reportId },
      relations: ['reportedUser'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    report.status = ReportStatus.RESOLVED;
    report.reviewedBy = reviewerId;
    report.reviewedAt = new Date();
    report.actionTaken = actionTaken;

    // If action involves suspending/b ejecting user
    if (
      report.reportedUserId &&
      (actionTaken.toLowerCase().includes('suspend') ||
        actionTaken.toLowerCase().includes('eject') ||
        actionTaken.toLowerCase().includes('ban'))
    ) {
      await this.userRepository.update(report.reportedUserId, {
        status: UserStatus.SUSPENDED,
      });
    }

    return this.contentReportRepository.save(report);
  }

  /**
   * Dismiss a report (admin only)
   */
  async dismissReport(
    reportId: string,
    reviewerId: string,
    reason: string,
  ): Promise<ContentReport> {
    const report = await this.contentReportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    report.status = ReportStatus.DISMISSED;
    report.reviewedBy = reviewerId;
    report.reviewedAt = new Date();
    report.actionTaken = reason;

    return this.contentReportRepository.save(report);
  }

  /**
   * Notify admin of new report
   */
  private async notifyAdminOfReport(report: ContentReport): Promise<void> {
    try {
      if (!this.emailService) {
        console.log('Email service not available, skipping email notification');
        return;
      }

      // Get admin users
      const admins = await this.userRepository.find({
        where: { role: 'admin' as any },
      });

      const reporter = await this.userRepository.findOne({
        where: { id: report.reporterId },
      });

      const reportedUser = report.reportedUserId
        ? await this.userRepository.findOne({
            where: { id: report.reportedUserId },
          })
        : null;

      const subject = `New Content Report - ${report.type} - ${report.reason}`;
      const text = `
A new content report has been submitted:

Report ID: ${report.id}
Type: ${report.type}
Reason: ${report.reason}
Reporter: ${reporter?.email || 'Unknown'}
Reported User: ${reportedUser?.email || 'N/A'}
Description: ${report.description || 'No description provided'}

Created: ${report.createdAt}

Please review this report within 24 hours as per Apple App Store guidelines.

Review at: ${process.env.APP_URL || 'https://app.cmutalenthub.com'}/admin/reports/${report.id}
      `;

      // Send to all admins
      for (const admin of admins) {
        await this.emailService.sendEmail(
          admin.email,
          subject,
          text,
        );
      }
    } catch (error) {
      console.error('Error notifying admin of report:', error);
      // Don't throw - logging is sufficient
    }
  }

  /**
   * Notify developer of user block
   */
  private async notifyDeveloperOfBlock(block: BlockedUser): Promise<void> {
    try {
      if (block.developerNotified) {
        return;
      }

      if (!this.emailService) {
        console.log('Email service not available, skipping email notification');
        // Mark as notified anyway
        block.developerNotified = true;
        await this.blockedUserRepository.save(block);
        return;
      }

      // Get admin users
      const admins = await this.userRepository.find({
        where: { role: 'admin' as any },
      });

      const blocker = await this.userRepository.findOne({
        where: { id: block.blockerId },
      });

      const blockedUser = await this.userRepository.findOne({
        where: { id: block.blockedUserId },
      });

      const subject = `User Blocked - ${blockedUser?.email || 'Unknown'}`;
      const text = `
A user has been blocked:

Block ID: ${block.id}
Blocker: ${blocker?.email || 'Unknown'}
Blocked User: ${blockedUser?.email || 'Unknown'}
Blocked At: ${block.createdAt}

This may indicate inappropriate behavior. Please review the blocked user's account.

Review at: ${process.env.APP_URL || 'https://app.cmutalenthub.com'}/admin/users/${block.blockedUserId}
      `;

      // Send to all admins
      for (const admin of admins) {
        await this.emailService.sendEmail(
          admin.email,
          subject,
          text,
        );
      }

      // Mark as notified
      block.developerNotified = true;
      await this.blockedUserRepository.save(block);
    } catch (error) {
      console.error('Error notifying developer of block:', error);
      // Don't throw - logging is sufficient
    }
  }

  /**
   * Get reports for a specific user (admin only)
   */
  async getReportsForUser(userId: string): Promise<ContentReport[]> {
    return this.contentReportRepository.find({
      where: { reportedUserId: userId },
      relations: ['reporter', 'reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get statistics for moderation dashboard (admin only)
   */
  async getModerationStats(): Promise<{
    pendingReports: number;
    resolvedReports: number;
    dismissedReports: number;
    totalBlocks: number;
    usersBlocked: number;
  }> {
    const [pendingReports, resolvedReports, dismissedReports] =
      await Promise.all([
        this.contentReportRepository.count({
          where: { status: ReportStatus.PENDING },
        }),
        this.contentReportRepository.count({
          where: { status: ReportStatus.RESOLVED },
        }),
        this.contentReportRepository.count({
          where: { status: ReportStatus.DISMISSED },
        }),
      ]);

    const totalBlocks = await this.blockedUserRepository.count();
    const uniqueBlockedUsers = await this.blockedUserRepository
      .createQueryBuilder('blocked_user')
      .select('COUNT(DISTINCT blocked_user.blocked_user_id)', 'count')
      .getRawOne();

    return {
      pendingReports,
      resolvedReports,
      dismissedReports,
      totalBlocks,
      usersBlocked: parseInt(uniqueBlockedUsers?.count || '0', 10),
    };
  }
}
