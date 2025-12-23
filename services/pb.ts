import PocketBase from 'pocketbase';

// 1. KONFIGURASI URL
// Menggunakan import.meta.env (Standar Vite) agar .env terbaca.
// Pastikan di file .env variabelnya bernama VITE_POCKETBASE_URL
const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

console.log(`[DATABASE] Connecting to: ${PB_URL}`);

export const pb = new PocketBase(PB_URL);

// 2. FIX UNTUK NGROK (SANGAT PENTING)
// Header ini mencegah Ngrok memblokir request API dengan halaman peringatan HTML.
// Ini akan memperbaiki error: "EventSource's response has a MIME type..."
pb.beforeSend = function (url, options) {
    options.headers = Object.assign({}, options.headers, {
        'ngrok-skip-browser-warning': 'true',
    });
    return { url, options };
};

// 3. MATIKAN AUTO-CANCELLATION
// Agar request yang cepat/bersamaan tidak saling membatalkan.
pb.autoCancellation(false);

// 4. TYPE DEFINITION (Untuk TypeScript)
export interface UserProfile {
    id: string;
    username: string;
    email: string;
    name?: string;   // Gunakan '?' jika field ini tidak selalu ada
    avatar?: string; // Gunakan '?' jika user baru belum punya avatar
    phone?: string;
}

// 5. HELPER FUNCTIONS
export const getCurrentUser = () => {
    return pb.authStore.model as UserProfile | null;
};

export const logout = () => {
    pb.authStore.clear();
    // Opsional: Redirect ke halaman login atau home
    window.location.href = '/'; 
};
