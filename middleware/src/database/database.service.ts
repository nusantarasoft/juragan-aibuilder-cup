import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private pool: Pool;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const dbUrl = this.configService.get<string>('SUPABASE_DB_URL')
            || 'postgresql://postgres:postgres@postgres:5432/postgres';

        this.pool = new Pool({
            connectionString: dbUrl,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            options: '-c search_path=public',
        });

        // Test connection
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT current_database(), current_schema()');
            console.log('[DatabaseService] Connected:', result.rows[0]);
            client.release();
        } catch (err) {
            console.error('[DatabaseService] Connection failed:', err.message);
        }
    }

    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.end();
        }
    }

    async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        return this.pool.query<T>(text, params);
    }

    async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
        const result = await this.pool.query<T>(text, params);
        return result.rows[0] || null;
    }

    async queryMany<T = any>(text: string, params?: any[]): Promise<T[]> {
        const result = await this.pool.query<T>(text, params);
        return result.rows;
    }
}
