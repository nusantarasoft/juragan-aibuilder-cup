import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ContainerInfo {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
    uptime: string;
    ports: string;
    cpu: number;
    memory: number;
    memoryLimit: number;
    restarts: number;
    created: string;
}

interface ContainerLog {
    timestamp: string;
    message: string;
}

@Injectable()
export class DockerService {
    private readonly logger = new Logger(DockerService.name);
    private dockerHost: string;

    constructor(private configService: ConfigService) {
        // Docker Engine API — defaults to unix socket via npipe on Windows or /var/run/docker.sock on Linux
        // In Docker-in-Docker or remote, use TCP: http://host.docker.internal:2375
        this.dockerHost = this.configService.get<string>('DOCKER_HOST', 'http://host.docker.internal:2375');
    }

    private async dockerAPI(path: string, method = 'GET', body?: any): Promise<any> {
        const url = `${this.dockerHost}${path}`;
        const opts: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);

        try {
            const res = await fetch(url, opts);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Docker API ${res.status}: ${text}`);
            }
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return res.json();
            }
            return res.text();
        } catch (err: any) {
            this.logger.warn(`Docker API unavailable (${url}): ${err.message}. Falling back to mock data.`);
            return null;
        }
    }

    async listContainers(): Promise<ContainerInfo[]> {
        const data = await this.dockerAPI('/containers/json?all=true');

        if (data && Array.isArray(data)) {
            return data.map((c: any) => {
                const name = (c.Names?.[0] || '').replace(/^\//, '');
                const memLimit = c.HostConfig?.Memory || 0;
                return {
                    id: c.Id?.substring(0, 12) || '',
                    name,
                    image: c.Image || '',
                    status: c.Status || '',
                    state: c.State || 'unknown',
                    uptime: c.Status || '',
                    ports: (c.Ports || []).map((p: any) => `${p.PublicPort || ''}:${p.PrivatePort}/${p.Type}`).filter((s: string) => !s.startsWith(':')).join(', '),
                    cpu: 0, // populated by stats
                    memory: 0,
                    memoryLimit: memLimit > 0 ? Math.round(memLimit / 1048576) : 512,
                    restarts: c.HostConfig?.RestartPolicy?.MaximumRetryCount || 0,
                    created: new Date(c.Created * 1000).toISOString(),
                };
            });
        }

        // Fallback to mock data when Docker API is unreachable
        return this.getMockContainers();
    }

    async getContainerStats(containerId: string): Promise<{ cpu: number; memory: number; memoryLimit: number }> {
        const data = await this.dockerAPI(`/containers/${containerId}/stats?stream=false`);

        if (data && data.cpu_stats) {
            const cpuDelta = (data.cpu_stats.cpu_usage?.total_usage || 0) - (data.precpu_stats?.cpu_usage?.total_usage || 0);
            const systemDelta = (data.cpu_stats.system_cpu_usage || 0) - (data.precpu_stats?.system_cpu_usage || 0);
            const numCpus = data.cpu_stats.online_cpus || 1;
            const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

            const memUsage = data.memory_stats?.usage || 0;
            const memLimit = data.memory_stats?.limit || 0;

            return {
                cpu: Math.round(cpuPercent * 100) / 100,
                memory: Math.round(memUsage / 1048576),
                memoryLimit: Math.round(memLimit / 1048576),
            };
        }

        return { cpu: Math.random() * 3, memory: Math.round(Math.random() * 200 + 30), memoryLimit: 512 };
    }

    async getContainerLogs(containerId: string, tail = 100): Promise<ContainerLog[]> {
        const data = await this.dockerAPI(`/containers/${containerId}/logs?stdout=true&stderr=true&tail=${tail}&timestamps=true`);

        if (data && typeof data === 'string') {
            return data.split('\n').filter(Boolean).map(line => {
                // Docker log format has 8-byte header + timestamp + message
                const clean = line.replace(/^[\x00-\x1f]{8}/, '');
                const spaceIdx = clean.indexOf(' ');
                return {
                    timestamp: spaceIdx > 0 ? clean.substring(0, spaceIdx) : new Date().toISOString(),
                    message: spaceIdx > 0 ? clean.substring(spaceIdx + 1) : clean,
                };
            });
        }

        return [{ timestamp: new Date().toISOString(), message: 'Log streaming unavailable — Docker API not reachable' }];
    }

    async restartContainer(containerId: string): Promise<boolean> {
        const result = await this.dockerAPI(`/containers/${containerId}/restart`, 'POST');
        return result !== null;
    }

    async stopContainer(containerId: string): Promise<boolean> {
        const result = await this.dockerAPI(`/containers/${containerId}/stop`, 'POST');
        return result !== null;
    }

    async startContainer(containerId: string): Promise<boolean> {
        const result = await this.dockerAPI(`/containers/${containerId}/start`, 'POST');
        return result !== null;
    }

    // --- Mock data fallback when Docker API isn't available ---
    private getMockContainers(): ContainerInfo[] {
        const services = [
            { name: 'supabase-db', image: 'supabase/postgres:15.8.1.060', state: 'running', cpu: 2.1, memory: 312, memoryLimit: 1024 },
            { name: 'supabase-kong', image: 'kong:2.8.1', state: 'running', cpu: 0.8, memory: 85, memoryLimit: 512 },
            { name: 'supabase-auth', image: 'supabase/gotrue:v2.175.0', state: 'running', cpu: 0.3, memory: 48, memoryLimit: 256 },
            { name: 'supabase-rest', image: 'postgrest/postgrest:v12.2.8', state: 'running', cpu: 0.2, memory: 32, memoryLimit: 256 },
            { name: 'supabase-realtime', image: 'supabase/realtime:v2.34.47', state: 'running', cpu: 0.5, memory: 64, memoryLimit: 256 },
            { name: 'supabase-storage', image: 'supabase/storage-api:v1.22.10', state: 'running', cpu: 0.3, memory: 56, memoryLimit: 256 },
            { name: 'supabase-meta', image: 'supabase/postgres-meta:v0.86.0', state: 'running', cpu: 0.1, memory: 28, memoryLimit: 128 },
            { name: 'supabase-studio', image: 'supabase/studio:20250317', state: 'running', cpu: 0.6, memory: 96, memoryLimit: 512 },
            { name: 'supabase-imgproxy', image: 'darthsim/imgproxy:v3.8.0', state: 'running', cpu: 0.1, memory: 24, memoryLimit: 128 },
            { name: 'supabase-edge-functions', image: 'supabase/edge-runtime:v1.67.4', state: 'running', cpu: 0.2, memory: 42, memoryLimit: 256 },
            { name: 'supabase-analytics', image: 'supabase/logflare:1.12.0', state: 'running', cpu: 0.4, memory: 78, memoryLimit: 512 },
            { name: 'supabase-vector', image: 'timberio/vector:0.34.0-alpine', state: 'running', cpu: 0.2, memory: 35, memoryLimit: 256 },
            { name: 'dremio', image: 'dremio/dremio-oss:25.1', state: 'running', cpu: 3.2, memory: 1280, memoryLimit: 4096 },
            { name: 'minio', image: 'minio/minio:RELEASE.2025', state: 'running', cpu: 0.4, memory: 92, memoryLimit: 512 },
            { name: 'nessie', image: 'ghcr.io/projectnessie/nessie:0.103.0', state: 'running', cpu: 0.3, memory: 128, memoryLimit: 512 },
            { name: 'middleware', image: 'node:20-slim', state: 'running', cpu: 0.5, memory: 105, memoryLimit: 512 },
            { name: 'ragflow', image: 'infiniflow/ragflow:v0.17.2', state: 'running', cpu: 1.2, memory: 520, memoryLimit: 2048 },
            { name: 'waha', image: 'devlikeapro/waha:latest-2026.4.3', state: 'running', cpu: 0.2, memory: 128, memoryLimit: 2048 },
        ];
        return services.map((s, i) => ({
            id: `mock-${i.toString().padStart(4, '0')}`,
            name: s.name,
            image: s.image,
            status: s.state === 'running' ? 'Up 2 days' : 'Exited',
            state: s.state,
            uptime: 'Up 2 days',
            ports: '',
            cpu: s.cpu + (Math.random() * 0.3 - 0.15),
            memory: s.memory + Math.round(Math.random() * 20 - 10),
            memoryLimit: s.memoryLimit,
            restarts: 0,
            created: new Date(Date.now() - 172800000).toISOString(),
        }));
    }
}
