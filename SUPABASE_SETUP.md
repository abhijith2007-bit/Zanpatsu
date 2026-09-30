# Supabase setup

1. Create a project at https://supabase.com.
2. Open the Supabase SQL Editor and run `supabase/schema.sql`.
3. Enable Email authentication under Authentication > Providers.
4. Open Project Settings > API.
5. Copy the Project URL and anon public key into `javascript/supabase-config.js`.
6. Use the anon public key only in the browser. Never place the service-role key in this website.

The Supabase browser client is loaded on all four pages. Until the project URL and anon key are entered, the existing localStorage behavior remains active. The next integration step is migrating registration, login, profile, and semester-result operations to Supabase Auth and these tables.
