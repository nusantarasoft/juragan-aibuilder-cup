import { describe, expect, it } from 'vitest';
import { firstValueFrom, timeout } from 'rxjs';
import { AosTaskQueueEvents } from './aos-task-queue.events';
import { AOS_DEFAULT_TENANT } from './agentic-os.types';

describe('AosTaskQueueEvents', () => {
    it('delivers events to the matching tenant stream', async () => {
        const bus = new AosTaskQueueEvents();
        const pending = firstValueFrom(bus.stream(AOS_DEFAULT_TENANT).pipe(timeout(500)));
        bus.publish(AOS_DEFAULT_TENANT, {
            reason: 'running',
            task: null,
            stats: null,
        });
        const ev = await pending;
        expect(ev.tenantId).toBe(AOS_DEFAULT_TENANT);
        expect(ev.reason).toBe('running');
    });
});
