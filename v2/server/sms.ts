export async function sendSms(phone: string, message: string) {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  if (!apiUrl || !apiKey) return false;
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ to: phone, message }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch (error) {
    console.warn("[SMS] Échec :", error instanceof Error ? error.message : error);
    return false;
  }
}
