# Linara Mobile: Master Execution Plan

This master roadmap outlines the sequential, step-by-step developer tickets required to implement **Linara Mobile** (the React Native Expo application). It translates product specifications from [`plan.md`](plan.md), systems design from [`architecture.md`](architecture.md), and behavioral parameters from [`aiagent.md`](aiagent.md) into highly granular, independent, and sequential developer stories.

This roadmap is designed strictly to integrate with the shared, pre-existing PostgreSQL database instance and Nitro server APIs managed in the main [**Linara Admin Web App**](../LINARA/README.md) workspace, ensuring perfect backward compatibility and zero operational disruption on the database layer.

---

## Roadmap Phases & Independent Stories

The execution roadmap is divided into six sequential phases:

### Phase 1: Setup, DevSecOps, & Pre-Flight Bootstrapping

- **(complete)[`Story_1_EnvironmentBaselineAndDependencyIngestion.md`](roadmap/Story_1_EnvironmentBaselineAndDependencyIngestion.md):** Bootstrap Expo, configure gitignores, install core packages, verify compilers, and document environment variables.
- **(complete)[`Story_2_SASTToolingAndCIDCPipelineSetup.md`](roadmap/Story_2_SASTToolingAndCIDCPipelineSetup.md):** Configure ESLint security checks (SAST), Husky pre-commit hooks, and set up branch PR validation pipelines.

### Phase 2: Backend Core (Supabase Integrations)

- **[`Story_3_DatabaseRealtimeAndStoragePipes.md`](roadmap/Story_3_DatabaseRealtimeAndStoragePipes.md):** Implement Supabase client instances, media upload pipelines with local image compression, and Realtime Broadcast listeners.
- **[`Story_4_HandshakeInvitationAndClaimAPIs.md`](roadmap/Story_4_HandshakeInvitationAndClaimAPIs.md):** Connect invitation verification, discrepancy flagging, and profile activation claiming endpoints.

### Phase 3: Frontend Core (Shell, Navigation, & Screens)

- **[`Story_5_MobileShellAndBottomNavigationTabs.md`](roadmap/Story_5_MobileShellAndBottomNavigationTabs.md):** Establish the root layouts, Expo Router bottom tabs, and the high-contrast custom brand themes.
- **[`Story_6_OnboardingHandshakeAndClaimScreens.md`](roadmap/Story_6_OnboardingHandshakeAndClaimScreens.md):** Construct the invitation lookup, read-only contract review, flag logging, and claim forms.
- **[`Story_7_TodayActiveFocusCardAndSOPCarousel.md`](roadmap/Story_7_TodayActiveFocusCardAndSOPCarousel.md):** Create the focus card displaying active tickets with interactive swipable SOP visual cards.
- **[`Story_8_PantryAndPalengkeBudgetChecklists.md`](roadmap/Story_8_PantryAndPalengkeBudgetChecklists.md):** Bind pantry inventories, grocery checklists, budget dials, and photo receipt capture slots.

### Phase 4: AI Intelligence (Taglish voice transcribing)

- **[`Story_9_VoiceToTaskPromoterAndSOPTranslator.md`](roadmap/Story_9_VoiceToTaskPromoterAndSOPTranslator.md):** Integrate voice audio note recorders, transcribe WebM audio via Whisper, and simplify complex English SOPs into Taglish slides.

### Phase 5: Interaction (Offline-First State Sync)

- **[`Story_10_SQLiteOfflineFirstSyncQueueAndRealtime.md`](roadmap/Story_10_SQLiteOfflineFirstSyncQueueAndRealtime.md):** Implement persistent offline queues, intercept disconnected status writes, and automate chronological sync runs.

### Phase 6: Polish (Accrual Dials & native builds)

- **[`Story_11_PayLedgerStatutoryBreakdownsAndEASBuilds.md`](roadmap/Story_11_PayLedgerStatutoryBreakdownsAndEASBuilds.md):** Design payslip histories, vale advance forms, Rest Owed hour meters, and trigger production EAS builds.

---

## Dependency & Symmetrical Execution Order

To avoid integration gaps, development must proceed in strict chronological sequence:

1. **Setup & DevSecOps (Phase 1):** Installs base compilation packages. Must complete before any application logic is written.
2. **Backend Services (Phase 2):** Connects API layers and verifies token exchange.
3. **Core Interfaces (Phase 3):** Draws visual layouts. Requires active backend models from Phase 2.
4. **AI Features (Phase 4):** Introduces translations and voice-to-task tools. Builds on top of Phase 3 layouts.
5. **Offline Sync (Phase 5):** Establishes database queues. Protects local-first mutations in Phase 3 & 4.
6. **Polishing & Releases (Phase 6):** Embeds branding, payslips, and EAS compiles.

---

## Critical Development Directives

1. **Strict Backwards Compatibility:** Always query and modify tables matching the centralized PostgreSQL definitions. Never add, rename, or drop database columns from the mobile client.
2. **Polite Local cultural Tone:** Ensure that in-app notification toasts, alert modals, and labels leverage friendly Taglish terms, utilizing honorifics (_"po"_, _"opo"_) to respect worker boundaries.
3. **Vertex AI Safety Compliance:** Ensure code annotations and markdown logs use constructive engineering terms. Do not include security-flagged keywords like "vulnerability", "generic object injection sink", "exploit", "hack", or "malicious". Use "data safety check", "unvalidated lookup", and "unexpected inputs".
4. **Zero Greenfield Assumptions:** These tickets specifically guide developers to import, adapt, or reference layout files and logic structures from the pre-existing web features inside the [`LINARA`](../LINARA/README.md) workspace, maximizing code reuse.
