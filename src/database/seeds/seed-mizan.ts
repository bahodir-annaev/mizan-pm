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
import { ProjectType } from '../../modules/project-management/domain/entities/project-type.enum';
import { ProjectSize } from '../../modules/project-management/domain/entities/project-size.enum';
import { ComplexityLevel } from '../../modules/project-management/domain/entities/complexity-level.enum';
import { TaskStatus } from '../../modules/project-management/domain/entities/task-status.enum';
import { TaskPriority } from '../../modules/project-management/domain/entities/task-priority.enum';
import { WorkType } from '../../modules/project-management/domain/entities/work-type.enum';
import { AcceptanceStatus } from '../../modules/project-management/domain/entities/acceptance-status.enum';
import { TeamRole } from '../../modules/organization/domain/entities/team-role.enum';
import { EmployeeStatus } from '../../modules/identity/domain/entities/employee-status.enum';
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

// ─── Permission & Role Data ──────────────────────────────────────────────────

const PERMISSIONS_DATA = [
  { name: 'organization:create', resource: 'organization', action: 'create', description: 'Create organizations' },
  { name: 'organization:read',   resource: 'organization', action: 'read',   description: 'View organizations' },
  { name: 'organization:update', resource: 'organization', action: 'update', description: 'Update organizations' },
  { name: 'organization:delete', resource: 'organization', action: 'delete', description: 'Delete organizations' },
  { name: 'project:create', resource: 'project', action: 'create', description: 'Create projects' },
  { name: 'project:read',   resource: 'project', action: 'read',   description: 'View projects' },
  { name: 'project:update', resource: 'project', action: 'update', description: 'Update projects' },
  { name: 'project:delete', resource: 'project', action: 'delete', description: 'Delete projects' },
  { name: 'task:create', resource: 'task', action: 'create', description: 'Create tasks' },
  { name: 'task:read',   resource: 'task', action: 'read',   description: 'View tasks' },
  { name: 'task:update', resource: 'task', action: 'update', description: 'Update tasks' },
  { name: 'task:delete', resource: 'task', action: 'delete', description: 'Delete tasks' },
  { name: 'task:assign', resource: 'task', action: 'assign', description: 'Assign tasks' },
  { name: 'time-entry:create', resource: 'time-entry', action: 'create', description: 'Log time' },
  { name: 'time-entry:read',   resource: 'time-entry', action: 'read',   description: 'View time entries' },
  { name: 'time-entry:update', resource: 'time-entry', action: 'update', description: 'Update time entries' },
  { name: 'time-entry:delete', resource: 'time-entry', action: 'delete', description: 'Delete time entries' },
  { name: 'user:create', resource: 'user', action: 'create', description: 'Create users' },
  { name: 'user:read',   resource: 'user', action: 'read',   description: 'View users' },
  { name: 'user:update', resource: 'user', action: 'update', description: 'Update users' },
  { name: 'user:delete', resource: 'user', action: 'delete', description: 'Delete users' },
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
      'organization:read',
      'project:read', 'project:update',
      'task:create', 'task:read', 'task:update', 'task:delete', 'task:assign',
      'time-entry:create', 'time-entry:read', 'time-entry:update',
      'user:read',
    ],
  },
  {
    name: 'member',
    description: 'Team member',
    permissionNames: [
      'organization:read',
      'project:read',
      'task:create', 'task:read', 'task:update',
      'time-entry:create', 'time-entry:read', 'time-entry:update',
      'user:read',
    ],
  },
  {
    name: 'viewer',
    description: 'Read-only access',
    permissionNames: [
      'organization:read',
      'project:read',
      'task:read',
      'time-entry:read',
      'user:read',
    ],
  },
];

// ─── Organization Data ───────────────────────────────────────────────────────

const ORG_DATA = {
  name: 'Mizan',
  slug: 'mizan',
  budgetLimit: 5_000_000,
  settings: {
    timezone: 'Asia/Tashkent',
    currency: 'USD',
    fiscalYearStart: '01-01',
    defaultWorkHoursPerDay: 8,
  },
};

// ─── User Data ───────────────────────────────────────────────────────────────

const DEFAULT_PASSWORD = 'Password123!';

interface UserSeed {
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  position: string;
  department: string;
  location: string;
  phone: string;
  skills: string[];
  joinDate: string;
  performance: number;
  status: EmployeeStatus;
  teamRole: TeamRole;
}

const USERS_DATA: UserSeed[] = [
  {
    email: 'kamol@mizan.uz',
    firstName: 'Kamol',
    lastName: 'Tashkentov',
    roleName: 'owner',
    position: 'Founder & Principal Architect',
    department: 'Executive',
    location: 'Tashkent, Uzbekistan',
    phone: '+998901234567',
    skills: ['architecture', 'project management', 'client relations', 'urban planning'],
    joinDate: '2020-03-01',
    performance: 98,
    status: EmployeeStatus.ACTIVE,
    teamRole: TeamRole.OWNER,
  },
  {
    email: 'dilnoza@mizan.uz',
    firstName: 'Dilnoza',
    lastName: 'Yusupova',
    roleName: 'admin',
    position: 'Project Director',
    department: 'Management',
    location: 'Tashkent, Uzbekistan',
    phone: '+998902345678',
    skills: ['project administration', 'budgeting', 'contract management', 'stakeholder communication'],
    joinDate: '2021-01-10',
    performance: 92,
    status: EmployeeStatus.ACTIVE,
    teamRole: TeamRole.ADMIN,
  },
  {
    email: 'sardor@mizan.uz',
    firstName: 'Sardor',
    lastName: 'Mirzayev',
    roleName: 'manager',
    position: 'Lead Architect',
    department: 'Architecture',
    location: 'Tashkent, Uzbekistan',
    phone: '+998903456789',
    skills: ['AutoCAD', 'Revit', 'BIM', 'architectural design', 'working drawings', 'team leadership'],
    joinDate: '2021-06-15',
    performance: 89,
    status: EmployeeStatus.ACTIVE,
    teamRole: TeamRole.ADMIN,
  },
  {
    email: 'zulfiya@mizan.uz',
    firstName: 'Zulfiya',
    lastName: 'Rahimova',
    roleName: 'member',
    position: 'Senior Interior Designer',
    department: 'Design',
    location: 'Tashkent, Uzbekistan',
    phone: '+998904567890',
    skills: ['interior design', '3ds Max', 'V-Ray', 'Enscape', 'SketchUp', 'material selection'],
    joinDate: '2022-03-07',
    performance: 85,
    status: EmployeeStatus.ACTIVE,
    teamRole: TeamRole.MEMBER,
  },
  {
    email: 'bobur@mizan.uz',
    firstName: 'Bobur',
    lastName: 'Xasanov',
    roleName: 'member',
    position: 'Structural Engineer',
    department: 'Engineering',
    location: 'Tashkent, Uzbekistan',
    phone: '+998905678901',
    skills: ['structural analysis', 'AutoCAD', 'ETABS', 'Revit Structure', 'MEP coordination'],
    joinDate: '2022-09-01',
    performance: 81,
    status: EmployeeStatus.ACTIVE,
    teamRole: TeamRole.MEMBER,
  },
];

// ─── Team Data ───────────────────────────────────────────────────────────────

const TEAM_DATA = {
  name: 'Mizan Core Team',
  description: 'Multidisciplinary design and engineering team responsible for all active Mizan projects',
};

// ─── Project Data ────────────────────────────────────────────────────────────

interface ProjectSeed {
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  projectType: ProjectType;
  size: ProjectSize;
  complexity: ComplexityLevel;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  areaSqm: number;
  budget: number;
  progress: number;
  estimatedDuration: string;
  color: string;
  startDate: string;
  dueDate: string;
  creatorEmail: string;
}

const PROJECTS_DATA: ProjectSeed[] = [
  {
    code: 'VAF',
    name: 'Villa Al-Farabi',
    description: 'Contemporary two-storey private residence for a family of five in the Al-Farabi district. Scope covers full architectural design, structural drawings, 3D visualization, and interior concept.',
    status: ProjectStatus.IN_PROGRESS,
    projectType: ProjectType.RESIDENTIAL,
    size: ProjectSize.MEDIUM,
    complexity: ComplexityLevel.HIGH,
    priority: 'HIGH',
    areaSqm: 850,
    budget: 450_000,
    progress: 45,
    estimatedDuration: '8 months',
    color: '#4F46E5',
    startDate: '2026-01-10',
    dueDate: '2026-09-15',
    creatorEmail: 'kamol@mizan.uz',
  },
  {
    code: 'MBC',
    name: 'Mizan Business Center',
    description: 'Mixed-use high-rise commercial complex with 18 above-ground floors and 3 underground parking levels. Includes office spaces, retail podium, and rooftop amenities.',
    status: ProjectStatus.PLANNING,
    projectType: ProjectType.COMMERCIAL,
    size: ProjectSize.LARGE,
    complexity: ComplexityLevel.VERY_HIGH,
    priority: 'HIGH',
    areaSqm: 4_200,
    budget: 2_800_000,
    progress: 10,
    estimatedDuration: '24 months',
    color: '#0891B2',
    startDate: '2026-04-01',
    dueDate: '2028-04-01',
    creatorEmail: 'kamol@mizan.uz',
  },
  {
    code: 'CPM',
    name: 'Central Park Masterplan',
    description: 'Landscape masterplan and infrastructure design for a 1.2-hectare urban park in the city center. Includes green zones, pedestrian paths, water features, lighting, and irrigation systems.',
    status: ProjectStatus.IN_PROGRESS,
    projectType: ProjectType.INFRASTRUCTURE,
    size: ProjectSize.LARGE,
    complexity: ComplexityLevel.MEDIUM,
    priority: 'MEDIUM',
    areaSqm: 12_000,
    budget: 980_000,
    progress: 30,
    estimatedDuration: '12 months',
    color: '#16A34A',
    startDate: '2025-11-01',
    dueDate: '2026-11-01',
    creatorEmail: 'dilnoza@mizan.uz',
  },
  {
    code: 'NUI',
    name: 'Nurafshon Apartment Interiors',
    description: 'Full interior design and working documentation for 42 apartments across a premium residential complex in Nurafshon city. Covers concept development, construction docs, and procurement.',
    status: ProjectStatus.IN_PROGRESS,
    projectType: ProjectType.RESIDENTIAL,
    size: ProjectSize.LARGE,
    complexity: ComplexityLevel.MEDIUM,
    priority: 'MEDIUM',
    areaSqm: 6_300,
    budget: 750_000,
    progress: 60,
    estimatedDuration: '18 months',
    color: '#DC2626',
    startDate: '2025-08-15',
    dueDate: '2027-02-28',
    creatorEmail: 'sardor@mizan.uz',
  },
];

// ─── Task Data ───────────────────────────────────────────────────────────────

interface TaskSeed {
  code: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  workType: WorkType;
  acceptance: AcceptanceStatus | null;
  progress: number;
  estimatedHours: number;
  startDate: string;
  dueDate: string;
  completedAt?: string;
  projectCode: string;
  parentCode?: string;
  position: number;
  assigneeEmails: string[];
}

const TASKS_DATA: TaskSeed[] = [
  // ════════════════════════════════════════════════════════════
  //  PROJECT: Villa Al-Farabi (VAF)
  // ════════════════════════════════════════════════════════════

  {
    code: 'VAF-001',
    title: 'Conceptual Design',
    description: 'Develop the initial architectural concept including massing, spatial organisation, and aesthetic direction based on the client brief.',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    workType: WorkType.ARCHITECTURE,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 40,
    startDate: '2026-01-10',
    dueDate: '2026-02-15',
    completedAt: '2026-02-14T15:00:00Z',
    projectCode: 'VAF',
    position: 0,
    assigneeEmails: ['sardor@mizan.uz', 'zulfiya@mizan.uz'],
  },
  {
    code: 'VAF-001-1',
    title: 'Client Brief Analysis',
    description: 'Review and consolidate client requirements, site constraints, and regulatory obligations into a design brief document.',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    workType: WorkType.CLIENT_COORDINATION,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 8,
    startDate: '2026-01-10',
    dueDate: '2026-01-20',
    completedAt: '2026-01-19T14:00:00Z',
    projectCode: 'VAF',
    parentCode: 'VAF-001',
    position: 0,
    assigneeEmails: ['sardor@mizan.uz'],
  },
  {
    code: 'VAF-001-2',
    title: 'Concept Sketches & Mood Board',
    description: 'Produce hand sketches and digital concept studies exploring at least three design directions; compile a client-facing mood board.',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.ARCHITECTURE,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 20,
    startDate: '2026-01-18',
    dueDate: '2026-02-05',
    completedAt: '2026-02-04T16:30:00Z',
    projectCode: 'VAF',
    parentCode: 'VAF-001',
    position: 1,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },
  {
    code: 'VAF-001-3',
    title: 'Client Approval Meeting',
    description: 'Present concept options to client and owner; capture feedback and obtain signed approval to proceed with the preferred direction.',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.CLIENT_COORDINATION,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 4,
    startDate: '2026-02-10',
    dueDate: '2026-02-14',
    completedAt: '2026-02-14T12:00:00Z',
    projectCode: 'VAF',
    parentCode: 'VAF-001',
    position: 2,
    assigneeEmails: ['sardor@mizan.uz', 'dilnoza@mizan.uz'],
  },

  {
    code: 'VAF-002',
    title: 'Architectural Working Drawings',
    description: 'Produce a complete set of architectural construction documents including floor plans, sections, elevations, and details at sufficient scale for permits and contractor use.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.WORKING_DRAWINGS,
    acceptance: AcceptanceStatus.PENDING,
    progress: 40,
    estimatedHours: 120,
    startDate: '2026-02-17',
    dueDate: '2026-05-30',
    projectCode: 'VAF',
    position: 1,
    assigneeEmails: ['sardor@mizan.uz', 'bobur@mizan.uz'],
  },
  {
    code: 'VAF-002-1',
    title: 'Ground & First Floor Plans',
    description: 'Draft dimensioned floor plans for both levels including room layouts, door/window schedules, stair details, and circulation paths.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.WORKING_DRAWINGS,
    acceptance: AcceptanceStatus.PENDING,
    progress: 65,
    estimatedHours: 32,
    startDate: '2026-02-17',
    dueDate: '2026-04-15',
    projectCode: 'VAF',
    parentCode: 'VAF-002',
    position: 0,
    assigneeEmails: ['sardor@mizan.uz'],
  },
  {
    code: 'VAF-002-2',
    title: 'Structural Drawings Package',
    description: 'Prepare foundation plan, column grid, beam layout, and reinforcement schedules in coordination with the architectural drawings.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.ENGINEERING,
    acceptance: AcceptanceStatus.PENDING,
    progress: 30,
    estimatedHours: 40,
    startDate: '2026-03-01',
    dueDate: '2026-05-15',
    projectCode: 'VAF',
    parentCode: 'VAF-002',
    position: 1,
    assigneeEmails: ['bobur@mizan.uz'],
  },
  {
    code: 'VAF-002-3',
    title: 'MEP Coordination Drawings',
    description: 'Coordinate mechanical, electrical, and plumbing rough-in layouts with the structural and architectural drawings to resolve clashes before construction.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.ENGINEERING,
    acceptance: null,
    progress: 0,
    estimatedHours: 24,
    startDate: '2026-04-15',
    dueDate: '2026-05-30',
    projectCode: 'VAF',
    parentCode: 'VAF-002',
    position: 2,
    assigneeEmails: ['bobur@mizan.uz'],
  },

  {
    code: 'VAF-003',
    title: '3D Visualization Package',
    description: 'Produce photorealistic exterior and interior renders for client presentation and marketing materials — minimum 6 key views including daylight and dusk scenes.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.THREE_D_VISUALIZATION,
    acceptance: AcceptanceStatus.PENDING,
    progress: 50,
    estimatedHours: 48,
    startDate: '2026-02-20',
    dueDate: '2026-04-30',
    projectCode: 'VAF',
    position: 2,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },

  {
    code: 'VAF-004',
    title: 'Interior Design Concept',
    description: 'Develop interior concept for all primary living spaces: entrance hall, living/dining, kitchen, master suite, and children\'s rooms. Includes material palette, lighting concept, and FF&E direction.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.INTERIOR_DESIGN,
    acceptance: null,
    progress: 5,
    estimatedHours: 60,
    startDate: '2026-04-01',
    dueDate: '2026-06-30',
    projectCode: 'VAF',
    position: 3,
    assigneeEmails: ['zulfiya@mizan.uz', 'sardor@mizan.uz'],
  },

  // ════════════════════════════════════════════════════════════
  //  PROJECT: Mizan Business Center (MBC)
  // ════════════════════════════════════════════════════════════

  {
    code: 'MBC-001',
    title: 'Site Analysis & Feasibility Study',
    description: 'Conduct a comprehensive analysis of the site conditions, planning regulations, market context, and financial viability to confirm the project scope.',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    workType: WorkType.DOCUMENTATION,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 32,
    startDate: '2026-01-15',
    dueDate: '2026-02-28',
    completedAt: '2026-02-26T17:00:00Z',
    projectCode: 'MBC',
    position: 0,
    assigneeEmails: ['sardor@mizan.uz', 'dilnoza@mizan.uz'],
  },
  {
    code: 'MBC-001-1',
    title: 'Geotechnical Survey Review',
    description: 'Review third-party geotechnical report for bearing capacity, groundwater levels, and soil classification; produce summary recommendations for structural design.',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    workType: WorkType.ENGINEERING,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 8,
    startDate: '2026-01-15',
    dueDate: '2026-02-05',
    completedAt: '2026-02-04T15:30:00Z',
    projectCode: 'MBC',
    parentCode: 'MBC-001',
    position: 0,
    assigneeEmails: ['bobur@mizan.uz'],
  },
  {
    code: 'MBC-001-2',
    title: 'Zoning & Planning Compliance',
    description: 'Verify permitted land use, FAR limits, height restrictions, setback requirements, and parking obligations under the current city masterplan.',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    workType: WorkType.DOCUMENTATION,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 12,
    startDate: '2026-01-20',
    dueDate: '2026-02-14',
    completedAt: '2026-02-12T16:00:00Z',
    projectCode: 'MBC',
    parentCode: 'MBC-001',
    position: 1,
    assigneeEmails: ['sardor@mizan.uz'],
  },
  {
    code: 'MBC-001-3',
    title: 'Competitor & Market Analysis',
    description: 'Benchmark the project against comparable commercial developments in the district; assess demand, rental rates, and target tenant mix.',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.CLIENT_COORDINATION,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 10,
    startDate: '2026-01-25',
    dueDate: '2026-02-20',
    completedAt: '2026-02-18T14:00:00Z',
    projectCode: 'MBC',
    parentCode: 'MBC-001',
    position: 2,
    assigneeEmails: ['dilnoza@mizan.uz'],
  },

  {
    code: 'MBC-002',
    title: 'Concept Design Development',
    description: 'Develop the architectural concept for the high-rise tower and podium: massing, facade expression, floor plate efficiency, vertical circulation, and public realm interface.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.ARCHITECTURE,
    acceptance: AcceptanceStatus.PENDING,
    progress: 35,
    estimatedHours: 80,
    startDate: '2026-04-01',
    dueDate: '2026-06-30',
    projectCode: 'MBC',
    position: 1,
    assigneeEmails: ['sardor@mizan.uz', 'zulfiya@mizan.uz'],
  },
  {
    code: 'MBC-002-1',
    title: 'Massing & Volume Studies',
    description: 'Test at least four distinct massing configurations in physical and digital models, evaluating floor plate efficiency, solar impact on neighbours, and urban skyline contribution.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.ARCHITECTURE,
    acceptance: AcceptanceStatus.PENDING,
    progress: 60,
    estimatedHours: 24,
    startDate: '2026-04-01',
    dueDate: '2026-05-10',
    projectCode: 'MBC',
    parentCode: 'MBC-002',
    position: 0,
    assigneeEmails: ['sardor@mizan.uz'],
  },
  {
    code: 'MBC-002-2',
    title: 'Facade Design Concepts',
    description: 'Develop three alternative facade treatments exploring materiality, shading strategy, and branding integration; present options with energy performance implications.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.HIGH,
    workType: WorkType.EXTERIOR_DESIGN,
    acceptance: null,
    progress: 0,
    estimatedHours: 32,
    startDate: '2026-05-01',
    dueDate: '2026-06-15',
    projectCode: 'MBC',
    parentCode: 'MBC-002',
    position: 1,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },

  {
    code: 'MBC-003',
    title: 'Investor Presentation Package',
    description: 'Assemble a high-quality investor deck including site analysis, concept renders, floor plate plans, financial projections, and project timeline for the pre-sales campaign.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.HIGH,
    workType: WorkType.CLIENT_COORDINATION,
    acceptance: null,
    progress: 15,
    estimatedHours: 40,
    startDate: '2026-05-01',
    dueDate: '2026-06-15',
    projectCode: 'MBC',
    position: 2,
    assigneeEmails: ['sardor@mizan.uz', 'dilnoza@mizan.uz', 'kamol@mizan.uz'],
  },

  {
    code: 'MBC-004',
    title: 'BIM Model Initial Setup',
    description: 'Configure the project BIM environment: establish file naming conventions, shared coordinates, worksets, model templates, and Level of Development (LOD) standards per the BEP.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.ENGINEERING,
    acceptance: null,
    progress: 0,
    estimatedHours: 24,
    startDate: '2026-05-15',
    dueDate: '2026-07-31',
    projectCode: 'MBC',
    position: 3,
    assigneeEmails: ['bobur@mizan.uz'],
  },

  // ════════════════════════════════════════════════════════════
  //  PROJECT: Central Park Masterplan (CPM)
  // ════════════════════════════════════════════════════════════

  {
    code: 'CPM-001',
    title: 'Landscape Masterplan',
    description: 'Design the overall park layout including land use zoning, green infrastructure network, topographic grading, and the spatial hierarchy of activity zones.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.LANDSCAPE,
    acceptance: AcceptanceStatus.PENDING,
    progress: 45,
    estimatedHours: 100,
    startDate: '2025-11-01',
    dueDate: '2026-05-01',
    projectCode: 'CPM',
    position: 0,
    assigneeEmails: ['sardor@mizan.uz', 'zulfiya@mizan.uz'],
  },
  {
    code: 'CPM-001-1',
    title: 'Green Zones & Planting Layout',
    description: 'Define planted areas, species palette, soil preparation zones, and maintenance access routes; produce planting plan drawings at 1:500 scale.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.LANDSCAPE,
    acceptance: AcceptanceStatus.PENDING,
    progress: 55,
    estimatedHours: 32,
    startDate: '2025-11-01',
    dueDate: '2026-04-01',
    projectCode: 'CPM',
    parentCode: 'CPM-001',
    position: 0,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },
  {
    code: 'CPM-001-2',
    title: 'Pedestrian Pathways & Zones',
    description: 'Lay out the primary and secondary pedestrian circulation network, resting nodes, event lawns, and accessibility-compliant routes per universal design standards.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.LANDSCAPE,
    acceptance: AcceptanceStatus.PENDING,
    progress: 40,
    estimatedHours: 24,
    startDate: '2025-12-01',
    dueDate: '2026-04-15',
    projectCode: 'CPM',
    parentCode: 'CPM-001',
    position: 1,
    assigneeEmails: ['sardor@mizan.uz', 'zulfiya@mizan.uz'],
  },
  {
    code: 'CPM-001-3',
    title: 'Water Features Design',
    description: 'Design the central fountain, reflecting pool, and two interactive water play elements including recirculation systems and winterisation provisions.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.LANDSCAPE,
    acceptance: null,
    progress: 5,
    estimatedHours: 20,
    startDate: '2026-04-01',
    dueDate: '2026-06-01',
    projectCode: 'CPM',
    parentCode: 'CPM-001',
    position: 2,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },
  {
    code: 'CPM-001-4',
    title: "Children's Play Area",
    description: 'Design inclusive play equipment layout, safety surfacing, shade structures, and perimeter fencing for the dedicated children\'s zone (600 m²).',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.LOW,
    workType: WorkType.LANDSCAPE,
    acceptance: null,
    progress: 0,
    estimatedHours: 16,
    startDate: '2026-05-01',
    dueDate: '2026-07-01',
    projectCode: 'CPM',
    parentCode: 'CPM-001',
    position: 3,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },

  {
    code: 'CPM-002',
    title: 'Infrastructure Coordination',
    description: 'Coordinate all below-ground and above-ground infrastructure systems across the park: lighting, irrigation, drainage, and utility routing.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.HIGH,
    workType: WorkType.ENGINEERING,
    acceptance: null,
    progress: 10,
    estimatedHours: 60,
    startDate: '2026-03-01',
    dueDate: '2026-08-01',
    projectCode: 'CPM',
    position: 1,
    assigneeEmails: ['bobur@mizan.uz'],
  },
  {
    code: 'CPM-002-1',
    title: 'Lighting Master Plan',
    description: 'Design the park-wide lighting strategy covering pathway luminaires, feature lighting, security lighting, and smart control system integration.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.ENGINEERING,
    acceptance: null,
    progress: 10,
    estimatedHours: 20,
    startDate: '2026-03-15',
    dueDate: '2026-06-30',
    projectCode: 'CPM',
    parentCode: 'CPM-002',
    position: 0,
    assigneeEmails: ['bobur@mizan.uz'],
  },
  {
    code: 'CPM-002-2',
    title: 'Irrigation System Design',
    description: 'Design the drip and sprinkler irrigation network for all planted areas, including mainline routing, zone valves, rain sensors, and controller specifications.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.ENGINEERING,
    acceptance: null,
    progress: 10,
    estimatedHours: 20,
    startDate: '2026-04-01',
    dueDate: '2026-07-01',
    projectCode: 'CPM',
    parentCode: 'CPM-002',
    position: 1,
    assigneeEmails: ['bobur@mizan.uz'],
  },

  {
    code: 'CPM-003',
    title: 'Construction Phasing Plan',
    description: 'Develop a logical construction sequence to allow partial public use of completed zones while work continues, minimising disruption and optimising contractor mobilisation.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.DOCUMENTATION,
    acceptance: null,
    progress: 0,
    estimatedHours: 24,
    startDate: '2026-05-01',
    dueDate: '2026-07-01',
    projectCode: 'CPM',
    position: 2,
    assigneeEmails: ['sardor@mizan.uz'],
  },

  // ════════════════════════════════════════════════════════════
  //  PROJECT: Nurafshon Apartment Interiors (NUI)
  // ════════════════════════════════════════════════════════════

  {
    code: 'NUI-001',
    title: 'Interior Concept Development',
    description: 'Establish the design language for the apartment complex: style direction, material palette, colour schemes, and typical room layouts for the 3 unit typologies (studio, 2-bed, 3-bed).',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    workType: WorkType.INTERIOR_DESIGN,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 48,
    startDate: '2025-08-15',
    dueDate: '2025-10-31',
    completedAt: '2025-10-28T15:00:00Z',
    projectCode: 'NUI',
    position: 0,
    assigneeEmails: ['zulfiya@mizan.uz', 'sardor@mizan.uz'],
  },
  {
    code: 'NUI-001-1',
    title: 'Mood Board & Style Direction',
    description: 'Curate visual references and produce mood boards for each apartment typology; present three distinct style directions for client selection.',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.INTERIOR_DESIGN,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 12,
    startDate: '2025-08-15',
    dueDate: '2025-09-10',
    completedAt: '2025-09-09T14:30:00Z',
    projectCode: 'NUI',
    parentCode: 'NUI-001',
    position: 0,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },
  {
    code: 'NUI-001-2',
    title: 'Material & Finish Selection',
    description: 'Specify all surface finishes, floor coverings, wall treatments, ceiling materials, and sanitary ware; prepare sample boards and supplier quotation schedule.',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.INTERIOR_DESIGN,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 16,
    startDate: '2025-09-10',
    dueDate: '2025-10-10',
    completedAt: '2025-10-08T16:00:00Z',
    projectCode: 'NUI',
    parentCode: 'NUI-001',
    position: 1,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },
  {
    code: 'NUI-001-3',
    title: 'Furniture Concept Layout',
    description: 'Produce indicative furniture layouts for each typology showing space planning, traffic flow, and compliance with minimum clearance standards.',
    status: TaskStatus.DONE,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.INTERIOR_DESIGN,
    acceptance: AcceptanceStatus.APPROVED,
    progress: 100,
    estimatedHours: 16,
    startDate: '2025-10-01',
    dueDate: '2025-10-31',
    completedAt: '2025-10-27T13:00:00Z',
    projectCode: 'NUI',
    parentCode: 'NUI-001',
    position: 2,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },

  {
    code: 'NUI-002',
    title: 'Construction Documentation',
    description: 'Produce a full interior construction document set for all apartment typologies: reflected ceiling plans, electrical finishing plans, tile layouts, and detailed furniture plans for 42 units.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.WORKING_DRAWINGS,
    acceptance: AcceptanceStatus.PENDING,
    progress: 55,
    estimatedHours: 120,
    startDate: '2025-11-01',
    dueDate: '2026-06-30',
    projectCode: 'NUI',
    position: 1,
    assigneeEmails: ['zulfiya@mizan.uz', 'bobur@mizan.uz'],
  },
  {
    code: 'NUI-002-1',
    title: 'Reflected Ceiling Plans',
    description: 'Draw RCPs for each room type showing ceiling height, cove/coffer profiles, light fixture types and positions, smoke detectors, and AC grilles.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.WORKING_DRAWINGS,
    acceptance: AcceptanceStatus.PENDING,
    progress: 70,
    estimatedHours: 32,
    startDate: '2025-11-01',
    dueDate: '2026-04-30',
    projectCode: 'NUI',
    parentCode: 'NUI-002',
    position: 0,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },
  {
    code: 'NUI-002-2',
    title: 'Furniture Layout Plans',
    description: 'Produce dimensioned furniture layout plans per unit for all 42 apartments showing built-in joinery, loose furniture, and balcony arrangements.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.WORKING_DRAWINGS,
    acceptance: AcceptanceStatus.PENDING,
    progress: 50,
    estimatedHours: 24,
    startDate: '2026-01-01',
    dueDate: '2026-05-31',
    projectCode: 'NUI',
    parentCode: 'NUI-002',
    position: 1,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },
  {
    code: 'NUI-002-3',
    title: 'Electrical Finishing Plans',
    description: 'Draw finishing electrical plans showing socket positions, switch plates, data outlets, USB points, and pendant/chandelier drop locations coordinated with the RCPs.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    workType: WorkType.ENGINEERING,
    acceptance: AcceptanceStatus.PENDING,
    progress: 60,
    estimatedHours: 28,
    startDate: '2025-12-01',
    dueDate: '2026-05-15',
    projectCode: 'NUI',
    parentCode: 'NUI-002',
    position: 2,
    assigneeEmails: ['bobur@mizan.uz'],
  },
  {
    code: 'NUI-002-4',
    title: 'Tile & Floor Layout Plans',
    description: 'Produce tile setting-out plans for all wet areas and tiled floors showing grout joint alignment, border details, feature panels, and cut-tile mitigation strategy.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.WORKING_DRAWINGS,
    acceptance: null,
    progress: 0,
    estimatedHours: 20,
    startDate: '2026-04-15',
    dueDate: '2026-06-30',
    projectCode: 'NUI',
    parentCode: 'NUI-002',
    position: 3,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },

  {
    code: 'NUI-003',
    title: 'Client Approval — Round 2',
    description: 'Present updated construction documents incorporating Round 1 comments; walk client through all changes and obtain written sign-off before contractor tender.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    workType: WorkType.CLIENT_COORDINATION,
    acceptance: AcceptanceStatus.REVISION,
    progress: 40,
    estimatedHours: 8,
    startDate: '2026-03-15',
    dueDate: '2026-04-30',
    projectCode: 'NUI',
    position: 2,
    assigneeEmails: ['zulfiya@mizan.uz', 'sardor@mizan.uz'],
  },

  {
    code: 'NUI-004',
    title: 'Procurement Coordination',
    description: 'Issue tender packages to shortlisted FF&E suppliers, evaluate bids, negotiate pricing, and issue purchase orders for all long-lead items across all 42 apartments.',
    status: TaskStatus.PLANNING,
    priority: TaskPriority.LOW,
    workType: WorkType.CLIENT_COORDINATION,
    acceptance: null,
    progress: 0,
    estimatedHours: 32,
    startDate: '2026-05-01',
    dueDate: '2026-08-31',
    projectCode: 'NUI',
    position: 3,
    assigneeEmails: ['zulfiya@mizan.uz'],
  },
];

// ─── Time Entry Data ─────────────────────────────────────────────────────────

interface TimeEntrySeed {
  taskCode: string;
  userEmail: string;
  startTime: string;
  endTime: string;
  description: string;
  isManual: boolean;
}

const TIME_ENTRIES_DATA: TimeEntrySeed[] = [
  // ── Week of 24-28 Feb ──
  {
    taskCode: 'VAF-001-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-02-24T08:00:00Z',
    endTime: '2026-02-24T10:30:00Z',
    description: 'Initial client brief review and annotation of site survey drawings',
    isManual: false,
  },
  {
    taskCode: 'VAF-001-2',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-02-24T09:00:00Z',
    endTime: '2026-02-24T13:00:00Z',
    description: 'First round of concept sketches — exploring three spatial organisations for the ground floor',
    isManual: false,
  },
  {
    taskCode: 'MBC-001-1',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-02-25T09:00:00Z',
    endTime: '2026-02-25T14:00:00Z',
    description: 'Deep-read of geotechnical borehole logs BH-01 through BH-08; drafted bearing-capacity summary table',
    isManual: false,
  },
  {
    taskCode: 'VAF-001-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-02-25T08:00:00Z',
    endTime: '2026-02-25T09:30:00Z',
    description: 'Follow-up call with client to clarify programme requirements and finalize brief annexes',
    isManual: true,
  },
  {
    taskCode: 'MBC-001-3',
    userEmail: 'dilnoza@mizan.uz',
    startTime: '2026-02-26T09:00:00Z',
    endTime: '2026-02-26T13:30:00Z',
    description: 'Market research — gathered rental rates and occupancy data for comparable commercial buildings in the district',
    isManual: false,
  },
  {
    taskCode: 'VAF-001-2',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-02-26T09:00:00Z',
    endTime: '2026-02-26T13:00:00Z',
    description: 'Refined concept sketches, compiled digital mood board with material references for client meeting',
    isManual: false,
  },
  {
    taskCode: 'MBC-001-2',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-02-27T09:00:00Z',
    endTime: '2026-02-27T12:00:00Z',
    description: 'Reviewed city masterplan zoning maps and documented FAR, height limits, and setback rules for the MBC site',
    isManual: false,
  },

  // ── Week of 02-06 Mar ──
  {
    taskCode: 'MBC-001-2',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-02T09:00:00Z',
    endTime: '2026-03-02T11:30:00Z',
    description: 'Completed compliance memo — confirmed site can accommodate 18 floors within permitted envelope',
    isManual: false,
  },
  {
    taskCode: 'MBC-001-3',
    userEmail: 'dilnoza@mizan.uz',
    startTime: '2026-03-02T10:00:00Z',
    endTime: '2026-03-02T14:00:00Z',
    description: 'Competitor analysis — detailed breakdown of 5 reference buildings; compiled findings into slide deck',
    isManual: false,
  },
  {
    taskCode: 'NUI-001-1',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-03T09:00:00Z',
    endTime: '2026-03-03T12:30:00Z',
    description: 'Created three distinct mood boards in Milanote — Modern Minimal, Warm Contemporary, and Bold Accent directions',
    isManual: false,
  },
  {
    taskCode: 'VAF-001-3',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-04T09:00:00Z',
    endTime: '2026-03-04T12:00:00Z',
    description: 'Client approval presentation for VAF concept — client selected direction B with minor revisions; approval signed',
    isManual: true,
  },
  {
    taskCode: 'VAF-002-2',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-03-04T13:00:00Z',
    endTime: '2026-03-04T17:00:00Z',
    description: 'Set up structural drawing template, established column grid from approved floor plan, started raft foundation sizing',
    isManual: false,
  },
  {
    taskCode: 'NUI-001-2',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-05T09:00:00Z',
    endTime: '2026-03-05T14:00:00Z',
    description: 'Specified floor, wall, and ceiling finishes for all three typologies; contacted 4 local suppliers for samples',
    isManual: false,
  },
  {
    taskCode: 'MBC-002-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-06T09:00:00Z',
    endTime: '2026-03-06T13:00:00Z',
    description: 'Generated massing option A (slender tower + wide podium) and option B (stepped tower) in Rhino; initial solar analysis',
    isManual: false,
  },

  // ── Week of 09-13 Mar ──
  {
    taskCode: 'NUI-001-3',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-09T09:00:00Z',
    endTime: '2026-03-09T13:00:00Z',
    description: 'Laid out furniture plans for studio and 2-bed typologies in AutoCAD; verified clearances meet code minimums',
    isManual: false,
  },
  {
    taskCode: 'VAF-002-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-10T08:00:00Z',
    endTime: '2026-03-10T13:30:00Z',
    description: 'Ground floor plan drafted to 1:50 in AutoCAD — entrance hall, living/dining, kitchen, and utility areas complete',
    isManual: false,
  },
  {
    taskCode: 'VAF-002-2',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-03-10T09:00:00Z',
    endTime: '2026-03-10T12:30:00Z',
    description: 'Column sizing calculations complete for ground floor; started beam layout drawing',
    isManual: false,
  },
  {
    taskCode: 'CPM-001-1',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-11T09:00:00Z',
    endTime: '2026-03-11T14:00:00Z',
    description: 'Completed planting zone boundaries and preliminary species list for the north and east quadrants of the park',
    isManual: false,
  },
  {
    taskCode: 'CPM-001-2',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-11T14:30:00Z',
    endTime: '2026-03-11T17:30:00Z',
    description: 'Primary pedestrian spine drawn; tested DDA compliance for main entry routes',
    isManual: false,
  },
  {
    taskCode: 'CPM-002-1',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-03-12T09:00:00Z',
    endTime: '2026-03-12T12:00:00Z',
    description: 'Initial lighting layout concept — classified zones by activity level and started lux-level estimates for pathway lighting',
    isManual: true,
  },
  {
    taskCode: 'MBC-001',
    userEmail: 'dilnoza@mizan.uz',
    startTime: '2026-03-13T10:00:00Z',
    endTime: '2026-03-13T14:30:00Z',
    description: 'Compiled feasibility study report combining geotechnical, zoning, and market sections into client-ready document',
    isManual: true,
  },

  // ── Week of 16-20 Mar ──
  {
    taskCode: 'VAF-002-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-16T08:00:00Z',
    endTime: '2026-03-16T14:00:00Z',
    description: 'First-floor plan drafted with bedrooms, bathrooms, study, and roof terrace access; door and window schedule begun',
    isManual: false,
  },
  {
    taskCode: 'NUI-002-1',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-17T09:00:00Z',
    endTime: '2026-03-17T14:30:00Z',
    description: 'Reflected ceiling plans drawn for studio and 2-bed typologies — defined coffer profiles and light fixture grid',
    isManual: false,
  },
  {
    taskCode: 'NUI-002-3',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-03-17T09:00:00Z',
    endTime: '2026-03-17T13:00:00Z',
    description: 'Electrical finishing plans for studio type completed — socket layout, switch positions, data & USB outlets drawn',
    isManual: false,
  },
  {
    taskCode: 'MBC-002-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-18T09:00:00Z',
    endTime: '2026-03-18T13:00:00Z',
    description: 'Massing options C and D explored — option C (tapered tower) showing best floor-plate efficiency; refined solar study',
    isManual: false,
  },
  {
    taskCode: 'VAF-003',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-19T09:00:00Z',
    endTime: '2026-03-19T15:00:00Z',
    description: 'Built initial 3D model in SketchUp imported to 3ds Max; set up lighting rig and camera positions for two exterior views',
    isManual: false,
  },
  {
    taskCode: 'CPM-002-2',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-03-20T09:00:00Z',
    endTime: '2026-03-20T12:30:00Z',
    description: 'Defined irrigation zones, sized main supply pipe, and located zone valve manifold positions on survey plan',
    isManual: false,
  },
  {
    taskCode: 'CPM-001',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-20T13:30:00Z',
    endTime: '2026-03-20T17:30:00Z',
    description: 'Masterplan progress review with Dilnoza — updated masterplan drawing to reflect revised southern boundary; issued interim drawing',
    isManual: true,
  },

  // ── Week of 23-27 Mar ──
  {
    taskCode: 'NUI-002-1',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-23T09:00:00Z',
    endTime: '2026-03-23T14:00:00Z',
    description: 'RCP refinements for 2-bed and 3-bed typologies — incorporated Sardor\'s review comments; updated fixture schedule',
    isManual: false,
  },
  {
    taskCode: 'NUI-002-3',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-03-24T09:00:00Z',
    endTime: '2026-03-24T14:30:00Z',
    description: 'Electrical finishing plans for 2-bed typology — added pendant drop points and USB-C outlets per revised client requirements',
    isManual: false,
  },
  {
    taskCode: 'VAF-002-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-24T09:00:00Z',
    endTime: '2026-03-24T12:00:00Z',
    description: 'Addressed internal review comments on floor plans — adjusted bathroom layouts and stairwell headroom clearances',
    isManual: false,
  },
  {
    taskCode: 'MBC-003',
    userEmail: 'dilnoza@mizan.uz',
    startTime: '2026-03-25T10:00:00Z',
    endTime: '2026-03-25T14:00:00Z',
    description: 'Drafted investor deck outline and started financial projections section; coordinated with accountant for cost data',
    isManual: true,
  },
  {
    taskCode: 'NUI-002-2',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-26T09:00:00Z',
    endTime: '2026-03-26T13:30:00Z',
    description: 'Furniture layout plans issued for floors 1-5 (studios) — 10 units completed',
    isManual: false,
  },
  {
    taskCode: 'CPM-001-2',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-26T14:00:00Z',
    endTime: '2026-03-26T17:30:00Z',
    description: 'Secondary pathway network drawn; added accessible rest nodes with seating alcoves and wayfinding sign positions',
    isManual: false,
  },
  {
    taskCode: 'MBC-004',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-03-27T09:00:00Z',
    endTime: '2026-03-27T13:00:00Z',
    description: 'Set up BIM project environment in Revit — shared coordinates established, workset structure drafted, template configured',
    isManual: false,
  },

  // ── Week of 30 Mar – 03 Apr ──
  {
    taskCode: 'VAF-003',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-03-30T09:00:00Z',
    endTime: '2026-03-30T15:00:00Z',
    description: 'Exterior render iterations — tested four material combinations for facade; front garden dusk scene 80% complete',
    isManual: false,
  },
  {
    taskCode: 'MBC-002-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-03-31T09:00:00Z',
    endTime: '2026-03-31T13:30:00Z',
    description: 'Massing option C refined to presentation quality; produced comparative diagram for investor deck',
    isManual: false,
  },
  {
    taskCode: 'NUI-002-3',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-04-01T09:00:00Z',
    endTime: '2026-04-01T13:00:00Z',
    description: 'Electrical finishing plans for 3-bed typology started — living area and kitchen zones complete',
    isManual: false,
  },
  {
    taskCode: 'NUI-002-2',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-04-01T13:30:00Z',
    endTime: '2026-04-01T17:30:00Z',
    description: 'Furniture plans for floors 6-10 (2-bed units) issued — 12 units complete; balcony furniture included',
    isManual: false,
  },
  {
    taskCode: 'CPM-001-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-04-02T09:00:00Z',
    endTime: '2026-04-02T12:00:00Z',
    description: 'Planting review session with Zulfiya — resolved boundary conflicts between lawn zones and tree pit locations',
    isManual: true,
  },
  {
    taskCode: 'MBC-003',
    userEmail: 'dilnoza@mizan.uz',
    startTime: '2026-04-02T13:00:00Z',
    endTime: '2026-04-02T17:00:00Z',
    description: 'Investor deck slides 8-18 completed — project timeline, phasing summary, and financial sensitivity table drafted',
    isManual: false,
  },
  {
    taskCode: 'MBC-003',
    userEmail: 'kamol@mizan.uz',
    startTime: '2026-04-03T10:00:00Z',
    endTime: '2026-04-03T12:00:00Z',
    description: 'Executive review of investor deck — provided comments on financial narrative and approved final format',
    isManual: true,
  },

  // ── Apr 06-07 (most recent) ──
  {
    taskCode: 'NUI-002-1',
    userEmail: 'zulfiya@mizan.uz',
    startTime: '2026-04-06T09:00:00Z',
    endTime: '2026-04-06T14:00:00Z',
    description: 'Correction batch from client Round 2 review — updated ceiling heights in master bedrooms and revised AC grille positions',
    isManual: false,
  },
  {
    taskCode: 'VAF-002-1',
    userEmail: 'sardor@mizan.uz',
    startTime: '2026-04-07T08:00:00Z',
    endTime: '2026-04-07T13:30:00Z',
    description: 'Section cuts A-A and B-B drawn; roof terrace balustrade detail and stair cross-section added to the drawing set',
    isManual: false,
  },
  {
    taskCode: 'CPM-002-2',
    userEmail: 'bobur@mizan.uz',
    startTime: '2026-04-07T09:00:00Z',
    endTime: '2026-04-07T12:00:00Z',
    description: 'Irrigation zone valve manifold detail drawn; calculated drip emitter spacing for lawn areas',
    isManual: false,
  },
];

// ─── Clear Database ───────────────────────────────────────────────────────────

async function clearDatabase(): Promise<void> {
  console.log('\n── Clearing database ──');
  await dataSource.query(`
    TRUNCATE TABLE
      activity_log,
      time_entries,
      task_assignees,
      tasks,
      projects,
      team_memberships,
      teams,
      refresh_tokens,
      user_roles,
      users,
      organizations,
      role_permissions,
      permissions,
      roles
    CASCADE
  `);
  console.log('  All tables truncated.');
}

// ─── Seed Functions ───────────────────────────────────────────────────────────

async function seedPermissionsAndRoles() {
  console.log('\n── Seeding permissions & roles ──');
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);

  const permissionMap = new Map<string, Permission>();
  for (const pData of PERMISSIONS_DATA) {
    const perm = permissionRepo.create(pData);
    const saved = await permissionRepo.save(perm);
    permissionMap.set(saved.name, saved);
    console.log(`  Created permission: ${saved.name}`);
  }

  const roleMap = new Map<string, Role>();
  for (const rData of ROLES_DATA) {
    const role = roleRepo.create({
      name: rData.name,
      description: rData.description,
      isSystem: true,
      permissions: rData.permissionNames
        .map((pn) => permissionMap.get(pn))
        .filter(Boolean) as Permission[],
    });
    const saved = await roleRepo.save(role);
    roleMap.set(saved.name, saved);
    console.log(`  Created role: ${saved.name} (${saved.permissions.length} permissions)`);
  }

  return { permissionMap, roleMap };
}

async function seedOrganization() {
  console.log('\n── Seeding organization ──');
  const orgRepo = dataSource.getRepository(Organization);

  const org = orgRepo.create(ORG_DATA);
  const saved = await orgRepo.save(org);
  console.log(`  Created organization: ${saved.name} (${saved.slug})`);
  return { org: saved };
}

async function seedUsers(roleMap: Map<string, Role>, org: Organization) {
  console.log('\n── Seeding users ──');
  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const userMap = new Map<string, User>();

  for (const uData of USERS_DATA) {
    const user = userRepo.create({
      email: uData.email,
      firstName: uData.firstName,
      lastName: uData.lastName,
      passwordHash,
      isActive: true,
      orgId: org.id,
      position: uData.position,
      department: uData.department,
      location: uData.location,
      phone: uData.phone,
      skills: uData.skills,
      joinDate: new Date(uData.joinDate),
      performance: uData.performance,
      status: uData.status,
      preferences: { notifications: true, theme: 'light', language: 'en' },
    });
    const saved = await userRepo.save(user);
    console.log(`  Created user: ${saved.email} (${uData.position})`);

    const role = roleMap.get(uData.roleName)!;
    const ur = userRoleRepo.create({ userId: saved.id, roleId: role.id });
    await userRoleRepo.save(ur);
    console.log(`    Assigned role: ${role.name}`);

    userMap.set(saved.email, saved);
  }

  return userMap;
}

async function seedTeam(userMap: Map<string, User>, org: Organization) {
  console.log('\n── Seeding team ──');
  const teamRepo = dataSource.getRepository(Team);
  const membershipRepo = dataSource.getRepository(TeamMembership);

  const owner = userMap.get('kamol@mizan.uz')!;

  const team = teamRepo.create({
    name: TEAM_DATA.name,
    description: TEAM_DATA.description,
    createdBy: owner.id,
  });
  const saved = await teamRepo.save(team);
  console.log(`  Created team: ${saved.name}`);

  for (const uData of USERS_DATA) {
    const user = userMap.get(uData.email)!;
    const membership = membershipRepo.create({
      teamId: saved.id,
      userId: user.id,
      teamRole: uData.teamRole,
    });
    await membershipRepo.save(membership);
    console.log(`    Added ${uData.email} as ${uData.teamRole}`);
  }

  return { team: saved };
}

async function seedProjects(team: Team, userMap: Map<string, User>, org: Organization) {
  console.log('\n── Seeding projects ──');
  const projectRepo = dataSource.getRepository(Project);
  const projectMap = new Map<string, Project>();

  for (const pData of PROJECTS_DATA) {
    const creator = userMap.get(pData.creatorEmail)!;
    const project = projectRepo.create({
      code: pData.code,
      name: pData.name,
      description: pData.description,
      status: pData.status,
      projectType: pData.projectType,
      size: pData.size,
      complexity: pData.complexity,
      priority: pData.priority,
      areaSqm: pData.areaSqm,
      budget: pData.budget,
      progress: pData.progress,
      estimatedDuration: pData.estimatedDuration,
      color: pData.color,
      isPinned: false,
      isArchived: false,
      startDate: new Date(pData.startDate),
      dueDate: new Date(pData.dueDate),
      teamId: team.id,
      orgId: org.id,
      createdBy: creator.id,
    });
    const saved = await projectRepo.save(project);
    projectMap.set(pData.code, saved);
    console.log(`  Created project: [${saved.code}] ${saved.name}`);
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

  const owner = userMap.get('kamol@mizan.uz')!;
  const taskMap = new Map<string, Task>();

  // First pass: top-level tasks (no parent)
  for (const tData of TASKS_DATA.filter((t) => !t.parentCode)) {
    const project = projectMap.get(tData.projectCode)!;
    const primaryAssignee = tData.assigneeEmails[0] ? userMap.get(tData.assigneeEmails[0]) ?? null : null;
    const task = taskRepo.create({
      code: tData.code,
      title: tData.title,
      description: tData.description,
      status: tData.status,
      priority: tData.priority,
      workType: tData.workType,
      acceptance: tData.acceptance,
      progress: tData.progress,
      estimatedHours: tData.estimatedHours,
      startDate: new Date(tData.startDate),
      dueDate: new Date(tData.dueDate),
      completedAt: tData.completedAt ? new Date(tData.completedAt) : null,
      projectId: project.id,
      createdBy: owner.id,
      assigneeId: primaryAssignee?.id ?? null,
      position: tData.position,
      depth: 0,
      materializedPath: '',
    });
    const saved = await taskRepo.save(task);
    saved.materializedPath = saved.id;
    await taskRepo.save(saved);
    taskMap.set(tData.code, saved);
    console.log(`  Created task: [${saved.code}] ${saved.title}`);
  }

  // Second pass: subtasks
  for (const tData of TASKS_DATA.filter((t) => t.parentCode)) {
    const parent = taskMap.get(tData.parentCode!)!;
    const project = projectMap.get(tData.projectCode)!;
    const primaryAssignee = tData.assigneeEmails[0] ? userMap.get(tData.assigneeEmails[0]) ?? null : null;
    const task = taskRepo.create({
      code: tData.code,
      title: tData.title,
      description: tData.description,
      status: tData.status,
      priority: tData.priority,
      workType: tData.workType,
      acceptance: tData.acceptance,
      progress: tData.progress,
      estimatedHours: tData.estimatedHours,
      startDate: new Date(tData.startDate),
      dueDate: new Date(tData.dueDate),
      completedAt: tData.completedAt ? new Date(tData.completedAt) : null,
      projectId: project.id,
      createdBy: owner.id,
      parentId: parent.id,
      assigneeId: primaryAssignee?.id ?? null,
      position: tData.position,
      depth: parent.depth + 1,
      materializedPath: '',
    });
    const saved = await taskRepo.save(task);
    saved.materializedPath = `${parent.materializedPath}.${saved.id}`;
    await taskRepo.save(saved);
    taskMap.set(tData.code, saved);
    console.log(`  Created subtask: [${saved.code}] ${saved.title}`);
  }

  // Seed assignees
  console.log('\n── Seeding task assignees ──');
  for (const tData of TASKS_DATA) {
    const task = taskMap.get(tData.code);
    if (!task || !tData.assigneeEmails.length) continue;

    for (const email of tData.assigneeEmails) {
      const user = userMap.get(email);
      if (!user) continue;
      const assignee = assigneeRepo.create({
        taskId: task.id,
        userId: user.id,
        assignedBy: owner.id,
      });
      await assigneeRepo.save(assignee);
      console.log(`  Assigned ${email} → [${tData.code}]`);
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
    const task = taskMap.get(teData.taskCode);
    const user = userMap.get(teData.userEmail);
    if (!task || !user) {
      console.log(`  WARNING: Skipping — task "${teData.taskCode}" or user "${teData.userEmail}" not found`);
      continue;
    }

    const startTime = new Date(teData.startTime);
    const endTime = new Date(teData.endTime);
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

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
    console.log(
      `  Time entry: ${teData.userEmail} on [${teData.taskCode}] (${(durationSeconds / 3600).toFixed(1)}h)`,
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await dataSource.initialize();
  console.log('Database connected. Running Mizan seed...');

  await clearDatabase();

  const { roleMap } = await seedPermissionsAndRoles();
  const { org } = await seedOrganization();
  const userMap = await seedUsers(roleMap, org);
  const { team } = await seedTeam(userMap, org);
  const projectMap = await seedProjects(team, userMap, org);
  const taskMap = await seedTasks(projectMap, userMap);
  await seedTimeEntries(taskMap, userMap);

  console.log('\n✓ Mizan seed completed successfully.');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
