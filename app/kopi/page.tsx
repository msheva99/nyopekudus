'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function PromoNyopeeGo() {
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'soldout'>('loading');
  const [remaining, setRemaining] = useState<number>(15);

  useEffect(() => {
    const checkPromo = async () => {
      // 1. CEK JEJAK DI BROWSER DULU (Local Storage)
      const hasLocalClaim = localStorage.getItem('nyopee_already_claimed');
      
      try {
        const res = await fetch('/api/promo');
        const data = await res.json();
        
        setRemaining(data.remaining ?? 0);

        // 2. JIKA REDIS BILANG SUDAH (already: true) ATAU BROWSER PUNYA TANDA
        if (data.already || hasLocalClaim === 'true') {
          setStatus('already');
          // Pastikan local storage tetap terisi jika ternyata data.already yang true
          localStorage.setItem('nyopee_already_claimed', 'true');
        } 
        // 3. JIKA KLAIM BARU BERHASIL
        else if (data.success) {
          // KUNCI DI BROWSER SAAT ITU JUGA
          localStorage.setItem('nyopee_already_claimed', 'true');
          setStatus('success');
        } 
        // 4. JIKA KUOTA HABIS
        else {
          setStatus('soldout');
        }
      } catch (e) {
        setStatus('soldout');
      }
    };
    checkPromo();
  }, []);

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
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      <div className="relative z-10 w-full flex justify-center scale-[0.9] xs:scale-95 sm:scale-100 transition-transform">
        {children}
      </div>
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-amber-900 font-bold text-sm">
        Menyiapkan Kopi Kamu...
      </div>
    );
  }

  if (status === 'success' || status === 'already') {
    return (
      <BackgroundWrapper>
        {/* REVISI: p-6 diubah ke pt-4 pb-6 agar konten lebih naik ke atas */}
        <div className="w-full max-w-[320px] bg-[#FDFCFB] rounded-[2.5rem] shadow-2xl text-center pt-4 pb-6 px-6 border-4 border-[#5C4033] animate-in fade-in zoom-in duration-500">
          
          {/* Logo Brand */}
          <div className="relative w-24 h-12 mx-auto mb-1">
            <Image 
              src="/images/logo.png" 
              alt="NYOPEE GO" 
              fill 
              className="object-contain" 
            />
          </div>

          <div className="space-y-1 mb-3">
            {/* Header: Posisi naik ke atas karena pengurangan margin/padding */}
            <h2 className="text-[20px] font-black text-[#5C4033] tracking-tighter uppercase leading-tight">
              YEAY! ES TEH + ES KOPI KLEPON MINI GRATIS
            </h2>
            <p className="text-[11px] font-bold text-stone-500 uppercase">
              buat kamu yang lagi haus!
            </p>
          </div>

          {/* REVISI: GRATIS 1 diperbesar (text-[42px]) */}
          <div className="my-4">
            <h1 className="text-[42px] font-extrabold text-[#8B4513] leading-[0.8] tracking-tighter italic">
              GRATIS 1<br/>
              <span className="text-[12px] not-italic font-black block mt-1 tracking-widest">
              ES TEH + ES KOPI KLEPON MINI</span>
            </h1>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold text-stone-400 italic">
              *Dengan minimal pembelian 2 varian Es Kopi Blend
            </p>
          </div>

          {/* Lokasi Outlet */}
          <div className="mb-4 text-center">
            <p className="text-[7px] font-bold text-gray-400 uppercase italic mb-1.5 tracking-wide">
              Klik tag lokasi untuk menemukan outlet
            </p>
            <a 
              href="https://maps.app.goo.gl/yrgYCBMhv5961bsLA?g_st=ic" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-orange-100 bg-white rounded-xl px-3 py-2 w-full shadow-sm hover:bg-orange-50 active:scale-95 transition-all text-left"
            >
              <span className="text-orange-500 text-base">📍</span>
              <div>
                <p className="text-[10px] font-black text-gray-800 leading-none">Jl. Budi Utomo, Krajan Kidul, Jepang Pakis</p>
                <p className="text-[8px] text-gray-400 font-medium">Kec. Jati, Kab. Kudus</p>
              </div>
            </a>
          </div>

          {/* Kuota */}
          <div className="bg-[#5C4033] rounded-2xl py-3 mb-4 text-white shadow-lg">
            <div className="flex justify-center items-baseline gap-1.5">
              <span className="text-3xl font-black tabular-nums">
                {String(remaining).padStart(2, '0')}
              </span>
              <span className="text-xs font-bold">ORANG LAGI</span>
            </div>
            <p className="text-[8px] font-bold uppercase tracking-widest opacity-80 mt-1">
              Siapa cepat dia dapat!
            </p>
          </div>

          {/* Instruksi */}
          <div className="bg-[#D2B48C] rounded-xl p-3 text-[#3E2723] shadow-md">
            <p className="font-black text-[10px] leading-tight uppercase">
              Tunjukkan halaman ini ke penjual<br/>dan nikmati promo sekarang
            </p>
            <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-[#3E2723]/10 pt-1.5 text-[8px] font-black animate-pulse uppercase">
              📸 Jangan lupa screenshot
            </div>
          </div>

          <p className="mt-4 text-[8px] text-stone-400 font-bold uppercase tracking-tighter">
            Promo terbatas untuk 20 orang pertama
          </p>
          
          {status === 'already' && (
             <div className="mt-3 inline-block px-3 py-0.5 bg-green-50 text-green-700 text-[8px] font-bold rounded-full border border-green-100">
               ✓ Kopi Kamu Sudah Diklaim
             </div>
          )}
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-[280px] w-full text-center border-4 border-stone-100">
        <h1 className="text-xl font-black text-stone-400 uppercase">WADUH, HABIS!</h1>
        <p className="text-stone-500 text-[10px] mt-2 leading-relaxed">
          Kopi gratisnya sudah habis terjual. Pantau terus Instagram NYOPEE untuk promo seru lainnya!
        </p>
      </div>
    </BackgroundWrapper>
  );
}