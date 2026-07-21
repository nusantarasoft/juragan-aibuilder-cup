import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioContextService } from './studio-context.service';
import { StudioDbContextService } from './studio-db-context.service';
import { assertNoSupabaseError } from './studio-supabase.util';

export type StudioReportStyle = 'study_guide' | 'briefing_doc' | 'timeline' | 'blog_post';

export type StudioOutputType =
    | 'report'
    | 'mind_map'
    | 'quiz'
    | 'flashcards'
    | 'faq'
    | 'audio_script'
    | 'video_overview'
    | 'brief'
    | 'data_table'
    | StudioReportStyle;

/** Preset "Reports" that mirror NotebookLM's Studio report types. */
export const STUDIO_REPORT_PRESETS: Record<
    StudioReportStyle,
    { label: string; query: string; instructions: string[] }
> = {
    study_guide: {
        label: 'Study Guide',
        query: 'Konsep utama, istilah, dan poin pembelajaran',
        instructions: [
            'Buat PANDUAN BELAJAR (study guide) terstruktur dalam Bahasa Indonesia.',
            'Struktur wajib: ## Ringkasan, ## Konsep Kunci (istilah + definisi singkat), ## Poin Penting (bullet), ## Pertanyaan Review (5-8 soal), ## Glosarium.',
        ],
    },
    briefing_doc: {
        label: 'Briefing Doc',
        query: 'Ringkasan eksekutif, temuan utama, dan implikasi',
        instructions: [
            'Buat DOKUMEN BRIEFING eksekutif dalam Bahasa Indonesia.',
            'Struktur wajib: ## Ringkasan Eksekutif, ## Tema & Temuan Utama, ## Kutipan/Fakta Penting, ## Implikasi & Rekomendasi.',
        ],
    },
    timeline: {
        label: 'Timeline',
        query: 'Kronologi peristiwa, tanggal, dan tonggak penting',
        instructions: [
            'Buat TIMELINE kronologis dari sumber dalam Bahasa Indonesia.',
            'Urutkan peristiwa dari terlama ke terbaru. Format: daftar bertanda dengan **tanggal/periode** diikuti deskripsi. Sertakan ## Ikhtisar singkat di awal.',
            'Jika tanggal tidak eksplisit, susun berdasarkan urutan logis dan tandai sebagai perkiraan.',
        ],
    },
    blog_post: {
        label: 'Blog Post',
        query: 'Narasi menarik dan wawasan utama untuk artikel',
        instructions: [
            'Tulis ARTIKEL BLOG yang menarik dan mudah dibaca dalam Bahasa Indonesia berdasarkan sumber.',
            'Struktur: # Judul menarik, paragraf pembuka, beberapa ## subjudul dengan penjelasan, dan ## Penutup. Gaya informatif namun ramah.',
        ],
    },
};

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
            `Buat kuis 5-8 pertanyaan pilihan ganda dari sumber notebook "${notebookName}".`,
            'Kembalikan HANYA JSON valid (tanpa markdown fences). Bentuk persis:',
            '{"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":0,"explanation":"..."}]}',
            'Setiap soal 4 opsi. answerIndex adalah indeks 0-3 dari opsi yang benar. explanation singkat. Hanya dari sumber.',
            fileContext ? `## Sumber\n${fileContext}` : '(Tidak ada sumber)',
        ].join('\n');
        const content = await generateText(prompt);
        return { title: `Quiz — ${notebookName}`, content };
    }

    async generateFlashcards(
        notebookId: string,
        notebookName: string,
        generateText: (prompt: string) => Promise<string>,
        sourceIds?: string[],
    ): Promise<{ title: string; content: string }> {
        const { fileContext } = await this.buildRetrievalContext(
            notebookId,
            `Istilah, konsep, dan fakta penting untuk kartu belajar dari ${notebookName}`,
            sourceIds,
        );
        const prompt = [
            `Buat 8-15 kartu belajar (flashcards) dari sumber notebook "${notebookName}".`,
            'Kembalikan HANYA JSON valid (tanpa markdown fences). Bentuk persis:',
            '{"cards":[{"front":"istilah/pertanyaan singkat","back":"definisi/jawaban ringkas"}]}',
            'front singkat (istilah atau pertanyaan), back ringkas dan jelas. Hanya dari sumber.',
            fileContext ? `## Sumber\n${fileContext}` : '(Tidak ada sumber)',
        ].join('\n');
        const content = await generateText(prompt);
        return { title: `Flashcards — ${notebookName}`, content };
    }

    async generateVideoOverview(
        notebookId: string,
        notebookName: string,
        generateText: (prompt: string) => Promise<string>,
        sourceIds?: string[],
    ): Promise<{ title: string; content: string }> {
        const { fileContext } = await this.buildRetrievalContext(
            notebookId,
            `Ikhtisar visual bertahap (slide) untuk ${notebookName}`,
            sourceIds,
        );
        const prompt = [
            `Buat VIDEO OVERVIEW (slide bernarasi) dari sumber notebook "${notebookName}".`,
            'Kembalikan HANYA JSON valid (tanpa markdown fences). Bentuk persis:',
            '{"title":"...","slides":[{"heading":"judul slide","bullets":["poin 1","poin 2"],"narration":"kalimat narasi yang dibacakan untuk slide ini"}]}',
            '6-10 slide. heading singkat, 2-4 bullet ringkas, narration 1-3 kalimat naratif yang mengalir. Hanya dari sumber.',
            fileContext ? `## Sumber\n${fileContext}` : '(Tidak ada sumber)',
        ].join('\n');
        const content = await generateText(prompt);
        return { title: `Video Overview — ${notebookName}`, content };
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
        opts?: { length?: 'short' | 'default' | 'long'; focus?: string },
    ): Promise<{ title: string; content: string }> {
        const focus = opts?.focus?.trim();
        const { fileContext } = await this.buildRetrievalContext(
            notebookId,
            focus ? `${focus} — ${notebookName}` : `Ringkasan mendalam ${notebookName}`,
            sourceIds,
        );
        const lengthGuide: Record<'short' | 'default' | 'long', string> = {
            short: 'Durasi baca ~3 menit (ringkas, 6-10 giliran bicara).',
            default: 'Durasi baca ~5 menit (12-18 giliran bicara).',
            long: 'Durasi baca ~10 menit (mendalam, 20-30 giliran bicara).',
        };
        const length = opts?.length ?? 'default';
        const prompt = [
            `Tulis naskah podcast 2 pembicara (Host & Expert) yang membahas notebook "${notebookName}".`,
            `Format dialog dengan label **Host:** dan **Expert:**. ${lengthGuide[length]} Bahasa Indonesia.`,
            focus ? `Fokus utama pembahasan: ${focus}.` : '',
            fileContext ? `## Sumber\n${fileContext}` : '',
        ].filter(Boolean).join('\n');
        const content = await generateText(prompt);
        return { title: `Audio Script — ${notebookName}`, content };
    }

    async generateReportPreset(
        notebookId: string,
        notebookName: string,
        style: StudioReportStyle,
        generateText: (prompt: string) => Promise<string>,
        sourceIds?: string[],
    ): Promise<{ title: string; content: string }> {
        const preset = STUDIO_REPORT_PRESETS[style];
        const { fileContext } = await this.buildRetrievalContext(
            notebookId,
            `${preset.query} dari notebook ${notebookName}`,
            sourceIds,
        );
        const prompt = [
            ...preset.instructions,
            'Hanya gunakan bukti dari sumber di bawah. Gunakan markdown. Kutip nama file bila relevan. Nyatakan asumsi jika bukti tipis.',
            fileContext ? `## Sumber\n${fileContext}` : '(Tidak ada sumber terindeks)',
        ].join('\n');
        const content = await generateText(prompt);
        return {
            title: `${preset.label} — ${notebookName}`,
            content: content || `# ${preset.label}\n\n(Tidak ada konten)`,
        };
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
