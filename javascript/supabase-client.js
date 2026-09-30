/* global supabase */

(function () {
    const config = window.supabaseConfig || {};
    window.useSupabaseAuth = config.useSupabaseAuth === true;

    const isConfigured = config.url &&
        config.anonKey &&
        !config.url.includes("YOUR_SUPABASE") &&
        !config.anonKey.includes("YOUR_SUPABASE");

    window.supabaseReady = isConfigured
        ? supabase.createClient(config.url, config.anonKey)
        : null;
})();
