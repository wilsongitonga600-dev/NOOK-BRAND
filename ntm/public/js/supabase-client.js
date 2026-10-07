const SUPABASE_URL = 'https://chomkgmusgtxsomuopjr.supabase.co';

const SUPABASE_ANON_KEY ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNob21rZ211c2d0eHNvbXVvcGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwOTcwMjEsImV4cCI6MjEwNjY3MzAyMX0.cpQrpU15FwsDhrbg_1MJ6FhvXcntllSEceJBMwy0wpQ';
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
window.supabaseClient = supabaseClient;

