import { graphql } from '@/lib/graphqlClient';
import { DEFAULT_TENANT_ID } from '@/lib/graphql';

export type CrawlJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface CrawlJobConfig {
    seedUrls: string[];
    maxDepth: number;
    includeRegex?: string;
    excludeRegex?: string;
    useJsRendering: boolean;
    authType: 'none' | 'basic' | 'custom_header';
    authConfig?: string;
    rps: number;
    concurrency: number;
    proxyEnabled: boolean;
    cssSelector: string;
    autoMetadata: boolean;
    chunkSize: number;
    chunkOverlap: number;
    scheduleCron?: string;
}

export interface CrawlJob {
    id: string;
    name: string;
    status: CrawlJobStatus;
    config: CrawlJobConfig;
    progress: number;
    pagesFound: number;
    pagesScraped: number;
    errors: number;
    documentsGenerated: number;
    startTime?: string;
    endTime?: string;
}

/** Real persisted jobs via middleware GraphQL (P2-1). */
export const WEB_CRAWLER_DATA_MODE = 'live' as const;

type GqlJob = {
    id: string;
    name: string;
    status: string;
    config: CrawlJobConfig;
    progress: number;
    pagesFound: number;
    pagesScraped: number;
    errors: number;
    documentsGenerated: number;
    startTime?: string;
    endTime?: string;
};

function mapJob(row: GqlJob): CrawlJob {
    return {
        id: row.id,
        name: row.name,
        status: row.status as CrawlJobStatus,
        config: row.config,
        progress: row.progress,
        pagesFound: row.pagesFound,
        pagesScraped: row.pagesScraped,
        errors: row.errors,
        documentsGenerated: row.documentsGenerated,
        startTime: row.startTime,
        endTime: row.endTime,
    };
}

const JOBS_QUERY = `
  query StudioWebCrawlJobs($tenantId: String) {
    studioWebCrawlJobs(tenantId: $tenantId) {
      id name status config progress pagesFound pagesScraped errors documentsGenerated startTime endTime
    }
  }
`;

const CREATE_MUTATION = `
  mutation CreateStudioWebCrawlJob($tenantId: String, $input: StudioWebCrawlJobInput!) {
    createStudioWebCrawlJob(tenantId: $tenantId, input: $input) {
      id name status config progress pagesFound pagesScraped errors documentsGenerated startTime endTime
    }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteStudioWebCrawlJob($tenantId: String, $id: String!) {
    deleteStudioWebCrawlJob(tenantId: $tenantId, id: $id)
  }
`;

export const webCrawlerService = {
    dataMode: WEB_CRAWLER_DATA_MODE,

    async getJobs(tenantId: string = DEFAULT_TENANT_ID): Promise<CrawlJob[]> {
        const data = await graphql<{ studioWebCrawlJobs: GqlJob[] }>(JOBS_QUERY, {
            variables: { tenantId },
        });
        return (data.studioWebCrawlJobs ?? []).map(mapJob);
    },

    async createJob(name: string, config: CrawlJobConfig, tenantId: string = DEFAULT_TENANT_ID): Promise<CrawlJob> {
        const data = await graphql<{ createStudioWebCrawlJob: GqlJob }>(CREATE_MUTATION, {
            variables: { tenantId, input: { name, config } },
        });
        return mapJob(data.createStudioWebCrawlJob);
    },

    async deleteJob(jobId: string, tenantId: string = DEFAULT_TENANT_ID): Promise<void> {
        await graphql<{ deleteStudioWebCrawlJob: boolean }>(DELETE_MUTATION, {
            variables: { tenantId, id: jobId },
        });
    },
};
