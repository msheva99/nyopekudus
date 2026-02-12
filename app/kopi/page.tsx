'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function PromoNyopeeGo() {
  const [status, setStatus] = useState<'loading' | 'check' | 'success' | 'already' | 'soldout'>('loading');
  const [remaining, setRemaining] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [claiming, setClaiming] = useState(false);

  // 1. CEK STATUS AWAL (Tidak Klaim Otomatis!)
  useEffect(() => {
    const checkStatus = async () => {
      const hasLocalClaim = localStorage.getItem('nyopee_already_claimed');
      
      // Jika browser sudah punya tanda, langsung ke halaman "already"
      if (hasLocalClaim === 'true') {
        setStatus('already');
        return;
      }

      try {
        // GET = Cek status saja, tidak klaim!
        const res = await fetch('/api/promo', { method: 'GET' });
        const data = await res.json();
        
        setRemaining(data.remaining ?? 0);

        if (data.already) {
          // Server bilang sudah klaim (berdasarkan fingerprint)
          localStorage.setItem('nyopee_already_claimed', 'true');
          setStatus('already');
        } else if (data.canClaim) {
          // Bisa klaim - tampilkan tombol
          setStatus('check');
        } else {
          // Kuota habis
          setStatus('soldout');
        }
      } catch (e) {
        console.error("Check status error:", e);
        setStatus('soldout');
      }
    };

    checkStatus();
  }, []);

  // 2. FUNGSI KLAIM PROMO (Dipanggil saat user tekan tombol)
  const handleClaim = async () => {
    setClaiming(true);
    
    try {
      // POST = Klaim promo sebenarnya
      const res = await fetch('/api/promo', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      setRemaining(data.remaining ?? 0);

      if (data.success) {
        localStorage.setItem('nyopee_already_claimed', 'true');
        setStatus('success');
      } else if (data.already) {
        localStorage.setItem('nyopee_already_claimed', 'true');
        setStatus('already');
      } else {
        setStatus('soldout');
      }
    } catch (e) {
      console.error("Claim error:", e);
      alert("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setClaiming(false);
    }
  };

  // 3. Jam Digital Real-time (Anti-Screenshot)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Komponen Wrapper Background
  const BackgroundWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center p-4 font-sans text-[#1a1a1a] overflow-hidden">
      <div className="fixed inset-0 -z-10 w-full h-full">
        <Image 
          src="/images/tampilan_diskon.png" 
          alt="Background" 
          fill 
          priority 
          className="object-cover object-center" 
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      <div className="relative z-10 w-full flex justify-center scale-[0.9] xs:scale-95 sm:scale-100 transition-transform">
        {children}
      </div>
    </div>
  );

  // --- LOADING ---
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-amber-900 font-bold text-sm">
        <div className="animate-pulse">Menyiapkan Kopi Kamu...</div>
      </div>
    );
  }

  // --- TAMPILAN TOMBOL KLAIM (Status: check) ---
  if (status === 'check') {
    return (
      <BackgroundWrapper>
        <div className="relative w-full max-w-[320px] bg-[#FDFCFB] rounded-[2.5rem] shadow-2xl text-center pt-6 pb-6 px-6 border-4 border-[#5C4033] animate-in fade-in zoom-in duration-500">
          
          <div className="relative w-24 h-12 mx-auto mb-3">
            <Image src="/images/logo.png" alt="NYOPEE GO" fill className="object-contain" />
          </div>

          <h2 className="text-[22px] font-black text-[#5C4033] tracking-tighter uppercase leading-tight mb-2">
            KLAIM PROMO<br/>ES TEH + KOPI KLEPON MINI GRATIS!
          </h2>

          <div className="my-5">
            <h1 className="text-[42px] font-extrabold text-[#8B4513] leading-[0.8] tracking-tighter italic">
              GRATIS 1<br/>
              <span className="text-[12px] not-italic font-black block mt-1 tracking-widest uppercase text-[#5C4033]">
              Es Teh + Es Kopi Klepon Mini</span>
            </h1>
          </div>

          <p className="text-[9px] font-bold text-stone-400 italic mb-4">
            *Minimal pembelian 2 varian Es Kopi Blend
          </p>

          {/* Sisa Kuota */}
          <div className="bg-[#5C4033] rounded-2xl py-3 mb-5 text-white shadow-lg">
            <div className="flex justify-center items-baseline gap-1.5">
              <span className="text-3xl font-black tabular-nums">{String(remaining).padStart(2, '0')}</span>
              <span className="text-xs font-bold">TERSISA</span>
            </div>
          </div>

          {/* TOMBOL KLAIM */}
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-base py-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
          >
            {claiming ? '⏳ Sedang Diklaim...' : '🎁 KLAIM SEKARANG'}
          </button>

          <p className="mt-4 text-[8px] text-stone-400 font-bold uppercase tracking-widest">
            Promo terbatas untuk hari ini
          </p>
        </div>
      </BackgroundWrapper>
    );
  }

  // --- TAMPILAN SUDAH DIKLAIM ---
  if (status === 'already') {
    return (
      <BackgroundWrapper>
        <div className="w-full max-w-[300px] bg-white rounded-[2.5rem] shadow-2xl text-center p-8 border-4 border-red-500 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-100">
            <span className="text-4xl">🚫</span>
          </div>
          <h2 className="text-[20px] font-black text-red-600 leading-tight uppercase mb-2">
            PROMO SUDAH<br/>PERNAH DIKLAIM
          </h2>
          <div className="h-1 w-12 bg-red-100 mx-auto mb-4" />
          <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase">
            Satu perangkat hanya berlaku <br/> 
            untuk satu kali klaim. <br/>
            Sampai jumpa di promo berikutnya!
          </p>
          <button 
            onClick={() => {
              localStorage.removeItem('nyopee_already_claimed');
              window.location.reload();
            }}
            className="mt-8 text-[9px] font-black text-red-400 underline uppercase tracking-widest hover:text-red-600 transition-colors"
          >
            Refresh Status
          </button>
        </div>
      </BackgroundWrapper>
    );
  }

  // --- TAMPILAN BERHASIL KLAIM ---
  if (status === 'success') {
    return (
      <BackgroundWrapper>
        <div className="relative w-full max-w-[320px] bg-[#FDFCFB] rounded-[2.5rem] shadow-2xl text-center pt-4 pb-6 px-6 border-4 border-[#5C4033] animate-in fade-in zoom-in duration-500 overflow-hidden">
          
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-100/30 rounded-full animate-pulse"></div>
          
          <div className="relative w-24 h-12 mx-auto mb-1">
            <Image src="/images/logo.png" alt="NYOPEE GO" fill className="object-contain" />
          </div>

          <div className="space-y-1 mb-3">
            <h2 className="text-[20px] font-black text-[#5C4033] tracking-tighter uppercase leading-tight">
              YEAY! ES TEH + ES KOPI KLEPON MINI GRATIS
            </h2>
            {/* Jam Digital Real-time */}
            <div className="inline-block px-4 py-1 bg-green-600 rounded-full shadow-md animate-bounce mt-1">
               <p className="text-[11px] font-bold text-white tabular-nums uppercase">
                🕒 Live: {currentTime || '--:--:--'}
              </p>
            </div>
          </div>

          <div className="my-4">
            <h1 className="text-[42px] font-extrabold text-[#8B4513] leading-[0.8] tracking-tighter italic">
              GRATIS 1<br/>
              <span className="text-[12px] not-italic font-black block mt-1 tracking-widest uppercase text-[#5C4033]">
              Es Teh + Es Kopi Klepon Mini</span>
            </h1>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold text-stone-400 italic">
              *Minimal pembelian 2 varian Es Kopi Blend
            </p>
          </div>

          {/* Lokasi Outlet */}
          <div className="mb-4">
            <a 
              href="https://maps.google.com/?q=Nyopee+Go+Jepang+Pakis" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-orange-100 bg-white rounded-xl px-3 py-2 w-full shadow-sm active:scale-95 transition-transform"
            >
              <span className="text-orange-500 text-base">📍</span>
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-800 leading-none uppercase">Jl. Budi Utomo, Jepang Pakis</p>
                <p className="text-[8px] text-gray-400 font-medium uppercase">Kec. Jati, Kab. Kudus</p>
              </div>
            </a>
          </div>

          {/* Sisa Kuota */}
          <div className="bg-[#5C4033] rounded-2xl py-3 mb-4 text-white shadow-lg relative overflow-hidden">
            <div className="flex justify-center items-baseline gap-1.5 relative z-10">
              <span className="text-3xl font-black tabular-nums">{String(remaining).padStart(2, '0')}</span>
              <span className="text-xs font-bold">ORANG LAGI</span>
            </div>
            <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
          </div>

          {/* Instruksi Penjual */}
          <div className="bg-[#D2B48C] rounded-xl p-3 text-[#3E2723] shadow-md border-b-4 border-[#b89b7a]">
            <p className="font-black text-[10px] leading-tight uppercase">
              Tunjukkan halaman ini ke penjual<br/>dan nikmati promo sekarang
            </p>
            <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-[#3E2723]/10 pt-1.5 text-[8px] font-black uppercase animate-pulse">
              📸 JANGAN PAKAI SCREENSHOT
            </div>
          </div>

          <p className="mt-4 text-[8px] text-stone-400 font-bold uppercase tracking-widest">
            Promo terbatas untuk hari ini
          </p>
        </div>
      </BackgroundWrapper>
    );
  }

  // --- TAMPILAN SOLDOUT ---
  return (
    <BackgroundWrapper>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-[280px] w-full text-center border-4 border-stone-100 animate-in fade-in duration-700">
        <h1 className="text-2xl font-black text-stone-400 uppercase leading-none mb-2">WADUH,<br/>HABIS!</h1>
        <div className="h-1 w-8 bg-stone-100 mx-auto mb-4" />
        <p className="text-stone-500 text-[10px] leading-relaxed uppercase font-bold">
          Kopi gratisnya sudah habis terjual.<br/>Pantau terus Instagram NYOPEE untuk promo seru lainnya!
        </p>
      </div>
    </BackgroundWrapper>
  );
}