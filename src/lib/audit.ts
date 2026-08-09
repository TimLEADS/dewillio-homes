import { getDb } from "./db";

export function audit(
  actorId: number | null,
  actorRole: string | null,
  action: string,
  entity: string,
  entityId?: string | number | null,
  details?: Record<string, unknown>
): void {
  getDb()
    .prepare(
      `INSERT INTO audit_logs (actor_id, actor_role, action, entity, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      actorId,
      actorRole,
      action,
      entity,
      entityId != null ? String(entityId) : null,
      details ? JSON.stringify(details) : null,
      new Date().toISOString()
    );
}
