import { Redis } from '@upstash/redis';
import { NextResponse, NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(req: NextRequest) {
  try {
    const quotaKey = 'kuota_nyopekudus';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const claimKey = `user_claimed_nyopekudus:${ip}`;

    // 1. Ambil data sisa kuota & status klaim IP secara bersamaan
    const [remaining, hasClaimed] = await Promise.all([
      redis.get<number>(quotaKey),
      redis.get(claimKey)
    ]);

    let currentQuota = remaining;

    // Inisialisasi jika database kosong
    if (currentQuota === null) {
      await redis.set(quotaKey, 15);
      currentQuota = 15;
    }

    // 2. CEK APAKAH SUDAH PERNAH KLAIM (Kunci utama agar refresh terdeteksi)
    if (hasClaimed) {
      return NextResponse.json({
        success: false,
        already: true,
        remaining: currentQuota
      });
    }

    // 3. JIKA BELUM KLAIM & KUOTA MASIH ADA
    if (currentQuota > 0) {
      // Kurangi kuota di Redis
      await redis.decr(quotaKey); 
      // Kunci IP ini agar saat refresh statusnya jadi 'already'
      await redis.set(claimKey, "true", { ex: 86400 }); 

      return NextResponse.json({
        success: true,
        remaining: currentQuota - 1
      });
    }

    // 4. JIKA KUOTA HABIS
    return NextResponse.json({
      success: false,
      already: false,
      remaining: 0
    });

  } catch (error) {
    return NextResponse.json({ success: false, remaining: 0 }, { status: 500 });
  }
}