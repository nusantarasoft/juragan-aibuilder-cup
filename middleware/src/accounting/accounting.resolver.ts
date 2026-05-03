import { Resolver, Query, Mutation, Args, ObjectType, Field, InputType, Float, Int, ID } from '@nestjs/graphql';
import { AccountingService } from './accounting.service';
import GraphQLJSON from 'graphql-type-json';

// ─── Object Types ───────────────────────────────────────
@ObjectType() class AcctCurrency { @Field() id: string; @Field() tenantId: string; @Field() code: string; @Field() name: string; @Field({ nullable: true }) symbol?: string; @Field(() => Int) decimalPlaces: number; @Field() isDefault: boolean; @Field(() => Float) exchangeRate: number; @Field({ nullable: true }) rateDate?: string; @Field({ nullable: true }) status?: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class AcctFiscalPeriod { @Field() id: string; @Field() tenantId: string; @Field() name: string; @Field({ nullable: true }) periodType?: string; @Field({ nullable: true }) parentId?: string; @Field() startDate: string; @Field() endDate: string; @Field() status: string; @Field({ nullable: true }) closedBy?: string; @Field({ nullable: true }) closedAt?: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class AcctAccount { @Field() id: string; @Field() tenantId: string; @Field() accountCode: string; @Field() name: string; @Field() accountType: string; @Field({ nullable: true }) accountSubtype?: string; @Field({ nullable: true }) parentId?: string; @Field({ nullable: true }) currencyCode?: string; @Field({ nullable: true }) description?: string; @Field() isHeader: boolean; @Field() isSystem: boolean; @Field(() => Float) openingBalance: number; @Field(() => Float) currentBalance: number; @Field() normalBalance: string; @Field(() => [String], { nullable: true }) tags?: string[]; @Field() status: string; @Field({ nullable: true }) createdAt?: string; @Field({ nullable: true }) updatedAt?: string; }
@ObjectType() class AcctCostCenter { @Field() id: string; @Field() tenantId: string; @Field() code: string; @Field() name: string; @Field({ nullable: true }) parentId?: string; @Field({ nullable: true }) manager?: string; @Field({ nullable: true }) description?: string; @Field() status: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class AcctTax { @Field() id: string; @Field() tenantId: string; @Field() code: string; @Field() name: string; @Field() taxType: string; @Field(() => Float) rate: number; @Field() isInclusive: boolean; @Field({ nullable: true }) accountId?: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) effectiveFrom?: string; @Field({ nullable: true }) effectiveTo?: string; @Field() isDefault: boolean; @Field() status: string; }
@ObjectType() class AcctContact { @Field() id: string; @Field() tenantId: string; @Field() contactType: string; @Field({ nullable: true }) code?: string; @Field() name: string; @Field({ nullable: true }) company?: string; @Field({ nullable: true }) email?: string; @Field({ nullable: true }) phone?: string; @Field({ nullable: true }) address?: string; @Field({ nullable: true }) city?: string; @Field({ nullable: true }) country?: string; @Field({ nullable: true }) taxIdNumber?: string; @Field({ nullable: true }) currencyCode?: string; @Field(() => Int, { nullable: true }) paymentTerms?: number; @Field({ nullable: true }) status?: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class AcctJournal { @Field() id: string; @Field() tenantId: string; @Field() journalNumber: string; @Field() journalType: string; @Field({ nullable: true }) fiscalPeriodId?: string; @Field() journalDate: string; @Field({ nullable: true }) reference?: string; @Field({ nullable: true }) memo?: string; @Field({ nullable: true }) currencyCode?: string; @Field(() => Float) exchangeRate: number; @Field(() => Float) totalDebit: number; @Field(() => Float) totalCredit: number; @Field({ nullable: true }) sourceModule?: string; @Field({ nullable: true }) sourceId?: string; @Field() status: string; @Field({ nullable: true }) postedBy?: string; @Field({ nullable: true }) postedAt?: string; @Field({ nullable: true }) reversedBy?: string; @Field({ nullable: true }) reversalOf?: string; @Field(() => [String], { nullable: true }) tags?: string[]; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class AcctJournalLine { @Field() id: string; @Field() journalId: string; @Field(() => Int) lineNumber: number; @Field() accountId: string; @Field({ nullable: true }) costCenterId?: string; @Field({ nullable: true }) description?: string; @Field(() => Float) debit: number; @Field(() => Float) credit: number; @Field({ nullable: true }) currencyCode?: string; @Field(() => Float) exchangeRate: number; @Field(() => Float) baseDebit: number; @Field(() => Float) baseCredit: number; @Field({ nullable: true }) taxId?: string; @Field(() => Float, { nullable: true }) taxAmount?: number; @Field({ nullable: true }) reference?: string; }
@ObjectType() class TrialBalanceRow { @Field() accountId: string; @Field() accountCode: string; @Field() accountName: string; @Field() accountType: string; @Field(() => Float) debit: number; @Field(() => Float) credit: number; @Field(() => Float) balance: number; }
@ObjectType() class AcctDashboard { @Field(() => Int) totalAccounts: number; @Field(() => Int) totalJournals: number; @Field(() => Int) postedJournals: number; @Field(() => Int) draftJournals: number; @Field(() => Float) totalRevenue: number; @Field(() => Float) totalExpenses: number; @Field(() => Float) netIncome: number; @Field(() => Float) totalAssets: number; @Field(() => Float) totalLiabilities: number; @Field(() => Float) totalEquity: number; @Field(() => GraphQLJSON, { nullable: true }) recentJournals?: any; }
@ObjectType() class AcctInvoice { @Field() id: string; @Field() tenantId: string; @Field() invoiceType: string; @Field() invoiceNumber: string; @Field({ nullable: true }) contactId?: string; @Field({ nullable: true }) contactName?: string; @Field() invoiceDate: string; @Field() dueDate: string; @Field({ nullable: true }) currencyCode?: string; @Field(() => Float) exchangeRate: number; @Field(() => Float) subtotal: number; @Field(() => Float) taxAmount: number; @Field(() => Float) totalAmount: number; @Field(() => Float) amountPaid: number; @Field(() => Float) amountDue: number; @Field({ nullable: true }) reference?: string; @Field({ nullable: true }) notes?: string; @Field({ nullable: true }) accountId?: string; @Field({ nullable: true }) journalId?: string; @Field() status: string; @Field({ nullable: true }) paidAt?: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class AcctInvoiceLine { @Field() id: string; @Field() invoiceId: string; @Field(() => Int) lineNumber: number; @Field() description: string; @Field({ nullable: true }) accountId?: string; @Field(() => Float) quantity: number; @Field(() => Float) unitPrice: number; @Field(() => Float) amount: number; @Field({ nullable: true }) taxId?: string; @Field(() => Float) taxAmount: number; }
@ObjectType() class AcctInvoiceSummary { @Field(() => Int) totalInvoices: number; @Field(() => Float) totalOutstanding: number; @Field(() => Float) overdue: number; @Field(() => Float) current: number; @Field(() => Float) aging30: number; @Field(() => Float) aging60: number; @Field(() => Float) aging90: number; @Field(() => Float) aging90plus: number; }

// ─── Input Types ────────────────────────────────────────
@InputType() class AcctCurrencyInput { @Field() code: string; @Field() name: string; @Field({ nullable: true }) symbol?: string; @Field(() => Int, { nullable: true }) decimalPlaces?: number; @Field({ nullable: true }) isDefault?: boolean; @Field(() => Float, { nullable: true }) exchangeRate?: number; @Field({ nullable: true }) rateDate?: string; @Field({ nullable: true }) status?: string; }
@InputType() class AcctFiscalInput { @Field() name: string; @Field({ nullable: true }) periodType?: string; @Field({ nullable: true }) parentId?: string; @Field() startDate: string; @Field() endDate: string; @Field({ nullable: true }) status?: string; }
@InputType() class AcctAccountInput { @Field() accountCode: string; @Field() name: string; @Field() accountType: string; @Field({ nullable: true }) accountSubtype?: string; @Field({ nullable: true }) parentId?: string; @Field({ nullable: true }) currencyCode?: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) isHeader?: boolean; @Field(() => Float, { nullable: true }) openingBalance?: number; @Field({ nullable: true }) normalBalance?: string; @Field(() => [String], { nullable: true }) tags?: string[]; @Field({ nullable: true }) status?: string; }
@InputType() class AcctAccountUpdateInput { @Field({ nullable: true }) accountCode?: string; @Field({ nullable: true }) name?: string; @Field({ nullable: true }) accountType?: string; @Field({ nullable: true }) accountSubtype?: string; @Field({ nullable: true }) parentId?: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) isHeader?: boolean; @Field({ nullable: true }) normalBalance?: string; @Field(() => [String], { nullable: true }) tags?: string[]; @Field({ nullable: true }) status?: string; }
@InputType() class AcctCostCenterInput { @Field() code: string; @Field() name: string; @Field({ nullable: true }) parentId?: string; @Field({ nullable: true }) manager?: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) status?: string; }
@InputType() class AcctTaxInput { @Field() code: string; @Field() name: string; @Field() taxType: string; @Field(() => Float) rate: number; @Field({ nullable: true }) isInclusive?: boolean; @Field({ nullable: true }) accountId?: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) effectiveFrom?: string; @Field({ nullable: true }) effectiveTo?: string; @Field({ nullable: true }) isDefault?: boolean; @Field({ nullable: true }) status?: string; }
@InputType() class AcctContactInput { @Field() contactType: string; @Field({ nullable: true }) code?: string; @Field() name: string; @Field({ nullable: true }) company?: string; @Field({ nullable: true }) email?: string; @Field({ nullable: true }) phone?: string; @Field({ nullable: true }) address?: string; @Field({ nullable: true }) city?: string; @Field({ nullable: true }) country?: string; @Field({ nullable: true }) taxIdNumber?: string; @Field({ nullable: true }) defaultAccountId?: string; @Field({ nullable: true }) currencyCode?: string; @Field(() => Int, { nullable: true }) paymentTerms?: number; @Field(() => Float, { nullable: true }) creditLimit?: number; @Field({ nullable: true }) notes?: string; @Field({ nullable: true }) status?: string; }
@InputType() class JournalLineInput { @Field() accountId: string; @Field({ nullable: true }) costCenterId?: string; @Field({ nullable: true }) description?: string; @Field(() => Float, { defaultValue: 0 }) debit: number; @Field(() => Float, { defaultValue: 0 }) credit: number; @Field({ nullable: true }) taxId?: string; @Field(() => Float, { nullable: true }) taxAmount?: number; @Field({ nullable: true }) reference?: string; }
@InputType() class AcctJournalInput { @Field({ nullable: true }) journalType?: string; @Field({ nullable: true }) fiscalPeriodId?: string; @Field({ nullable: true }) journalDate?: string; @Field({ nullable: true }) reference?: string; @Field({ nullable: true }) memo?: string; @Field({ nullable: true }) currencyCode?: string; @Field(() => Float, { nullable: true }) exchangeRate?: number; @Field({ nullable: true }) sourceModule?: string; @Field({ nullable: true }) sourceId?: string; @Field(() => [String], { nullable: true }) tags?: string[]; @Field(() => [JournalLineInput]) lines: JournalLineInput[]; }
@InputType() class InvoiceLineInput { @Field() description: string; @Field({ nullable: true }) accountId?: string; @Field(() => Float, { defaultValue: 1 }) quantity: number; @Field(() => Float, { defaultValue: 0 }) unitPrice: number; @Field(() => Float, { nullable: true }) amount?: number; @Field({ nullable: true }) taxId?: string; @Field(() => Float, { nullable: true }) taxAmount?: number; }
@InputType() class AcctInvoiceInput { @Field() invoiceType: string; @Field({ nullable: true }) invoiceNumber?: string; @Field({ nullable: true }) contactId?: string; @Field({ nullable: true }) contactName?: string; @Field({ nullable: true }) invoiceDate?: string; @Field() dueDate: string; @Field({ nullable: true }) currencyCode?: string; @Field(() => Float, { nullable: true }) exchangeRate?: number; @Field({ nullable: true }) reference?: string; @Field({ nullable: true }) notes?: string; @Field({ nullable: true }) accountId?: string; @Field({ nullable: true }) status?: string; @Field(() => [InvoiceLineInput], { nullable: true }) lines?: InvoiceLineInput[]; }

// Helper to convert snake_case DB rows to camelCase GraphQL
function toCamel(row: any) {
    if (!row) return row;
    const out: any = {};
    for (const [k, v] of Object.entries(row)) {
        out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    return out;
}
function toCamelArray(rows: any[]) { return (rows || []).map(toCamel); }

@Resolver()
export class AccountingResolver {
    constructor(private svc: AccountingService) {}

    // ─── Currencies ─────────────────────────────────────
    @Query(() => [AcctCurrency]) async acctCurrencies(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getCurrencies(t)); }
    @Mutation(() => AcctCurrency) async upsertAcctCurrency(@Args('tenantId') t: string, @Args('input') i: AcctCurrencyInput) { return toCamel(await this.svc.upsertCurrency(t, i)); }

    // ─── Fiscal Periods ─────────────────────────────────
    @Query(() => [AcctFiscalPeriod]) async acctFiscalPeriods(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getFiscalPeriods(t)); }
    @Mutation(() => AcctFiscalPeriod) async createAcctFiscalPeriod(@Args('tenantId') t: string, @Args('input') i: AcctFiscalInput) { return toCamel(await this.svc.createFiscalPeriod(t, i)); }
    @Mutation(() => AcctFiscalPeriod) async closeAcctFiscalPeriod(@Args('id') id: string, @Args('closedBy') c: string) { return toCamel(await this.svc.closeFiscalPeriod(id, c)); }

    // ─── Chart of Accounts ──────────────────────────────
    @Query(() => [AcctAccount]) async acctAccounts(@Args('tenantId') t: string, @Args('accountType', { nullable: true }) at?: string, @Args('status', { nullable: true }) s?: string, @Args('search', { nullable: true }) q?: string) { return toCamelArray(await this.svc.getAccounts(t, { accountType: at, status: s, search: q })); }
    @Query(() => AcctAccount) async acctAccount(@Args('id') id: string) { return toCamel(await this.svc.getAccount(id)); }
    @Mutation(() => AcctAccount) async createAcctAccount(@Args('tenantId') t: string, @Args('input') i: AcctAccountInput) { return toCamel(await this.svc.createAccount(t, i)); }
    @Mutation(() => AcctAccount) async updateAcctAccount(@Args('id') id: string, @Args('input') i: AcctAccountUpdateInput) { return toCamel(await this.svc.updateAccount(id, i)); }
    @Mutation(() => Boolean) async deleteAcctAccount(@Args('id') id: string) { return this.svc.deleteAccount(id); }

    // ─── Cost Centers ───────────────────────────────────
    @Query(() => [AcctCostCenter]) async acctCostCenters(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getCostCenters(t)); }
    @Mutation(() => AcctCostCenter) async createAcctCostCenter(@Args('tenantId') t: string, @Args('input') i: AcctCostCenterInput) { return toCamel(await this.svc.createCostCenter(t, i)); }
    @Mutation(() => AcctCostCenter) async updateAcctCostCenter(@Args('id') id: string, @Args('input') i: AcctCostCenterInput) { return toCamel(await this.svc.updateCostCenter(id, i)); }
    @Mutation(() => Boolean) async deleteAcctCostCenter(@Args('id') id: string) { return this.svc.deleteCostCenter(id); }

    // ─── Taxes ──────────────────────────────────────────
    @Query(() => [AcctTax]) async acctTaxes(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getTaxes(t)); }
    @Mutation(() => AcctTax) async createAcctTax(@Args('tenantId') t: string, @Args('input') i: AcctTaxInput) { return toCamel(await this.svc.createTax(t, i)); }
    @Mutation(() => AcctTax) async updateAcctTax(@Args('id') id: string, @Args('input') i: AcctTaxInput) { return toCamel(await this.svc.updateTax(id, i)); }
    @Mutation(() => Boolean) async deleteAcctTax(@Args('id') id: string) { return this.svc.deleteTax(id); }

    // ─── Contacts ───────────────────────────────────────
    @Query(() => [AcctContact]) async acctContacts(@Args('tenantId') t: string, @Args('contactType', { nullable: true }) ct?: string, @Args('search', { nullable: true }) q?: string) { return toCamelArray(await this.svc.getContacts(t, { contactType: ct, search: q })); }
    @Mutation(() => AcctContact) async createAcctContact(@Args('tenantId') t: string, @Args('input') i: AcctContactInput) { return toCamel(await this.svc.createContact(t, i)); }
    @Mutation(() => AcctContact) async updateAcctContact(@Args('id') id: string, @Args('input') i: AcctContactInput) { return toCamel(await this.svc.updateContact(id, i)); }
    @Mutation(() => Boolean) async deleteAcctContact(@Args('id') id: string) { return this.svc.deleteContact(id); }

    // ─── Journal Entries ────────────────────────────────
    @Query(() => [AcctJournal]) async acctJournals(@Args('tenantId') t: string, @Args('status', { nullable: true }) s?: string, @Args('journalType', { nullable: true }) jt?: string, @Args('dateFrom', { nullable: true }) df?: string, @Args('dateTo', { nullable: true }) dt?: string, @Args('search', { nullable: true }) q?: string) { return toCamelArray(await this.svc.getJournals(t, { status: s, journalType: jt, dateFrom: df, dateTo: dt, search: q })); }
    @Query(() => AcctJournal) async acctJournal(@Args('id') id: string) { return toCamel(await this.svc.getJournal(id)); }
    @Query(() => [AcctJournalLine]) async acctJournalLines(@Args('journalId') id: string) { return toCamelArray(await this.svc.getJournalLines(id)); }
    @Mutation(() => AcctJournal) async createAcctJournal(@Args('tenantId') t: string, @Args('input') i: AcctJournalInput) { return toCamel(await this.svc.createJournal(t, i)); }
    @Mutation(() => AcctJournal) async postAcctJournal(@Args('id') id: string, @Args('postedBy') p: string) { return toCamel(await this.svc.postJournal(id, p)); }
    @Mutation(() => AcctJournal) async reverseAcctJournal(@Args('id') id: string, @Args('reversedBy') r: string) { return toCamel(await this.svc.reverseJournal(id, r)); }
    @Mutation(() => Boolean) async deleteAcctJournal(@Args('id') id: string) { return this.svc.deleteJournal(id); }

    // ─── Reports ────────────────────────────────────────
    @Query(() => [AcctJournalLine]) async acctGeneralLedger(@Args('tenantId') t: string, @Args('accountId') a: string, @Args('dateFrom', { nullable: true }) df?: string, @Args('dateTo', { nullable: true }) dt?: string) { return toCamelArray(await this.svc.getGeneralLedger(t, a, { dateFrom: df, dateTo: dt })); }
    @Query(() => [TrialBalanceRow]) async acctTrialBalance(@Args('tenantId') t: string, @Args('asOfDate', { nullable: true }) d?: string) { return await this.svc.getTrialBalance(t, d); }
    @Query(() => AcctDashboard) async acctDashboard(@Args('tenantId') t: string) { return await this.svc.getDashboardStats(t); }

    // ─── Invoices (AP/AR) ───────────────────────────────
    @Query(() => [AcctInvoice]) async acctInvoices(@Args('tenantId') t: string, @Args('invoiceType', { nullable: true }) it?: string, @Args('status', { nullable: true }) s?: string, @Args('contactId', { nullable: true }) c?: string, @Args('search', { nullable: true }) q?: string) { return toCamelArray(await this.svc.getInvoices(t, { invoiceType: it, status: s, contactId: c, search: q })); }
    @Query(() => AcctInvoice) async acctInvoice(@Args('id') id: string) { return toCamel(await this.svc.getInvoice(id)); }
    @Query(() => [AcctInvoiceLine]) async acctInvoiceLines(@Args('invoiceId') id: string) { return toCamelArray(await this.svc.getInvoiceLines(id)); }
    @Query(() => AcctInvoiceSummary) async acctInvoiceSummary(@Args('tenantId') t: string, @Args('invoiceType') it: string) { return await this.svc.getInvoiceSummary(t, it); }
    @Mutation(() => AcctInvoice) async createAcctInvoice(@Args('tenantId') t: string, @Args('input') i: AcctInvoiceInput) { return toCamel(await this.svc.createInvoice(t, i)); }
    @Mutation(() => AcctInvoice) async updateAcctInvoiceStatus(@Args('id') id: string, @Args('status') s: string) { return toCamel(await this.svc.updateInvoiceStatus(id, s)); }
    @Mutation(() => AcctInvoice) async recordAcctPayment(@Args('id') id: string, @Args('amount', { type: () => Float }) a: number) { return toCamel(await this.svc.recordPayment(id, a)); }
    @Mutation(() => Boolean) async deleteAcctInvoice(@Args('id') id: string) { return this.svc.deleteInvoice(id); }
}
