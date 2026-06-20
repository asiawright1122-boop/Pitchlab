import crypto from "crypto";
import { prisma } from "./prisma";

export interface TmaUserPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function validateInitData(initData: string, token: string): { user: TmaUserPayload, startParam?: string } | null {
  if (process.env.NODE_ENV === "development" && (!initData || initData === "mock_dev_init_data")) {
    return {
      user: {
        id: 999999,
        first_name: "Dev",
        username: "devuser",
      },
    };
  }
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    
    if (!hash) return null;
    
    urlParams.delete("hash");

    // Replay attack prevention: validate auth_date
    const authDateStr = urlParams.get("auth_date");
    if (!authDateStr) return null;
    
    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);
    
    // Reject if auth_date is older than 24 hours (86400 seconds) or > 5 mins in future
    if (now - authDate > 86400 || authDate > now + 300) {
      console.warn("[tma-auth] initData is expired or invalid");
      return null;
    }
    
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
    const signature = crypto.createHmac("sha256", secretKey as any).update(dataCheckString).digest("hex");
    
    if (signature !== hash) {
      console.warn("[tma-auth] Invalid initData hash");
      return null;
    }
    
    const userStr = urlParams.get("user");
    if (!userStr) return null;
    
    const startParam = urlParams.get("start_param") || undefined;
    
    return {
      user: JSON.parse(userStr) as TmaUserPayload,
      startParam
    };
  } catch (err) {
    console.error("[tma-auth] Error validating initData", err);
    return null;
  }
}

/**
 * Ensures the Telegram user exists in our DB, and returns the Quant Edge User record.
 * Handles initial bonus (10000), referral bonus (1000 for inviter), and daily login bonus (500).
 */
export async function getOrCreateTmaUser(tmaUser: TmaUserPayload, startParam?: string) {
  const telegramId = String(tmaUser.id);
  
  let binding = await prisma.channelBinding.findFirst({
    where: { channel: "telegram", externalId: telegramId },
    include: { user: { include: { paperWallet: true } } },
  });

  let user = binding?.user;

  // 1. Auto-register if not exists
  if (!user) {
    let inviterId: string | undefined = undefined;
    
    // Check start_param for referral (e.g. ref_cuid123)
    if (startParam && startParam.startsWith("ref_")) {
      inviterId = startParam.replace("ref_", "");
    }

    const email = `tg_${telegramId}@quantedge.local`;
    
    // Create new user with 10000 initial bonus
    user = await prisma.user.create({
      data: {
        email,
        invitedById: inviterId,
        lastLoginBonusAt: new Date(),
        channelBindings: {
          create: {
            channel: "telegram",
            externalId: telegramId,
            verifiedAt: new Date(),
          }
        },
        paperWallet: {
          create: {
            balance: 10000,
            currency: "research_units"
          }
        }
      },
      include: { paperWallet: true }
    });

    // Reward the inviter
    if (inviterId) {
      try {
        await prisma.paperWallet.update({
          where: { userId: inviterId },
          data: { balance: { increment: 1000 } }
        });
      } catch (e) {
        console.error("Failed to reward inviter", e);
      }
    }
    
    return user;
  }

  // 2. Existing user: Check Daily Login Bonus (500 RU)
  const now = new Date();
  const lastBonus = user.lastLoginBonusAt;
  
  // Simple check: if last bonus was on a different calendar day (UTC)
  const isDifferentDay = !lastBonus || 
    (lastBonus.getUTCFullYear() !== now.getUTCFullYear() ||
     lastBonus.getUTCMonth() !== now.getUTCMonth() ||
     lastBonus.getUTCDate() !== now.getUTCDate());

  if (isDifferentDay) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginBonusAt: now,
        paperWallet: {
          update: {
            balance: { increment: 500 }
          }
        }
      },
      include: { paperWallet: true }
    });
  }

  return user;
}
