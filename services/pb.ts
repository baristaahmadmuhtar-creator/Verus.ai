import PocketBase from 'pocketbase';

// KONFIGURASI DINAMIS UNTUK VERCEL & LOCALHOST
// Perubahan: Menggunakan import.meta.env (Standar Vite) agar .env terbaca
const PB_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

console.log(`[DATABASE] Connecting to: ${PB_URL}`);

export const pb = new PocketBase(PB_URL);

// --- TAMBAHAN PENTING (Agar tidak diblokir Ngrok) ---
pb.beforeSend = function (url, options) {
    options.headers = Object.assign({}, options.headers, {
        'ngrok-skip-browser-warning': 'true',
    });
    return { url, options };
};
// ----------------------------------------------------

// Matikan auto-cancellation agar request yang cepat tidak saling membatalkan
pb.autoCancellation(false);

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    phone: string;
    name: string;
    avatar: string;
}

export const getCurrentUser = () => {
    return pb.authStore.model as UserProfile | null;
};

export const logout = () => {
    pb.authStore.clear();
    window.location.reload(); // Refresh agar kembali ke halaman login
};
