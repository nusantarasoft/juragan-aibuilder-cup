import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AccountingService {
    private readonly logger = new Logger(AccountingService.name);
    constructor(private supabaseService: SupabaseService) {}
    private get db() { return this.supabaseService.getAdminClient(); }

    // ─── CURRENCIES ─────────────────────────────────────────
    async getCurrencies(tenantId: string) {
        const { data, error } = await this.db.from('acct_currencies').select('*').eq('tenant_id', tenantId).order('is_default', { ascending: false });
        if (error) throw error;
        return data;
    }
    async upsertCurrency(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('acct_currencies').upsert({
            tenant_id: tenantId, code: input.code, name: input.name, symbol: input.symbol || '',
            decimal_places: input.decimalPlaces ?? 2, is_default: input.isDefault ?? false,
            exchange_rate: input.exchangeRate ?? 1, rate_date: input.rateDate || new Date().toISOString().slice(0, 10),
            status: input.status || 'active', updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,code' }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── FISCAL PERIODS ─────────────────────────────────────
    async getFiscalPeriods(tenantId: string) {
        const { data, error } = await this.db.from('acct_fiscal_periods').select('*').eq('tenant_id', tenantId).order('start_date', { ascending: false });
        if (error) throw error;
        return data;
    }
    async createFiscalPeriod(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('acct_fiscal_periods').insert({
            tenant_id: tenantId, name: input.name, period_type: input.periodType || 'month',
            parent_id: input.parentId || null, start_date: input.startDate, end_date: input.endDate,
            status: input.status || 'open',
        }).select().single();
        if (error) throw error;
        return data;
    }
    async closeFiscalPeriod(id: string, closedBy: string) {
        const { data, error } = await this.db.from('acct_fiscal_periods').update({
            status: 'closed', closed_by: closedBy, closed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── CHART OF ACCOUNTS ──────────────────────────────────
    async getAccounts(tenantId: string, filters?: { accountType?: string; status?: string; search?: string }) {
        let query = this.db.from('acct_accounts').select('*').eq('tenant_id', tenantId);
        if (filters?.accountType) query = query.eq('account_type', filters.accountType);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,account_code.ilike.%${filters.search}%`);
        const { data, error } = await query.order('account_code');
        if (error) throw error;
        return data;
    }
    async getAccount(id: string) {
        const { data, error } = await this.db.from('acct_accounts').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }
    async createAccount(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('acct_accounts').insert({
            tenant_id: tenantId, account_code: input.accountCode, name: input.name,
            account_type: input.accountType, account_subtype: input.accountSubtype || null,
            parent_id: input.parentId || null, currency_code: input.currencyCode || 'IDR',
            description: input.description || null, is_header: input.isHeader ?? false,
            opening_balance: input.openingBalance ?? 0, current_balance: input.openingBalance ?? 0,
            normal_balance: input.normalBalance || (['asset', 'expense'].includes(input.accountType) ? 'debit' : 'credit'),
            tags: input.tags || [], status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }
    async updateAccount(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            accountCode: 'account_code', name: 'name', accountType: 'account_type',
            accountSubtype: 'account_subtype', parentId: 'parent_id', currencyCode: 'currency_code',
            description: 'description', isHeader: 'is_header', normalBalance: 'normal_balance',
            tags: 'tags', status: 'status',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('acct_accounts').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    async deleteAccount(id: string) {
        const { data: acct } = await this.db.from('acct_accounts').select('is_system').eq('id', id).single();
        if (acct?.is_system) throw new Error('Cannot delete system account');
        const { error } = await this.db.from('acct_accounts').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── COST CENTERS ───────────────────────────────────────
    async getCostCenters(tenantId: string) {
        const { data, error } = await this.db.from('acct_cost_centers').select('*').eq('tenant_id', tenantId).order('code');
        if (error) throw error;
        return data;
    }
    async createCostCenter(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('acct_cost_centers').insert({
            tenant_id: tenantId, code: input.code, name: input.name,
            parent_id: input.parentId || null, manager: input.manager || null,
            description: input.description || null, status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }
    async updateCostCenter(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        for (const [k, c] of Object.entries({ code: 'code', name: 'name', parentId: 'parent_id', manager: 'manager', description: 'description', status: 'status' })) {
            if (input[k] !== undefined) updates[c] = input[k];
        }
        const { data, error } = await this.db.from('acct_cost_centers').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    async deleteCostCenter(id: string) {
        const { error } = await this.db.from('acct_cost_centers').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── TAXES ──────────────────────────────────────────────
    async getTaxes(tenantId: string) {
        const { data, error } = await this.db.from('acct_taxes').select('*').eq('tenant_id', tenantId).order('code');
        if (error) throw error;
        return data;
    }
    async createTax(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('acct_taxes').insert({
            tenant_id: tenantId, code: input.code, name: input.name, tax_type: input.taxType,
            rate: input.rate, is_inclusive: input.isInclusive ?? false, account_id: input.accountId || null,
            description: input.description || null, effective_from: input.effectiveFrom || null,
            effective_to: input.effectiveTo || null, is_default: input.isDefault ?? false,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }
    async updateTax(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        for (const [k, c] of Object.entries({ code: 'code', name: 'name', taxType: 'tax_type', rate: 'rate', isInclusive: 'is_inclusive', accountId: 'account_id', description: 'description', effectiveFrom: 'effective_from', effectiveTo: 'effective_to', isDefault: 'is_default', status: 'status' })) {
            if (input[k] !== undefined) updates[c] = input[k];
        }
        const { data, error } = await this.db.from('acct_taxes').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    async deleteTax(id: string) {
        const { error } = await this.db.from('acct_taxes').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── CONTACTS ───────────────────────────────────────────
    async getContacts(tenantId: string, filters?: { contactType?: string; search?: string }) {
        let query = this.db.from('acct_contacts').select('*').eq('tenant_id', tenantId);
        if (filters?.contactType) query = query.eq('contact_type', filters.contactType);
        if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }
    async createContact(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('acct_contacts').insert({
            tenant_id: tenantId, contact_type: input.contactType, code: input.code || null,
            name: input.name, company: input.company || null, email: input.email || null,
            phone: input.phone || null, address: input.address || null, city: input.city || null,
            country: input.country || 'Indonesia', tax_id_number: input.taxIdNumber || null,
            default_account_id: input.defaultAccountId || null, currency_code: input.currencyCode || 'IDR',
            payment_terms: input.paymentTerms ?? 30, credit_limit: input.creditLimit || null,
            notes: input.notes || null, crm_account_id: input.crmAccountId || null,
            inv_supplier_id: input.invSupplierId || null, status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }
    async updateContact(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        for (const [k, c] of Object.entries({ contactType: 'contact_type', code: 'code', name: 'name', company: 'company', email: 'email', phone: 'phone', address: 'address', city: 'city', country: 'country', taxIdNumber: 'tax_id_number', defaultAccountId: 'default_account_id', currencyCode: 'currency_code', paymentTerms: 'payment_terms', creditLimit: 'credit_limit', notes: 'notes', status: 'status' })) {
            if (input[k] !== undefined) updates[c] = input[k];
        }
        const { data, error } = await this.db.from('acct_contacts').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }
    async deleteContact(id: string) {
        const { error } = await this.db.from('acct_contacts').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── JOURNAL ENTRIES ────────────────────────────────────
    private async generateJournalNumber(tenantId: string, type: string) {
        const prefix = { general: 'JV', adjusting: 'AJ', closing: 'CL', opening: 'OP', reversal: 'RV' }[type] || 'JV';
        const year = new Date().getFullYear();
        const { count } = await this.db.from('acct_journals').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `${prefix}-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
    }

    async getJournals(tenantId: string, filters?: { status?: string; journalType?: string; dateFrom?: string; dateTo?: string; search?: string }) {
        let query = this.db.from('acct_journals').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.journalType) query = query.eq('journal_type', filters.journalType);
        if (filters?.dateFrom) query = query.gte('journal_date', filters.dateFrom);
        if (filters?.dateTo) query = query.lte('journal_date', filters.dateTo);
        if (filters?.search) query = query.or(`journal_number.ilike.%${filters.search}%,reference.ilike.%${filters.search}%,memo.ilike.%${filters.search}%`);
        const { data, error } = await query.order('journal_date', { ascending: false }).order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        return data;
    }

    async getJournal(id: string) {
        const { data, error } = await this.db.from('acct_journals').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async getJournalLines(journalId: string) {
        const { data, error } = await this.db.from('acct_journal_lines').select('*').eq('journal_id', journalId).order('line_number');
        if (error) throw error;
        return data;
    }

    async createJournal(tenantId: string, input: Record<string, any>) {
        const journalNumber = await this.generateJournalNumber(tenantId, input.journalType || 'general');
        const lines = input.lines || [];

        // Validate debit = credit
        const totalDebit = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
        const totalCredit = lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.001) {
            throw new Error(`Journal unbalanced: debit ${totalDebit} != credit ${totalCredit}`);
        }
        if (lines.length < 2) throw new Error('Journal must have at least 2 lines');

        const exchangeRate = input.exchangeRate ?? 1;

        const { data: journal, error } = await this.db.from('acct_journals').insert({
            tenant_id: tenantId, journal_number: journalNumber,
            journal_type: input.journalType || 'general', fiscal_period_id: input.fiscalPeriodId || null,
            journal_date: input.journalDate || new Date().toISOString().slice(0, 10),
            reference: input.reference || null, memo: input.memo || null,
            currency_code: input.currencyCode || 'IDR', exchange_rate: exchangeRate,
            total_debit: totalDebit, total_credit: totalCredit,
            source_module: input.sourceModule || 'manual', source_id: input.sourceId || null,
            status: 'draft', tags: input.tags || [], attachments: input.attachments || [],
        }).select().single();
        if (error) throw error;

        // Insert lines
        const lineRows = lines.map((l: any, i: number) => ({
            journal_id: journal.id, line_number: i + 1, account_id: l.accountId,
            cost_center_id: l.costCenterId || null, description: l.description || null,
            debit: l.debit || 0, credit: l.credit || 0,
            currency_code: input.currencyCode || 'IDR', exchange_rate: exchangeRate,
            base_debit: (l.debit || 0) * exchangeRate, base_credit: (l.credit || 0) * exchangeRate,
            tax_id: l.taxId || null, tax_amount: l.taxAmount || 0, reference: l.reference || null,
        }));
        const { error: lineErr } = await this.db.from('acct_journal_lines').insert(lineRows);
        if (lineErr) throw lineErr;

        return journal;
    }

    async postJournal(id: string, postedBy: string) {
        const { data: journal } = await this.db.from('acct_journals').select('status, total_debit, total_credit').eq('id', id).single();
        if (!journal) throw new Error('Journal not found');
        if (journal.status !== 'draft') throw new Error(`Cannot post journal in status: ${journal.status}`);
        if (Math.abs(journal.total_debit - journal.total_credit) > 0.001) throw new Error('Journal is unbalanced');

        const { data, error } = await this.db.from('acct_journals').update({
            status: 'posted', posted_by: postedBy, posted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async reverseJournal(id: string, reversedBy: string) {
        const { data: original } = await this.db.from('acct_journals').select('*').eq('id', id).single();
        if (!original) throw new Error('Journal not found');
        if (original.status !== 'posted') throw new Error('Only posted journals can be reversed');

        // Mark original as reversed
        await this.db.from('acct_journals').update({
            status: 'reversed', reversed_by: reversedBy, reversed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', id);

        // Get original lines
        const { data: origLines } = await this.db.from('acct_journal_lines').select('*').eq('journal_id', id);

        // Create reversal journal with swapped debits/credits
        const reversalInput = {
            journalType: 'reversal', journalDate: new Date().toISOString().slice(0, 10),
            reference: `Reversal of ${original.journal_number}`, memo: `Reversal of ${original.journal_number}`,
            currencyCode: original.currency_code, exchangeRate: original.exchange_rate,
            lines: (origLines || []).map((l: any) => ({
                accountId: l.account_id, costCenterId: l.cost_center_id,
                description: `Reversal: ${l.description || ''}`, debit: l.credit, credit: l.debit,
                taxId: l.tax_id, taxAmount: l.tax_amount,
            })),
        };
        const reversal = await this.createJournal(original.tenant_id, reversalInput);

        // Link and auto-post the reversal
        await this.db.from('acct_journals').update({ reversal_of: id }).eq('id', reversal.id);
        await this.postJournal(reversal.id, reversedBy);
        return reversal;
    }

    async deleteJournal(id: string) {
        const { data } = await this.db.from('acct_journals').select('status').eq('id', id).single();
        if (data?.status === 'posted') throw new Error('Cannot delete posted journal');
        const { error } = await this.db.from('acct_journals').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── GENERAL LEDGER ─────────────────────────────────────
    async getGeneralLedger(tenantId: string, accountId: string, filters?: { dateFrom?: string; dateTo?: string }) {
        let query = this.db.from('acct_journal_lines').select(`
            *, acct_journals!inner(tenant_id, journal_number, journal_date, memo, status)
        `).eq('account_id', accountId).eq('acct_journals.tenant_id', tenantId).eq('acct_journals.status', 'posted');
        if (filters?.dateFrom) query = query.gte('acct_journals.journal_date', filters.dateFrom);
        if (filters?.dateTo) query = query.lte('acct_journals.journal_date', filters.dateTo);
        const { data, error } = await query.order('acct_journals(journal_date)').order('line_number');
        if (error) throw error;
        return data;
    }

    // ─── TRIAL BALANCE ──────────────────────────────────────
    async getTrialBalance(tenantId: string, asOfDate?: string) {
        const accounts = await this.getAccounts(tenantId, { status: 'active' });
        // Get all posted journal lines up to asOfDate
        let query = this.db.from('acct_journal_lines').select(`
            account_id, base_debit, base_credit,
            acct_journals!inner(tenant_id, journal_date, status)
        `).eq('acct_journals.tenant_id', tenantId).eq('acct_journals.status', 'posted');
        if (asOfDate) query = query.lte('acct_journals.journal_date', asOfDate);
        const { data: lines } = await query;

        const balanceMap = new Map<string, { debit: number; credit: number }>();
        for (const line of (lines || []) as any[]) {
            const existing = balanceMap.get(line.account_id) || { debit: 0, credit: 0 };
            existing.debit += line.base_debit || 0;
            existing.credit += line.base_credit || 0;
            balanceMap.set(line.account_id, existing);
        }

        return (accounts || []).filter((a: any) => !a.is_header).map((a: any) => {
            const bal = balanceMap.get(a.id) || { debit: 0, credit: 0 };
            return {
                accountId: a.id, accountCode: a.account_code, accountName: a.name,
                accountType: a.account_type, debit: bal.debit, credit: bal.credit,
                balance: a.opening_balance + bal.debit - bal.credit,
            };
        });
    }

    // ─── DASHBOARD STATS ────────────────────────────────────
    async getDashboardStats(tenantId: string) {
        const { count: totalAccounts } = await this.db.from('acct_accounts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active');
        const { count: totalJournals } = await this.db.from('acct_journals').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        const { count: postedJournals } = await this.db.from('acct_journals').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'posted');
        const { count: draftJournals } = await this.db.from('acct_journals').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'draft');

        // Revenue, Expenses, Assets, Liabilities totals from current balances
        const { data: accounts } = await this.db.from('acct_accounts').select('account_type, current_balance, is_header').eq('tenant_id', tenantId).eq('status', 'active').eq('is_header', false);
        let totalRevenue = 0, totalExpenses = 0, totalAssets = 0, totalLiabilities = 0, totalEquity = 0;
        for (const a of (accounts || []) as any[]) {
            switch (a.account_type) {
                case 'revenue': totalRevenue += Math.abs(a.current_balance || 0); break;
                case 'expense': totalExpenses += Math.abs(a.current_balance || 0); break;
                case 'asset': totalAssets += a.current_balance || 0; break;
                case 'liability': totalLiabilities += Math.abs(a.current_balance || 0); break;
                case 'equity': totalEquity += Math.abs(a.current_balance || 0); break;
            }
        }

        // Recent journals
        const { data: recentJournals } = await this.db.from('acct_journals').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10);

        return {
            totalAccounts: totalAccounts || 0, totalJournals: totalJournals || 0,
            postedJournals: postedJournals || 0, draftJournals: draftJournals || 0,
            totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses,
            totalAssets, totalLiabilities, totalEquity,
            recentJournals: recentJournals || [],
        };
    }

    // ─── INVOICES (AP / AR) ────────────────────────────────
    async getInvoices(tenantId: string, filters?: { invoiceType?: string; status?: string; contactId?: string; search?: string }) {
        let query = this.db.from('acct_invoices').select('*').eq('tenant_id', tenantId);
        if (filters?.invoiceType) query = query.eq('invoice_type', filters.invoiceType);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.contactId) query = query.eq('contact_id', filters.contactId);
        if (filters?.search) query = query.or(`invoice_number.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`);
        const { data, error } = await query.order('invoice_date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getInvoice(id: string) {
        const { data, error } = await this.db.from('acct_invoices').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async getInvoiceLines(invoiceId: string) {
        const { data, error } = await this.db.from('acct_invoice_lines').select('*').eq('invoice_id', invoiceId).order('line_number');
        if (error) throw error;
        return data;
    }

    private async generateInvoiceNumber(tenantId: string, type: string): Promise<string> {
        const prefix = type === 'payable' ? 'BILL' : 'INV';
        const year = new Date().getFullYear();
        const { count } = await this.db.from('acct_invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('invoice_type', type).ilike('invoice_number', `${prefix}-${year}-%`);
        return `${prefix}-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
    }

    async createInvoice(tenantId: string, input: Record<string, any>) {
        const invoiceNumber = input.invoiceNumber || await this.generateInvoiceNumber(tenantId, input.invoiceType);
        const lines = input.lines || [];
        const subtotal = lines.reduce((s: number, l: any) => s + (l.amount || (l.quantity || 1) * (l.unitPrice || 0)), 0);
        const taxAmount = lines.reduce((s: number, l: any) => s + (l.taxAmount || 0), 0);
        const totalAmount = subtotal + taxAmount;

        const { data, error } = await this.db.from('acct_invoices').insert({
            tenant_id: tenantId, invoice_type: input.invoiceType, invoice_number: invoiceNumber,
            contact_id: input.contactId || null, contact_name: input.contactName || '',
            invoice_date: input.invoiceDate || new Date().toISOString().slice(0, 10),
            due_date: input.dueDate, currency_code: input.currencyCode || 'IDR',
            exchange_rate: input.exchangeRate || 1, subtotal, tax_amount: taxAmount,
            total_amount: totalAmount, amount_paid: 0, amount_due: totalAmount,
            reference: input.reference || null, notes: input.notes || null,
            account_id: input.accountId || null, status: input.status || 'draft',
        }).select().single();
        if (error) throw error;

        // Insert lines
        if (lines.length > 0) {
            const lineInserts = lines.map((l: any, i: number) => ({
                invoice_id: data.id, line_number: i + 1, description: l.description || '',
                account_id: l.accountId || null, quantity: l.quantity || 1,
                unit_price: l.unitPrice || 0, amount: l.amount || (l.quantity || 1) * (l.unitPrice || 0),
                tax_id: l.taxId || null, tax_amount: l.taxAmount || 0,
            }));
            const { error: lErr } = await this.db.from('acct_invoice_lines').insert(lineInserts);
            if (lErr) this.logger.error('Failed to insert invoice lines', lErr);
        }
        return data;
    }

    async updateInvoiceStatus(id: string, status: string) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'paid') updates.paid_at = new Date().toISOString();
        const { data, error } = await this.db.from('acct_invoices').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async recordPayment(id: string, amount: number) {
        const invoice = await this.getInvoice(id);
        if (!invoice) throw new Error('Invoice not found');
        const newPaid = Number(invoice.amount_paid || 0) + amount;
        const newDue = Number(invoice.total_amount) - newPaid;
        const status = newDue <= 0 ? 'paid' : 'partial';
        const updates: any = { amount_paid: newPaid, amount_due: Math.max(0, newDue), status, updated_at: new Date().toISOString() };
        if (status === 'paid') updates.paid_at = new Date().toISOString();
        const { data, error } = await this.db.from('acct_invoices').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteInvoice(id: string) {
        const { data } = await this.db.from('acct_invoices').select('status').eq('id', id).single();
        if (data?.status === 'paid') throw new Error('Cannot delete paid invoice');
        const { error } = await this.db.from('acct_invoices').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getInvoiceSummary(tenantId: string, invoiceType: string) {
        const { data } = await this.db.from('acct_invoices').select('status, total_amount, amount_paid, amount_due, due_date').eq('tenant_id', tenantId).eq('invoice_type', invoiceType);
        const invoices = data || [];
        const today = new Date();
        let totalOutstanding = 0, overdue = 0, current = 0, d30 = 0, d60 = 0, d90 = 0, d90plus = 0;
        for (const inv of invoices as any[]) {
            const due = Number(inv.amount_due || 0);
            if (due <= 0) continue;
            totalOutstanding += due;
            const dueDate = new Date(inv.due_date);
            const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
            if (daysDiff <= 0) current += due;
            else if (daysDiff <= 30) { d30 += due; overdue += due; }
            else if (daysDiff <= 60) { d60 += due; overdue += due; }
            else if (daysDiff <= 90) { d90 += due; overdue += due; }
            else { d90plus += due; overdue += due; }
        }
        return { totalInvoices: invoices.length, totalOutstanding, overdue, current, aging30: d30, aging60: d60, aging90: d90, aging90plus: d90plus };
    }
}
