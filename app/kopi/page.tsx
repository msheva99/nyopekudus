'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function PromoNyopeeGo() {
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'soldout'>('loading');
  const [remaining, setRemaining] = useState<number>(15);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Effect untuk mengecek promo
  useEffect(() => {
    const checkPromo = async () => {
      const hasLocalClaim = localStorage.getItem('nyopee_already_claimed');
      
      try {
        const res = await fetch('/api/promo');
        const data = await res.json();
        setRemaining(data.remaining ?? 0);

        if (data.already || hasLocalClaim === 'true') {
          setStatus('already');
          localStorage.setItem('nyopee_already_claimed', 'true');
        } else if (data.success) {
          localStorage.setItem('nyopee_already_claimed', 'true');
          setStatus('success');
        } else {
          setStatus('soldout');
        }
      } catch (e) {
        setStatus('soldout');
      }
    };
    checkPromo();
  }, []);

  // Effect untuk Jam Digital (Real-time)
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

  // --- 1. TAMPILAN SUDAH DIKLAIM (PAGE BARU) ---
  if (status === 'already') {
    return (
      <BackgroundWrapper>
        <div className="w-full max-w-[300px] bg-white rounded-[2.5rem] shadow-2xl text-center p-8 border-4 border-green-600 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl text-green-600">✓</span>
          </div>
          <h2 className="text-[22px] font-black text-green-700 leading-tight uppercase mb-2">
            PROMO SUDAH<br/>PERNAH DIKLAIM
          </h2>
          <div className="h-1 w-12 bg-green-200 mx-auto mb-4" />
          <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase">
            Maaf, satu akun/perangkat <br/> 
            hanya berlaku untuk satu kali klaim. <br/>
            Sampai jumpa di promo berikutnya!
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 text-[9px] font-black text-green-600 underline uppercase tracking-widest"
          >
            Refresh Status
          </button>
        </div>
      </BackgroundWrapper>
    );
  }

  // --- 2. TAMPILAN BERHASIL KLAIM (KUPON AKTIF) ---
  if (status === 'success') {
    return (
      <BackgroundWrapper>
        <div className="w-full max-w-[320px] bg-[#FDFCFB] rounded-[2.5rem] shadow-2xl text-center pt-4 pb-6 px-6 border-4 border-[#5C4033] animate-in fade-in zoom-in duration-500">
          
          <div className="relative w-24 h-12 mx-auto mb-1">
            <Image src="/images/logo.png" alt="NYOPEE GO" fill className="object-contain" />
          </div>

          <div className="space-y-1 mb-3">
            <h2 className="text-[20px] font-black text-[#5C4033] tracking-tighter uppercase leading-tight">
              YEAY! ES TEH + ES KOPI KLEPON MINI GRATIS
            </h2>
            <div className="inline-block px-3 py-1 bg-amber-100 rounded-full">
               <p className="text-[10px] font-black text-amber-800 uppercase tabular-nums">
                🕒 {currentTime || '--:--:--'}
              </p>
            </div>
          </div>

          <div className="my-4">
            <h1 className="text-[42px] font-extrabold text-[#8B4513] leading-[0.8] tracking-tighter italic">
              GRATIS 1<br/>
              <span className="text-[12px] not-italic font-black block mt-1 tracking-widest uppercase">
              Es Teh + Es Kopi Klepon Mini</span>
            </h1>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold text-stone-400 italic">
              *Minimal pembelian 2 varian Es Kopi Blend
            </p>
          </div>

          {/* Lokasi */}
          <div className="mb-4">
            <a 
              href="https://maps.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-orange-100 bg-white rounded-xl px-3 py-2 w-full shadow-sm"
            >
              <span className="text-orange-500 text-base">📍</span>
              <div className="text-left">
                <p className="text-[10px] font-black text-gray-800 leading-none">Jl. Budi Utomo, Jepang Pakis</p>
                <p className="text-[8px] text-gray-400 font-medium">Kec. Jati, Kab. Kudus</p>
              </div>
            </a>
          </div>

          {/* Kuota */}
          <div className="bg-[#5C4033] rounded-2xl py-3 mb-4 text-white shadow-lg">
            <div className="flex justify-center items-baseline gap-1.5">
              <span className="text-3xl font-black tabular-nums">{String(remaining).padStart(2, '0')}</span>
              <span className="text-xs font-bold">ORANG LAGI</span>
            </div>
            <p className="text-[8px] font-bold uppercase tracking-widest opacity-80 mt-1">Siapa cepat dia dapat!</p>
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

          <p className="mt-4 text-[8px] text-stone-400 font-bold uppercase">
            Promo terbatas untuk 20 orang pertama
          </p>
        </div>
      </BackgroundWrapper>
    );
  }

  // --- 3. TAMPILAN SOLDOUT ---
  return (
    <BackgroundWrapper>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-[280px] w-full text-center border-4 border-stone-100">
        <h1 className="text-xl font-black text-stone-400 uppercase leading-none mb-2">WADUH,<br/>HABIS!</h1>
        <p className="text-stone-500 text-[10px] leading-relaxed uppercase font-bold">
          Kopi gratisnya sudah habis. Pantau terus Instagram NYOPEE untuk promo berikutnya!
        </p>
      </div>
    </BackgroundWrapper>
  );
}