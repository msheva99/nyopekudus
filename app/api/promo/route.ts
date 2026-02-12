import { Redis } from '@upstash/redis';
import { NextResponse, NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ✅ FINGERPRINT BARU: Multi-Factor (IP + Canvas + Screen + TZ + Lang + Platform)
function generateDeviceFingerprint(
  req: NextRequest, 
  signature: {
    canvas: string;
    screen: string;
    timezone: string;
    language: string;
    platform: string;
  }
): string {
  // 1. IP Address
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor 
    ? forwardedFor.split(',')[0].trim() 
    : (req.headers.get('x-real-ip') || '127.0.0.1');
  
  // 2. Kombinasi semua faktor dari frontend
  const combined = `IP:${ip}|CANVAS:${signature.canvas}|SCREEN:${signature.screen}|TZ:${signature.timezone}|LANG:${signature.language}|PLATFORM:${signature.platform}`;
  
  // Hash jadi base64
  return Buffer.from(combined)
    .toString('base64')
    .replace(/[/+=]/g, '_');
}

// ========================================
// ENDPOINT POST: CEK & KLAIM (Multi-Factor)
// ========================================
export async function POST(req: NextRequest) {
  try {
    const quotaKey = 'kuota_nyopekudus';
    
    // Terima signature dari frontend
    const body = await req.json();
    const { signature } = body;

    // Validasi signature
    if (!signature || !signature.canvas || !signature.screen) {
      return NextResponse.json(
        { success: false, remaining: 0, error: "Invalid signature" }, 
        { status: 400 }
      );
    }

    // Generate device fingerprint dengan multi-factor
    const deviceId = generateDeviceFingerprint(req, signature);
    const claimKey = `user_claimed_nyopekudus:${deviceId}`;

    // Debug log (hapus setelah testing)
    console.log('=== DEVICE FINGERPRINT DEBUG ===');
    console.log('IP:', req.headers.get('x-forwarded-for')?.split(',')[0]);
    console.log('Canvas:', signature.canvas.substring(0, 30) + '...');
    console.log('Screen:', signature.screen);
    console.log('Timezone:', signature.timezone);
    console.log('Platform:', signature.platform);
    console.log('Fingerprint Hash:', deviceId.substring(0, 50) + '...');
    console.log('================================');

    // CEK: Apakah device ini sudah pernah klaim?
    const [hasClaimed, currentQuotaStr] = await redis.mget<[string | null, string | null]>(
      claimKey, 
      quotaKey
    );
    
    let currentQuota = currentQuotaStr !== null ? parseInt(currentQuotaStr) : 20;

    // JIKA SUDAH PERNAH KLAIM
    if (hasClaimed) {
      console.log('❌ Device sudah pernah klaim:', claimKey);
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
        
        console.log('✅ Klaim berhasil! Sisa kuota:', newQuota);
        
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
    console.log('⚠️ Kuota habis');
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