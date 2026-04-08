import { DataSource } from 'typeorm';
import { Permission } from '../../modules/identity/domain/entities/permission.entity';
import { Role } from '../../modules/identity/domain/entities/role.entity';
import { User } from '../../modules/identity/domain/entities/user.entity';
import { UserRole } from '../../modules/identity/domain/entities/user-role.entity';
import { RefreshToken } from '../../modules/identity/domain/entities/refresh-token.entity';
import { Organization } from '../../modules/organization/domain/entities/organization.entity';
import { Team } from '../../modules/organization/domain/entities/team.entity';
import { TeamMembership } from '../../modules/organization/domain/entities/team-membership.entity';
import { Project } from '../../modules/project-management/domain/entities/project.entity';
import { Task } from '../../modules/project-management/domain/entities/task.entity';
import { TaskAssignee } from '../../modules/project-management/domain/entities/task-assignee.entity';
import { TimeEntry } from '../../modules/time-tracking/domain/entities/time-entry.entity';
import { ActivityLog } from '../../shared/domain/entities/activity-log.entity';
import { ProjectStatus } from '../../modules/project-management/domain/entities/project-status.enum';
import { TaskStatus } from '../../modules/project-management/domain/entities/task-status.enum';
import { TaskPriority } from '../../modules/project-management/domain/entities/task-priority.enum';
import { TeamRole } from '../../modules/organization/domain/entities/team-role.enum';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'archplan',
  password: process.env.DB_PASSWORD || 'archplan_secret',
  database: process.env.DB_DATABASE || 'archplan',
  entities: [
    Permission, Role, User, UserRole, RefreshToken,
    Organization, Team, TeamMembership,
    Project, Task, TaskAssignee,
    TimeEntry, ActivityLog,
  ],
  synchronize: false,
});

// ─── Permission & Role Data ─────────────────────────────────────────────────

const PERMISSIONS_DATA = [
  // Organization
  { name: 'organization:create', resource: 'organization', action: 'create', description: 'Create organizations' },
  { name: 'organization:read', resource: 'organization', action: 'read', description: 'View organizations' },
  { name: 'organization:update', resource: 'organization', action: 'update', description: 'Update organizations' },
  { name: 'organization:delete', resource: 'organization', action: 'delete', description: 'Delete organizations' },
  // Project
  { name: 'project:create', resource: 'project', action: 'create', description: 'Create projects' },
  { name: 'project:read', resource: 'project', action: 'read', description: 'View projects' },
  { name: 'project:update', resource: 'project', action: 'update', description: 'Update projects' },
  { name: 'project:delete', resource: 'project', action: 'delete', description: 'Delete projects' },
  // Task
  { name: 'task:create', resource: 'task', action: 'create', description: 'Create tasks' },
  { name: 'task:read', resource: 'task', action: 'read', description: 'View tasks' },
  { name: 'task:update', resource: 'task', action: 'update', description: 'Update tasks' },
  { name: 'task:delete', resource: 'task', action: 'delete', description: 'Delete tasks' },
  { name: 'task:assign', resource: 'task', action: 'assign', description: 'Assign tasks' },
  // Time tracking
  { name: 'time-entry:create', resource: 'time-entry', action: 'create', description: 'Log time' },
  { name: 'time-entry:read', resource: 'time-entry', action: 'read', description: 'View time entries' },
  { name: 'time-entry:update', resource: 'time-entry', action: 'update', description: 'Update time entries' },
  { name: 'time-entry:delete', resource: 'time-entry', action: 'delete', description: 'Delete time entries' },
  // User management
  { name: 'user:create', resource: 'user', action: 'create', description: 'Create users' },
  { name: 'user:read', resource: 'user', action: 'read', description: 'View users' },
  { name: 'user:update', resource: 'user', action: 'update', description: 'Update users' },
  { name: 'user:delete', resource: 'user', action: 'delete', description: 'Delete users' },
  // Role management
  { name: 'role:manage', resource: 'role', action: 'manage', description: 'Manage roles' },
];

const ROLES_DATA: { name: string; description: string; permissionNames: string[] }[] = [
  {
    name: 'owner',
    description: 'Organization owner with full access',
    permissionNames: PERMISSIONS_DATA.map((p) => p.name),
  },
  {
    name: 'admin',
    description: 'Administrator with broad access',
    permissionNames: PERMISSIONS_DATA.filter((p) => p.name !== 'role:manage').map((p) => p.name),
  },
  {
    name: 'manager',
    description: 'Project manager',
    permissionNames: [
      'project:read', 'project:update',
      'task:create', 'task:read', 'task:update', 'task:delete', 'task:assign',
      'time-entry:create', 'time-entry:read', 'time-entry:update',
      'user:read',
      'organization:read',
    ],
  },
  {
    name: 'member',
    description: 'Team member',
    permissionNames: [
      'project:read',
      'task:create', 'task:read', 'task:update',
      'time-entry:create', 'time-entry:read', 'time-entry:update',
      'user:read',
      'organization:read',
    ],
  },
  {
    name: 'viewer',
    description: 'Read-only access',
    permissionNames: [
      'project:read',
      'task:read',
      'time-entry:read',
      'user:read',
      'organization:read',
    ],
  },
];

// ─── User Data ───────────────────────────────────────────────────────────────

const USERS_DATA = [
  { email: 'admin@archplan.io', firstName: 'Alex', lastName: 'Admin', roleName: 'owner' },
  { email: 'sarah@archplan.io', firstName: 'Sarah', lastName: 'Chen', roleName: 'manager' },
  { email: 'mike@archplan.io', firstName: 'Mike', lastName: 'Johnson', roleName: 'member' },
  { email: 'emma@archplan.io', firstName: 'Emma', lastName: 'Williams', roleName: 'member' },
  { email: 'james@archplan.io', firstName: 'James', lastName: 'Brown', roleName: 'viewer' },
];

const DEFAULT_PASSWORD = 'Password123!';

// ─── Team Data ───────────────────────────────────────────────────────────────

const TEAMS_DATA = [
  { name: 'Engineering', description: 'Core engineering team responsible for platform development' },
  { name: 'Design', description: 'UI/UX design team' },
  { name: 'QA', description: 'Quality assurance and testing team' },
];

// ─── Project Data ────────────────────────────────────────────────────────────

const PROJECTS_DATA = [
  {
    name: 'ArchPlan Platform v2',
    description: 'Next generation of the ArchPlan task management platform',
    status: ProjectStatus.IN_PROGRESS,
    startDate: '2026-01-15',
    dueDate: '2026-06-30',
    teamName: 'Engineering',
  },
  {
    name: 'Mobile App Redesign',
    description: 'Complete redesign of the mobile application with new design system',
    status: ProjectStatus.PLANNING,
    startDate: '2026-03-01',
    dueDate: '2026-08-31',
    teamName: 'Design',
  },
  {
    name: 'API Performance Audit',
    description: 'Audit and optimize API response times across all endpoints',
    status: ProjectStatus.IN_PROGRESS,
    startDate: '2026-02-01',
    dueDate: '2026-04-15',
    teamName: 'QA',
  },
];

// ─── Task Data ───────────────────────────────────────────────────────────────

interface TaskSeed {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectName: string;
  parentTitle?: string;
  position: number;
  assigneeEmails?: string[];
}

const TASKS_DATA: TaskSeed[] = [
  // ArchPlan Platform v2 — top-level
  {
    title: 'User Authentication Overhaul',
    description: 'Migrate from session-based to JWT with refresh token rotation',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    projectName: 'ArchPlan Platform v2',
    position: 0,
    assigneeEmails: ['sarah@archplan.io', 'mike@archplan.io'],
  },
  {
    title: 'Database Schema Migration',
    description: 'Migrate schema to support multi-tenancy',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.HIGH,
    projectName: 'ArchPlan Platform v2',
    position: 1,
    assigneeEmails: ['mike@archplan.io'],
  },
  {
    title: 'REST API Documentation',
    description: 'Generate OpenAPI 3.0 docs for all endpoints',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    projectName: 'ArchPlan Platform v2',
    position: 2,
    assigneeEmails: ['emma@archplan.io'],
  },
  // ArchPlan Platform v2 — sub-tasks of "User Authentication Overhaul"
  {
    title: 'Implement JWT token rotation',
    description: 'Add automatic refresh token rotation on each use',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    projectName: 'ArchPlan Platform v2',
    parentTitle: 'User Authentication Overhaul',
    position: 0,
    assigneeEmails: ['mike@archplan.io'],
  },
  {
    title: 'Add OAuth2 social login',
    description: 'Support Google and GitHub OAuth2 providers',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    projectName: 'ArchPlan Platform v2',
    parentTitle: 'User Authentication Overhaul',
    position: 1,
    assigneeEmails: ['sarah@archplan.io'],
  },
  // Mobile App Redesign — top-level
  {
    title: 'Design System Components',
    description: 'Create reusable component library in Figma',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    projectName: 'Mobile App Redesign',
    position: 0,
    assigneeEmails: ['emma@archplan.io'],
  },
  {
    title: 'User Research Interviews',
    description: 'Conduct 10 user interviews for pain point analysis',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    projectName: 'Mobile App Redesign',
    position: 1,
    assigneeEmails: ['emma@archplan.io', 'james@archplan.io'],
  },
  {
    title: 'Navigation Flow Wireframes',
    description: 'Design wireframes for the new bottom navigation flow',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    projectName: 'Mobile App Redesign',
    position: 2,
  },
  // API Performance Audit — top-level
  {
    title: 'Benchmark Current Endpoints',
    description: 'Run load tests and record baseline response times',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    projectName: 'API Performance Audit',
    position: 0,
    assigneeEmails: ['mike@archplan.io', 'james@archplan.io'],
  },
  {
    title: 'Optimize N+1 Query Patterns',
    description: 'Identify and fix N+1 queries in project and task endpoints',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    projectName: 'API Performance Audit',
    position: 1,
    assigneeEmails: ['mike@archplan.io'],
  },
  {
    title: 'Add Redis Caching Layer',
    description: 'Implement caching for frequently accessed read endpoints',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.HIGH,
    projectName: 'API Performance Audit',
    position: 2,
    assigneeEmails: ['sarah@archplan.io'],
  },
];

// ─── Time Entry Data ─────────────────────────────────────────────────────────

interface TimeEntrySeed {
  taskTitle: string;
  userEmail: string;
  startTime: string;
  endTime: string;
  description: string | null;
  isManual: boolean;
}

const TIME_ENTRIES_DATA: TimeEntrySeed[] = [
  {
    taskTitle: 'Implement JWT token rotation',
    userEmail: 'mike@archplan.io',
    startTime: '2026-02-10T09:00:00Z',
    endTime: '2026-02-10T12:30:00Z',
    description: 'Implemented token rotation logic and unit tests',
    isManual: false,
  },
  {
    taskTitle: 'Implement JWT token rotation',
    userEmail: 'mike@archplan.io',
    startTime: '2026-02-10T13:30:00Z',
    endTime: '2026-02-10T17:00:00Z',
    description: 'Integrated rotation with auth middleware',
    isManual: false,
  },
  {
    taskTitle: 'User Authentication Overhaul',
    userEmail: 'sarah@archplan.io',
    startTime: '2026-02-09T10:00:00Z',
    endTime: '2026-02-09T12:00:00Z',
    description: 'Planning and architecture review',
    isManual: true,
  },
  {
    taskTitle: 'REST API Documentation',
    userEmail: 'emma@archplan.io',
    startTime: '2026-02-08T09:00:00Z',
    endTime: '2026-02-08T16:00:00Z',
    description: 'Wrote OpenAPI specs for identity and org modules',
    isManual: false,
  },
  {
    taskTitle: 'Design System Components',
    userEmail: 'emma@archplan.io',
    startTime: '2026-02-11T09:00:00Z',
    endTime: '2026-02-11T13:00:00Z',
    description: 'Created button, input, and card components in Figma',
    isManual: false,
  },
  {
    taskTitle: 'User Research Interviews',
    userEmail: 'emma@archplan.io',
    startTime: '2026-02-05T14:00:00Z',
    endTime: '2026-02-05T17:00:00Z',
    description: 'Conducted 3 user interviews',
    isManual: true,
  },
  {
    taskTitle: 'Benchmark Current Endpoints',
    userEmail: 'mike@archplan.io',
    startTime: '2026-02-03T09:00:00Z',
    endTime: '2026-02-03T17:00:00Z',
    description: 'Full load test suite with k6',
    isManual: false,
  },
  {
    taskTitle: 'Benchmark Current Endpoints',
    userEmail: 'james@archplan.io',
    startTime: '2026-02-04T10:00:00Z',
    endTime: '2026-02-04T14:00:00Z',
    description: 'Documented baseline metrics and created dashboards',
    isManual: true,
  },
  {
    taskTitle: 'Optimize N+1 Query Patterns',
    userEmail: 'mike@archplan.io',
    startTime: '2026-02-11T09:00:00Z',
    endTime: '2026-02-11T12:00:00Z',
    description: 'Profiled and fixed task list endpoint queries',
    isManual: false,
  },
];

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seedPermissionsAndRoles() {
  console.log('\n── Seeding permissions & roles ──');
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);

  const permissionMap = new Map<string, Permission>();
  for (const pData of PERMISSIONS_DATA) {
    let perm = await permissionRepo.findOne({ where: { name: pData.name } });
    if (!perm) {
      perm = permissionRepo.create(pData);
      perm = await permissionRepo.save(perm);
      console.log(`  Created permission: ${perm.name}`);
    }
    permissionMap.set(perm.name, perm);
  }

  const roleMap = new Map<string, Role>();
  for (const rData of ROLES_DATA) {
    let role = await roleRepo.findOne({
      where: { name: rData.name },
      relations: ['permissions'],
    });
    if (!role) {
      role = roleRepo.create({
        name: rData.name,
        description: rData.description,
        isSystem: true,
      });
    }
    role.permissions = rData.permissionNames
      .map((pn) => permissionMap.get(pn))
      .filter(Boolean) as Permission[];
    await roleRepo.save(role);
    roleMap.set(role.name, role);
    console.log(`  Upserted role: ${role.name} (${role.permissions.length} permissions)`);
  }

  return { permissionMap, roleMap };
}

async function seedUsers(roleMap: Map<string, Role>) {
  console.log('\n── Seeding users ──');
  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const userMap = new Map<string, User>();

  for (const uData of USERS_DATA) {
    let user = await userRepo.findOne({ where: { email: uData.email } });
    if (!user) {
      user = userRepo.create({
        email: uData.email,
        firstName: uData.firstName,
        lastName: uData.lastName,
        passwordHash,
        isActive: true,
      });
      user = await userRepo.save(user);
      console.log(`  Created user: ${user.email}`);

      // Assign role
      const role = roleMap.get(uData.roleName);
      if (role) {
        const existing = await userRoleRepo.findOne({
          where: { userId: user.id, roleId: role.id },
        });
        if (!existing) {
          const ur = userRoleRepo.create({ userId: user.id, roleId: role.id });
          await userRoleRepo.save(ur);
          console.log(`    Assigned role: ${role.name}`);
        }
      }
    } else {
      console.log(`  User exists: ${user.email}`);
    }
    userMap.set(user.email, user);
  }

  return userMap;
}

async function seedTeams(userMap: Map<string, User>) {
  console.log('\n── Seeding teams ──');
  const teamRepo = dataSource.getRepository(Team);
  const membershipRepo = dataSource.getRepository(TeamMembership);

  const admin = userMap.get('admin@archplan.io')!;
  const teamMap = new Map<string, Team>();

  // Team → members mapping
  const teamMembers: Record<string, { email: string; role: TeamRole }[]> = {
    Engineering: [
      { email: 'admin@archplan.io', role: TeamRole.OWNER },
      { email: 'sarah@archplan.io', role: TeamRole.ADMIN },
      { email: 'mike@archplan.io', role: TeamRole.MEMBER },
    ],
    Design: [
      { email: 'admin@archplan.io', role: TeamRole.OWNER },
      { email: 'emma@archplan.io', role: TeamRole.ADMIN },
      { email: 'james@archplan.io', role: TeamRole.MEMBER },
    ],
    QA: [
      { email: 'admin@archplan.io', role: TeamRole.OWNER },
      { email: 'mike@archplan.io', role: TeamRole.ADMIN },
      { email: 'james@archplan.io', role: TeamRole.MEMBER },
      { email: 'sarah@archplan.io', role: TeamRole.MEMBER },
    ],
  };

  for (const tData of TEAMS_DATA) {
    let team = await teamRepo.findOne({ where: { name: tData.name } });
    if (!team) {
      team = teamRepo.create({
        name: tData.name,
        description: tData.description,
        createdBy: admin.id,
      });
      team = await teamRepo.save(team);
      console.log(`  Created team: ${team.name}`);
    } else {
      console.log(`  Team exists: ${team.name}`);
    }
    teamMap.set(team.name, team);

    // Seed memberships
    const members = teamMembers[tData.name] || [];
    for (const m of members) {
      const user = userMap.get(m.email);
      if (!user) continue;
      const existing = await membershipRepo.findOne({
        where: { teamId: team.id, userId: user.id },
      });
      if (!existing) {
        const membership = membershipRepo.create({
          teamId: team.id,
          userId: user.id,
          teamRole: m.role,
        });
        await membershipRepo.save(membership);
        console.log(`    Added ${m.email} as ${m.role}`);
      }
    }
  }

  return teamMap;
}

async function seedProjects(
  teamMap: Map<string, Team>,
  userMap: Map<string, User>,
) {
  console.log('\n── Seeding projects ──');
  const projectRepo = dataSource.getRepository(Project);

  // Project creator mapping
  const projectCreators: Record<string, string> = {
    'ArchPlan Platform v2': 'admin@archplan.io',
    'Mobile App Redesign': 'emma@archplan.io',
    'API Performance Audit': 'sarah@archplan.io',
  };

  const projectMap = new Map<string, Project>();

  for (const pData of PROJECTS_DATA) {
    let project = await projectRepo.findOne({ where: { name: pData.name } });
    if (!project) {
      const team = teamMap.get(pData.teamName)!;
      const creator = userMap.get(projectCreators[pData.name])!;
      project = projectRepo.create({
        name: pData.name,
        description: pData.description,
        status: pData.status,
        startDate: pData.startDate ? new Date(pData.startDate) : null,
        dueDate: pData.dueDate ? new Date(pData.dueDate) : null,
        teamId: team.id,
        createdBy: creator.id,
      });
      project = await projectRepo.save(project);
      console.log(`  Created project: ${project.name}`);
    } else {
      console.log(`  Project exists: ${project.name}`);
    }
    projectMap.set(project.name, project);
  }

  return projectMap;
}

async function seedTasks(
  projectMap: Map<string, Project>,
  userMap: Map<string, User>,
) {
  console.log('\n── Seeding tasks ──');
  const taskRepo = dataSource.getRepository(Task);
  const assigneeRepo = dataSource.getRepository(TaskAssignee);

  const admin = userMap.get('admin@archplan.io')!;
  const taskMap = new Map<string, Task>();

  // First pass: create top-level tasks (no parent)
  for (const tData of TASKS_DATA.filter((t) => !t.parentTitle)) {
    let task = await taskRepo.findOne({
      where: { title: tData.title, projectId: projectMap.get(tData.projectName)!.id },
    });
    if (!task) {
      const project = projectMap.get(tData.projectName)!;
      task = taskRepo.create({
        title: tData.title,
        description: tData.description,
        status: tData.status,
        priority: tData.priority,
        projectId: project.id,
        createdBy: admin.id,
        position: tData.position,
        depth: 0,
        materializedPath: '',
      });
      task = await taskRepo.save(task);
      // Update materialized path after we have the id
      task.materializedPath = task.id;
      await taskRepo.save(task);
      console.log(`  Created task: ${task.title}`);
    } else {
      console.log(`  Task exists: ${task.title}`);
    }
    taskMap.set(task.title, task);
  }

  // Second pass: create sub-tasks
  for (const tData of TASKS_DATA.filter((t) => t.parentTitle)) {
    const parent = taskMap.get(tData.parentTitle!);
    if (!parent) {
      console.log(`  WARNING: Parent task not found: ${tData.parentTitle}`);
      continue;
    }

    let task = await taskRepo.findOne({
      where: { title: tData.title, projectId: projectMap.get(tData.projectName)!.id },
    });
    if (!task) {
      const project = projectMap.get(tData.projectName)!;
      task = taskRepo.create({
        title: tData.title,
        description: tData.description,
        status: tData.status,
        priority: tData.priority,
        projectId: project.id,
        createdBy: admin.id,
        parentId: parent.id,
        position: tData.position,
        depth: parent.depth + 1,
        materializedPath: '',
      });
      task = await taskRepo.save(task);
      task.materializedPath = `${parent.materializedPath}.${task.id}`;
      await taskRepo.save(task);
      console.log(`  Created sub-task: ${task.title} (under ${tData.parentTitle})`);
    } else {
      console.log(`  Task exists: ${task.title}`);
    }
    taskMap.set(task.title, task);
  }

  // Seed assignees
  console.log('\n── Seeding task assignees ──');
  for (const tData of TASKS_DATA) {
    if (!tData.assigneeEmails?.length) continue;
    const task = taskMap.get(tData.title);
    if (!task) continue;

    for (const email of tData.assigneeEmails) {
      const user = userMap.get(email);
      if (!user) continue;
      const existing = await assigneeRepo.findOne({
        where: { taskId: task.id, userId: user.id },
      });
      if (!existing) {
        const assignee = assigneeRepo.create({
          taskId: task.id,
          userId: user.id,
          assignedBy: admin.id,
        });
        await assigneeRepo.save(assignee);
        console.log(`  Assigned ${email} → ${tData.title}`);
      }
    }
  }

  return taskMap;
}

async function seedTimeEntries(
  taskMap: Map<string, Task>,
  userMap: Map<string, User>,
) {
  console.log('\n── Seeding time entries ──');
  const timeEntryRepo = dataSource.getRepository(TimeEntry);

  for (const teData of TIME_ENTRIES_DATA) {
    const task = taskMap.get(teData.taskTitle);
    const user = userMap.get(teData.userEmail);
    if (!task || !user) {
      console.log(`  WARNING: Skipping time entry — task or user not found: ${teData.taskTitle} / ${teData.userEmail}`);
      continue;
    }

    const startTime = new Date(teData.startTime);
    const endTime = new Date(teData.endTime);
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    // Check for duplicate by matching task, user, and start time
    const existing = await timeEntryRepo.findOne({
      where: { taskId: task.id, userId: user.id, startTime },
    });
    if (!existing) {
      const entry = timeEntryRepo.create({
        taskId: task.id,
        userId: user.id,
        startTime,
        endTime,
        durationSeconds,
        description: teData.description,
        isManual: teData.isManual,
      });
      await timeEntryRepo.save(entry);
      console.log(`  Created time entry: ${teData.userEmail} on "${teData.taskTitle}" (${(durationSeconds / 3600).toFixed(1)}h)`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  await dataSource.initialize();
  console.log('Database connected. Running seed...\n');

  const { roleMap } = await seedPermissionsAndRoles();
  const userMap = await seedUsers(roleMap);
  const teamMap = await seedTeams(userMap);
  const projectMap = await seedProjects(teamMap, userMap);
  const taskMap = await seedTasks(projectMap, userMap);
  await seedTimeEntries(taskMap, userMap);

  console.log('\n✓ Seed completed successfully.');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
