import { Redis } from '@upstash/redis';
import { NextResponse, NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 🔧 PERBAIKAN: Device Fingerprint Lebih Kuat
function generateDeviceFingerprint(req: NextRequest): string {
  // 1. IP Address (prioritaskan x-forwarded-for untuk Vercel)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor 
    ? forwardedFor.split(',')[0].trim() 
    : (req.headers.get('x-real-ip') || '127.0.0.1');
  
  // 2. User Agent (JANGAN di-slice, simpan FULL!)
  const ua = req.headers.get('user-agent') || 'unknown';
  
  // 3. Accept-Language (untuk diferensiasi lebih baik)
  const lang = req.headers.get('accept-language') || '';
  
  // 4. Accept-Encoding (tambahan identifier)
  const encoding = req.headers.get('accept-encoding') || '';
  
  // Kombinasi SEMUA faktor dengan delimiter jelas
  const rawFingerprint = `IP:${ip}|UA:${ua}|LANG:${lang}|ENC:${encoding}`;
  
  // Hash dengan base64 TANPA slice (biar full unique)
  return Buffer.from(rawFingerprint)
    .toString('base64')
    .replace(/[/+=]/g, '_'); // Replace special chars agar aman jadi Redis key
}

// ========================================
// ENDPOINT GET: CEK & KLAIM (KONSEP ASLI USER)
// ========================================
export async function GET(req: NextRequest) {
  try {
    const quotaKey = 'kuota_nyopekudus';
    
    // Generate device fingerprint yang lebih robust
    const deviceId = generateDeviceFingerprint(req);
    const claimKey = `user_claimed_nyopekudus:${deviceId}`;

    // Debug log (hapus setelah testing)
    console.log('Device Fingerprint:', deviceId.slice(0, 50) + '...');
    console.log('IP:', req.headers.get('x-forwarded-for')?.split(',')[0]);
    console.log('UA:', req.headers.get('user-agent')?.slice(0, 50) + '...');

    // CEK: Apakah device ini sudah pernah klaim?
    const [hasClaimed, currentQuotaStr] = await redis.mget<[string | null, string | null]>(
      claimKey, 
      quotaKey
    );
    
    let currentQuota = currentQuotaStr !== null ? parseInt(currentQuotaStr) : 15;

    // JIKA SUDAH PERNAH KLAIM
    if (hasClaimed) {
      return NextResponse.json({
        success: false,
        already: true,
        remaining: currentQuota > 0 ? currentQuota : 0
      });
    }

    // PROSES KLAIM BARU (ATOMIC)
    if (currentQuota > 0) {
      const newQuota = await redis.decr(quotaKey);

      // Klaim berhasil
      if (newQuota >= 0) {
        // LOCK device selama 24 jam
        await redis.set(claimKey, "true", { ex: 86400 });
        
        return NextResponse.json({
          success: true,
          remaining: newQuota
        });
      } else {
        // Kuota habis tepat saat request
        await redis.set(quotaKey, 0);
      }
    }

    // KUOTA HABIS
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