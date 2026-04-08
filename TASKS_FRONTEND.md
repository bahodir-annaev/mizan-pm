# Tasks — Frontend Integration Guide (TanStack Query + React)

## Strategy: Flat fetch → client builds tree

The API returns tasks as a **flat array** with `parentId` included. The frontend builds the nested tree structure. Expanding a node beyond the initially loaded depth triggers a lazy fetch for deeper children.

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/projects/:projectId/tasks?depth=2` | Initial load — returns tasks up to N levels deep (flat, paginated) |
| `GET` | `/api/v1/tasks/:taskId/children` | Lazy load direct children of an expanded node |
| `GET` | `/api/v1/projects/:projectId/tasks/tree` | Full nested tree (avoid unless project is small) |

### `depth` param behaviour
- `depth=0` (default) → root tasks only
- `depth=1` → root + their direct children
- `depth=2` → root + 2 levels of children (recommended for initial load)
- Max: `depth=10`

### Pagination
`page` and `limit` apply across all returned tasks (not just roots). Recommend `limit=50` for initial load with `depth=2`.

---

## Task shape (response)

```ts
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'planning' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  parentId: string | null;   // key for tree building
  depth: number;             // 0 = root
  position: number;
  projectId: string;
  code: string;              // e.g. "TSK-001"
  dueDate: string | null;
  startDate: string | null;
  estimatedHours: number | null;
  progress: number | null;
  createdAt: string;
  updatedAt: string;
  creator: User;
  assignee: User | null;
}

interface TreeTask extends Task {
  children: TreeTask[];
}
```

---

## Tree builder utility

```ts
// utils/buildTree.ts
export function buildTree(tasks: Task[]): TreeTask[] {
  const map = new Map<string, TreeTask>();

  for (const task of tasks) {
    map.set(task.id, { ...task, children: [] });
  }

  const roots: TreeTask[] = [];

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by position
  for (const node of map.values()) {
    node.children.sort((a, b) => a.position - b.position);
  }

  return roots;
}
```

---

## Query keys

```ts
// queryKeys.ts
export const taskKeys = {
  all: ['tasks'] as const,
  byProject: (projectId: string, filters?: object) =>
    ['tasks', 'project', projectId, filters] as const,
  children: (taskId: string) =>
    ['tasks', taskId, 'children'] as const,
};
```

---

## Initial load hook

```ts
// hooks/useProjectTasks.ts
import { useQuery } from '@tanstack/react-query';
import { taskKeys } from '../queryKeys';
import { buildTree } from '../utils/buildTree';
import { api } from '../api';

interface UseProjectTasksOptions {
  projectId: string;
  depth?: number;       // default 2
  filters?: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    search?: string;
    page?: number;
    limit?: number;
  };
}

export function useProjectTasks({
  projectId,
  depth = 2,
  filters = {},
}: UseProjectTasksOptions) {
  return useQuery({
    queryKey: taskKeys.byProject(projectId, { depth, ...filters }),
    queryFn: () =>
      api.get(`/projects/${projectId}/tasks`, {
        params: { depth, ...filters },
      }).then(r => r.data),
    select: (response) => ({
      tree: buildTree(response.data),
      flat: response.data as Task[],
      meta: response.meta,
    }),
    staleTime: 30_000,
  });
}
```

---

## Lazy load children hook (on expand)

```ts
// hooks/useTaskChildren.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '../queryKeys';
import { api } from '../api';

export function useTaskChildren(taskId: string, enabled: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: taskKeys.children(taskId),
    queryFn: () =>
      api.get(`/tasks/${taskId}/children`).then(r => r.data.data as Task[]),
    enabled,                  // only fires when user expands the node
    staleTime: 30_000,
    onSuccess: (children) => {
      // Inject children into the project tasks cache so the tree stays consistent
      // Update all cached project-task queries that contain this task
      queryClient.setQueriesData(
        { queryKey: ['tasks', 'project'] },
        (old: any) => {
          if (!old?.data) return old;
          const ids = new Set(old.data.map((t: Task) => t.id));
          const newTasks = children.filter((c: Task) => !ids.has(c.id));
          return { ...old, data: [...old.data, ...newTasks] };
        },
      );
    },
  });
}
```

---

## Task node component pattern

```tsx
// components/TaskNode.tsx
function TaskNode({ task }: { task: TreeTask }) {
  const [expanded, setExpanded] = useState(false);
  const [childrenLoaded, setChildrenLoaded] = useState(
    task.children.length > 0,  // already loaded in initial fetch
  );

  const { data: lazyChildren } = useTaskChildren(
    task.id,
    expanded && !childrenLoaded,
  );

  const children = childrenLoaded ? task.children : (lazyChildren ?? []);

  return (
    <div>
      <div onClick={() => {
        setExpanded(e => !e);
        if (!childrenLoaded && lazyChildren) setChildrenLoaded(true);
      }}>
        {task.title}
      </div>

      {expanded && children.map(child => (
        <TaskNode key={child.id} task={child} />
      ))}
    </div>
  );
}
```

---

## Mutations

### Create task
```ts
const createTask = useMutation({
  mutationFn: (dto: CreateTaskDto) =>
    api.post('/tasks', dto).then(r => r.data.data),
  onSuccess: (newTask) => {
    queryClient.invalidateQueries({
      queryKey: taskKeys.byProject(newTask.projectId),
    });
    // If it has a parent, also invalidate that parent's children cache
    if (newTask.parentId) {
      queryClient.invalidateQueries({
        queryKey: taskKeys.children(newTask.parentId),
      });
    }
  },
});
```

### Update task (optimistic)
```ts
const updateTask = useMutation({
  mutationFn: ({ id, dto }: { id: string; dto: UpdateTaskDto }) =>
    api.patch(`/tasks/${id}`, dto).then(r => r.data.data),
  onMutate: async ({ id, dto }) => {
    await queryClient.cancelQueries({ queryKey: ['tasks', 'project'] });
    const snapshot = queryClient.getQueriesData({ queryKey: ['tasks', 'project'] });

    queryClient.setQueriesData(
      { queryKey: ['tasks', 'project'] },
      (old: any) => ({
        ...old,
        data: old?.data?.map((t: Task) =>
          t.id === id ? { ...t, ...dto } : t,
        ),
      }),
    );
    return { snapshot };
  },
  onError: (_err, _vars, ctx) => {
    // Roll back on error
    ctx?.snapshot.forEach(([key, data]) => {
      queryClient.setQueryData(key, data);
    });
  },
  onSettled: (_data, _err, { id }) => {
    queryClient.invalidateQueries({ queryKey: ['tasks', 'project'] });
  },
});
```

### Move task
```ts
const moveTask = useMutation({
  mutationFn: ({ id, dto }: { id: string; dto: MoveTaskDto }) =>
    api.patch(`/tasks/${id}/move`, dto).then(r => r.data.data),
  onSuccess: () => {
    // Invalidate everything — tree structure changed
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});
```

### Delete task
```ts
const deleteTask = useMutation({
  mutationFn: (id: string) => api.delete(`/tasks/${id}`),
  onSuccess: (_data, id) => {
    // Remove from all caches immediately, server cascades to children
    queryClient.setQueriesData(
      { queryKey: ['tasks', 'project'] },
      (old: any) => ({
        ...old,
        data: old?.data?.filter((t: Task) => t.id !== id),
      }),
    );
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  },
});
```

---

## Decision tree — which endpoint to call?

```
User opens project page
  → useProjectTasks({ projectId, depth: 2 })   ← eager 2 levels

User expands a node that has children beyond depth 2
  → useTaskChildren(taskId, true)               ← lazy fetch on demand

User searches / filters
  → useProjectTasks({ projectId, depth: 0, filters: { search, status } })
    (searching across all depths? use depth=10 or the /tree endpoint)

User wants to see entire hierarchy (e.g., Gantt / outline view)
  → GET /projects/:id/tasks/tree                ← full nested tree, no pagination
```

---

## Notes

- Always include `parentId` when displaying tasks so you can navigate to parent context.
- The `depth` field on each task tells you its level (0 = root) — use it to indent rows.
- After a `move` mutation, **invalidate all task queries** since the entire tree structure changes.
- The `meta` object from the paginated response includes `{ page, limit, total, totalPages }`.
