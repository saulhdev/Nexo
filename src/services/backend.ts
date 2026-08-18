import type {
  Activity,
  Comment,
  CreateProjectInput,
  CreateSubtaskInput,
  CreateTaskInput,
  CreateTeamInput,
  Project,
  Subtask,
  Task,
  TaskAttachment,
  TaskFilters,
  Team,
  TeamMember,
  UpdateProjectInput,
  UpdateSubtaskInput,
  UpdateTaskInput,
  UpdateTeamInput,
  User,
} from '@/types'

export interface Backend {
  readonly kind: 'local' | 'supabase'
  getSession(): Promise<User | null>
  signIn(email: string, password: string): Promise<User>
  signUp(email: string, password: string, fullName: string): Promise<User>
  signOut(): Promise<void>
  updateProfile(input: { fullName?: string; password?: string }): Promise<User>
  onAuthChange(cb: (user: User | null) => void): () => void
  listUsers(): Promise<User[]>

  listProjects(): Promise<Project[]>
  createProject(input: CreateProjectInput): Promise<Project>
  updateProject(id: string, input: UpdateProjectInput): Promise<Project>

  listTasks(filters?: TaskFilters): Promise<Task[]>
  getTask(id: string): Promise<Task>
  createTask(input: CreateTaskInput): Promise<Task>
  updateTask(id: string, input: UpdateTaskInput): Promise<Task>
  deleteTask(id: string): Promise<void>
  reorderColumn(status: Task['status'], orderedIds: string[]): Promise<void>

  listSubtasks(taskId: string): Promise<Subtask[]>
  createSubtask(taskId: string, input: CreateSubtaskInput | string): Promise<Subtask>
  updateSubtask(id: string, input: UpdateSubtaskInput): Promise<Subtask>
  deleteSubtask(id: string): Promise<void>

  listComments(taskId: string): Promise<Comment[]>
  addComment(taskId: string, body: string): Promise<Comment>

  listAttachments(taskId: string): Promise<TaskAttachment[]>
  addAttachment(taskId: string, attachment: { name: string; url: string; size: number; type: string }): Promise<TaskAttachment>
  deleteAttachment(id: string): Promise<void>

  listActivities(taskId: string): Promise<Activity[]>
  listRecentActivities(limit?: number): Promise<Activity[]>

  // ── Teams ────────────────────────────────────────────────────────────────────
  listTeams(): Promise<Team[]>
  createTeam(input: CreateTeamInput): Promise<Team>
  updateTeam(id: string, input: UpdateTeamInput): Promise<Team>
  deleteTeam(id: string): Promise<void>
  listTeamMembers(teamId: string): Promise<TeamMember[]>
  addTeamMember(teamId: string, userId: string): Promise<TeamMember>
  removeTeamMember(teamId: string, userId: string): Promise<void>
}
