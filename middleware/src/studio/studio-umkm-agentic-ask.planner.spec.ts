import { describe, expect, it } from 'vitest';
import {
    planAgenticAskTools,
    isAgenticAskToolName,
} from './studio-umkm-agentic-ask.planner';
import { AGENTIC_ASK_MAX_TOOLS } from './studio-umkm-agentic-ask.types';
import { formatSuggestMenuActionContent } from './studio-umkm-agentic-ask.prompts';

describe('planAgenticAskTools', () => {
    it('POSITIF stok → get_stock', () => {
        const p = planAgenticAskTools('cek stok mie ayam');
        expect(p.tools.some((t) => t.name === 'get_stock')).toBe(true);
        expect(p.tools.find((t) => t.name === 'get_stock')?.productQuery).toMatch(/mie/i);
    });

    it('POSITIF omzet + belanja → combined report (multi-hop intent)', () => {
        const p = planAgenticAskTools('berapa omzet dan belanja hari ini');
        expect(p.tools.some((t) => t.name === 'get_combined_report')).toBe(true);
    });

    it('POSITIF penjualan saja → sales summary', () => {
        const p = planAgenticAskTools('penjualan hari ini berapa');
        expect(p.tools.some((t) => t.name === 'get_sales_summary' || t.name === 'get_combined_report')).toBe(
            true,
        );
    });

    it('POSITIF daftar menu → list_products', () => {
        const p = planAgenticAskTools('daftar menu apa saja');
        expect(p.tools.some((t) => t.name === 'list_products')).toBe(true);
    });

    it('POSITIF tips omzet → report + docs (advice multi-tool)', () => {
        const p = planAgenticAskTools('tips tingkatkan omzet toko');
        const names = p.tools.map((t) => t.name);
        expect(names).toContain('get_combined_report');
        expect(names).toContain('search_docs');
        expect(p.reason).toMatch(/advice/);
    });

    it('POSITIF bagaimana menaikkan omzet → advice (bukan dump sales saja)', () => {
        const p = planAgenticAskTools(
            'Bagaimana cara menaikkan omzet usaha saya hingga 20%',
        );
        expect(p.reason).toMatch(/advice/);
        expect(p.tools.some((t) => t.name === 'search_docs')).toBe(true);
        expect(p.tools.some((t) => t.name === 'get_combined_report')).toBe(true);
        expect(p.reason).not.toBe('sales');
    });

    it('POSITIF bagaimana meningkatkan omset → advice', () => {
        const p = planAgenticAskTools('bagaimana cara meningkatkan omset');
        expect(p.reason).toMatch(/advice/);
        expect(p.tools.some((t) => t.name === 'search_docs')).toBe(true);
    });

    it('POSITIF cara catat jual → suggest menu (bukan tulis)', () => {
        const p = planAgenticAskTools('bagaimana cara catat penjualan');
        expect(p.tools.some((t) => t.name === 'suggest_menu_action')).toBe(true);
        expect(p.reason).toMatch(/howto/);
    });

    it('NEGATIF aksi tulis langsung → hanya suggest_menu_action', () => {
        const p = planAgenticAskTools('jual 2 mie ayam 30000');
        expect(p.tools).toEqual([{ name: 'suggest_menu_action' }]);
        expect(p.reason).toBe('write_action_redirect');
    });

    it('NEGATIF tambah menu → redirect', () => {
        const p = planAgenticAskTools('tambah menu bakso 15000');
        expect(p.tools.every((t) => t.name === 'suggest_menu_action')).toBe(true);
    });

    it('cap max tools', () => {
        const p = planAgenticAskTools(
            'tips tingkatkan omzet daftar menu stok mie belanja dan laporan semua',
        );
        expect(p.tools.length).toBeLessThanOrEqual(AGENTIC_ASK_MAX_TOOLS);
    });

    it('empty → suggest', () => {
        expect(planAgenticAskTools('').tools[0].name).toBe('suggest_menu_action');
    });

    it('menu hint content lengkap', () => {
        const c = formatSuggestMenuActionContent();
        expect(c).toMatch(/\*1\*/);
        expect(c).toMatch(/\*5\*/);
        expect(c).toMatch(/ya/);
    });

    it('general soft question → docs + suggest (no live context)', () => {
        const p = planAgenticAskTools('apa kabar semua');
        const names = p.tools.map((t) => t.name);
        expect(names).toContain('search_docs');
        expect(names).toContain('suggest_menu_action');
        expect(names).not.toContain('get_combined_report');
        expect(p.reason).toBe('general');
    });

    it('general question mentioning toko → adds live combined_report', () => {
        const p = planAgenticAskTools('info toko dong');
        const names = p.tools.map((t) => t.name);
        expect(names).toContain('search_docs');
        expect(names).toContain('get_combined_report');
        expect(names).toContain('suggest_menu_action');
    });

    it('catalog request also fetches list_products', () => {
        const p = planAgenticAskTools('produk apa saja yang ada');
        expect(p.tools.some((t) => t.name === 'list_products')).toBe(true);
        expect(p.reason).toMatch(/catalog/);
    });

    it('purchase-only question → purchases summary', () => {
        const p = planAgenticAskTools('belanja hari ini berapa');
        expect(p.tools.some((t) => t.name === 'get_purchases_summary')).toBe(true);
    });

    it('generic stock question without a product → get_stock with no productQuery', () => {
        const p = planAgenticAskTools('berapa stok sekarang');
        const stock = p.tools.find((t) => t.name === 'get_stock');
        expect(stock).toBeDefined();
        expect(stock?.productQuery).toBeUndefined();
    });
});

describe('isAgenticAskToolName', () => {
    it('recognizes known tool names', () => {
        expect(isAgenticAskToolName('get_stock')).toBe(true);
        expect(isAgenticAskToolName('search_docs')).toBe(true);
    });
    it('rejects unknown tool names', () => {
        expect(isAgenticAskToolName('nope')).toBe(false);
    });
});
