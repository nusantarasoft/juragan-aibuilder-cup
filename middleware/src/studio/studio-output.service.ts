import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioContextService } from './studio-context.service';
import { StudioDbContextService } from './studio-db-context.service';
import { assertNoSupabaseError } from './studio-supabase.util';

export type StudioOutputType =
    | 'report'
    | 'mind_map'
    | 'quiz'
    | 'faq'
    | 'audio_script'
    | 'brief'
    | 'data_table';

@Injectable()
export class StudioOutputService {
    private readonly logger = new Logger(StudioOutputService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly contextService: StudioContextService,
        private readonly dbContextService: StudioDbContextService,
    ) {}

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    async listOutputs(notebookId: string): Promise<any[]> {
        const { data, error } = await this.admin()
            .from('studio_outputs')
            .select('*')
            .eq('notebook_id', notebookId)
            .order('created_at', { ascending: false });
        if (error) {
            if (error.code === '42P01') {
                this.logger.warn('studio_outputs table missing — apply migration');
                return [];
            }
            assertNoSupabaseError(error, 'Failed to list studio outputs');
        }
        return data || [];
    }

    async getOutput(outputId: string): Promise<any> {
        const { data, error } = await this.admin()
            .from('studio_outputs')
            .select('*')
            .eq('id', outputId)
            .single();
        if (error || !data) throw new NotFoundException('Output not found');
        return data;
    }

    async deleteOutput(outputId: string): Promise<boolean> {
        const { error } = await this.admin().from('studio_outputs').delete().eq('id', outputId);
        assertNoSupabaseError(error, 'Failed to delete studio output');
        return true;
    }

    async saveOutput(
        notebookId: string,
        outputType: StudioOutputType,
        title: string,
        content: string,
        metadata?: Record<string, unknown>,
    ): Promise<any> {
        const { data, error } = await this.admin()
            .from('studio_outputs')
            .insert({
                notebook_id: notebookId,
                output_type: outputType,
                title,
                content,
                metadata: metadata ?? {},
            })
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to save studio output');
        return data;
    }

    async buildRetrievalContext(
        notebookId: string,
        query: string,
        sourceIds?: string[],
    ): Promise<{ fileContext: string; dbContext: string }> {
        const retrieval = await this.contextService.retrieveContext(
            notebookId,
            query,
            undefined,
            undefined,
            { sourceIds },
        );
        return { fileContext: retrieval.fileContext, dbContext: retrieval.dbContext };
    }

    async generateMindMap(
        notebookId: string,
        notebookName: string,
        generateText: (prompt: string) => Promise<string>,
        sourceIds?: string[],
    ): Promise<{ title: string; content: string }> {
        const { fileContext } = await this.buildRetrievalContext(
            notebookId,
            `Peta konsep utama dari notebook ${notebookName}`,
            sourceIds,
        );
        const prompt = [
            `Buat mind map dalam format markdown untuk notebook "${notebookName}".`,
            'Gunakan heading (# ## ###) dan bullet untuk hierarki. Hanya dari bukti di bawah.',
            fileContext ? `## Sumber\n${fileContext}` : '(Tidak ada sumber terindeks)',
            '',
            'Output: judul singkat di baris pertama sebagai # Judul, lalu struktur mind map.',
        ].join('\n');
        const content = await generateText(prompt);
        const title = `Mind Map — ${notebookName}`;
        return { title, content: content || '# Mind Map\n\n(Tidak ada konten)' };
    }

    async generateQuiz(
        notebookId: string,
        notebookName: string,
        generateText: (prompt: string) => Promise<string>,
        sourceIds?: string[],
    ): Promise<{ title: string; content: string }> {
        const { fileContext } = await this.buildRetrievalContext(
            notebookId,
            `Fakta penting untuk kuis dari ${notebookName}`,
            sourceIds,
        );
        const prompt = [
            `Buat kuis 5-8 pertanyaan (pilihan ganda) dari sumber notebook "${notebookName}".`,
            'Format markdown: setiap soal bernomor, 4 opsi (A-D), beri **Jawaban:** di akhir setiap soal.',
            fileContext ? `## Sumber\n${fileContext}` : '(Tidak ada sumber)',
        ].join('\n');
        const content = await generateText(prompt);
        return { title: `Quiz — ${notebookName}`, content };
    }

    async generateFaq(
        notebookId: string,
        notebookName: string,
        generateText: (prompt: string) => Promise<string>,
        sourceIds?: string[],
    ): Promise<{ title: string; content: string }> {
        const { fileContext } = await this.buildRetrievalContext(
            notebookId,
            `Pertanyaan yang sering diajukan tentang ${notebookName}`,
            sourceIds,
        );
        const prompt = [
            `Buat FAQ 6-10 pasangan Q&A dari notebook "${notebookName}".`,
            'Format markdown dengan ## Pertanyaan / jawaban. Hanya dari sumber.',
            fileContext ? `## Sumber\n${fileContext}` : '',
        ].join('\n');
        const content = await generateText(prompt);
        return { title: `FAQ — ${notebookName}`, content };
    }

    async generateAudioScript(
        notebookId: string,
        notebookName: string,
        generateText: (prompt: string) => Promise<string>,
        sourceIds?: string[],
    ): Promise<{ title: string; content: string }> {
        const { fileContext } = await this.buildRetrievalContext(
            notebookId,
            `Ringkasan mendalam ${notebookName}`,
            sourceIds,
        );
        const prompt = [
            `Tulis naskah podcast 2 pembicara (Host & Expert) yang membahas notebook "${notebookName}".`,
            'Format dialog dengan label **Host:** dan **Expert:**. Durasi baca ~5 menit. Bahasa Indonesia.',
            fileContext ? `## Sumber\n${fileContext}` : '',
        ].join('\n');
        const content = await generateText(prompt);
        return { title: `Audio Script — ${notebookName}`, content };
    }

    async generateDataTable(
        notebookId: string,
        notebookName: string,
        query: string,
        generateText: (prompt: string) => Promise<string>,
        sourceIds?: string[],
    ): Promise<{ title: string; content: string }> {
        const { fileContext } = await this.buildRetrievalContext(notebookId, query, sourceIds);
        const prompt = [
            `Ekstrak data terstruktur sebagai tabel markdown dari notebook "${notebookName}".`,
            `Fokus: ${query}`,
            'Gunakan tabel markdown dengan header. Hanya fakta dari sumber.',
            fileContext ? `## Sumber\n${fileContext}` : '',
        ].join('\n');
        const content = await generateText(prompt);
        return { title: `Data Table — ${notebookName}`, content };
    }
}
