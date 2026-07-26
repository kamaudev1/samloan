// ===============================
// Sam Loan App - Supabase Config
// ===============================

const SUPABASE_URL = "https://buyrcwepcwoipbgcydqg.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1eXJjd2VwY3dvaXBiZ2N5ZHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTg1NzcsImV4cCI6MjEwMDYzNDU3N30.g4M6I_2m-3DiD3_WcusLzA67lbNYwugjuf-MEF8UDGg";

// Create ONE client for the app
const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
