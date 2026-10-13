# Access control audit — middleware & admin

**Date:** 2026-10-14  
**Branch:** `cursor/access-control-audit-707c`  
**Scope:** NestJS middleware GraphQL + REST; admin Next.js API routes.

## Platform controls (non-route)

| Control | Finding | Risk | Fix |
|---------|---------|------|-----|
| `/internal/*` nginx | Not in `volumes/nginx/nginx.conf`; middleware `POST /internal/kasir-consult` is Docker-network only | Low | Keep off nginx; rotate `KASIR_CONSULT_KEY` |
| GraphQL introspection/playground | Was always on; now gated by `NODE_ENV` / `GRAPHQL_INTROSPECTION` / `GRAPHQL_PLAYGROUND` | High (prod) | Set env false in production |
| CORS | Explicit allowlist + `CORS_ORIGINS` in `main.ts` | Medium | Tighten prod origins |
| Login rate limit | GraphQL `/graphql` uses nginx `limit_req zone=api`; Supabase `/auth/` uses `zone=auth`; `signIn` mutation has no app-level throttle | Medium | Add Throttler on auth resolver or WAF |
| Service role in browser | Admin uses `SUPABASE_ANON_KEY` only (`admin/src/lib/supabaseClient.ts`) | Low | Keep service role server-only |
| Supabase RLS | Tenant tables + CMS public read policies in migrations | Medium | Anon key can read `pages`/`settings`; mutations need RLS deny |

## Severity summary

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 3 |
| Medium | 933 |
| Low | 7 |

**Post-change note:** `GlobalAuthGuard` (`APP_GUARD`) now protects all GraphQL/resolvers and REST controllers unless `@Public()` or `@AlternativeAuth()`. Historical Critical counts include pre-fix open GraphQL modules (CRM, inventory, AOS reads, unauthenticated upload).


## Endpoint inventory

| Endpoint | Guard | Tenant / scoping | Risk | Recommended fix |
|----------|-------|------------------|------|-----------------|
| GraphQL Mutation acceptGrn | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation acctAccounts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation acctContacts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation acctCostCenters | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation acctFiscalPeriods | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation acctGeneralLedger | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation acctJournals | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation acctTaxes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addBomLine | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addCampaignMember | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addEcomOrderItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addEcomPackageItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addItsmAgentSkill | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addItsmCIRelationship | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addItsmComment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addItsmReleaseChange | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addMediaToNotebook | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addOpnameLine | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addPassenger | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation addTeamMember | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation approveHrLeaveRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation approveStockTransfer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation assignForm | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation assignOpsRunStep | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation assignPermissionSet | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation autoLabelMedia | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation bulkCreateBins | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation calculateFormScore | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation cancelPickTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation cancelPutawayTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation cancelRentalContract | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation chatWithSources | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation cleanupNotificationLogs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation closeAcctFiscalPeriod | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation closeCase | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation completeCrmActivity | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation completeStockTransfer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation confirmPick | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation confirmPutaway | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation convertLead | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation convertStudioNoteToSource | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation copyFile | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createBin | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createBlock | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createBom | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createBooking | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createBucket | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createCampaign | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createCase | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createContact | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createCrmActivity | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createCrmNote | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createDcimSite | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createDeal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createEcomCustomer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createEcomDiscount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createEcomOffer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createEcomOrder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createEcomPackage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createEcomReturn | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createFixedAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createFolder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createFormTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createGoodsReceivedNote | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createHrApplicant | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createIndividual | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createInvCategory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createInvItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createInvSupplier | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createInvVariant | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmAgent | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmApproval | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmAvailabilityRecord | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmCatalogItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmCategory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmChange | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmConfigurationItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmContinuityPlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmDeployment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmEvent | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmKnowledgeArticle | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmPortfolioService | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmProblem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmRelease | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmServiceRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmSlaPolicy | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createItsmTicket | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createMedia | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createNotification | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createNotificationChannel | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createNotificationRule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createNotificationTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createOccurrence | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createOpnameSession | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createOpsPlaybook | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createOpsPlaybookStep | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createOpsRun | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createOpsSchedule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPermissionSet | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPickTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmActivity | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmBenefit | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmChangeRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmCommPlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmGovernanceDecision | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmLessonLearned | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmMeetingMinutes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmMilestone | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmProcurementLink | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmProject | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmQualityChecklist | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmQualityInspection | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmQualityMetric | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmRaciEntry | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmRequirement | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmResourcePlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmRiskRegister | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmSprint | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmStakeholder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmStatusReport | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmSustainabilityMetric | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmTailoringEntry | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmTaskDependency | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPmWbsItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createProduct | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createProfile | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPublicGroup | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPurchaseOrder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPurchaseRequisition | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createPutawayTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createQuote | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createRentalAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createRentalContract | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createRole | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createSchedule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createSetting | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createSharingRule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createStockMovement | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createStockOperation | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createStockTransfer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createStudioGuideFlow | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createStudioNote | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createStudioNotebook | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createTeam | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createTenant | JWT (GlobalAuthGuard APP_GUARD) | Partial (client-supplied tenantId args) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createTenantUser | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createUser | JWT (explicit UseGuards) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createWarehouse | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createWorkOrder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation createZone | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation decideItsmApproval | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteAcctAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteAcctContact | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteAcctCostCenter | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteAcctInvoice | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteAcctJournal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteAcctTax | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteBin | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteBlock | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteBom | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteBomLine | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteBucket | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteBucketPolicy | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteCampaign | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteCase | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteContact | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteCrmActivity | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteCrmNote | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteDeal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteEcomCustomer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteEcomDiscount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteEcomOffer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteEcomOrder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteEcomPackage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteEcomPackageItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteEcomReturn | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteFileByKey | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteFixedAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteFolder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteFormTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteGoodsReceivedNote | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteHrDepartment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteHrEmployee | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteHrPerformanceReview | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteHrPosition | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteHrTrainingProgram | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteIndividual | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteInvCategory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteInvItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteInvSupplier | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteInvVariant | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmAgent | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmAvailabilityRecord | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmCatalogItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmCategory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmChange | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmConfigurationItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmContinuityPlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmDeployment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmEvent | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmKnowledgeArticle | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmPortfolioService | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmProblem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmRelease | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmServiceRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmSlaPolicy | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteItsmTicket | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteLifecycleRules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteMedia | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNewsAlert | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNewsArticle | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNewsCompetitor | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNewsContentDraft | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNewsCrawlJob | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNewsSocialAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNewsSocialPost | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNewsSource | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNotificationChannel | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNotificationRule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteNotificationTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteOpnameLine | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteOpnameSession | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteOpsPlaybook | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteOpsPlaybookStep | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteOpsRun | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteOpsSchedule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePentestTarget | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePermissionSet | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmActivity | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmBenefit | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmChangeRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmCommPlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmDomainHealth | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmFocusArea | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmGovernanceDecision | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmLessonLearned | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmMeetingMinutes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmMilestone | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmPrincipleAssessment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmProcurementLink | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmProject | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmQualityChecklist | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmQualityInspection | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmQualityMetric | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmRaciEntry | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmRequirement | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmResourcePlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmRiskRegister | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmSprint | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmStakeholder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmStatusReport | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmSustainabilityMetric | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmTailoringEntry | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmTaskDependency | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmTimeLog | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePmWbsItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteProduct | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteProfile | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePublicGroup | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePurchaseOrder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deletePurchaseRequisition | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteQuote | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteRentalAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteRentalContract | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteRole | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteSchedule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteSetting | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteSharingRule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteStockOperation | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteStockTransfer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteStudioGuideFlow | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteStudioNote | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteStudioNotebook | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteStudioOutput | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteSubmission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteTeam | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteTenant | JWT (GlobalAuthGuard APP_GUARD) | Partial (client-supplied tenantId args) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteUser | JWT (explicit UseGuards) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteWarehouse | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteWarehouseLayout | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteWorkOrder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation deleteZone | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation disableVersioning | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation disposeFixedAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dockerRestartContainer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dockerStartContainer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dockerStopContainer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioCancelJob | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioCreateSource | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioCreateSpace | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioCreateVDS | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioDeleteSource | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioDeleteSpace | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioDeleteVDS | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioExportCsv | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioRenameSpace | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioRunSQL | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioUpdateSource | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation dremioUpdateVDS | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation duplicateFormTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation enableVersioning | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation escalateItsmEventToIncident | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation executeNewsCrawl | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation generateEarnedValueMetrics | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation generateImage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation generateMediaEmbeddings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation generatePodcastScript | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation generatePresentation | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation generateReport | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrClockOut | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrDepartments | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrJobPostings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrLeaveBalances | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrLeaveTypes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrPayrollRuns | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrPerformanceReviews | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrPositions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation hrTrainingPrograms | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation importStudioUrl | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation itsmLinkProblemIncident | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation itsmPublishToCatalog | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation logDataExport | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation logoutStudioWhatsAppSession | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation logPmTime | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation makeBucketPublic | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation markAllNotificationsRead | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation markNotificationRead | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation moveFile | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsAlerts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsArticles | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsCompetitors | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsContentCalendar | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsContentDrafts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsCrawlJobs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsDashboard | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsMarketSignals | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsSentimentEntries | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsSettings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsSocialAccounts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation newsSocialPosts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation pentestDomains | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation pentestFindings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation pentestReports | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation pentestScans | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation pentestTrendData | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation postAcctJournal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation publishFormTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation publishPage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation publishStudioGuideFlow | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation rebindStudioHermesSession | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation recordAcctPayment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation refreshToken | Public (@Public) | None / service-role Supabase | High | Keep @Public only on allowlist; verify tenant scoping in service |
| GraphQL Mutation regenerateThumbnails | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation reindexStudioNotebook | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation reindexStudioSource | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation rejectHrLeaveRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation removeCampaignMember | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation removeItsmAgentSkill | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation removeItsmCIRelationship | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation removeItsmReleaseChange | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation removeMediaEmbeddings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation removeStudioSource | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation removeTeamMember | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation removeUserPermissionSet | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation restartStudioWhatsAppSession | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation returnRentalAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation reverseAcctJournal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation reviewSubmission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation runDepreciation | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation saveFormFields | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation saveWarehouseLayout | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation sendNotification | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation sendToLabelStudio | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation setActiveWarehouseLayout | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation setBucketPolicy | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation setDefaultVersion | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation setLifecycleRules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation setUserStatus | JWT (explicit UseGuards) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation signIn | Public (@Public) | None / service-role Supabase | High | Keep @Public only on allowlist; verify tenant scoping in service |
| GraphQL Mutation signOut | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation signUp | Public (@Public) | None / service-role Supabase | High | Keep @Public only on allowlist; verify tenant scoping in service |
| GraphQL Mutation startPickTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation startPutawayTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation startStudioGuidedSession | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation startStudioWhatsAppSession | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioAddTextSource | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioApproveUmkmRegistration | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioChat | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioCreateShareLink | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioGenerateBrief | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioGenerateOutput | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioGenerateReport | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioGuidedChat | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioPlaygroundTest | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioRejectUmkmRegistration | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioRevokeShareLink | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioSetupUmkmNotebook | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioSynthesizeAudio | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioTestAiConnection | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioWhatsAppSimChat | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation studioWhatsAppSimReset | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation submitForm | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation syncStudioWhatsAppSession | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation testNotificationChannel | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation toggleNewsBookmark | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation toggleStar | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation unpublishPage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateAcctAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateAcctContact | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateAcctCostCenter | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateAcctInvoiceStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateAcctTax | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateBin | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateBlock | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateBom | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateBomLine | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateBookingStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateCampaign | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateCase | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateContact | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateCrmActivity | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateCrmNote | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateDeal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateEcomCustomer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateEcomDiscount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateEcomOffer | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateEcomOrderStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateEcomPackage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateEcomReturnStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateFixedAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateFormTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateHrApplicantStage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateHrEmployee | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateHrPerformanceReview | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateIndividual | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateInvCategory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateInvItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateInvSupplier | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmAgent | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmCatalogItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmCategory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmChange | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmConfigurationItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmContinuityPlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmDeployment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmEvent | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmKnowledgeArticle | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmPortfolioService | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmProblem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmRelease | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmServiceRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmSlaPolicy | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateItsmTicket | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateMedia | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNewsAlert | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNewsArticle | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNewsCompetitor | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNewsContentDraft | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNewsCrawlJob | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNewsSocialPost | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNewsSource | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNotificationChannel | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNotificationRule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateNotificationTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOccurrenceStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOpnameLine | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOpnameSession | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOpnameSessionStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOpsPlaybook | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOpsPlaybookStep | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOpsRunStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOpsRunStepStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateOpsSchedule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePage | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePentestTarget | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmActivity | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmBenefit | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmChangeRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmCommPlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmGovernanceDecision | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmLessonLearned | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmMeetingMinutes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmMilestone | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmProcurementLink | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmProject | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmQualityChecklist | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmQualityInspection | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmQualityMetric | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmRaciEntry | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmRequirement | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmResourcePlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmRiskRegister | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmSprint | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmStakeholder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmStatusReport | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmSustainabilityMetric | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmTailoringEntry | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePmWbsItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePoStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateProduct | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateProfile | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updatePrStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateQuote | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateRentalAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateRole | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateSchedule | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateSetting | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateSettingByKey | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateStoreSettings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateStudioGuideFlow | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateStudioNote | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateStudioNotebook | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateStudioSettings | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateStudioUmkmCommands | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateStudioWhatsAppConfig | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateTenant | JWT (GlobalAuthGuard APP_GUARD) | Partial (client-supplied tenantId args) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateTenantUser | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateUser | JWT (explicit UseGuards) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateWarehouse | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateWorkOrder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateWorkOrderStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation updateZone | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation uploadMedia | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertFieldPermission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertOrgWideDefault | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertPermissionSetObjectPermission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertPermissionSetSystemPermission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertPmDomainHealth | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertPmFocusArea | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertPmPrincipleAssessment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertPmProjectCharter | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertPmScopeStatement | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertProfileObjectPermission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Mutation upsertProfileSystemPermission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query account | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query accounts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctDashboard | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctInvoice | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctInvoiceLines | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctInvoices | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctInvoiceSummary | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctJournal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctJournalLines | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query acctTrialBalance | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query aiClassifyItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query aiDetectStockAnomalies | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query analyticsMetrics | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query analyzeNewsSentiment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query analyzePmSprintRisk | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query auditRetentionPolicies | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query automationRuns | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query automationSchedules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bimClashResults | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bimElements | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bimIssues | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bimModels | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query binContents | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query block | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query blocks | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query blocksByCategory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bmsAlarms | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bmsEquipment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bmsSystems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bmsZones | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bookingOccurrences | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bookingPassengers | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bookings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bookingSchedules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query bookingStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query campaignMembers | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query campaigns | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query cases | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query chatWithLibrary | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query checkDuplicateMedia | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query checkRecordAccess | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query collaborationMessages | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query contact | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query contacts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query contactsByAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query contactsByIndividual | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createAcctAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createAcctContact | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createAcctCostCenter | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createAcctFiscalPeriod | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createAcctInvoice | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createAcctJournal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createAcctTax | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createHrDepartment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createHrEmployee | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createHrJobPosting | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createHrLeaveRequest | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createHrPayrollRun | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createHrPerformanceReview | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createHrPosition | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createHrTrainingProgram | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsAlert | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsArticle | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsCalendarEntry | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsCompetitor | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsContentDraft | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsCrawlJob | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsMarketSignal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsSocialAccount | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsSocialPost | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createNewsSource | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createPentestReport | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query createPentestTarget | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query crmActivities | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query crmDashboard | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query crmNotes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dataExportLogs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query datasetColumns | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query datasetSources | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dcimBuildings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dcimDevices | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dcimPods | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dcimRacks | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dcimRooms | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dcimRows | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dcimSites | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query deal | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dealInsights | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query deals | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query devopsBuilds | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query devopsDeployments | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dockerContainerLogs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dockerContainers | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dockerContainerStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query documentShares | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query documentVersions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query documentWorkflows | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioCatalog | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioCatalogById | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioCatalogByPath | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioCatalogChildren | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioDatasetPreview | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioJobResults | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioSourceDetail | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioSources | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query dremioTestConnection | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomCustomers | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomDiscounts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomDiscountStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecommerceCategories | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecommerceCustomers | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecommerceDiscounts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecommerceOrderItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecommerceOrders | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecommercePayments | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecommerceReviews | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomOffers | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomOfferStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomOrder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomOrderItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomOrders | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomPackageItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomPackages | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomPackageStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomReturn | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomReturnItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomReturns | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomReturnStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query ecomStoreSettings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query emailAliases | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query emailDomains | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query embeddingStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query expiryAlerts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query fieldPermissions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query fixedAsset | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query fixedAssets | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query fixedAssetStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query formAnalytics | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query formAssignments | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query formFields | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query formScores | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query formSubmission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query formSubmissions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query formTemplate | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query formTemplates | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateCampaignContent | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateCommPlan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateCriticalPath | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateDealNextBestAction | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generatePmSprintRetrospective | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generatePmTaskDescription | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generatePortfolioAnalysis | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateProjectCharter | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateQualityChecklist | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateRiskRegister | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateScheduleFromWbs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateStakeholderAnalysis | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateStatusReport | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateSustainabilityImpact | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateTailoringRecommendations | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateTasksFromWbs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query generateWbs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query getBucketPolicy | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query getDefaultBucket | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query getLifecycleRules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query getS3Endpoint | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query getStorageStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query getVersioningStatus | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query getVersionPresignedUrl | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hasSystemPermission | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hrApplicants | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hrAttendance | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hrClockIn | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hrDepartment | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hrEmployee | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hrEmployees | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hrLeaveRequests | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query hrPayrollSlips | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query individual | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query individuals | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query integrationsMarketplace | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query integrationsWebhookLogs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invBins | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invCategories | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invGoodsReceivedNotes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invGrnLines | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invItemVariants | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invPoLines | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invPrLines | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invPurchaseOrders | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invPurchaseRequisitions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invStockLedger | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invStockMovements | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invStockStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invStockTransfers | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invSuppliers | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invWarehouse | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invWarehouses | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query invZones | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmAgents | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmAgentSkills | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmAgentWorkload | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmAiCategorize | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmAiSlaRisk | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmAiSuggestResolution | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmApprovals | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmAvailabilityRecords | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmCatalogItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmCategories | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmChanges | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmCIRelationships | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmConfigurationItem | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmConfigurationItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmContinuityPlans | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmDashboardStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmDeployments | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmEvents | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmKnowledgeArticles | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmModuleCounts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmPortfolioServices | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmProblems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmReleaseChanges | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmReleases | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmSearchReporters | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmServiceRequests | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmSlaPolicies | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmTicket | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmTicketComments | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query itsmTickets | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query leadScores | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query listBuckets | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query listFilesInFolder | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query listFolders | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query listObjectVersions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query manufacturingStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query markPentestFalsePositive | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query me | Public (@Public) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query media | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query mediaById | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query mediaByS3Key | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query messagingEvents | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query messagingQueues | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query mfgBomLines | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query mfgBoms | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query mfgWorkOrders | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query minioServerInfo | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query newsCrawlHistory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query newsSentimentSummary | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query notificationChannels | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query notificationLogs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query notificationRules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query notifications | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query notificationStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query notificationTemplates | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opnameLines | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opnameSessions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opnameStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opsPlaybook | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opsPlaybooks | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opsPlaybookSteps | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opsRun | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opsRuns | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opsRunSteps | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query opsSchedules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query orgWideDefaults | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query page | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pageBySlug | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pages | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pentestCompliance | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pentestScanDetail | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pentestTarget | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query permissionSet | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query permissionSetObjectPermissions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query permissionSets | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query permissionSetSystemPermissions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pickTasks | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmActivities | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmAllLessonsLearned | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmBenefits | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmChangeRequests | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmCommPlans | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmDomainHealth | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmEarnedValues | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmFocusAreas | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmGovernanceDecisions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmLessonsLearned | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmMeetingMinutes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmMilestones | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmPortfolioSummary | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmPrincipleAssessments | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmProcurementLinks | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmProject | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmProjectCharter | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmProjects | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmQualityChecklists | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmQualityInspections | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmQualityMetrics | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmRaciMatrix | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmRequirements | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmResourcePlans | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmRiskRegisters | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmScopeStatement | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmSprints | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmStakeholders | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmStatusReports | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmSustainabilityMetrics | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmTailoringLog | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmTask | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmTaskDependencies | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmTasks | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmTimeLogs | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query pmWbsItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query portainerEndpoints | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query procurementStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query products | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query profile | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query profileObjectPermissions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query profiles | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query profileSystemPermissions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query publicGroups | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query putawayTasks | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query quoteItems | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query quotes | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query rentalAssets | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query rentalContracts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query rentalStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query reportSchedules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query reportTemplates | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query resolveObjectPermissions | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query role | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query roles | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query runPentestScan | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query scadaActiveAlarms | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query scadaDataSources | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query scadaTags | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query securityEvents | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query semanticSearch | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query setting | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query settingByKey | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query settings | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query settingsByCategory | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query sharingRules | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query stockOperations | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query stockOperationStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioAiStatus | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioChunk | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioConversation | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioConversations | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioGuideFlow | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioGuideFlows | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioGuideFlowTemplates | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioNotebook | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioNotebooks | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioNotes | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioOutputs | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioPreviewUmkmIntent | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioPublishedGuideFlow | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioSettings | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioSourceDetail | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioSourceStatus | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioUmkmCommandsDefaults | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioUmkmRegistrations | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioValidateGuideFlow | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioWhatsAppAuthQr | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioWhatsAppConfig | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioWhatsAppConfigs | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioWhatsAppSecurityMeta | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query studioWhatsAppSessionStatus | JWT (explicit UseGuards) | User ownership in service layer | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query systemInfo | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query teams | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query tenant | JWT (GlobalAuthGuard APP_GUARD) | Partial (client-supplied tenantId args) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query tenantBySlug | JWT (GlobalAuthGuard APP_GUARD) | Partial (client-supplied tenantId args) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query tenants | JWT (GlobalAuthGuard APP_GUARD) | Partial (client-supplied tenantId args) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query tenantUser | JWT (GlobalAuthGuard APP_GUARD) | Partial (client-supplied tenantId args) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query tenantUsers | JWT (GlobalAuthGuard APP_GUARD) | Partial (client-supplied tenantId args) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query updateNewsSetting | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query updatePentestCompliance | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query upsertAcctCurrency | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query user | JWT (explicit UseGuards) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query users | JWT (explicit UseGuards) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query userStars | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query warehouseLayout | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query warehouseLayouts | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query warehouseStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| GraphQL Query wmsStats | JWT (GlobalAuthGuard APP_GUARD) | None / service-role Supabase | Medium | Monitor; enforce RLS if client uses Supabase direct |
| Next.js POST /api/chat | None (mock) | N/A | Low | Add auth before enabling real LLM |
| Next.js POST /api/media | Bearer JWT (route handler) | Forwarded to GraphQL GlobalAuthGuard | Medium | Ensure admin UI sends Authorization on upload |
| REST GET /ml/health | Public (@Public) | User JWT when required | Low | Monitor; enforce RLS if client uses Supabase direct |
| REST GET /studio/shared/:token | Public (@Public) | User JWT when required | Low (token gate in service) | Monitor; enforce RLS if client uses Supabase direct |
| REST GET /webhooks/health | Public (@Public) | User JWT when required | Low | Monitor; enforce RLS if client uses Supabase direct |
| REST POST /api/studio/whatsapp/webhook | Alternative (handler key/HMAC) | User JWT when required | Medium | Monitor; enforce RLS if client uses Supabase direct |
| REST POST /internal/kasir-consult | Alternative (handler key/HMAC) | N/A (Hermes coach/kurikulum) | Medium | Monitor; enforce RLS if client uses Supabase direct |
| REST POST /ml/predict | Public (@Public) | User JWT when required | Low | Monitor; enforce RLS if client uses Supabase direct |
| REST POST /ml/setup | Public (@Public) | User JWT when required | Low | Monitor; enforce RLS if client uses Supabase direct |
| REST POST /studio/chat/stream | JWT (GlobalAuthGuard APP_GUARD) | User JWT when required | Medium | Monitor; enforce RLS if client uses Supabase direct |
| REST POST /studio/upload | JWT (GlobalAuthGuard APP_GUARD) | User JWT when required | Medium | Fixed: GlobalAuthGuard requires Bearer JWT |
| REST POST /webhooks/labelstudio | Public (@Public) | User JWT when required | Low | Monitor; enforce RLS if client uses Supabase direct |
