import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModerationTables1758000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create EULA versions table
    await queryRunner.query(`
      CREATE TABLE eula_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        version INTEGER UNIQUE NOT NULL,
        content TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create user EULA acceptances table
    await queryRunner.query(`
      CREATE TABLE user_eula_acceptances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        eula_version_id uuid NOT NULL REFERENCES eula_versions(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        accepted_at TIMESTAMP DEFAULT now(),
        UNIQUE(user_id, eula_version_id)
      );
    `);

    // Create content reports table
    await queryRunner.query(`
      CREATE TABLE content_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('MESSAGE', 'PROFILE', 'PROJECT', 'ACHIEVEMENT', 'JOB', 'USER')),
        content_id uuid,
        reason VARCHAR(30) NOT NULL CHECK (reason IN ('INAPPROPRIATE_CONTENT', 'HARASSMENT', 'SPAM', 'FAKE_PROFILE', 'INAPPROPRIATE_BEHAVIOR', 'OTHER')),
        description TEXT,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED')),
        reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP,
        action_taken TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    // Create blocked users table
    await queryRunner.query(`
      CREATE TABLE blocked_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        developer_notified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now(),
        UNIQUE(blocker_id, blocked_user_id),
        CHECK (blocker_id != blocked_user_id)
      );
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX idx_content_reports_status ON content_reports(status);
      CREATE INDEX idx_content_reports_type ON content_reports(type);
      CREATE INDEX idx_content_reports_reported_user ON content_reports(reported_user_id);
      CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
      CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_user_id);
      CREATE INDEX idx_eula_versions_active ON eula_versions(active);
    `);

    // Insert initial EULA version
    await queryRunner.query(`
      INSERT INTO eula_versions (version, content, active) VALUES (
        1,
        'END USER LICENSE AGREEMENT (EULA)

Last Updated: ${new Date().toISOString().split('T')[0]}

By using CMU TalentHub, you agree to the following terms and conditions:

1. ACCEPTANCE OF TERMS
By accessing or using CMU TalentHub, you acknowledge that you have read, understood, and agree to be bound by this End User License Agreement (EULA) and our Privacy Policy.

2. ZERO TOLERANCE POLICY
CMU TalentHub maintains a ZERO TOLERANCE policy for:
- Objectionable, offensive, or harmful content
- Harassment, bullying, or abusive behavior
- Spam, fraudulent activities, or fake profiles
- Any content or behavior that violates community standards

3. USER CONDUCT
You agree to:
- Provide accurate and truthful information
- Respect all community members
- Not post objectionable, offensive, or inappropriate content
- Not engage in harassment, bullying, or abusive behavior
- Not create fake or misleading profiles
- Not spam or engage in fraudulent activities

4. CONTENT MODERATION
CMU TalentHub actively monitors and filters content. Objectionable content may be automatically filtered or removed. Users are encouraged to report inappropriate content or behavior.

5. REPORTING AND BLOCKING
You can report objectionable content or block abusive users at any time. Reports are reviewed within 24 hours, and appropriate action will be taken, including content removal and user suspension when warranted.

6. CONSEQUENCES OF VIOLATIONS
Violations of this EULA may result in:
- Immediate content removal
- User account suspension or termination
- Notification to appropriate authorities if illegal activity is suspected

7. YOUR RIGHTS
You have the right to:
- Report objectionable content
- Block abusive users (blocked users will be immediately removed from your feed)
- Request content removal
- Appeal moderation decisions

8. CONTACT
For questions or to report issues, contact: support@cmutalenthub.com

By clicking "Accept" or using this app, you confirm that you understand and agree to these terms.',
        true
      );
    `);

    // Update users table to require terms acceptance
    await queryRunner.query(`
      ALTER TABLE users 
      ALTER COLUMN agreed_to_terms SET DEFAULT false;
      
      UPDATE users SET agreed_to_terms = false WHERE agreed_to_terms IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_eula_versions_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_blocked_users_blocked;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_blocked_users_blocker;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_content_reports_reported_user;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_content_reports_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_content_reports_status;`);
    
    await queryRunner.query(`DROP TABLE IF EXISTS blocked_users;`);
    await queryRunner.query(`DROP TABLE IF EXISTS content_reports;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_eula_acceptances;`);
    await queryRunner.query(`DROP TABLE IF EXISTS eula_versions;`);

    await queryRunner.query(`
      ALTER TABLE users 
      ALTER COLUMN agreed_to_terms SET DEFAULT true;
    `);
  }
}
