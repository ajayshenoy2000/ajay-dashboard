export type TaskStatus = "open" | "done";

export type Task = {
  id: string;
  groupId: string | null;
  parentTaskId: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  dueAt: string | null;
  recurrenceRule: string | null;
  reminderAt: string | null;
  sortOrder: number;
  createdAt: string;
  completedAt: string | null;
  subtasks: Task[];
};

export type TaskGroup = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  createdAt: string;
};

export type CreateTaskInput = {
  title: string;
  notes?: string | null;
  groupId?: string | null;
  parentTaskId?: string | null;
  dueAt?: string | null;
  recurrenceRule?: string | null;
  reminderAt?: string | null;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & { status?: TaskStatus };
