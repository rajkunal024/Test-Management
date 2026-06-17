interface OtpRecord {
  otp: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpRecord>();
const rateLimitStore = new Map<string, number>();

/**
 * Request a new OTP.
 * Returns true if OTP is generated, false if rate limited (less than 60s cooldown).
 */
export const requestOtp = (email: string): { success: boolean; cooldownLeft?: number; otp?: string } => {
  const now = Date.now();
  const lastRequested = rateLimitStore.get(email);
  
  if (lastRequested && now - lastRequested < 60 * 1000) {
    const cooldownLeft = Math.ceil((60 * 1000 - (now - lastRequested)) / 1000);
    return { success: false, cooldownLeft };
  }

  // Generate secure 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes from now

  otpStore.set(email, { otp, expiresAt });
  rateLimitStore.set(email, now);

  return { success: true, otp };
};

/**
 * Verify Otp for an email.
 * Returns { success: boolean; message: string }
 */
export const verifyOtp = (email: string, otp: string): { success: boolean; message: string } => {
  const record = otpStore.get(email);
  if (!record) {
    return { success: false, message: "No OTP request found for this email" };
  }

  if (Date.now() > record.expiresAt) {
    return { success: false, message: "OTP has expired" };
  }

  if (record.otp !== otp) {
    return { success: false, message: "Invalid OTP" };
  }

  return { success: true, message: "OTP verified" };
};

/**
 * Delete OTP for an email after successful reset.
 */
export const deleteOtp = (email: string): void => {
  otpStore.delete(email);
};
