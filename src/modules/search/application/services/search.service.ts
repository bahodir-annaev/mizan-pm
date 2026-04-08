import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'client' | 'user';
  title: string;
  description: string | null;
  metadata: Record<string, any>;
}

@Injectable()
export class SearchService {
  constructor(private readonly dataSource: DataSource) {}

  async search(
    query: string,
    options: { type?: string; orgId?: string; limit?: number; offset?: number },
  ): Promise<{ results: SearchResult[]; total: number }> {
    if (!query || query.trim().length < 2) {
      return { results: [], total: 0 };
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`;
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const results: SearchResult[] = [];
    let total = 0;

    const types = options.type ? options.type.split(',') : ['project', 'task', 'client', 'user'];

    if (types.includes('project')) {
      const [rows, count] = await this.searchProjects(searchTerm, options.orgId, limit, offset);
      results.push(...rows);
      total += count;
    }

    if (types.includes('task')) {
      const [rows, count] = await this.searchTasks(searchTerm, options.orgId, limit, offset);
      results.push(...rows);
      total += count;
    }

    if (types.includes('client')) {
      const [rows, count] = await this.searchClients(searchTerm, options.orgId, limit, offset);
      results.push(...rows);
      total += count;
    }

    if (types.includes('user')) {
      const [rows, count] = await this.searchUsers(searchTerm, options.orgId, limit, offset);
      results.push(...rows);
      total += count;
    }

    return { results, total };
  }

  private async searchProjects(
    term: string,
    orgId?: string,
    limit = 20,
    offset = 0,
  ): Promise<[SearchResult[], number]> {
    let query = `
      SELECT id, name as title, description, code, status,
        COUNT(*) OVER() as total_count
      FROM projects
      WHERE deleted_at IS NULL
        AND (LOWER(name) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(code) LIKE $1)
    `;
    const params: any[] = [term];

    if (orgId) {
      params.push(orgId);
      query += ` AND org_id = $${params.length}`;
    }

    query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.dataSource.query(query, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

    return [
      rows.map((r: any) => ({
        id: r.id,
        type: 'project' as const,
        title: r.title,
        description: r.description,
        metadata: { code: r.code, status: r.status },
      })),
      total,
    ];
  }

  private async searchTasks(
    term: string,
    orgId?: string,
    limit = 20,
    offset = 0,
  ): Promise<[SearchResult[], number]> {
    let query = `
      SELECT t.id, t.title, t.description, t.code, t.status, t.project_id,
        COUNT(*) OVER() as total_count
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.deleted_at IS NULL
        AND (LOWER(t.title) LIKE $1 OR LOWER(t.description) LIKE $1 OR LOWER(t.code) LIKE $1)
    `;
    const params: any[] = [term];

    if (orgId) {
      params.push(orgId);
      query += ` AND p.org_id = $${params.length}`;
    }

    query += ` ORDER BY t.title ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.dataSource.query(query, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

    return [
      rows.map((r: any) => ({
        id: r.id,
        type: 'task' as const,
        title: r.title,
        description: r.description,
        metadata: { code: r.code, status: r.status, projectId: r.project_id },
      })),
      total,
    ];
  }

  private async searchClients(
    term: string,
    orgId?: string,
    limit = 20,
    offset = 0,
  ): Promise<[SearchResult[], number]> {
    let query = `
      SELECT id, name as title, description, type, status,
        COUNT(*) OVER() as total_count
      FROM clients
      WHERE deleted_at IS NULL
        AND (LOWER(name) LIKE $1 OR LOWER(description) LIKE $1)
    `;
    const params: any[] = [term];

    if (orgId) {
      params.push(orgId);
      query += ` AND org_id = $${params.length}`;
    }

    query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.dataSource.query(query, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

    return [
      rows.map((r: any) => ({
        id: r.id,
        type: 'client' as const,
        title: r.title,
        description: r.description,
        metadata: { type: r.type, status: r.status },
      })),
      total,
    ];
  }

  private async searchUsers(
    term: string,
    orgId?: string,
    limit = 20,
    offset = 0,
  ): Promise<[SearchResult[], number]> {
    let query = `
      SELECT id, first_name, last_name, email, position,
        COUNT(*) OVER() as total_count
      FROM users
      WHERE deleted_at IS NULL
        AND (LOWER(first_name) LIKE $1 OR LOWER(last_name) LIKE $1 OR LOWER(email) LIKE $1 OR LOWER(position) LIKE $1)
    `;
    const params: any[] = [term];

    if (orgId) {
      params.push(orgId);
      query += ` AND org_id = $${params.length}`;
    }

    query += ` ORDER BY first_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.dataSource.query(query, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;

    return [
      rows.map((r: any) => ({
        id: r.id,
        type: 'user' as const,
        title: `${r.first_name} ${r.last_name}`,
        description: r.email,
        metadata: { position: r.position },
      })),
      total,
    ];
  }
}
