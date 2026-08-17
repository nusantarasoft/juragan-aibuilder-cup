import { describe, expect, it } from 'vitest';
import { parseAddProductMessage } from './studio-umkm-ops.util';
import { DEFAULT_UMKM_COMMANDS, formatWelcomeFromCommands } from './studio-umkm-commands';
import {
    detectUmkmIntent,
    extractStockProductQuery,
    isUmkmGreetingOnly,
    parsePendingQtyCorrection,
} from './studio-umkm.util';

// Regression: ISSUE-001 — shop-owner WhatsApp sounded like a rigid bot / RAG indexer
// Found by /qa on 2026-08-17
// Report: .gstack/qa-reports/qa-report-umkm-wa-2026-08-17.md

describe('QA regression — natural warung WhatsApp', () => {
    it('S1 open-shop greeting is welcome, not RAG', () => {
        expect(isUmkmGreetingOnly('pagi, baru buka toko nih')).toBe(true);
        expect(formatWelcomeFromCommands(DEFAULT_UMKM_COMMANDS)).toMatch(/Siap bantu catat jualan/i);
        expect(formatWelcomeFromCommands(DEFAULT_UMKM_COMMANDS)).not.toMatch(/mengindeks/i);
    });

    it('S2 bantuan + catat jualan stays help', () => {
        expect(detectUmkmIntent('bantuan dong, mau catat jualan')).toBe('help');
    });

    it('S4 tambah barang does not eat "harga jual" into the name', () => {
        const p = parseAddProductMessage(
            'tambah barang indomie goreng harga jual 3500 modal 3000',
        );
        expect(p?.name.toLowerCase()).toBe('indomie goreng');
        expect(p?.sellingPrice).toBe(3500);
        expect(p?.costPrice).toBe(3000);
    });

    it('S5 natural "ada yang beli" is a sale', () => {
        expect(detectUmkmIntent('tadi ada yang beli 2 indomie goreng')).toBe('record_sale');
    });

    it('S6 qty correction from pending preview', () => {
        expect(parsePendingQtyCorrection('salah deh, maksudnya 2')).toBe(2);
    });

    it('S7 stock query strips filler words', () => {
        expect(extractStockProductQuery('stok indomie goreng masih berapa?')).toMatch(
            /indomie goreng/i,
        );
    });

    it('S10 restock advice is ask, not stock search', () => {
        expect(
            detectUmkmIntent('kalau stok indomie mau habis, mending restock berapa?'),
        ).toBe('ask');
    });
});
