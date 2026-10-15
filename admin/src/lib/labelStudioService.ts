import { graphql } from '@/lib/graphqlClient';
import { DEFAULT_TENANT_ID } from '@/lib/graphql';

export interface LabelStudioProject {
    id: number;
    name: string;
    projectType: string;
    tasks: number;
    completed: number;
    annotators: number;
    color: string;
}

export interface LabelStudioRecentAnnotation {
    id: string;
    taskLabel: string;
    projectName: string;
    label: string;
    annotator: string;
    updatedAt: string;
}

export interface LabelStudioDashboard {
    configured: boolean;
    openUrl?: string;
    message?: string;
    projects: LabelStudioProject[];
    recentAnnotations: LabelStudioRecentAnnotation[];
}

/** Real Label Studio stats via middleware GraphQL (P2-4). */
export const LABEL_STUDIO_DATA_MODE = 'live' as const;

export const DEMO_LABEL_STUDIO_DASHBOARD: LabelStudioDashboard = {
    configured: false,
    openUrl: 'http://localhost:8080',
    projects: [
        { id: 1, name: 'Document Classification', projectType: 'Text Classification', tasks: 450, completed: 380, annotators: 3, color: '#3b82f6' },
        { id: 2, name: 'Image Labeling', projectType: 'Object Detection', tasks: 200, completed: 145, annotators: 2, color: '#8b5cf6' },
        { id: 3, name: 'Sentiment Analysis', projectType: 'Text Classification', tasks: 1200, completed: 1200, annotators: 4, color: '#10b981' },
    ],
    recentAnnotations: [
        { id: 'd1', taskLabel: 'Invoice #2024-089', projectName: 'Document Classification', label: 'invoice', annotator: 'admin', updatedAt: new Date(Date.now() - 5 * 60_000).toISOString() },
        { id: 'd2', taskLabel: 'Product Photo #456', projectName: 'Image Labeling', label: 'electronics', annotator: 'hr.manager', updatedAt: new Date(Date.now() - 15 * 60_000).toISOString() },
    ],
};

const DASHBOARD_QUERY = `
  query StudioLabelStudioDashboard($tenantId: String) {
    studioLabelStudioDashboard(tenantId: $tenantId) {
      configured
      openUrl
      message
      projects { id name projectType tasks completed annotators color }
      recentAnnotations { id taskLabel projectName label annotator updatedAt }
    }
  }
`;

function formatRelativeTime(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms) || ms < 0) return iso;
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 48) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export const labelStudioService = {
    dataMode: LABEL_STUDIO_DATA_MODE,

    formatRelativeTime,

    async getDashboard(tenantId: string = DEFAULT_TENANT_ID): Promise<LabelStudioDashboard> {
        const data = await graphql<{ studioLabelStudioDashboard: LabelStudioDashboard }>(DASHBOARD_QUERY, {
            variables: { tenantId },
        });
        return data.studioLabelStudioDashboard;
    },
};
