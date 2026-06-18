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
    progress: number; // 0 to 100
    pagesFound: number;
    pagesScraped: number;
    errors: number;
    documentsGenerated: number;
    startTime?: string;
    endTime?: string;
}

// In-memory mock store
let mockJobs: CrawlJob[] = [
    {
        id: "job_101",
        name: "Nusantarasoft Knowledge Base",
        status: "completed",
        config: {
            seedUrls: ["https://nusantarasoft.com/docs"],
            maxDepth: 3,
            useJsRendering: false,
            authType: 'none',
            rps: 5,
            concurrency: 2,
            proxyEnabled: false,
            cssSelector: "main.content",
            autoMetadata: true,
            chunkSize: 1000,
            chunkOverlap: 200,
        },
        progress: 100,
        pagesFound: 145,
        pagesScraped: 142,
        errors: 3,
        documentsGenerated: 854,
        startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
        endTime: new Date(Date.now() - 86400000 * 2 + 1200000).toISOString(),
    },
    {
        id: "job_102",
        name: "Competitor Pricing Nightly",
        status: "failed",
        config: {
            seedUrls: ["https://competitor.example.com/pricing"],
            maxDepth: 1,
            useJsRendering: true,
            authType: 'none',
            rps: 1,
            concurrency: 1,
            proxyEnabled: true,
            cssSelector: ".pricing-table",
            autoMetadata: false,
            chunkSize: 500,
            chunkOverlap: 50,
            scheduleCron: "0 0 * * *",
        },
        progress: 12,
        pagesFound: 15,
        pagesScraped: 2,
        errors: 13,
        documentsGenerated: 0,
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date(Date.now() - 3500000).toISOString(),
    }
];

export const webCrawlerService = {
    async getJobs(): Promise<CrawlJob[]> {
        return new Promise((resolve) => setTimeout(() => resolve([...mockJobs]), 500));
    },

    async createJob(name: string, config: CrawlJobConfig): Promise<CrawlJob> {
        const newJob: CrawlJob = {
            id: `job_${Date.now()}`,
            name,
            status: 'pending',
            config,
            progress: 0,
            pagesFound: 0,
            pagesScraped: 0,
            errors: 0,
            documentsGenerated: 0,
            startTime: new Date().toISOString()
        };
        mockJobs.unshift(newJob);
        return newJob;
    },

    async startJobSimulation(jobId: string, onProgress: (job: CrawlJob) => void): Promise<void> {
        const job = mockJobs.find(j => j.id === jobId);
        if (!job || job.status === 'completed' || job.status === 'running') return;

        job.status = 'running';
        
        let interval: NodeJS.Timeout;
        
        const tick = () => {
            if (job.progress >= 100) {
                job.status = 'completed';
                job.endTime = new Date().toISOString();
                clearInterval(interval);
                onProgress({ ...job });
                return;
            }

            job.progress += Math.floor(Math.random() * 5) + 1;
            if (job.progress > 100) job.progress = 100;
            
            job.pagesFound += Math.floor(Math.random() * 10);
            job.pagesScraped += Math.floor(Math.random() * 8);
            if (Math.random() > 0.9) job.errors += 1;
            job.documentsGenerated += Math.floor(Math.random() * 15);
            
            onProgress({ ...job });
        };

        interval = setInterval(tick, 1000);
    },

    async deleteJob(jobId: string): Promise<void> {
        mockJobs = mockJobs.filter(j => j.id !== jobId);
    }
};
