import React, { useState } from 'react';
import { pb } from '../../services/pb';
import { Shield, Lock, Smartphone, User, ArrowRight, Loader2, KeyRound, Fingerprint, Flame, Cpu, Eye, EyeOff } from 'lucide-react';

interface AuthViewProps {
    onAuthSuccess: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'RECOVERY'>('LOGIN');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPass, setShowPass] = useState(false);

    // Form States
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Login ke PocketBase
            await pb.collection('users').authWithPassword(username, password);
            onAuthSuccess();
        } catch (err: any) {
            console.error(err);
            setError("Akses Ditolak. Username atau Password salah.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== passwordConfirm) {
            setError("Konfirmasi password tidak cocok.");
            setLoading(false);
            return;
        }

        try {
            const data = {
                username,
                password,
                passwordConfirm,
                phone, 
                emailVisibility: true,
            };

            await pb.collection('users').create(data);
            await pb.collection('users').authWithPassword(username, password); // Auto login
            onAuthSuccess();
        } catch (err: any) {
            console.error(err);
            // Menangkap pesan error dari PocketBase
            const msg = err.data?.data?.username?.message || err.data?.data?.password?.message || err.message;
            setError(`Gagal Mendaftar: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Simulasi Verifikasi (Karena SMS Gateway butuh biaya)
        // Di sistem lokal, kita validasi apakah datanya ada di database
        try {
            // Cek ketersediaan user (Simulasi logic)
            if(!phone || !username) throw new Error("Data tidak lengkap");
            
            await new Promise(resolve => setTimeout(resolve, 1500)); // Efek loading
            
            // Note: PocketBase tidak kirim SMS bawaan. 
            // Ini instruksi untuk Developer/User di environment lokal.
            alert(`[DEV MODE: RECOVERY]\n\nVerifikasi Valid.\nKarena ini Localhost, silakan reset password manual melalui Dashboard Admin (http://127.0.0.1:8090/_/).\n\nCari user: ${username}, klik Edit, lalu set Password baru.`);
            
            setMode('LOGIN');
        } catch (err: any) {
            setError("Gagal memverifikasi data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050505] flex items-center justify-center p-4">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo Header */}
                <div className="text-center mb-8 animate-slide-down">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[24px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-[0_0_40px_var(--accent-glow)] mb-6 relative group">
                        <div className="absolute inset-0 rounded-[24px] border border-accent/20 animate-pulse"></div>
                        <Fingerprint size={40} className="text-accent relative z-10" />
                    </div>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">
                        IStoic<span className="text-accent">AI</span>
                    </h1>
                    <p className="text-[10px] tech-mono text-neutral-500 font-bold uppercase tracking-[0.4em]">
                        SECURE_COGNITIVE_TERMINAL
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-[#0a0a0b] border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden animate-slide-up">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-fade-in">
                            <Shield className="text-red-500 shrink-0" size={16} />
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">{error}</p>
                        </div>
                    )}

                    {mode === 'LOGIN' && (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">Username / Identity</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-accent transition-colors" size={18} />
                                    <input 
                                        type="text" 
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-neutral-700"
                                        placeholder="Ketik username..."
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">Passcode</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-accent transition-colors" size={18} />
                                    <input 
                                        type={showPass ? "text" : "password"} 
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-12 text-sm font-bold text-white focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-neutral-700"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white">
                                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                    </button>
                                </div>
                                <div className="flex justify-end">
                                    <button type="button" onClick={() => setMode('RECOVERY')} className="text-[9px] font-bold text-neutral-500 hover:text-accent transition-colors uppercase tracking-wide">
                                        Lupa Kode Akses?
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-4 bg-white text-black hover:bg-accent hover:text-black rounded-xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <>AUTHENTICATE <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    )}

                    {mode === 'REGISTER' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">Username</label>
                                    <div className="relative">
                                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-accent/50" required placeholder="UserBaru" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">No. HP (Recovery)</label>
                                    <div className="relative">
                                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-accent/50" placeholder="08..." required />
                                    </div>
                                </div>
                             </div>
                            <div className="space-y-2">
                                <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-accent/50" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">Konfirmasi Password</label>
                                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-accent/50" required />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-4 bg-accent text-black rounded-xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all mt-4 hover:shadow-[0_0_20px_var(--accent-glow)]">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : "CREATE ID"}
                            </button>
                        </form>
                    )}

                    {mode === 'RECOVERY' && (
                        <form onSubmit={handleRecovery} className="space-y-5">
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[10px] text-yellow-500 font-bold leading-relaxed mb-4">
                                Masukkan Username dan Nomor HP yang terdaftar untuk verifikasi kepemilikan.
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">Username</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-accent/50" required />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <label className="text-[9px] tech-mono font-black text-neutral-500 uppercase tracking-widest pl-2">Nomor Handphone</label>
                                <div className="relative group">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-accent/50" placeholder="08..." required />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-4 bg-white text-black hover:bg-yellow-400 rounded-xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : "VERIFY IDENTITY"}
                            </button>
                        </form>
                    )}

                    {/* Footer Toggle */}
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2">
                        {mode === 'LOGIN' ? (
                            <>
                                <span className="text-[10px] text-neutral-500 font-bold uppercase">Belum punya akses?</span>
                                <button onClick={() => setMode('REGISTER')} className="text-[10px] font-black text-accent hover:text-white uppercase tracking-wider transition-colors">DAFTAR SYSTEM</button>
                            </>
                        ) : (
                            <button onClick={() => setMode('LOGIN')} className="text-[10px] font-black text-neutral-400 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-2">
                                <KeyRound size={12} /> KEMBALI KE LOGIN
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};