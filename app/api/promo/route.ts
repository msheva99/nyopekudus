import { Redis } from '@upstash/redis';
import { NextResponse, NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(req: NextRequest) {
  try {
    const quotaKey = 'kuota_nyopekudus';
    
    // 1. IDENTIFIKASI PERANGKAT (Fingerprint)
    // Mengambil IP asli (menangani proxy Vercel)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'unknown';
    
    // PENTING: Jangan slice terlalu pendek. Laptop dan HP punya User-Agent yang 
    // sangat panjang di bagian belakang. Kita simpan lebih panjang agar unik.
    const deviceId = Buffer.from(`${ip}-${ua}`).toString('base64').replace(/[/+=]/g, '').slice(0, 150);
    const claimKey = `user_claimed_nyopekudus:${deviceId}`;

    // 2. CEK STATUS KLAIM & SISA KUOTA (Multi-Get untuk efisiensi)
    const [hasClaimed, currentQuotaStr] = await redis.mget<[string | null, string | null]>(claimKey, quotaKey);
    
    let currentQuota = currentQuotaStr !== null ? parseInt(currentQuotaStr) : 15;

    // JIKA PERANGKAT INI SUDAH PERNAH KLAIM
    if (hasClaimed) {
      return NextResponse.json({
        success: false,
        already: true,
        remaining: currentQuota > 0 ? currentQuota : 0
      });
    }

    // 3. PROSES KLAIM BARU
    if (currentQuota > 0) {
      // Operasi ATOMIC: Mengurangi kuota langsung di Redis
      const newQuota = await redis.decr(quotaKey);

      // Jika setelah dikurangi hasilnya masih 0 atau lebih, berarti klaim SAH
      if (newQuota >= 0) {
        // KUNCI PERANGKAT: Set agar tidak bisa klaim lagi selama 24 jam
        await redis.set(claimKey, "true", { ex: 86400 });
        
        return NextResponse.json({
          success: true,
          remaining: newQuota
        });
      } else {
        // Jika hasil DECR negatif, berarti kuota habis tepat saat request masuk
        await redis.set(quotaKey, 0); // Pastikan tidak minus di database
      }
    }

    // 4. JIKA KUOTA HABIS
    return NextResponse.json({
      success: false,
      already: false,
      remaining: 0
    });

  } catch (error) {
    console.error("Promo API Error:", error);
    return NextResponse.json(
      { success: false, remaining: 0, error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}