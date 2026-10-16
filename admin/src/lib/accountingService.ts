/**
 * Accounting Service - All operations via GraphQL Middleware
 */

import { DEFAULT_TENANT_ID, gql } from '@/lib/graphql';

// ─── Types ───────────────────────────────────────────────
export interface AcctCurrency { id: string; tenantId: string; code: string; name: string; symbol?: string; decimalPlaces: number; isDefault: boolean; exchangeRate: number; rateDate?: string; status?: string; createdAt?: string; }
export interface AcctFiscalPeriod { id: string; tenantId: string; name: string; periodType?: string; parentId?: string; startDate: string; endDate: string; status: string; closedBy?: string; closedAt?: string; createdAt?: string; }
export interface AcctAccount { id: string; tenantId: string; accountCode: string; name: string; accountType: string; accountSubtype?: string; parentId?: string; currencyCode?: string; description?: string; isHeader: boolean; isSystem: boolean; openingBalance: number; currentBalance: number; normalBalance: string; tags?: string[]; status: string; createdAt?: string; updatedAt?: string; }
export interface AcctCostCenter { id: string; tenantId: string; code: string; name: string; parentId?: string; manager?: string; description?: string; status: string; createdAt?: string; }
export interface AcctTax { id: string; tenantId: string; code: string; name: string; taxType: string; rate: number; isInclusive: boolean; accountId?: string; description?: string; effectiveFrom?: string; effectiveTo?: string; isDefault: boolean; status: string; }
export interface AcctContact { id: string; tenantId: string; contactType: string; code?: string; name: string; company?: string; email?: string; phone?: string; address?: string; city?: string; country?: string; taxIdNumber?: string; currencyCode?: string; paymentTerms?: number; status?: string; createdAt?: string; }
export interface AcctJournal { id: string; tenantId: string; journalNumber: string; journalType: string; fiscalPeriodId?: string; journalDate: string; reference?: string; memo?: string; currencyCode?: string; exchangeRate: number; totalDebit: number; totalCredit: number; sourceModule?: string; sourceId?: string; status: string; postedBy?: string; postedAt?: string; reversedBy?: string; reversalOf?: string; tags?: string[]; createdAt?: string; }
export interface AcctJournalLine { id: string; journalId: string; lineNumber: number; accountId: string; costCenterId?: string; description?: string; debit: number; credit: number; currencyCode?: string; exchangeRate: number; baseDebit: number; baseCredit: number; taxId?: string; taxAmount?: number; reference?: string; }
export interface TrialBalanceRow { accountId: string; accountCode: string; accountName: string; accountType: string; debit: number; credit: number; balance: number; }
export interface AcctDashboard { totalAccounts: number; totalJournals: number; postedJournals: number; draftJournals: number; totalRevenue: number; totalExpenses: number; netIncome: number; totalAssets: number; totalLiabilities: number; totalEquity: number; recentJournals?: AcctJournal[]; }
export interface AcctInvoice { id: string; tenantId: string; invoiceType: string; invoiceNumber: string; contactId?: string; contactName?: string; invoiceDate: string; dueDate: string; currencyCode?: string; exchangeRate: number; subtotal: number; taxAmount: number; totalAmount: number; amountPaid: number; amountDue: number; reference?: string; notes?: string; accountId?: string; journalId?: string; status: string; paidAt?: string; createdAt?: string; }
export interface AcctInvoiceLine { id: string; invoiceId: string; lineNumber: number; description: string; accountId?: string; quantity: number; unitPrice: number; amount: number; taxId?: string; taxAmount: number; }
export interface AcctInvoiceSummary { totalInvoices: number; totalOutstanding: number; overdue: number; current: number; aging30: number; aging60: number; aging90: number; aging90plus: number; }

// ─── Field Fragments ─────────────────────────────────────
const ACCOUNT_FIELDS = `id tenantId accountCode name accountType accountSubtype parentId currencyCode description isHeader isSystem openingBalance currentBalance normalBalance tags status createdAt updatedAt`;
const JOURNAL_FIELDS = `id tenantId journalNumber journalType fiscalPeriodId journalDate reference memo currencyCode exchangeRate totalDebit totalCredit sourceModule sourceId status postedBy postedAt reversedBy reversalOf tags createdAt`;
const JOURNAL_LINE_FIELDS = `id journalId lineNumber accountId costCenterId description debit credit currencyCode exchangeRate baseDebit baseCredit taxId taxAmount reference`;
const INVOICE_FIELDS = `id tenantId invoiceType invoiceNumber contactId contactName invoiceDate dueDate currencyCode exchangeRate subtotal taxAmount totalAmount amountPaid amountDue reference notes accountId journalId status paidAt createdAt`;
const INVOICE_LINE_FIELDS = `id invoiceId lineNumber description accountId quantity unitPrice amount taxId taxAmount`;

// ─── Service ─────────────────────────────────────────────
export const accountingService = {
    // ─── Currencies ─────────────────────────────────────
    async getCurrencies(tenantId = DEFAULT_TENANT_ID): Promise<AcctCurrency[]> {
        const d = await gql<{ acctCurrencies: AcctCurrency[] }>(`query($t:String!){acctCurrencies(tenantId:$t){id tenantId code name symbol decimalPlaces isDefault exchangeRate rateDate status createdAt}}`, { t: tenantId });
        return d.acctCurrencies || [];
    },
    async upsertCurrency(tenantId = DEFAULT_TENANT_ID, input: Partial<AcctCurrency>) {
        const d = await gql<{ upsertAcctCurrency: AcctCurrency }>(`mutation($t:String!,$i:AcctCurrencyInput!){upsertAcctCurrency(tenantId:$t,input:$i){id code name symbol exchangeRate isDefault}}`, { t: tenantId, i: input });
        return d.upsertAcctCurrency;
    },

    // ─── Fiscal Periods ─────────────────────────────────
    async getFiscalPeriods(tenantId = DEFAULT_TENANT_ID): Promise<AcctFiscalPeriod[]> {
        const d = await gql<{ acctFiscalPeriods: AcctFiscalPeriod[] }>(`query($t:String!){acctFiscalPeriods(tenantId:$t){id tenantId name periodType parentId startDate endDate status closedBy closedAt createdAt}}`, { t: tenantId });
        return d.acctFiscalPeriods || [];
    },
    async createFiscalPeriod(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createAcctFiscalPeriod: AcctFiscalPeriod }>(`mutation($t:String!,$i:AcctFiscalInput!){createAcctFiscalPeriod(tenantId:$t,input:$i){id name startDate endDate status createdAt}}`, { t: tenantId, i: input });
        return d.createAcctFiscalPeriod;
    },
    async closeFiscalPeriod(id: string, closedBy: string) {
        const d = await gql<{ closeAcctFiscalPeriod: AcctFiscalPeriod }>(`mutation($id:String!,$c:String!){closeAcctFiscalPeriod(id:$id,closedBy:$c){id status closedBy closedAt}}`, { id, c: closedBy });
        return d.closeAcctFiscalPeriod;
    },

    // ─── Chart of Accounts ──────────────────────────────
    async getAccounts(tenantId = DEFAULT_TENANT_ID, filters?: { accountType?: string; status?: string; search?: string }): Promise<AcctAccount[]> {
        const d = await gql<{ acctAccounts: AcctAccount[] }>(`query($t:String!,$at:String,$s:String,$q:String){acctAccounts(tenantId:$t,accountType:$at,status:$s,search:$q){${ACCOUNT_FIELDS}}}`, { t: tenantId, at: filters?.accountType, s: filters?.status, q: filters?.search });
        return d.acctAccounts || [];
    },
    async getAccount(id: string): Promise<AcctAccount> {
        const d = await gql<{ acctAccount: AcctAccount }>(`query($id:String!){acctAccount(id:$id){${ACCOUNT_FIELDS}}}`, { id });
        return d.acctAccount;
    },
    async createAccount(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createAcctAccount: AcctAccount }>(`mutation($t:String!,$i:AcctAccountInput!){createAcctAccount(tenantId:$t,input:$i){${ACCOUNT_FIELDS}}}`, { t: tenantId, i: input });
        return d.createAcctAccount;
    },
    async updateAccount(id: string, input: Record<string, any>) {
        const d = await gql<{ updateAcctAccount: AcctAccount }>(`mutation($id:String!,$i:AcctAccountUpdateInput!){updateAcctAccount(id:$id,input:$i){${ACCOUNT_FIELDS}}}`, { id, i: input });
        return d.updateAcctAccount;
    },
    async deleteAccount(id: string) {
        await gql(`mutation($id:String!){deleteAcctAccount(id:$id)}`, { id });
    },

    // ─── Cost Centers ───────────────────────────────────
    async getCostCenters(tenantId = DEFAULT_TENANT_ID): Promise<AcctCostCenter[]> {
        const d = await gql<{ acctCostCenters: AcctCostCenter[] }>(`query($t:String!){acctCostCenters(tenantId:$t){id tenantId code name parentId manager description status createdAt}}`, { t: tenantId });
        return d.acctCostCenters || [];
    },
    async createCostCenter(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createAcctCostCenter: AcctCostCenter }>(`mutation($t:String!,$i:AcctCostCenterInput!){createAcctCostCenter(tenantId:$t,input:$i){id code name status}}`, { t: tenantId, i: input });
        return d.createAcctCostCenter;
    },

    // ─── Taxes ──────────────────────────────────────────
    async getTaxes(tenantId = DEFAULT_TENANT_ID): Promise<AcctTax[]> {
        const d = await gql<{ acctTaxes: AcctTax[] }>(`query($t:String!){acctTaxes(tenantId:$t){id tenantId code name taxType rate isInclusive accountId description isDefault status}}`, { t: tenantId });
        return d.acctTaxes || [];
    },
    async createTax(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createAcctTax: AcctTax }>(`mutation($t:String!,$i:AcctTaxInput!){createAcctTax(tenantId:$t,input:$i){id code name rate status}}`, { t: tenantId, i: input });
        return d.createAcctTax;
    },

    // ─── Contacts ───────────────────────────────────────
    async getContacts(tenantId = DEFAULT_TENANT_ID, filters?: { contactType?: string; search?: string }): Promise<AcctContact[]> {
        const d = await gql<{ acctContacts: AcctContact[] }>(`query($t:String!,$ct:String,$q:String){acctContacts(tenantId:$t,contactType:$ct,search:$q){id tenantId contactType code name company email phone city country taxIdNumber currencyCode paymentTerms status createdAt}}`, { t: tenantId, ct: filters?.contactType, q: filters?.search });
        return d.acctContacts || [];
    },
    async createContact(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createAcctContact: AcctContact }>(`mutation($t:String!,$i:AcctContactInput!){createAcctContact(tenantId:$t,input:$i){id name contactType status}}`, { t: tenantId, i: input });
        return d.createAcctContact;
    },

    // ─── Journal Entries ────────────────────────────────
    async getJournals(tenantId = DEFAULT_TENANT_ID, filters?: { status?: string; journalType?: string; dateFrom?: string; dateTo?: string; search?: string }): Promise<AcctJournal[]> {
        const d = await gql<{ acctJournals: AcctJournal[] }>(`query($t:String!,$s:String,$jt:String,$df:String,$dt:String,$q:String){acctJournals(tenantId:$t,status:$s,journalType:$jt,dateFrom:$df,dateTo:$dt,search:$q){${JOURNAL_FIELDS}}}`, { t: tenantId, s: filters?.status, jt: filters?.journalType, df: filters?.dateFrom, dt: filters?.dateTo, q: filters?.search });
        return d.acctJournals || [];
    },
    async getJournal(id: string): Promise<AcctJournal> {
        const d = await gql<{ acctJournal: AcctJournal }>(`query($id:String!){acctJournal(id:$id){${JOURNAL_FIELDS}}}`, { id });
        return d.acctJournal;
    },
    async getJournalLines(journalId: string): Promise<AcctJournalLine[]> {
        const d = await gql<{ acctJournalLines: AcctJournalLine[] }>(`query($id:String!){acctJournalLines(journalId:$id){${JOURNAL_LINE_FIELDS}}}`, { id: journalId });
        return d.acctJournalLines || [];
    },
    async createJournal(tenantId = DEFAULT_TENANT_ID, input: { journalType?: string; journalDate?: string; reference?: string; memo?: string; currencyCode?: string; exchangeRate?: number; lines: { accountId: string; description?: string; debit: number; credit: number; costCenterId?: string; taxId?: string; taxAmount?: number }[] }) {
        const d = await gql<{ createAcctJournal: AcctJournal }>(`mutation($t:String!,$i:AcctJournalInput!){createAcctJournal(tenantId:$t,input:$i){${JOURNAL_FIELDS}}}`, { t: tenantId, i: input });
        return d.createAcctJournal;
    },
    async postJournal(id: string, postedBy = 'admin') {
        const d = await gql<{ postAcctJournal: AcctJournal }>(`mutation($id:String!,$p:String!){postAcctJournal(id:$id,postedBy:$p){${JOURNAL_FIELDS}}}`, { id, p: postedBy });
        return d.postAcctJournal;
    },
    async reverseJournal(id: string, reversedBy = 'admin') {
        const d = await gql<{ reverseAcctJournal: AcctJournal }>(`mutation($id:String!,$r:String!){reverseAcctJournal(id:$id,reversedBy:$r){${JOURNAL_FIELDS}}}`, { id, r: reversedBy });
        return d.reverseAcctJournal;
    },
    async deleteJournal(id: string) {
        await gql(`mutation($id:String!){deleteAcctJournal(id:$id)}`, { id });
    },

    // ─── Reports ────────────────────────────────────────
    async getGeneralLedger(tenantId = DEFAULT_TENANT_ID, accountId: string, filters?: { dateFrom?: string; dateTo?: string }): Promise<AcctJournalLine[]> {
        const d = await gql<{ acctGeneralLedger: AcctJournalLine[] }>(`query($t:String!,$a:String!,$df:String,$dt:String){acctGeneralLedger(tenantId:$t,accountId:$a,dateFrom:$df,dateTo:$dt){${JOURNAL_LINE_FIELDS}}}`, { t: tenantId, a: accountId, df: filters?.dateFrom, dt: filters?.dateTo });
        return d.acctGeneralLedger || [];
    },
    async getTrialBalance(tenantId = DEFAULT_TENANT_ID, asOfDate?: string): Promise<TrialBalanceRow[]> {
        const d = await gql<{ acctTrialBalance: TrialBalanceRow[] }>(`query($t:String!,$d:String){acctTrialBalance(tenantId:$t,asOfDate:$d){accountId accountCode accountName accountType debit credit balance}}`, { t: tenantId, d: asOfDate });
        return d.acctTrialBalance || [];
    },
    async getDashboard(tenantId = DEFAULT_TENANT_ID): Promise<AcctDashboard> {
        const d = await gql<{ acctDashboard: AcctDashboard }>(`query($t:String!){acctDashboard(tenantId:$t){totalAccounts totalJournals postedJournals draftJournals totalRevenue totalExpenses netIncome totalAssets totalLiabilities totalEquity recentJournals}}`, { t: tenantId });
        return d.acctDashboard;
    },

    // ─── Invoices (AP/AR) ───────────────────────────────
    async getInvoices(tenantId = DEFAULT_TENANT_ID, filters?: { invoiceType?: string; status?: string; contactId?: string; search?: string }): Promise<AcctInvoice[]> {
        const d = await gql<{ acctInvoices: AcctInvoice[] }>(`query($t:String!,$it:String,$s:String,$c:String,$q:String){acctInvoices(tenantId:$t,invoiceType:$it,status:$s,contactId:$c,search:$q){${INVOICE_FIELDS}}}`, { t: tenantId, it: filters?.invoiceType, s: filters?.status, c: filters?.contactId, q: filters?.search });
        return d.acctInvoices || [];
    },
    async getInvoice(id: string): Promise<AcctInvoice> {
        const d = await gql<{ acctInvoice: AcctInvoice }>(`query($id:String!){acctInvoice(id:$id){${INVOICE_FIELDS}}}`, { id });
        return d.acctInvoice;
    },
    async getInvoiceLines(invoiceId: string): Promise<AcctInvoiceLine[]> {
        const d = await gql<{ acctInvoiceLines: AcctInvoiceLine[] }>(`query($id:String!){acctInvoiceLines(invoiceId:$id){${INVOICE_LINE_FIELDS}}}`, { id: invoiceId });
        return d.acctInvoiceLines || [];
    },
    async getInvoiceSummary(tenantId = DEFAULT_TENANT_ID, invoiceType: string): Promise<AcctInvoiceSummary> {
        const d = await gql<{ acctInvoiceSummary: AcctInvoiceSummary }>(`query($t:String!,$it:String!){acctInvoiceSummary(tenantId:$t,invoiceType:$it){totalInvoices totalOutstanding overdue current aging30 aging60 aging90 aging90plus}}`, { t: tenantId, it: invoiceType });
        return d.acctInvoiceSummary;
    },
    async createInvoice(tenantId = DEFAULT_TENANT_ID, input: Partial<AcctInvoice> & { lines?: Partial<AcctInvoiceLine>[] }) {
        const d = await gql<{ createAcctInvoice: AcctInvoice }>(`mutation($t:String!,$i:AcctInvoiceInput!){createAcctInvoice(tenantId:$t,input:$i){${INVOICE_FIELDS}}}`, { t: tenantId, i: input });
        return d.createAcctInvoice;
    },
    async updateInvoiceStatus(id: string, status: string) {
        const d = await gql<{ updateAcctInvoiceStatus: AcctInvoice }>(`mutation($id:String!,$s:String!){updateAcctInvoiceStatus(id:$id,status:$s){${INVOICE_FIELDS}}}`, { id, s: status });
        return d.updateAcctInvoiceStatus;
    },
    async recordPayment(id: string, amount: number) {
        const d = await gql<{ recordAcctPayment: AcctInvoice }>(`mutation($id:String!,$a:Float!){recordAcctPayment(id:$id,amount:$a){${INVOICE_FIELDS}}}`, { id, a: amount });
        return d.recordAcctPayment;
    },
    async deleteInvoice(id: string) {
        await gql(`mutation($id:String!){deleteAcctInvoice(id:$id)}`, { id });
    },

    // ─── Budgets ────────────────────────────────────────
    async getBudgets(tenantId = DEFAULT_TENANT_ID): Promise<AcctBudget[]> {
        const d = await gql<{ acctBudgets: AcctBudget[] }>(`query($t:String!){acctBudgets(tenantId:$t){id tenantId name fiscalPeriodId status notes createdBy createdAt}}`, { t: tenantId });
        return d.acctBudgets || [];
    },
    async getBudgetLines(budgetId: string): Promise<AcctBudgetLine[]> {
        const d = await gql<{ acctBudgetLines: AcctBudgetLine[] }>(`query($id:String!){acctBudgetLines(budgetId:$id){id budgetId accountId month budgetedAmount actualAmount notes accountCode accountName}}`, { id: budgetId });
        return d.acctBudgetLines || [];
    },
    async createBudget(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createAcctBudget: AcctBudget }>(`mutation($t:String!,$i:AcctBudgetInput!){createAcctBudget(tenantId:$t,input:$i){id name status createdAt}}`, { t: tenantId, i: input });
        return d.createAcctBudget;
    },
    async updateBudget(id: string, input: Record<string, any>) {
        const d = await gql<{ updateAcctBudget: AcctBudget }>(`mutation($id:String!,$i:AcctBudgetUpdateInput!){updateAcctBudget(id:$id,input:$i){id name status}}`, { id, i: input });
        return d.updateAcctBudget;
    },
    async getBudgetVsActual(tenantId = DEFAULT_TENANT_ID, budgetId?: string): Promise<BudgetVsActualRow[]> {
        const d = await gql<{ acctBudgetVsActual: BudgetVsActualRow[] }>(`query($t:String!,$b:String){acctBudgetVsActual(tenantId:$t,budgetId:$b){accountId accountCode accountName budgeted actual variance variancePct}}`, { t: tenantId, b: budgetId });
        return d.acctBudgetVsActual || [];
    },

    // ─── Bank Reconciliation ────────────────────────────
    async getBankAccounts(tenantId = DEFAULT_TENANT_ID): Promise<AcctBankAccount[]> {
        const d = await gql<{ acctBankAccounts: AcctBankAccount[] }>(`query($t:String!){acctBankAccounts(tenantId:$t){id tenantId name bankName accountNumber glAccountId currency status createdAt}}`, { t: tenantId });
        return d.acctBankAccounts || [];
    },
    async createBankAccount(tenantId = DEFAULT_TENANT_ID, input: Record<string, any>) {
        const d = await gql<{ createAcctBankAccount: AcctBankAccount }>(`mutation($t:String!,$i:AcctBankAccountInput!){createAcctBankAccount(tenantId:$t,input:$i){id name bankName status}}`, { t: tenantId, i: input });
        return d.createAcctBankAccount;
    },
    async getBankStatements(bankAccountId: string): Promise<AcctBankStatement[]> {
        const d = await gql<{ acctBankStatements: AcctBankStatement[] }>(`query($id:String!){acctBankStatements(bankAccountId:$id){id bankAccountId statementDate openingBalance closingBalance totalCredits totalDebits source status importedAt}}`, { id: bankAccountId });
        return d.acctBankStatements || [];
    },
    async getBankStatementLines(statementId: string): Promise<AcctBankStatementLine[]> {
        const d = await gql<{ acctBankStatementLines: AcctBankStatementLine[] }>(`query($id:String!){acctBankStatementLines(statementId:$id){id statementId transactionDate description reference amount runningBalance matched matchedJournalId matchType}}`, { id: statementId });
        return d.acctBankStatementLines || [];
    },
    async importBankStatement(bankAccountId: string, input: Record<string, any>) {
        const d = await gql<{ importAcctBankStatement: AcctBankStatement }>(`mutation($id:String!,$i:AcctBankStatementInput!){importAcctBankStatement(bankAccountId:$id,input:$i){id statementDate status}}`, { id: bankAccountId, i: input });
        return d.importAcctBankStatement;
    },
    async matchBankTransaction(lineId: string, journalId: string) {
        await gql(`mutation($l:String!,$j:String!){matchAcctBankTransaction(lineId:$l,journalId:$j)}`, { l: lineId, j: journalId });
    },
    async unmatchBankTransaction(lineId: string) {
        await gql(`mutation($l:String!){unmatchAcctBankTransaction(lineId:$l)}`, { l: lineId });
    },
    async autoMatchBankStatement(statementId: string) {
        const d = await gql<{ autoMatchAcctBankStatement: number }>(`mutation($id:String!){autoMatchAcctBankStatement(statementId:$id)}`, { id: statementId });
        return d.autoMatchAcctBankStatement || 0;
    },

    // ─── Cash Flow ──────────────────────────────────────
    async getCashFlowStatement(tenantId = DEFAULT_TENANT_ID, dateFrom?: string, dateTo?: string): Promise<CashFlowStatement> {
        const d = await gql<{ acctCashFlowStatement: CashFlowStatement }>(`query($t:String!,$df:String,$dt:String){acctCashFlowStatement(tenantId:$t,dateFrom:$df,dateTo:$dt){operating{items{name amount} total} investing{items{name amount} total} financing{items{name amount} total} netChange openingCash closingCash}}`, { t: tenantId, df: dateFrom, dt: dateTo });
        return d.acctCashFlowStatement;
    },

    // ─── Settings ───────────────────────────────────────
    async getSettings(tenantId = DEFAULT_TENANT_ID): Promise<AcctSetting[]> {
        const d = await gql<{ acctSettings: AcctSetting[] }>(`query($t:String!){acctSettings(tenantId:$t){id key value description updatedAt}}`, { t: tenantId });
        return d.acctSettings || [];
    },
    async updateSetting(tenantId = DEFAULT_TENANT_ID, key: string, value: string) {
        await gql(`mutation($t:String!,$k:String!,$v:String!){updateAcctSetting(tenantId:$t,key:$k,value:$v)}`, { t: tenantId, k: key, v: value });
    },
};

// ─── Additional Types ────────────────────────────────────
export interface AcctBudget { id: string; tenantId: string; name: string; fiscalPeriodId?: string; status: string; notes?: string; createdBy?: string; createdAt?: string; }
export interface AcctBudgetLine { id: string; budgetId: string; accountId: string; month: number; budgetedAmount: number; actualAmount: number; notes?: string; accountCode?: string; accountName?: string; }
export interface BudgetVsActualRow { accountId: string; accountCode: string; accountName: string; budgeted: number; actual: number; variance: number; variancePct: number; }
export interface AcctBankAccount { id: string; tenantId: string; name: string; bankName?: string; accountNumber?: string; glAccountId?: string; currency: string; status: string; createdAt?: string; }
export interface AcctBankStatement { id: string; bankAccountId: string; statementDate: string; openingBalance: number; closingBalance: number; totalCredits: number; totalDebits: number; source: string; status: string; importedAt?: string; }
export interface AcctBankStatementLine { id: string; statementId: string; transactionDate: string; description?: string; reference?: string; amount: number; runningBalance?: number; matched: boolean; matchedJournalId?: string; matchType?: string; }
export interface CashFlowSection { items: { name: string; amount: number }[]; total: number; }
export interface CashFlowStatement { operating: CashFlowSection; investing: CashFlowSection; financing: CashFlowSection; netChange: number; openingCash: number; closingCash: number; }
export interface AcctSetting { id: string; key: string; value: string; description?: string; updatedAt?: string; }
