import { Redis } from '@upstash/redis';
import { NextResponse, NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// HELPER: Buat Device Fingerprint yang lebih robust
function generateDeviceFingerprint(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             '127.0.0.1';
  
  const ua = req.headers.get('user-agent') || 'unknown';
  
  // Tambahkan accept-language untuk diferensiasi lebih baik
  const lang = req.headers.get('accept-language')?.slice(0, 10) || '';
  
  // Kombinasi yang lebih unik
  const rawFingerprint = `${ip}::${ua}::${lang}`;
  
  return Buffer.from(rawFingerprint)
    .toString('base64')
    .replace(/[/+=]/g, '')
    .slice(0, 200); // Lebih panjang untuk menghindari collision
}

// ========================================
// ENDPOINT GET: CEK STATUS (Tidak mengklaim!)
// ========================================
export async function GET(req: NextRequest) {
  try {
    const quotaKey = 'kuota_nyopekudus';
    const deviceId = generateDeviceFingerprint(req);
    const claimKey = `user_claimed_nyopekudus:${deviceId}`;

    // Cek status klaim dan sisa kuota (READ-ONLY, tidak ubah data)
    const [hasClaimed, currentQuotaStr] = await redis.mget<[string | null, string | null]>(
      claimKey, 
      quotaKey
    );
    
    const currentQuota = currentQuotaStr !== null ? parseInt(currentQuotaStr) : 15;

    return NextResponse.json({
      already: !!hasClaimed,
      remaining: currentQuota > 0 ? currentQuota : 0,
      canClaim: !hasClaimed && currentQuota > 0
    });

  } catch (error) {
    console.error("Status Check Error:", error);
    return NextResponse.json(
      { already: false, remaining: 0, canClaim: false, error: "Check failed" }, 
      { status: 500 }
    );
  }
}

// ========================================
// ENDPOINT POST: KLAIM PROMO (Aksi sebenarnya!)
// ========================================
export async function POST(req: NextRequest) {
  try {
    const quotaKey = 'kuota_nyopekudus';
    const deviceId = generateDeviceFingerprint(req);
    const claimKey = `user_claimed_nyopekudus:${deviceId}`;

    // 1. CEK APAKAH SUDAH PERNAH KLAIM
    const hasClaimed = await redis.get(claimKey);
    
    if (hasClaimed) {
      const currentQuota = await redis.get(quotaKey) || 0;
      return NextResponse.json({
        success: false,
        already: true,
        remaining: typeof currentQuota === 'string' ? parseInt(currentQuota) : currentQuota,
        message: "Perangkat ini sudah pernah mengklaim promo"
      });
    }

    // 2. KLAIM PROMO (ATOMIC OPERATION)
    const newQuota = await redis.decr(quotaKey);

    // Jika berhasil (kuota masih >= 0 setelah dikurangi)
    if (newQuota >= 0) {
      // Lock perangkat ini selama 24 jam
      await redis.set(claimKey, "true", { ex: 86400 });
      
      return NextResponse.json({
        success: true,
        already: false,
        remaining: newQuota,
        message: "Promo berhasil diklaim!"
      });
    } 
    
    // Jika kuota habis tepat saat klaim
    else {
      // Kembalikan kuota ke 0 (jangan sampai minus)
      await redis.set(quotaKey, 0);
      
      return NextResponse.json({
        success: false,
        already: false,
        remaining: 0,
        message: "Maaf, kuota promo sudah habis"
      });
    }

  } catch (error) {
    console.error("Claim Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        already: false,
        remaining: 0, 
        error: "Terjadi kesalahan saat klaim promo" 
      }, 
      { status: 500 }
    );
  }
}