// ── Domain Event Publisher ────────────────────────────────────────────────
// Writes domain_event + outbox_event in the same DB transaction.
// The worker polls outbox_events and dispatches to BullMQ.
//
// Usage:
//   await publishEvent(db, {
//     type: "feature.status_changed",
//     aggregateType: "feature",
//     aggregateId: featureId,
//     organisationId,
//     projectId,
//     actorId: userId,
//     actorName: userName,
//     payload: { featureId, featureTitle, from: old, to: new, sprintId, sprintName },
//   });

import type { DomainEvent, DomainEventType } from "./types";
import { EVENT_ROUTING } from "./types";

// Minimal Prisma-compatible interface so this package doesn't import Prisma directly
interface PrismaLike {
  $transaction<T>(fn: (tx: PrismaLike) => Promise<T>): Promise<T>;
  domainEvent: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  outboxEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

export async function publishEvent(
  db: PrismaLike,
  event: Omit<DomainEvent, "occurredAt"> & { occurredAt?: string }
): Promise<string> {
  const occurredAt = event.occurredAt ?? new Date().toISOString();
  const routing    = EVENT_ROUTING[event.type as DomainEventType];

  return db.$transaction(async (tx) => {
    const de = await tx.domainEvent.create({
      data: {
        type:          event.type,
        aggregateType: event.aggregateType,
        aggregateId:   event.aggregateId,
        organisationId: event.organisationId,
        projectId:     event.projectId ?? null,
        actorId:       event.actorId   ?? null,
        actorName:     event.actorName ?? null,
        payload:       (event as any).payload ?? {},
        occurredAt:    new Date(occurredAt),
      },
    });

    await tx.outboxEvent.create({
      data: {
        domainEventId: de.id,
        queue:         routing.queue,
        jobName:       routing.jobName,
        payload: {
          // Guardian and alert-sweep jobs only need projectId + projectName
          // The processor fetches full data from DB. Keep payload minimal.
          domainEventId: de.id,
          eventType:     event.type,
          aggregateId:   event.aggregateId,
          organisationId: event.organisationId,
          projectId:     event.projectId ?? null,
        },
      },
    });

    return de.id;
  });
}

/** Convenience: publish without a transaction (creates its own) */
export async function emit(
  db: PrismaLike,
  event: Omit<DomainEvent, "occurredAt"> & { occurredAt?: string }
): Promise<void> {
  await publishEvent(db, event).catch((err) => {
    // Non-fatal: log but don't block the main mutation
    console.warn("[events] publishEvent failed:", (err as Error).message);
  });
}
