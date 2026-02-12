import { Redis } from '@upstash/redis';
import { NextResponse, NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(req: NextRequest) {
  try {
    const quotaKey = 'kuota_nyopekudus';
    
    // 1. IDENTIFIKASI PERANGKAT (Fingerprint Sederhana)
    // Menggabungkan IP dan User-Agent agar 1 device sulit klaim di browser berbeda
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'unknown';
    const deviceId = Buffer.from(`${ip}-${ua}`).toString('base64').slice(0, 60);
    const claimKey = `user_claimed_nyopekudus:${deviceId}`;

    // 2. CEK STATUS KLAIM (Cek apakah ID perangkat ini sudah ada di Redis)
    const hasClaimed = await redis.get(claimKey);
    
    if (hasClaimed) {
      const currentRemaining = await redis.get<number>(quotaKey);
      return NextResponse.json({
        success: false,
        already: true,
        remaining: currentRemaining ?? 0
      });
    }

    // 3. CEK KUOTA & EKSEKUSI (Atomic Operation)
    // Kita ambil kuota saat ini dulu untuk pengecekan awal
    let currentQuota = await redis.get<number>(quotaKey);

    // Inisialisasi jika database Redis masih kosong
    if (currentQuota === null) {
      await redis.set(quotaKey, 15);
      currentQuota = 15;
    }

    if (currentQuota > 0) {
      // PENTING: Gunakan DECR langsung untuk mencegah Race Condition (kuota bocor)
      const newQuota = await redis.decr(quotaKey);

      // Jika hasil pengurangan masih >= 0, berarti klaim VALID
      if (newQuota >= 0) {
        // Kunci perangkat ini selama 24 jam (86400 detik)
        await redis.set(claimKey, "true", { ex: 86400 });

        return NextResponse.json({
          success: true,
          remaining: newQuota
        });
      } else {
        // Jika hasil DECR malah minus, berarti kuota habis di milidetik yang sama
        await redis.set(quotaKey, 0); // Reset ke 0 agar tidak minus terus
      }
    }

    // 4. JIKA KUOTA HABIS
    return NextResponse.json({
      success: false,
      already: false,
      remaining: 0
    });

  } catch (error) {
    console.error("Promo Error:", error);
    return NextResponse.json({ success: false, remaining: 0 }, { status: 500 });
  }
}