import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody, readBodyBuffer } from "../middlewares/utils.js";
import { AdminModel, TeacherModel, StudentModel } from "../models/index.js";
import { hashPassword, verifyPassword, signToken } from "../utils/crypto.js";
import { getUserFromRequest } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";
import { requestOtp, verifyOtp as checkOtp, deleteOtp } from "../utils/otpStore.js";
import { ImageKit } from "@imagekit/nodejs";

export const signupAdmin = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { userId, password, name, signupKey, email } = body;

    if (!userId || !password || !name || !signupKey) {
      json(response, 400, { success: false, message: "All fields are required" });
      return;
    }

    const expectedKey = process.env.ADMIN_SIGNUP_KEY ?? "roar";
    if (signupKey !== expectedKey) {
      json(response, 400, { success: false, message: "Invalid Admin Registration Key" });
      return;
    }

    const namePrefix = name.toLowerCase().replace(/\s+/g, "");
    const normalizedEmail = (email || (namePrefix.includes("@") ? namePrefix : `${namePrefix}@parikshya.admin.com`)).toLowerCase();
    const existingAdmin = await AdminModel.findOne({
      $or: [{ userId }, { email: normalizedEmail }]
    });
    if (existingAdmin) {
      json(response, 400, { success: false, message: "Admin with this User ID or Email already exists" });
      return;
    }

    const newAdmin = new AdminModel({
      userId,
      password: hashPassword(password),
      name,
      email: normalizedEmail,
      role: "Admin"
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
    const { userId, password, role } = body;
    const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_key_change_me";

    if (role === "Admin") {
      const admin = await AdminModel.findOne({
        $or: [{ userId }, { email: userId }]
      });
      if (admin && verifyPassword(password, admin.password)) {
        const token = signToken({ id: admin.id, userId: admin.userId, role: "Admin" }, secret);
        json(
          response,
          200,
          {
            success: true,
            data: {
              token,
              user: { id: admin.id, name: admin.name, userId: admin.userId, role: "Admin", email: admin.email, requiresPasswordChange: admin.requiresPasswordChange, profilePicture: admin.profilePicture }
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
        const token = signToken({ id: teacher.id, userId: teacher.userId, role: "Teacher" }, secret);
        json(
          response,
          200,
          {
            success: true,
            data: {
              token,
              user: { id: teacher.id, name: teacher.name, userId: teacher.userId, role: "Teacher", subject: teacher.subject, gender: teacher.gender, email: teacher.email, dob: teacher.dob, requiresPasswordChange: teacher.requiresPasswordChange, profilePicture: teacher.profilePicture }
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
        const token = signToken({ id: student.id, userId: student.userId, role: "Student" }, secret);
        json(
          response,
          200,
          {
            success: true,
            data: {
              token,
            user: { id: student.id, name: student.name, userId: student.userId, role: "Student", email: student.email, dob: student.dob, class: student.class || "Class 10", gender: student.gender, requiresPasswordChange: student.requiresPasswordChange, profilePicture: student.profilePicture, joined_at: (student.toObject({ defaults: false } as any) as any).joined_at || student._id.getTimestamp() }
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
