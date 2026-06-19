import { existsSync } from 'fs';

/** True when middleware runs inside a Docker container. */
export function isRunningInDocker(): boolean {
    return existsSync('/.dockerenv') || process.env.RUNNING_IN_DOCKER === 'true';
}

/**
 * host.docker.internal only works from inside Docker → host.
 * When middleware runs on the host (npm run start:dev on Windows/Mac), use 127.0.0.1 instead.
 */
export function resolveOllamaBaseUrl(raw: string): string {
    const url = raw.trim().replace(/\/$/, '');
    if (!url.includes('host.docker.internal')) return url;
    if (isRunningInDocker()) return url;
    return url.replace('host.docker.internal', '127.0.0.1');
}
