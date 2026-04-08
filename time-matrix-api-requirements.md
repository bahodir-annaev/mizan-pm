# Time Matrix API Requirements

## Endpoint

```
GET /analytics/time-matrix?days=30
```

The `days` query parameter controls how many days of history to return (default: 30).

---

## Response Shape

```json
{
  "dateRange": {
    "from": "2026-03-07",
    "to": "2026-04-06",
    "days": 30
  },
  "projects": [
    {
      "id": "proj-1",
      "name": "Villa Aurora",
      "status": "IN_PROGRESS",
      "type": "RESIDENTIAL",
      "currentTaskName": "Foundation drawings",
      "assignedUserId": "EMP-001",
      "assignedUserName": "Sarah Chen",
      "assignedUserInitials": "SC",
      "assignedUserAvatarUrl": null
    }
  ],
  "employees": [
    {
      "userId": "EMP-001",
      "userName": "Sarah Chen",
      "projects": {
        "proj-1": [
          6.5, 7.0, 5.0, 0, 0, 6.5, 7.0, 5.5, 0, 0, 6.0, 7.0, 5.5, 0, 0, 6.5, 7.0, 0, 0, 0, 5.5, 7.0, 6.0, 0, 0, 6.5,
          7.0, 5.0, 0, 0
        ],
        "proj-3": [0, 0, 2.0, 3.5, 0, 0, 0, 1.5, 2.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    },
    {
      "userId": "EMP-002",
      "userName": "Mike Johnson",
      "projects": {
        "proj-1": [
          3.0, 0, 4.0, 2.5, 0, 3.5, 0, 4.0, 0, 0, 3.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ],
        "proj-2": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4.0, 5.0, 6.0, 5.5, 0, 4.0, 5.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    }
  ]
}
```

---

## Field Definitions

### `dateRange`

| Field  | Type   | Description                             |
| ------ | ------ | --------------------------------------- |
| `from` | string | ISO date of the oldest day in the array |
| `to`   | string | ISO date of today (most recent day)     |
| `days` | number | Number of days returned (array length)  |

### `projects[]`

| Field                   | Type           | Description                                                       |
| ----------------------- | -------------- | ----------------------------------------------------------------- |
| `id`                    | string         | Project ID — must match keys used in `employee.projects`          |
| `name`                  | string         | Display name shown in the matrix column                           |
| `status`                | string (enum)  | Backend status enum — see Status Mapping below                    |
| `type`                  | string (enum)  | Project type — see Icon Mapping below                             |
| `currentTaskName`       | string         | Title of the currently active task, or most recently updated task |
| `assignedUserId`        | string         | ID of the lead/primary employee shown in the column header        |
| `assignedUserName`      | string         | Full name of the assigned employee                                |
| `assignedUserInitials`  | string         | 2-letter initials (e.g. `"SC"`)                                   |
| `assignedUserAvatarUrl` | string \| null | Avatar URL, or null to fall back to initials                      |

### `employees[]`

| Field      | Type   | Description                                       |
| ---------- | ------ | ------------------------------------------------- |
| `userId`   | string | User ID                                           |
| `userName` | string | Full name shown in the matrix row                 |
| `projects` | object | Map of `projectId → number[]` (daily hours array) |

#### `projects` map

- **Key**: must exactly match a `project.id` from the `projects` array. Orphaned keys are silently ignored by the frontend.
- **Value**: array of `number` with length equal to `days`. Index `0` = oldest day (`dateRange.from`), index `N-1` = today (`dateRange.to`). Each value is hours worked (decimal, e.g. `6.5`). Use `0` for days with no hours logged.

---

## Constraints

1. **Array length must equal `days`** — the frontend slices the array client-side for daily/weekly/monthly/yearly views. A mismatch will produce incorrect totals.
2. **`projectId` keys in `employee.projects` must match `project.id` values** in the `projects` array.
3. **At most 10 projects** are displayed in the matrix. If more are returned the frontend will truncate to the first 10.

---

## Status Mapping (`project.status` → UI)

| Backend value | UI behaviour          | Indicator colour |
| ------------- | --------------------- | ---------------- |
| `IN_PROGRESS` | Active (green)        | `#10b981`        |
| Any other     | Paused/inactive (red) | `#ef4444`        |

---

## Icon Mapping (`project.type` → icon)

| Backend value | Icon shown      |
| ------------- | --------------- |
| `RESIDENTIAL` | Sofa (interior) |
| `COMMERCIAL`  | Building2       |
| `LANDSCAPE`   | Trees           |
| `INDUSTRIAL`  | Warehouse       |
| `OTHER`       | TreePine        |

---

## Frontend Integration Plan

Once the endpoint is available:

1. Add `TimeMatrixResponse` type to `src/types/api.ts`
2. Add `getTimeMatrix(days: number)` to `src/services/analytics.service.ts`
3. Add `useTimeMatrix(days: number)` hook to `src/hooks/api/useAnalytics.ts`
4. Replace the synthetic `seededRand` data in `EmployeeProjectMatrix.tsx` with the hook result

Online users (real-time) — requires the WebSocket gateway to maintain a connected-users map (userId → socketId) and optionally emit user:online/user:offline events. A REST endpoint like GET /api/v1/users/online could read from that in-memory map.
