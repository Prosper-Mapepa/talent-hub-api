import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ContentFilterService } from './services/content-filter.service';
import { ContentReport } from './entities/content-report.entity';
import { BlockedUser } from './entities/blocked-user.entity';
import { EulaVersion } from './entities/eula-version.entity';
import { UserEulaAcceptance } from './entities/user-eula-acceptance.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentReport,
      BlockedUser,
      EulaVersion,
      UserEulaAcceptance,
      User,
    ]),
    UsersModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ModerationController],
  providers: [
    ModerationService,
    ContentFilterService,
  ],
  exports: [ModerationService, ContentFilterService],
})
export class ModerationModule {}
