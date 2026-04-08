import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getOverview(orgId?: string): Promise<{
    completedTasks: number;
    activeTasks: number;
    overdueTasks: number;
    totalHoursLogged: number;
  }> {
    const orgFilter = orgId
      ? 'AND p.org_id = $1'
      : '';
    const params = orgId ? [orgId] : [];

    const taskCountsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE t.status = 'DONE') AS completed_tasks,
        COUNT(*) FILTER (WHERE t.status IN ('PLANNING', 'IN_PROGRESS', 'IN_REVIEW')) AS active_tasks,
        COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('DONE', 'CANCELLED')) AS overdue_tasks
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
        ${orgFilter}
    `;

    const hoursQuery = `
      SELECT COALESCE(SUM(te.duration_seconds) / 3600.0, 0) AS total_hours
      FROM time_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
        ${orgFilter}
    `;

    const [taskCounts] = await this.dataSource.query(taskCountsQuery, params);
    const [hours] = await this.dataSource.query(hoursQuery, params);

    return {
      completedTasks: parseInt(taskCounts.completed_tasks, 10) || 0,
      activeTasks: parseInt(taskCounts.active_tasks, 10) || 0,
      overdueTasks: parseInt(taskCounts.overdue_tasks, 10) || 0,
      totalHoursLogged: parseFloat(hours.total_hours) || 0,
    };
  }

  async getTaskCompletion(
    orgId?: string,
    days = 30,
  ): Promise<{ date: string; count: number }[]> {
    const orgFilter = orgId
      ? 'AND p.org_id = $2'
      : '';
    const params: any[] = [days];
    if (orgId) params.push(orgId);

    const query = `
      SELECT
        DATE(t.completed_at) AS date,
        COUNT(*)::int AS count
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.status = 'DONE'
        AND t.completed_at >= CURRENT_DATE - ($1 || ' days')::interval
        AND t.deleted_at IS NULL
        AND p.deleted_at IS NULL
        ${orgFilter}
      GROUP BY DATE(t.completed_at)
      ORDER BY date ASC
    `;

    const rows = await this.dataSource.query(query, params);
    return rows.map((r: any) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }

  async getTaskDistribution(
    orgId?: string,
  ): Promise<{ status: string; count: number }[]> {
    const orgFilter = orgId
      ? 'AND p.org_id = $1'
      : '';
    const params = orgId ? [orgId] : [];

    const query = `
      SELECT
        t.status,
        COUNT(*)::int AS count
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
        ${orgFilter}
      GROUP BY t.status
      ORDER BY count DESC
    `;

    const rows = await this.dataSource.query(query, params);
    return rows.map((r: any) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    }));
  }

  async getTeamPerformance(
    orgId?: string,
  ): Promise<
    { userId: string; name: string; tasksCompleted: number; hoursLogged: number }[]
  > {
    const orgFilter = orgId
      ? 'AND p.org_id = $1'
      : '';
    const params = orgId ? [orgId] : [];

    const query = `
      SELECT
        u.id AS user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'DONE') AS tasks_completed,
        COALESCE(SUM(te.duration_seconds) / 3600.0, 0) AS hours_logged
      FROM users u
      LEFT JOIN tasks t ON t.assignee_id = u.id AND t.deleted_at IS NULL
      LEFT JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL
      LEFT JOIN time_entries te ON te.user_id = u.id
      WHERE u.deleted_at IS NULL
        ${orgFilter ? orgFilter.replace('p.org_id', 'u.org_id') : ''}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY tasks_completed DESC
    `;

    const rows = await this.dataSource.query(query, params);
    return rows.map((r: any) => ({
      userId: r.user_id,
      name: r.name,
      tasksCompleted: parseInt(r.tasks_completed, 10) || 0,
      hoursLogged: parseFloat(r.hours_logged) || 0,
    }));
  }

  async getTimeByProject(
    orgId?: string,
  ): Promise<{ projectId: string; projectName: string; totalHours: number }[]> {
    const orgFilter = orgId
      ? 'AND p.org_id = $1'
      : '';
    const params = orgId ? [orgId] : [];

    const query = `
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        COALESCE(SUM(te.duration_seconds) / 3600.0, 0) AS total_hours
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id AND t.deleted_at IS NULL
      LEFT JOIN time_entries te ON te.task_id = t.id
      WHERE p.deleted_at IS NULL
        ${orgFilter}
      GROUP BY p.id, p.name
      HAVING SUM(te.duration_seconds) > 0
      ORDER BY total_hours DESC
    `;

    const rows = await this.dataSource.query(query, params);
    return rows.map((r: any) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      totalHours: parseFloat(r.total_hours) || 0,
    }));
  }

  async getTimeByType(
    orgId?: string,
  ): Promise<{ workType: string; totalHours: number }[]> {
    const orgFilter = orgId
      ? 'AND p.org_id = $1'
      : '';
    const params = orgId ? [orgId] : [];

    const query = `
      SELECT
        COALESCE(t.work_type, 'unspecified') AS work_type,
        COALESCE(SUM(te.duration_seconds) / 3600.0, 0) AS total_hours
      FROM time_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
        ${orgFilter}
      GROUP BY t.work_type
      ORDER BY total_hours DESC
    `;

    const rows = await this.dataSource.query(query, params);
    return rows.map((r: any) => ({
      workType: r.work_type,
      totalHours: parseFloat(r.total_hours) || 0,
    }));
  }

  async getWeeklyProductivity(
    orgId?: string,
  ): Promise<{ dayOfWeek: number; tasksCompleted: number; hoursLogged: number }[]> {
    const orgFilter = orgId
      ? 'AND p.org_id = $1'
      : '';
    const params = orgId ? [orgId] : [];

    const query = `
      SELECT
        EXTRACT(DOW FROM d.day)::int AS day_of_week,
        COALESCE(task_counts.completed, 0) AS tasks_completed,
        COALESCE(hour_counts.hours, 0) AS hours_logged
      FROM generate_series(0, 6) AS d(day_num)
      CROSS JOIN LATERAL (SELECT (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int - d.day_num) * INTERVAL '1 day') AS day) d_ext
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS completed
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        WHERE t.status = 'end'
          AND t.completed_at IS NOT NULL
          AND EXTRACT(DOW FROM t.completed_at) = d.day_num
          AND t.deleted_at IS NULL
          AND p.deleted_at IS NULL
          ${orgFilter}
      ) task_counts ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(te.duration_seconds) / 3600.0, 0) AS hours
        FROM time_entries te
        JOIN tasks t ON t.id = te.task_id
        JOIN projects p ON p.id = t.project_id
        WHERE EXTRACT(DOW FROM te.start_time) = d.day_num
          AND t.deleted_at IS NULL
          AND p.deleted_at IS NULL
          ${orgFilter}
      ) hour_counts ON TRUE
      ORDER BY d.day_num
    `;

    // Simplified approach using two separate queries
    const taskQuery = `
      SELECT
        EXTRACT(DOW FROM t.completed_at)::int AS day_of_week,
        COUNT(*)::int AS tasks_completed
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.status = 'DONE'
        AND t.completed_at IS NOT NULL
        AND t.deleted_at IS NULL
        AND p.deleted_at IS NULL
        ${orgFilter}
      GROUP BY EXTRACT(DOW FROM t.completed_at)
    `;

    const hoursQuery = `
      SELECT
        EXTRACT(DOW FROM te.start_time)::int AS day_of_week,
        COALESCE(SUM(te.duration_seconds) / 3600.0, 0) AS hours_logged
      FROM time_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
        ${orgFilter}
      GROUP BY EXTRACT(DOW FROM te.start_time)
    `;

    const [taskRows, hourRows] = await Promise.all([
      this.dataSource.query(taskQuery, params),
      this.dataSource.query(hoursQuery, params),
    ]);

    const taskMap = new Map<number, number>();
    for (const r of taskRows) {
      taskMap.set(r.day_of_week, parseInt(r.tasks_completed, 10));
    }

    const hourMap = new Map<number, number>();
    for (const r of hourRows) {
      hourMap.set(r.day_of_week, parseFloat(r.hours_logged));
    }

    return Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      tasksCompleted: taskMap.get(i) || 0,
      hoursLogged: hourMap.get(i) || 0,
    }));
  }

  async getMonthlyReport(
    orgId?: string,
    year?: number,
    month?: number,
  ): Promise<{ userId: string; userName: string; hours: number; tasksDone: number }[]> {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const params: any[] = [startDate];
    let paramIdx = 2;

    let orgFilter = '';
    if (orgId) {
      orgFilter = `AND u.org_id = $${paramIdx}`;
      params.push(orgId);
      paramIdx++;
    }

    const query = `
      SELECT
        u.id AS user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        COALESCE(SUM(te.duration_seconds) / 3600.0, 0) AS hours,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'DONE' AND t.completed_at >= $1::date AND t.completed_at < ($1::date + INTERVAL '1 month')) AS tasks_done
      FROM users u
      LEFT JOIN time_entries te ON te.user_id = u.id
        AND te.start_time >= $1::date
        AND te.start_time < ($1::date + INTERVAL '1 month')
      LEFT JOIN tasks t ON t.assignee_id = u.id AND t.deleted_at IS NULL
      WHERE u.deleted_at IS NULL
        ${orgFilter}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY hours DESC
    `;

    const rows = await this.dataSource.query(query, params);
    return rows.map((r: any) => ({
      userId: r.user_id,
      userName: r.user_name,
      hours: parseFloat(r.hours) || 0,
      tasksDone: parseInt(r.tasks_done, 10) || 0,
    }));
  }

  async getTimeMatrix(
    orgId: string,
    days: number,
  ): Promise<{
    dateRange: { from: string; to: string; days: number };
    projects: any[];
    employees: any[];
  }> {
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = new Date();
    const toDate = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;
    const fromTs = new Date(today.getTime() - (days - 1) * 86_400_000);
    const fromDate = `${fromTs.getUTCFullYear()}-${pad(fromTs.getUTCMonth() + 1)}-${pad(fromTs.getUTCDate())}`;

    const dayList: string[] = Array.from({ length: days }, (_, i) => {
      const d = new Date(fromTs.getTime() + i * 86_400_000);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    });
    const dayIndexMap = new Map<string, number>(dayList.map((d, i) => [d, i]));

    const projectRows: any[] = await this.dataSource.query(
      `SELECT
         p.id,
         p.name,
         p.status,
         p."projectType"        AS type,
         u.id                  AS assigned_user_id,
         CONCAT(u.first_name, ' ', u.last_name) AS assigned_user_name,
         UPPER(LEFT(u.first_name, 1) || LEFT(u.last_name, 1)) AS assigned_user_initials,
         u.avatar_url          AS assigned_user_avatar_url
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.org_id = $1
         AND p.deleted_at IS NULL
         AND p.is_archived = FALSE
       ORDER BY p.updated_at DESC
       LIMIT 10`,
      [orgId],
    );

    if (projectRows.length === 0) {
      return { dateRange: { from: fromDate, to: toDate, days }, projects: [], employees: [] };
    }

    const projectIds = projectRows.map((r) => r.id);

    const taskRows: any[] = await this.dataSource.query(
      `SELECT DISTINCT ON (t.project_id)
         t.project_id,
         t.title AS current_task_name
       FROM tasks t
       WHERE t.project_id = ANY($1::uuid[])
         AND t.status IN ('IN_PROGRESS', 'PLANNING', 'IN_REVIEW')
         AND t.deleted_at IS NULL
       ORDER BY t.project_id, t.updated_at DESC`,
      [projectIds],
    );

    const taskNameMap = new Map<string, string>(
      taskRows.map((r: any) => [r.project_id, r.current_task_name]),
    );

    const projects = projectRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      type: r.type ?? null,
      currentTaskName: taskNameMap.get(r.id) ?? null,
      assignedUserId: r.assigned_user_id ?? null,
      assignedUserName: r.assigned_user_name ?? null,
      assignedUserInitials: r.assigned_user_initials ?? null,
      assignedUserAvatarUrl: r.assigned_user_avatar_url ?? null,
    }));

    const entryRows: any[] = await this.dataSource.query(
      `SELECT
         te.user_id,
         CONCAT(u.first_name, ' ', u.last_name) AS user_name,
         COALESCE(te.project_id, tk.project_id) AS project_id,
         COALESCE(te."date", DATE(te.start_time))::text AS day,
         COALESCE(SUM(te.hours), SUM(te.duration_seconds) / 3600.0, 0) AS hours
       FROM time_entries te
       JOIN tasks tk ON tk.id = te.task_id
       JOIN users u ON u.id = te.user_id
       WHERE COALESCE(te.project_id, tk.project_id) = ANY($1::uuid[])
         AND COALESCE(te."date", DATE(te.start_time)) >= $2::date
         AND COALESCE(te."date", DATE(te.start_time)) <= $3::date
       GROUP BY te.user_id, u.first_name, u.last_name,
                COALESCE(te.project_id, tk.project_id),
                COALESCE(te."date", DATE(te.start_time))`,
      [projectIds, fromDate, toDate],
    );

    const userMap = new Map<
      string,
      { userId: string; userName: string; projects: Record<string, number[]> }
    >();

    for (const r of entryRows) {
      if (!userMap.has(r.user_id)) {
        userMap.set(r.user_id, { userId: r.user_id, userName: r.user_name, projects: {} });
      }
      const emp = userMap.get(r.user_id)!;
      if (!emp.projects[r.project_id]) {
        emp.projects[r.project_id] = new Array(days).fill(0);
      }
      const idx = dayIndexMap.get(r.day);
      if (idx !== undefined) {
        emp.projects[r.project_id][idx] = Math.round(parseFloat(r.hours) * 100) / 100;
      }
    }

    return {
      dateRange: { from: fromDate, to: toDate, days },
      projects,
      employees: Array.from(userMap.values()),
    };
  }

  async getRecentlyCompleted(orgId?: string, limit = 10): Promise<any[]> {
    const orgFilter = orgId
      ? 'AND p.org_id = $2'
      : '';
    const params: any[] = [limit];
    if (orgId) params.push(orgId);

    const query = `
      SELECT
        t.id,
        t.title,
        t.status,
        t.completed_at,
        t.project_id,
        p.name AS project_name,
        t.assignee_id,
        CONCAT(u.first_name, ' ', u.last_name) AS assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.status = 'DONE'
        AND t.completed_at IS NOT NULL
        AND t.deleted_at IS NULL
        AND p.deleted_at IS NULL
        ${orgFilter}
      ORDER BY t.completed_at DESC
      LIMIT $1
    `;

    const rows = await this.dataSource.query(query, params);
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      completedAt: r.completed_at,
      projectId: r.project_id,
      projectName: r.project_name,
      assigneeId: r.assignee_id,
      assigneeName: r.assignee_name,
    }));
  }
}
