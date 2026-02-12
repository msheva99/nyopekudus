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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'unknown';
    // Gunakan base64 agar deviceId tidak mengandung karakter aneh untuk key Redis
    const deviceId = Buffer.from(`${ip}-${ua}`).toString('base64').slice(0, 50);
    const claimKey = `user_claimed_nyopekudus:${deviceId}`;

    // 2. CEK STATUS KLAIM & SISA KUOTA SEKALIGUS
    // Kita gunakan mget (Multi-Get) agar lebih cepat (hanya 1x panggil Redis)
    const [hasClaimed, currentQuotaStr] = await redis.mget<[string | null, string | null]>(claimKey, quotaKey);
    
    let currentQuota = currentQuotaStr !== null ? parseInt(currentQuotaStr) : 15;

    // Jika sudah pernah klaim, langsung stop di sini
    if (hasClaimed) {
      return NextResponse.json({
        success: false,
        already: true,
        remaining: currentQuota > 0 ? currentQuota : 0
      });
    }

    // 3. EKSEKUSI PENGURANGAN KUOTA (Atomic)
    if (currentQuota > 0) {
      const newQuota = await redis.decr(quotaKey);

      if (newQuota >= 0) {
        // BERHASIL: Kunci perangkat ini selama 24 jam
        await redis.set(claimKey, "true", { ex: 86400 });
        return NextResponse.json({
          success: true,
          remaining: newQuota
        });
      } else {
        // GAGAL: Ternyata pas dikurangi hasilnya minus (keduluan orang lain)
        await redis.set(quotaKey, 0);
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