import crypto from "crypto";

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    // If it's empty, invalid
    if (!initData) return false;

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    if (!hash) return false;

    // Remove hash from the params to construct data-check-string
    urlParams.delete("hash");
    
    // Sort keys alphabetically and join with newlines
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Calculate secret key: HMAC_SHA256(<bot_token>, "WebAppData")
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    
    // Calculate expected hash: HMAC_SHA256(<data_check_string>, <secret_key>)
    const calculatedHash = crypto.createHmac("sha256", secretKey as any).update(dataCheckString).digest("hex");

    return calculatedHash === hash;
  } catch (err) {
    return false;
  }
}

export function parseInitDataUser(initData: string) {
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get("user");
    if (!userStr) return null;
    
    // e.g. {"id":12345,"first_name":"Kaka","last_name":"W","username":"kakawah","language_code":"en"}
    return JSON.parse(userStr) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  } catch (err) {
    return null;
  }
}
