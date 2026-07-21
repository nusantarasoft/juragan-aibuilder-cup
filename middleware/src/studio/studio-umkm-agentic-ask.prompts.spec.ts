import { describe, expect, it } from 'vitest';
import {
    buildAgenticAskSynthesizePrompt,
    formatSuggestMenuActionContent,
} from './studio-umkm-agentic-ask.prompts';
import type { AgenticAskToolResult } from './studio-umkm-agentic-ask.types';

describe('buildAgenticAskSynthesizePrompt', () => {
    const okTool: AgenticAskToolResult = { name: 'get_stock', ok: true, content: 'Stok: 10' };
    const failTool: AgenticAskToolResult = { name: 'search_docs', ok: false, content: '' };

    it('renders OK/GAGAL statuses and empty content placeholder', () => {
        const prompt = buildAgenticAskSynthesizePrompt({
            notebookName: 'Toko',
            question: 'berapa stok?',
            toolResults: [okTool, failTool],
            conversationLines: ['User: hai', 'Asisten: halo'],
            instruction: 'Fokus stok',
        });
        expect(prompt).toContain('get_stock` [OK]');
        expect(prompt).toContain('search_docs` [GAGAL]');
        expect(prompt).toContain('(kosong)');
        expect(prompt).toContain('Instruksi tambahan: Fokus stok');
        expect(prompt).toContain('User: hai');
        expect(prompt).toContain('## Pertanyaan\nberapa stok?');
    });

    it('handles no tools, no instruction, and no conversation lines', () => {
        const prompt = buildAgenticAskSynthesizePrompt({
            notebookName: 'Toko',
            question: 'apa kabar?',
            toolResults: [],
        });
        expect(prompt).toContain('(tidak ada tool yang dijalankan)');
        expect(prompt).toContain('(belum ada)');
        expect(prompt).not.toContain('Instruksi tambahan');
    });

    it('ignores a whitespace-only instruction', () => {
        const prompt = buildAgenticAskSynthesizePrompt({
            notebookName: 'Toko',
            question: 'q',
            toolResults: [okTool],
            conversationLines: [],
            instruction: '   ',
        });
        expect(prompt).not.toContain('Instruksi tambahan');
        expect(prompt).toContain('(belum ada)');
    });

    it('truncates conversation to the last 6 lines', () => {
        const lines = Array.from({ length: 10 }, (_, i) => `L${i}`);
        const prompt = buildAgenticAskSynthesizePrompt({
            notebookName: 'Toko',
            question: 'q',
            toolResults: [okTool],
            conversationLines: lines,
        });
        expect(prompt).toContain('L9');
        expect(prompt).not.toContain('L3');
    });
});

describe('formatSuggestMenuActionContent', () => {
    it('lists the numeric menu', () => {
        const out = formatSuggestMenuActionContent();
        expect(out).toContain('*5* Tambah penjualan');
        expect(out).toContain('*0* Bantuan');
    });
});
