import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody, readBodyBuffer } from "../middlewares/utils.js";
import { AdminModel, TeacherModel, StudentModel, OrganizationModel, CaptchaModel } from "../models/index.js";
import { hashPassword, verifyPassword, signToken } from "../utils/crypto.js";
import { getUserFromRequest } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";
import { requestOtp, verifyOtp as checkOtp, deleteOtp } from "../utils/otpStore.js";
import { ImageKit } from "@imagekit/nodejs";

export const signupAdmin = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { userId, password, name, signupKey } = body;

    if (!userId || !password || !name || !signupKey) {
      json(response, 400, { success: false, message: "All fields are required" });
      return;
    }

    // Lookup organization by tenant code (signupKey)
    const orgCodeUpper = signupKey.toUpperCase().trim();
    const org = await OrganizationModel.findOne({ code: orgCodeUpper });
    if (!org) {
      json(response, 400, { success: false, message: "Invalid Tenant Code or Organization not found" });
      return;
    }

    const orgName = org.name.toLowerCase().replace(/\s+/g, "");
    const userName = name.toLowerCase().replace(/\s+/g, "");
    const generatedEmail = `${userName}@${orgName}.admin.com`;

    // Check if an Admin with this generated email already exists
    const existingAdmin = await AdminModel.findOne({ email: generatedEmail });
    if (existingAdmin) {
      json(response, 400, { success: false, message: "Admin user already exists in this organization" });
      return;
    }

    const newAdmin = new AdminModel({
      userId,
      password: hashPassword(password),
      name,
      email: generatedEmail,
      role: "Admin",
      organization_id: org.id
    });
    await newAdmin.save();


    json(response, 201, {
      success: true,
      data: {
        id: newAdmin.id,
        userId: newAdmin.userId,
        name: newAdmin.name,
        email: (newAdmin as any).email,
        role: "Admin"
      }
    });
  } catch (e) {
    json(response, 400, { success: false, message: "Server error or invalid JSON body" });
  }
};

export const login = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { userId, password, role, captchaId, captcha } = body;
    const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_key_change_me";

    // Verify CAPTCHA for Admin and Teacher if present
    if (role === "Admin" || role === "Teacher") {
      if (!captchaId || !captcha) {
        json(response, 400, { success: false, message: "CAPTCHA is required." });
        return;
      }
      const captchaDoc = await CaptchaModel.findById(captchaId);
      if (!captchaDoc) {
        json(response, 400, { success: false, message: "CAPTCHA expired." });
        return;
      }
      const storedCaptcha = captchaDoc.captcha;
      await CaptchaModel.deleteOne({ _id: captchaId });
      if (storedCaptcha !== captcha) {
        json(response, 400, { success: false, message: "Invalid CAPTCHA." });
        return;
      }
    }

    if (role === "Admin") {
      const admin = await AdminModel.findOne({
        $or: [{ userId }, { email: userId }]
      });
      if (admin && verifyPassword(password, admin.password)) {
        // Validate organization status
        const org = await OrganizationModel.findOne({ id: admin.organization_id });
        if (!org || org.status !== "Active") {
          json(response, 403, { success: false, message: "Organization account is deactivated. Please contact support." });
          return;
        }
        const token = signToken({ id: admin.id, userId: admin.userId, role: "Admin", organization_id: admin.organization_id }, secret);
        json(
          response,
          200,
          {
            success: true,
            data: {
              token,
              user: {
                id: admin.id,
                name: admin.name,
                userId: admin.userId,
                role: "Admin",
                email: admin.email,
                requiresPasswordChange: admin.requiresPasswordChange,
                profilePicture: admin.profilePicture,
                organization_id: admin.organization_id,
                organizationName: org?.name,
                organizationLogo: org?.logo
              }
            }
          },
          {
            "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax`
          }
        );
        return;
      }
    }

    if (role === "Teacher") {
      const teacher = await TeacherModel.findOne({
        $or: [{ userId }, { email: userId }]
      });
      if (teacher && verifyPassword(password, teacher.password)) {
        // Validate organization status
        const org = await OrganizationModel.findOne({ id: teacher.organization_id });
        if (!org || org.status !== "Active") {
          json(response, 403, { success: false, message: "Organization account is deactivated. Please contact support." });
          return;
        }
        const token = signToken({ id: teacher.id, userId: teacher.userId, role: "Teacher", organization_id: teacher.organization_id }, secret);
        json(
          response,
          200,
          {
            success: true,
            data: {
              token,
              user: {
                id: teacher.id,
                name: teacher.name,
                userId: teacher.userId,
                role: "Teacher",
                subject: teacher.subject,
                gender: teacher.gender,
                email: teacher.email,
                dob: teacher.dob,
                requiresPasswordChange: teacher.requiresPasswordChange,
                profilePicture: teacher.profilePicture,
                organization_id: teacher.organization_id,
                organizationName: org?.name,
                organizationLogo: org?.logo
              }
            }
          },
          {
            "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax`
          }
        );
        return;
      }
    }

    if (role === "Student") {
      const student = await StudentModel.findOne({
        $or: [{ userId }, { email: userId }]
      });
      if (student && verifyPassword(password, student.password)) {
        // Validate organization status
        const org = await OrganizationModel.findOne({ id: student.organization_id });
        if (!org || org.status !== "Active") {
          json(response, 403, { success: false, message: "Organization account is deactivated. Please contact support." });
          return;
        }
        const token = signToken({ id: student.id, userId: student.userId, role: "Student", organization_id: student.organization_id }, secret);
        json(
          response,
          200,
          {
            success: true,
            data: {
              token,
              user: {
                id: student.id,
                name: student.name,
                userId: student.userId,
                role: "Student",
                email: student.email,
                dob: student.dob,
                class: student.class || "Class 10",
                gender: student.gender,
                requiresPasswordChange: student.requiresPasswordChange,
                profilePicture: student.profilePicture,
                joined_at: (student.toObject({ defaults: false } as any) as any).joined_at || student._id.getTimestamp(),
                organization_id: student.organization_id,
                organizationName: org?.name,
                organizationLogo: org?.logo
              }
            }
          },
          {
            "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax`
          }
        );
        return;
      }
    }

    json(response, 401, { success: false, message: "Invalid User ID or Password" });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const logout = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    json(
      response,
      200,
      { success: true, message: "Logged out successfully" },
      {
        "Set-Cookie": "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
      }
    );
  } catch (e) {
    json(response, 500, { success: false, message: "Logout error" });
  }
};

export const changePassword = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      json(response, 401, { success: false, message: "Unauthorized" });
      return;
    }

    const { oldPassword, newPassword } = JSON.parse(await readBody(request));
    if (!oldPassword || !newPassword) {
      json(response, 400, { success: false, message: "Old password and new password are required" });
      return;
    }

    let userDoc: any = null;
    if (user.role === "Admin") {
      userDoc = await AdminModel.findOne({ userId: user.userId });
    } else if (user.role === "Teacher") {
      userDoc = await TeacherModel.findOne({ userId: user.userId });
    } else if (user.role === "Student") {
      userDoc = await StudentModel.findOne({ userId: user.userId });
    }

    if (!userDoc) {
      json(response, 404, { success: false, message: "User account not found" });
      return;
    }

    if (!verifyPassword(oldPassword, userDoc.password)) {
      json(response, 400, { success: false, message: "Incorrect old password" });
      return;
    }

    userDoc.password = hashPassword(newPassword);
    userDoc.requiresPasswordChange = false;
    await userDoc.save();

    json(response, 200, { success: true, message: "Password updated successfully" });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error during password update" });
  }
};

export const forgotPassword = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email } = body;

    if (!email) {
      json(response, 400, { success: false, message: "Email is required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      json(response, 400, { success: false, message: "Invalid email format" });
      return;
    }

    // Verify email exists in our models
    let userDoc = await StudentModel.findOne({ email });
    if (!userDoc) {
      userDoc = await TeacherModel.findOne({ email });
    }
    if (!userDoc) {
      userDoc = await AdminModel.findOne({ email });
    }

    if (!userDoc) {
      json(response, 404, { success: false, message: "User not found" });
      return;
    }

    // Attempt to generate/store OTP (managing rate limit map internally)
    const otpResult = requestOtp(email);
    if (!otpResult.success) {
      json(response, 429, {
        success: false,
        message: `Too many OTP requests. Please wait ${otpResult.cooldownLeft} seconds before trying again.`
      });
      return;
    }

    // Print OTP in backend terminal
    console.log(`
================================================
FORGOT PASSWORD REQUEST
Email: ${email}
OTP: ${otpResult.otp}
Expires In: 10 Minutes
================================================
`);

    json(response, 200, {
      success: true,
      message: "OTP generated successfully"
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error during OTP generation" });
  }
};

export const verifyOtpController = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email, otp } = body;

    if (!email || !otp) {
      json(response, 400, { success: false, message: "Email and OTP are required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      json(response, 400, { success: false, message: "Invalid email format" });
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      json(response, 400, { success: false, message: "OTP must be exactly 6 digits" });
      return;
    }

    const verification = checkOtp(email, otp);
    if (!verification.success) {
      json(response, 400, { success: false, message: verification.message });
      return;
    }

    json(response, 200, {
      success: true,
      message: "OTP verified"
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error during OTP verification" });
  }
};

export const resetPassword = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      json(response, 400, { success: false, message: "Email, OTP, and new password are required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      json(response, 400, { success: false, message: "Invalid email format" });
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      json(response, 400, { success: false, message: "OTP must be exactly 6 digits" });
      return;
    }

    // Password validation: minimum 8 characters, one uppercase letter, one lowercase letter, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      json(response, 400, {
        success: false,
        message: "Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, and one number"
      });
      return;
    }

    // Verify OTP first
    const verification = checkOtp(email, otp);
    if (!verification.success) {
      json(response, 400, { success: false, message: verification.message });
      return;
    }

    // Search user to update password
    let userDoc = await StudentModel.findOne({ email });
    if (!userDoc) {
      userDoc = await TeacherModel.findOne({ email });
    }
    if (!userDoc) {
      userDoc = await AdminModel.findOne({ email });
    }

    if (!userDoc) {
      json(response, 404, { success: false, message: "User not found" });
      return;
    }

    // Hash using standard hashPassword helper and update
    userDoc.password = hashPassword(newPassword);
    userDoc.requiresPasswordChange = false;
    await userDoc.save();

    // Delete OTP from Map immediately
    deleteOtp(email);

    json(response, 200, {
      success: true,
      message: "Password reset successful"
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error during password reset" });
  }
};

let imageKitclient: ImageKit | null = null;
const getImageKitClient = () => {
  if (!imageKitclient) {
    imageKitclient = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    });
  }
  return imageKitclient;
};

export const uploadProfilePicture = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      json(response, 401, { success: false, message: "Unauthorized" });
      return;
    }

    const contentType = request.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      json(response, 400, { success: false, message: "Request must be multipart/form-data" });
      return;
    }

    const bodyBuffer = await readBodyBuffer(request);

    // Parse boundary
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      json(response, 400, { success: false, message: "No multipart boundary found" });
      return;
    }

    let boundaryStr = boundaryMatch[1].trim();
    if (boundaryStr.startsWith('"') && boundaryStr.endsWith('"')) {
      boundaryStr = boundaryStr.slice(1, -1);
    }
    const boundary = "--" + boundaryStr;
    const boundaryBuffer = Buffer.from(boundary);

    let fileBuffer: Buffer | null = null;
    let fileName = `profile-${Date.now()}.png`;
    let fileMime = "image/png";

    let index = 0;
    while (true) {
      const start = bodyBuffer.indexOf(boundaryBuffer, index);
      if (start === -1) break;

      const nextBoundaryIndex = bodyBuffer.indexOf(boundaryBuffer, start + boundaryBuffer.length);
      if (nextBoundaryIndex === -1) break;

      const part = bodyBuffer.subarray(start + boundaryBuffer.length, nextBoundaryIndex);
      const crlf2 = Buffer.from("\r\n\r\n");
      const headerEnd = part.indexOf(crlf2);
      if (headerEnd !== -1) {
        const headerText = part.subarray(0, headerEnd).toString("utf-8");
        // Data starts after \r\n\r\n and ends before trailing \r\n (2 bytes)
        const data = part.subarray(headerEnd + crlf2.length, part.length - 2);

        // Parse headers
        const headers: Record<string, string> = {};
        headerText.split("\r\n").forEach(line => {
          const colon = line.indexOf(":");
          if (colon !== -1) {
            const key = line.substring(0, colon).trim().toLowerCase();
            const value = line.substring(colon + 1).trim();
            headers[key] = value;
          }
        });

        const disposition = headers["content-disposition"] || "";
        const nameMatch = disposition.match(/name="([^"]+)"/);
        const filenameMatch = disposition.match(/filename="([^"]+)"/);

        if (nameMatch && nameMatch[1] === "file") {
          fileBuffer = data;
          if (filenameMatch) {
            fileName = filenameMatch[1];
          }
          if (headers["content-type"]) {
            fileMime = headers["content-type"];
          }
          break; // Found our file
        }
      }

      index = nextBoundaryIndex;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      json(response, 400, { success: false, message: "No file content uploaded under field 'file'." });
      return;
    }

    // Check size limit: 5MB
    if (fileBuffer.length > 5 * 1024 * 1024) {
      json(response, 400, { success: false, message: "Image size should be less than 5MB" });
      return;
    }

    // Check allowed formats
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    if (!allowedMimes.includes(fileMime) && !allowedExtensions.includes(ext)) {
      json(response, 400, { success: false, message: "Allowed formats are JPG, JPEG, PNG, WEBP." });
      return;
    }

    const ikData = await getImageKitClient().files.upload({
      file: fileBuffer.toString("base64"),
      fileName: "profile_" + user.userId + "_" + Date.now(),
      folder: "profile_pictures"
    });

    // Save url in user document
    let updatedUser: any = null;
    if (user.role === "Admin") {
      updatedUser = await AdminModel.findOneAndUpdate(
        { userId: user.userId },
        { profilePicture: ikData.url },
        { new: true }
      );
    } else if (user.role === "Teacher") {
      updatedUser = await TeacherModel.findOneAndUpdate(
        { userId: user.userId },
        { profilePicture: ikData.url },
        { new: true }
      );
    } else if (user.role === "Student") {
      updatedUser = await StudentModel.findOneAndUpdate(
        { userId: user.userId },
        { profilePicture: ikData.url },
        { new: true }
      );
    }

    if (!updatedUser) {
      json(response, 404, { success: false, message: "User account not found" });
      return;
    }

    json(response, 200, { success: true, profilePicture: ikData.url });
  } catch (e) {
    console.error("Error uploading profile picture:", e);
    json(response, 500, { success: false, message: "Internal server error during profile picture upload" });
  }
};

const generateCaptchaSvg = (code: string): string => {
  const width = 150;
  const height = 48;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="100%" height="100%" fill="#f3f4ff" />`;

  // Draw wavy lines
  svg += `<path d="M 0 18 Q 37.5 8, 75 24 T 150 18" fill="none" stroke="#d5d8fc" stroke-width="1.5" />`;
  svg += `<path d="M 0 30 Q 37.5 40, 75 24 T 150 30" fill="none" stroke="#d5d8fc" stroke-width="1.5" />`;

  // Scattered tiny dots noise
  for (let i = 0; i < 40; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    svg += `<circle cx="${cx}" cy="${cy}" r="0.8" fill="#a5b4fc" opacity="0.5" />`;
  }

  // Diamond sparkles
  const diamondPositions = [
    { x: 12, y: 18 },
    { x: 35, y: 35 },
    { x: 65, y: 12 },
    { x: 105, y: 38 },
    { x: 138, y: 16 }
  ];
  diamondPositions.forEach(pos => {
    const size = 3;
    const cx = pos.x + Math.floor(Math.random() * 6) - 3;
    const cy = pos.y + Math.floor(Math.random() * 6) - 3;
    svg += `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" fill="#818cf8" transform="rotate(45, ${cx}, ${cy})" opacity="0.7" />`;
  });

  // A couple of hollow circles
  svg += `<circle cx="28" cy="10" r="1.5" fill="none" stroke="#818cf8" stroke-width="0.8" opacity="0.6" />`;
  svg += `<circle cx="130" cy="14" r="2" fill="none" stroke="#818cf8" stroke-width="0.8" opacity="0.6" />`;

  // Letters with random rotation, color, and vertical offset
  const textLen = code.length;
  const charSpacing = Math.floor((width - 30) / textLen);
  for (let i = 0; i < textLen; i++) {
    const char = code[i];
    const x = 15 + i * charSpacing + Math.floor(Math.random() * 4);
    const y = 33 + Math.floor(Math.random() * 6) - 3;
    const angle = Math.floor(Math.random() * 24) - 12;
    const colors = ["#4338ca", "#3730a3", "#1e3a8a", "#1e40af", "#1d4ed8", "#312e81", "#111827", "#1f2937"];
    const fill = colors[Math.floor(Math.random() * colors.length)];
    svg += `<text x="${x}" y="${y}" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="${fill}" transform="rotate(${angle}, ${x}, ${y})">${char}</text>`;
  }

  svg += `</svg>`;
  return svg;
};

const generateCaptchaCode = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const getCaptcha = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const code = generateCaptchaCode();
    const expires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry
    const svg = generateCaptchaSvg(code);

    const captchaDoc = new CaptchaModel({
      captcha: code,
      expires
    });
    await captchaDoc.save();

    json(response, 200, {
      success: true,
      captchaId: captchaDoc._id.toString(),
      captcha: code,
      captchaSvg: svg,
      data: {
        captchaId: captchaDoc._id.toString(),
        captcha: code,
        captchaSvg: svg
      }
    });
  } catch (e) {
    console.error("Error generating captcha:", e);
    json(response, 500, { success: false, message: "Internal server error generating CAPTCHA" });
  }
};

export const loginStudentWithCaptcha = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email, password, captchaId, captcha } = body;

    if (!captchaId || !captcha) {
      json(response, 400, { success: false, message: "CAPTCHA is required." });
      return;
    }

    const captchaDoc = await CaptchaModel.findById(captchaId);
    if (!captchaDoc) {
      json(response, 400, { success: false, message: "CAPTCHA expired." });
      return;
    }

    const storedCaptcha = captchaDoc.captcha;
    await CaptchaModel.deleteOne({ _id: captchaId });

    if (storedCaptcha !== captcha) {
      json(response, 400, { success: false, message: "Invalid CAPTCHA." });
      return;
    }

    if (!email || !password) {
      json(response, 400, { success: false, message: "Email and password are required" });
      return;
    }

    const student = await StudentModel.findOne({
      $or: [{ userId: email }, { email }]
    });

    if (!student || !verifyPassword(password, student.password)) {
      json(response, 400, { success: false, message: "Invalid credentials" });
      return;
    }

    const org = await OrganizationModel.findOne({ id: student.organization_id });
    if (!org || org.status !== "Active") {
      json(response, 403, { success: false, message: "Organization account is deactivated. Please contact support." });
      return;
    }

    const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_key_change_me";
    const token = signToken({ id: student.id, userId: student.userId, role: "Student", organization_id: student.organization_id }, secret);

    json(
      response,
      200,
      {
        success: true,
        data: {
          token,
          user: {
            id: student.id,
            name: student.name,
            userId: student.userId,
            role: "Student",
            email: student.email,
            dob: student.dob,
            class: student.class || "Class 10",
            gender: student.gender,
            requiresPasswordChange: student.requiresPasswordChange,
            profilePicture: student.profilePicture,
            joined_at: (student.toObject({ defaults: false } as any) as any).joined_at || student._id.getTimestamp(),
            organization_id: student.organization_id,
            organizationName: org?.name,
            organizationLogo: org?.logo
          }
        }
      },
      {
        "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax`
      }
    );
  } catch (e) {
    console.error("Error logging in student with CAPTCHA:", e);
    json(response, 500, { success: false, message: "Internal server error during login" });
  }
};

export const loginTeacherWithCaptcha = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email, password, captchaId, captcha } = body;

    if (!captchaId || !captcha) {
      json(response, 400, { success: false, message: "CAPTCHA is required." });
      return;
    }

    const captchaDoc = await CaptchaModel.findById(captchaId);
    if (!captchaDoc) {
      json(response, 400, { success: false, message: "CAPTCHA expired." });
      return;
    }

    const storedCaptcha = captchaDoc.captcha;
    await CaptchaModel.deleteOne({ _id: captchaId });

    if (storedCaptcha !== captcha) {
      json(response, 400, { success: false, message: "Invalid CAPTCHA." });
      return;
    }

    if (!email || !password) {
      json(response, 400, { success: false, message: "Email and password are required" });
      return;
    }

    const teacher = await TeacherModel.findOne({
      $or: [{ userId: email }, { email }]
    });

    if (!teacher || !verifyPassword(password, teacher.password)) {
      json(response, 400, { success: false, message: "Invalid credentials" });
      return;
    }

    const org = await OrganizationModel.findOne({ id: teacher.organization_id });
    if (!org || org.status !== "Active") {
      json(response, 403, { success: false, message: "Organization account is deactivated. Please contact support." });
      return;
    }

    const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_key_change_me";
    const token = signToken({ id: teacher.id, userId: teacher.userId, role: "Teacher", organization_id: teacher.organization_id }, secret);

    json(
      response,
      200,
      {
        success: true,
        data: {
          token,
          user: {
            id: teacher.id,
            name: teacher.name,
            userId: teacher.userId,
            role: "Teacher",
            subject: teacher.subject,
            gender: teacher.gender,
            email: teacher.email,
            dob: teacher.dob,
            requiresPasswordChange: teacher.requiresPasswordChange,
            profilePicture: teacher.profilePicture,
            organization_id: teacher.organization_id,
            organizationName: org?.name,
            organizationLogo: org?.logo
          }
        }
      },
      {
        "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax`
      }
    );
  } catch (e) {
    console.error("Error logging in teacher with CAPTCHA:", e);
    json(response, 500, { success: false, message: "Internal server error during login" });
  }
};

export const loginAdminWithCaptcha = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email, password, captchaId, captcha } = body;

    if (!captchaId || !captcha) {
      json(response, 400, { success: false, message: "CAPTCHA is required." });
      return;
    }

    const captchaDoc = await CaptchaModel.findById(captchaId);
    if (!captchaDoc) {
      json(response, 400, { success: false, message: "CAPTCHA expired." });
      return;
    }

    const storedCaptcha = captchaDoc.captcha;
    await CaptchaModel.deleteOne({ _id: captchaId });

    if (storedCaptcha !== captcha) {
      json(response, 400, { success: false, message: "Invalid CAPTCHA." });
      return;
    }

    if (!email || !password) {
      json(response, 400, { success: false, message: "Email and password are required" });
      return;
    }

    const admin = await AdminModel.findOne({
      $or: [{ userId: email }, { email }]
    });

    if (!admin || !verifyPassword(password, admin.password)) {
      json(response, 400, { success: false, message: "Invalid credentials" });
      return;
    }

    const org = await OrganizationModel.findOne({ id: admin.organization_id });
    if (!org || org.status !== "Active") {
      json(response, 403, { success: false, message: "Organization account is deactivated. Please contact support." });
      return;
    }

    const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_key_change_me";
    const token = signToken({ id: admin.id, userId: admin.userId, role: "Admin", organization_id: admin.organization_id }, secret);

    json(
      response,
      200,
      {
        success: true,
        data: {
          token,
          user: {
            id: admin.id,
            name: admin.name,
            userId: admin.userId,
            role: "Admin",
            email: admin.email,
            requiresPasswordChange: admin.requiresPasswordChange,
            profilePicture: admin.profilePicture,
            organization_id: admin.organization_id,
            organizationName: org?.name,
            organizationLogo: org?.logo
          }
        }
      },
      {
        "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax`
      }
    );
  } catch (e) {
    console.error("Error logging in admin with CAPTCHA:", e);
    json(response, 500, { success: false, message: "Internal server error during login" });
  }
};
