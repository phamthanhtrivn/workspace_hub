import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { lockProject } from './project-transaction';

export interface UploadedProjectFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ProjectFileResponse {
  id: string;
  projectId: string;
  sprintId: string | null;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  addedAt: Date;
}

const FILE_LIMIT = 10 * 1024 * 1024;
const PROJECT_LIMIT = 100 * 1024 * 1024;

@Injectable()
export class ProjectFileService {
  constructor(private readonly prisma: PrismaService, private readonly access: ProjectAccessService) {}

  async list(userId: string, projectId: string): Promise<ProjectFileResponse[]> {
    await this.access.requireReadAccess(userId, projectId);
    return this.prisma.$queryRaw<ProjectFileResponse[]>`
      SELECT id, project_id AS "projectId", sprint_id AS "sprintId", name,
        mime_type AS type, size_bytes AS size, uploaded_by AS "uploadedBy", created_at AS "addedAt"
      FROM project_files WHERE project_id = ${projectId}::uuid ORDER BY created_at DESC, id
    `;
  }

  async upload(userId: string, projectId: string, file: UploadedProjectFile | undefined, sprintId?: string) {
    await this.requireContributor(userId, projectId);
    if (!file?.buffer?.length || file.size > FILE_LIMIT || file.size !== file.buffer.length) {
      throw new BadRequestException('Select a nonempty file up to 10 MB');
    }
    const name = Array.from(file.originalname, (char) =>
      char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 || char === '/' || char === '\\' ? '_' : char,
    ).join('').trim();
    if (!name || name.length > 255) throw new BadRequestException('Invalid file name');
    const mimeType = (file.mimetype || 'application/octet-stream').slice(0, 255);
    return this.prisma.$transaction(async (tx) => {
      await lockProject(tx, projectId);
      if (sprintId && !await tx.sprint.findFirst({ where: { id: sprintId, projectId } })) {
        throw new NotFoundException('Sprint not found in this project');
      }
      const [usage] = await tx.$queryRaw<Array<{ bytes: bigint; count: bigint }>>`
        SELECT COALESCE(SUM(size_bytes), 0)::bigint AS bytes, COUNT(*) AS count
        FROM project_files WHERE project_id = ${projectId}::uuid
      `;
      if (Number(usage.bytes) + file.size > PROJECT_LIMIT || Number(usage.count) >= 500) {
        throw new BadRequestException('Project file limit reached (100 MB or 500 files)');
      }
      const [saved] = await tx.$queryRaw<ProjectFileResponse[]>`
        INSERT INTO project_files (id, project_id, sprint_id, name, mime_type, size_bytes, content, uploaded_by)
        VALUES (${crypto.randomUUID()}::uuid, ${projectId}::uuid, ${sprintId ?? null}::uuid,
          ${name}, ${mimeType}, ${file.size}, ${file.buffer}, ${userId}::uuid)
        RETURNING id, project_id AS "projectId", sprint_id AS "sprintId", name,
          mime_type AS type, size_bytes AS size, uploaded_by AS "uploadedBy", created_at AS "addedAt"
      `;
      return saved;
    });
  }

  async download(userId: string, projectId: string, fileId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const [file] = await this.prisma.$queryRaw<Array<{ name: string; content: Uint8Array }>>`
      SELECT name, content FROM project_files WHERE id = ${fileId}::uuid AND project_id = ${projectId}::uuid
    `;
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async remove(userId: string, projectId: string, fileId: string): Promise<void> {
    const project = await this.requireContributor(userId, projectId);
    const deleted = await this.prisma.$executeRaw`
      DELETE FROM project_files WHERE id = ${fileId}::uuid AND project_id = ${projectId}::uuid
      AND (uploaded_by = ${userId}::uuid OR ${project.ownerId === userId})
    `;
    if (!deleted) throw new ForbiddenException('Only the uploader or project owner can remove this file');
  }

  private async requireContributor(userId: string, projectId: string) {
    const project = await this.access.requireReadAccess(userId, projectId);
    if (project.ownerId !== userId) await this.access.getActiveMember(projectId, userId);
    return project;
  }
}
