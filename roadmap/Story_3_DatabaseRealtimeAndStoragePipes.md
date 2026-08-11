# Story 3: Database Realtime & Storage Pipes

## Objective

Configure the local Supabase Client SDK in the native runtime, establish secure connections, enable real-time PostgreSQL replication channels, and configure image uploading pipelines using pre-signed headers. This sets up the backend connectivity needed before building views.

## Context References

- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md)
- **Technical Architecture:** [`../LINARA_MOBILE/architecture.md`](../LINARA_MOBILE/architecture.md:Section 5)
- **Database Configurations:** [`src/lib/supabase.ts`](src/lib/supabase.ts) (reference for client configurations).

## Explicit Dependencies

- `Story_2_SASTToolingAndCIDCPipelineSetup.md`

## Explicit Inputs

- **Environment Variables:** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Step-by-Step Implementation Instructions

1. Create `services/supabase.ts` to initialize the Supabase client using native parameters:
   ```typescript
   import { createClient } from "@supabase/supabase-js";
   import AsyncStorage from "@react-native-async-storage/async-storage";

   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       storage: AsyncStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false,
     },
   });
   ```
2. Set up media upload pipes. Implement helper utility `services/media-upload.ts` which takes a local file path, compresses the image to a maximum width of 1200px at 80% JPEG quality using `expo-image-manipulator`, and posts the binary data to the shared Supabase Storage bucket `household-evidence`.
3. Apply Row-Level Security (RLS) policies on the bucket, restricting reads/writes to authenticated session profiles matching the `household_id`.
4. Build real-time replication listeners. Implement a hook `hooks/use-realtime-subscription.ts` to subscribe to changes on the `public.quick_utos` and `public.tickets` tables filtered by the helper's ID.

## Expected Output

- Initialized Supabase client module utilizing persistent AsyncStorage token sessions.
- Resized, compressed image upload pipeline exporting secure URLs from private storage buckets.
- Active websocket subscription hook listening to postgres replication broadcasts.

## Acceptance Criteria

- Executing database transactions with active internet returns valid responses through the Supabase client.
- Camera captures are compressed client-side and saved into the storage bucket under private, pre-signed folders.
- Modifying a row in the database table triggers an immediate realtime callback on the client.

## Definition of Done

- Storage bucket upload works and returns secure URLs.
- Real-time client listeners react to backend changes.
- Session persists across application reboots.
