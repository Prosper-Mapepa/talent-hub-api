import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ArrayOverlap, Not } from 'typeorm';
import { Student } from './entities/student.entity';
import { Project } from './entities/project.entity';
import { Achievement } from './entities/achievement.entity';
import { StudentTalent } from './entities/talent.entity';
import { Skill } from './entities/skill.entity';
import {
  Collaboration,
  CollaborationStatus,
} from './entities/collaboration.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { CreateTalentDto } from './dto/create-talent.dto';
import { UpdateTalentDto } from './dto/update-talent.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { LikeTalentDto } from './dto/like-talent.dto';
import { SaveTalentDto } from './dto/save-talent.dto';
import { CollaborationRequestDto } from './dto/collaboration-request.dto';
import { User } from '../users/entities/user.entity';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Achievement)
    private achievementsRepository: Repository<Achievement>,
    @InjectRepository(StudentTalent)
    private talentsRepository: Repository<StudentTalent>,
    @InjectRepository(Skill)
    private skillsRepository: Repository<Skill>,
    @InjectRepository(Collaboration)
    private collaborationsRepository: Repository<Collaboration>,
    private cloudinaryService: CloudinaryService,
    private moderationService: ModerationService,
  ) {}

  async create(createStudentDto: any): Promise<Student> {
    const student = this.studentsRepository.create(createStudentDto);
    const result = await this.studentsRepository.save(student);
    // TypeORM returns an array when saving a single entity
    if (Array.isArray(result)) {
      return result[0];
    }
    return result;
  }

  async findAll(): Promise<Student[]> {
    return this.studentsRepository.find({
      relations: ['user', 'talents', 'skills', 'projects', 'achievements'],
    });
  }

  async findOne(id: string, viewerUserId?: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: ['user', 'talents', 'skills', 'projects', 'achievements'],
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if viewer has been blocked by this student
    // If the student blocked the viewer, the viewer cannot see the profile
    if (viewerUserId && student.user?.id) {
      const isViewerBlocked = await this.moderationService.isBlocked(
        student.user.id,
        viewerUserId,
      );
      if (isViewerBlocked) {
        throw new ForbiddenException(
          'You cannot view this profile. This user has blocked you.',
        );
      }
    }

    return student;
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    const student = await this.findOne(id);
    Object.assign(student, updateStudentDto);
    return this.studentsRepository.save(student);
  }

  async remove(id: string): Promise<void> {
    await this.studentsRepository.delete(id);
  }

  async findByUserId(userId: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'talents', 'skills', 'projects', 'achievements'],
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  // Projects methods
  async addProject(
    studentId: string,
    createProjectDto: CreateProjectDto,
    files?: any,
  ): Promise<Project> {
    const student = await this.findOne(studentId);
    let images: string[] = [];

    if (files && files.files && files.files.length > 0) {
      try {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files.files,
          'projects',
        );
        images = uploadResults.map((result) => result.secure_url);
      } catch (error) {
        console.error('Error uploading project files to Cloudinary:', error);
        throw new Error('Failed to upload project files');
      }
    }

    const project = this.projectsRepository.create({
      ...createProjectDto,
      images,
      student,
    });
    return this.projectsRepository.save(project);
  }

  async updateProject(
    studentId: string,
    projectId: string,
    updateProjectDto: CreateProjectDto,
    files?: any,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, student: { id: studentId } },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const oldImages: string[] = project.images || [];
    let images: string[] = oldImages;

    if (files && files.files && files.files.length > 0) {
      try {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files.files,
          'projects',
        );
        images = uploadResults.map((result) => result.secure_url);

        // Delete old Cloudinary files that are being replaced
        const filesToDelete = oldImages.filter(
          (oldUrl) => !images.includes(oldUrl) && oldUrl.startsWith('http'),
        );
        await this.deleteCloudinaryFiles(filesToDelete);
      } catch (error) {
        console.error('Error uploading project files to Cloudinary:', error);
        throw new Error('Failed to upload project files');
      }
    }

    Object.assign(project, { ...updateProjectDto, images });
    return this.projectsRepository.save(project);
  }

  async removeProject(studentId: string, projectId: string): Promise<void> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId, student: { id: studentId } },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Delete all Cloudinary files associated with this project
    const filesToDelete =
      project.images?.filter((url) => url.startsWith('http')) || [];
    await this.deleteCloudinaryFiles(filesToDelete);

    await this.projectsRepository.remove(project);
  }

  // Achievements methods
  async addAchievement(
    studentId: string,
    createAchievementDto: CreateAchievementDto,
    files?: any,
  ): Promise<Achievement> {
    const student = await this.findOne(studentId);
    let fileArr: string[] = [];

    if (files && files.files && files.files.length > 0) {
      try {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files.files,
          'achievements',
        );
        fileArr = uploadResults.map((result) => result.secure_url);
      } catch (error) {
        console.error(
          'Error uploading achievement files to Cloudinary:',
          error,
        );
        throw new Error('Failed to upload achievement files');
      }
    }

    const achievement = this.achievementsRepository.create({
      ...createAchievementDto,
      files: fileArr,
      student,
    });
    return this.achievementsRepository.save(achievement);
  }

  async updateAchievement(
    studentId: string,
    achievementId: string,
    updateAchievementDto: CreateAchievementDto,
    files?: any,
  ): Promise<Achievement> {
    const achievement = await this.achievementsRepository.findOne({
      where: { id: achievementId, student: { id: studentId } },
    });
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    const oldFiles: string[] = achievement.files || [];
    let fileArr: string[] = oldFiles;

    if (files && files.files && files.files.length > 0) {
      try {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files.files,
          'achievements',
        );
        fileArr = uploadResults.map((result) => result.secure_url);

        // Delete old Cloudinary files that are being replaced
        const filesToDelete = oldFiles.filter(
          (oldUrl) => !fileArr.includes(oldUrl) && oldUrl.startsWith('http'),
        );
        await this.deleteCloudinaryFiles(filesToDelete);
      } catch (error) {
        console.error(
          'Error uploading achievement files to Cloudinary:',
          error,
        );
        throw new Error('Failed to upload achievement files');
      }
    }

    Object.assign(achievement, { ...updateAchievementDto, files: fileArr });
    return this.achievementsRepository.save(achievement);
  }

  async removeAchievement(
    studentId: string,
    achievementId: string,
  ): Promise<void> {
    const achievement = await this.achievementsRepository.findOne({
      where: { id: achievementId, student: { id: studentId } },
    });
    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    // Delete all Cloudinary files associated with this achievement
    const filesToDelete =
      achievement.files?.filter((url) => url.startsWith('http')) || [];
    await this.deleteCloudinaryFiles(filesToDelete);

    await this.achievementsRepository.remove(achievement);
  }

  // Talents methods
  async addTalent(
    studentId: string,
    createTalentDto: CreateTalentDto,
    files?: any,
  ): Promise<StudentTalent> {
    const student = await this.findOne(studentId);
    let filePaths: string[] = [];

    if (files && files.files && files.files.length > 0) {
      try {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files.files,
          'talents',
        );
        filePaths = uploadResults.map((result) => result.secure_url);
      } catch (error) {
        console.error('Error uploading talent files to Cloudinary:', error);
        throw new Error('Failed to upload talent files');
      }
    }

    const talent = this.talentsRepository.create({
      ...createTalentDto,
      files: filePaths,
      student,
    });
    return this.talentsRepository.save(talent);
  }

  async updateTalent(
    studentId: string,
    talentId: string,
    updateTalentDto: UpdateTalentDto,
    files?: any,
  ): Promise<StudentTalent> {
    const talent = await this.talentsRepository.findOne({
      where: { id: talentId, student: { id: studentId } },
    });
    if (!talent) {
      throw new NotFoundException('Talent not found');
    }

    const oldFiles: string[] = talent.files || [];
    // Get existing files to keep from DTO (if provided)
    const existingFilesToKeep: string[] = (updateTalentDto as any).existingFiles || oldFiles;
    
    let filePaths: string[] = existingFilesToKeep;

    // If new files are uploaded, add them to the existing files
    if (files && files.files && files.files.length > 0) {
      try {
        const uploadResults = await this.cloudinaryService.uploadMultipleFiles(
          files.files,
          'talents',
        );
        const newFileUrls = uploadResults.map((result) => result.secure_url);
        filePaths = [...existingFilesToKeep, ...newFileUrls];
      } catch (error) {
        console.error('Error uploading talent files to Cloudinary:', error);
        throw new Error('Failed to upload talent files');
      }
    }

    // Delete old Cloudinary files that are no longer in the keep list
    const filesToDelete = oldFiles.filter(
      (oldUrl) => !filePaths.includes(oldUrl) && oldUrl.startsWith('http'),
    );
    await this.deleteCloudinaryFiles(filesToDelete);

    Object.assign(talent, { ...updateTalentDto, files: filePaths });
    return this.talentsRepository.save(talent);
  }

  async removeTalent(studentId: string, talentId: string): Promise<void> {
    const talent = await this.talentsRepository.findOne({
      where: { id: talentId, student: { id: studentId } },
    });
    if (!talent) {
      throw new NotFoundException('Talent not found');
    }

    // Delete all Cloudinary files associated with this talent
    const filesToDelete =
      talent.files?.filter((url) => url.startsWith('http')) || [];
    await this.deleteCloudinaryFiles(filesToDelete);

    await this.talentsRepository.remove(talent);
  }

  /**
   * Helper method to delete multiple Cloudinary files
   * Silently handles errors to prevent upload failures from blocking operations
   */
  private async deleteCloudinaryFiles(urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) return;

    const deletePromises = urls.map(async (url) => {
      try {
        await this.cloudinaryService.deleteFileByUrl(url);
      } catch (error) {
        // Log but don't throw - deletion failures shouldn't block updates
        console.warn(`Failed to delete Cloudinary file ${url}:`, error);
      }
    });

    await Promise.all(deletePromises);
  }

  async getStudentTalents(studentId: string): Promise<StudentTalent[]> {
    return this.talentsRepository.find({
      where: { student: { id: studentId } },
      order: { createdAt: 'DESC' },
    });
  }

  async uploadProfileImage(
    studentId: string,
    file: Express.Multer.File,
  ): Promise<Student> {
    const student = await this.findOne(studentId);

    // Delete old profile image if it exists (Cloudinary)
    if (student.profileImage && student.profileImage.startsWith('http')) {
      try {
        await this.cloudinaryService.deleteFileByUrl(student.profileImage);
      } catch (error) {
        console.error('Error deleting old profile image:', error);
      }
    }

    // Upload to Cloudinary
    try {
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        'profiles',
      );
      student.profileImage = uploadResult.secure_url;
    } catch (error) {
      console.error('Error uploading profile image to Cloudinary:', error);
      throw new Error('Failed to upload profile image');
    }

    return this.studentsRepository.save(student);
  }

  async deleteProfileImage(studentId: string): Promise<Student> {
    const student = await this.findOne(studentId);

    // Delete from Cloudinary if it's a Cloudinary URL
    if (student.profileImage && student.profileImage.startsWith('http')) {
      try {
        await this.cloudinaryService.deleteFileByUrl(student.profileImage);
      } catch (error) {
        console.error('Error deleting profile image from Cloudinary:', error);
      }
    }

    student.profileImage = '';
    return this.studentsRepository.save(student);
  }

  async updateProfileViews(studentId: string): Promise<Student> {
    const student = await this.findOne(studentId);

    // Increment profile views count
    student.profileViews = (student.profileViews || 0) + 1;
    return this.studentsRepository.save(student);
  }

  async getAllTalents(viewerUserId?: string): Promise<StudentTalent[]> {
    const talents = await this.talentsRepository.find({
      relations: ['student', 'student.user'],
      order: { createdAt: 'DESC' },
    });
    console.log(
      `[StudentsService.getAllTalents] Found ${talents?.length || 0} talents in database`,
    );

    // If viewer is authenticated, filter out talents from users they've blocked
    if (viewerUserId && talents.length > 0) {
      const filteredTalents = [];
      for (const talent of talents) {
        if (talent.student?.user?.id) {
          // Check if viewer has blocked this user
          const isBlocked = await this.moderationService.isBlocked(
            viewerUserId,
            talent.student.user.id,
          );
          // Only include if viewer hasn't blocked this user
          if (!isBlocked) {
            filteredTalents.push(talent);
          }
        } else {
          // Include talents without user info (shouldn't happen, but safe fallback)
          filteredTalents.push(talent);
        }
      }
      console.log(
        `[StudentsService.getAllTalents] Filtered to ${filteredTalents.length} talents after blocking check`,
      );
      return filteredTalents;
    }

    return talents || [];
  }

  // New social features methods
  // Social features methods
  async likeTalent(
    studentId: string,
    likeTalentDto: LikeTalentDto,
    user: User,
  ): Promise<Student> {
    // Any authenticated user can like any talent
    // Just verify that the user is authenticated (which is handled by JWT guard)

    const student = await this.findOne(studentId);
    const { talentId, isLiked } = likeTalentDto;

    if (!student.likedTalents) {
      student.likedTalents = [];
    }

    if (isLiked) {
      if (!student.likedTalents.includes(talentId)) {
        student.likedTalents.push(talentId);
      }
    } else {
      student.likedTalents = student.likedTalents.filter(
        (id) => id !== talentId,
      );
    }

    // Ensure likedTalents is always an array and properly formatted for PostgreSQL
    if (!Array.isArray(student.likedTalents)) {
      student.likedTalents = [];
    }

    // Filter out any undefined or null values
    student.likedTalents = student.likedTalents.filter((id) => id != null);

    return this.studentsRepository.save(student);
  }

  async saveTalent(
    studentId: string,
    saveTalentDto: SaveTalentDto,
    user: User,
  ): Promise<Student> {
    // Any authenticated user can save any talent
    // Just verify that the user is authenticated (which is handled by JWT guard)

    const student = await this.findOne(studentId);
    const { talentId, isSaved } = saveTalentDto;

    if (!student.savedTalents) {
      student.savedTalents = [];
    }

    if (isSaved) {
      if (!student.savedTalents.includes(talentId)) {
        student.savedTalents.push(talentId);
      }
    } else {
      student.savedTalents = student.savedTalents.filter(
        (id) => id !== talentId,
      );
    }

    // Ensure savedTalents is always an array and properly formatted for PostgreSQL
    if (!Array.isArray(student.savedTalents)) {
      student.savedTalents = [];
    }

    // Filter out any undefined or null values
    student.savedTalents = student.savedTalents.filter((id) => id != null);

    return this.studentsRepository.save(student);
  }

  async getLikedTalents(studentId: string): Promise<StudentTalent[]> {
    const student = await this.findOne(studentId);
    if (!student.likedTalents || student.likedTalents.length === 0) {
      return [];
    }

    return this.talentsRepository.findBy({ id: In(student.likedTalents) });
  }

  async getSavedTalents(studentId: string): Promise<StudentTalent[]> {
    const student = await this.findOne(studentId);
    if (!student.savedTalents || student.savedTalents.length === 0) {
      return [];
    }

    return this.talentsRepository.findBy({ id: In(student.savedTalents) });
  }

  async requestCollaboration(
    studentId: string,
    collaborationRequestDto: CollaborationRequestDto,
    user: User,
  ): Promise<Collaboration> {
    console.log('requestCollaboration called with:', {
      studentId,
      collaborationRequestDto,
      user,
    });
    console.log('User object:', JSON.stringify(user, null, 2));

    // Verify the user is authenticated
    if (!user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is trying to collaborate with themselves
    if (studentId === collaborationRequestDto.recipientId) {
      throw new ForbiddenException(
        'You cannot request collaboration with yourself',
      );
    }

    console.log('Creating collaboration:', {
      requesterId: studentId,
      recipientId: collaborationRequestDto.recipientId,
    });

    const collaboration = this.collaborationsRepository.create({
      ...collaborationRequestDto,
      requesterId: studentId,
    });

    return this.collaborationsRepository.save(collaboration);
  }

  async getCollaborationRequests(studentId: string): Promise<Collaboration[]> {
    return this.collaborationsRepository.find({
      where: [{ requesterId: studentId }, { recipientId: studentId }],
      relations: ['requester', 'recipient', 'talent'],
    });
  }

  async respondToCollaboration(
    collaborationId: string,
    response: { status: string; message?: string },
    user: User,
  ): Promise<Collaboration> {
    const collaboration = await this.collaborationsRepository.findOne({
      where: { id: collaborationId },
      relations: ['recipient'],
    });

    if (!collaboration) {
      throw new NotFoundException('Collaboration request not found');
    }

    // Verify the user is the recipient or has permission
    if (
      user.role !== 'admin' &&
      user.student?.id !== collaboration.recipientId
    ) {
      throw new ForbiddenException(
        'You can only respond to collaboration requests sent to you',
      );
    }

    collaboration.status = response.status as CollaborationStatus;
    if (response.message) {
      collaboration.responseMessage = response.message;
    }

    return this.collaborationsRepository.save(collaboration);
  }

  // Skills methods
  async addSkill(studentId: string, createSkillDto: any): Promise<any> {
    const student = await this.findOne(studentId);

    const skill = this.skillsRepository.create({
      ...createSkillDto,
      student,
    });
    return this.skillsRepository.save(skill);
  }

  async updateSkill(
    studentId: string,
    skillId: string,
    updateSkillDto: any,
  ): Promise<Skill> {
    const skill = await this.skillsRepository.findOne({
      where: { id: skillId, student: { id: studentId } },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    Object.assign(skill, updateSkillDto);
    return this.skillsRepository.save(skill);
  }

  async removeSkill(studentId: string, skillId: string): Promise<void> {
    const skill = await this.skillsRepository.findOne({
      where: { id: skillId, student: { id: studentId } },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    await this.skillsRepository.remove(skill);
  }

  async getWhoLikedTalents(studentId: string): Promise<Student[]> {
    // Get the target student's talents
    const targetStudent = await this.findOne(studentId);
    const targetTalentIds =
      targetStudent.talents?.map((talent) => talent.id) || [];

    if (targetTalentIds.length === 0) {
      return [];
    }

    // Find all students whose likedTalents array overlaps with the target student's talent IDs
    const studentsWhoLiked = await this.studentsRepository.find({
      where: {
        likedTalents: ArrayOverlap(targetTalentIds),
        id: Not(studentId), // Exclude the target student themselves
      },
      relations: ['user'],
    });

    return studentsWhoLiked;
  }

  async getTalentLikes(talentId: string): Promise<{ count: number; users: Student[] }> {
    // Find all students whose likedTalents array contains this talentId
    const studentsWhoLiked = await this.studentsRepository.find({
      where: {
        likedTalents: ArrayOverlap([talentId]),
      },
      relations: ['user'],
    });

    return {
      count: studentsWhoLiked.length,
      users: studentsWhoLiked,
    };
  }
}
