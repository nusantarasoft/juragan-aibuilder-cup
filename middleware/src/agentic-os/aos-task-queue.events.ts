import { Injectable } from '@nestjs/common';
import { filter, map, Observable, Subject } from 'rxjs';
import { tenantOf } from './agentic-os.service';
import { AosTaskQueueEvent } from './agentic-os.types';

@Injectable()
export class AosTaskQueueEvents {
    private readonly bus = new Subject<{ channel: string; event: AosTaskQueueEvent }>();

    channel(tenantId?: string | null): string {
        return `aos_task_queue:${tenantOf(tenantId)}`;
    }

    publish(tenantId: string | undefined, event: Omit<AosTaskQueueEvent, 'tenantId'>): void {
        const tenant = tenantOf(tenantId);
        this.bus.next({
            channel: this.channel(tenant),
            event: { tenantId: tenant, ...event },
        });
    }

    stream(tenantId: string): Observable<AosTaskQueueEvent> {
        const channel = this.channel(tenantId);
        return this.bus.asObservable().pipe(
            filter((m) => m.channel === channel),
            map((m) => m.event),
        );
    }
}
