import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { AdminModel, TeacherModel, StudentModel } from "../models/index.js";
import { hashPassword, verifyPassword, signToken } from "../utils/crypto.js";
import { getUserFromRequest } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";
import { requestOtp, verifyOtp as checkOtp, deleteOtp } from "../utils/otpStore.js";

export const signupAdmin = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { userId, password, name, signupKey } = body;

    if (!userId || !password || !name || !signupKey) {
      json(response, 400, { success: false, message: "All fields are required" });
      return;
    }

    const expectedKey = process.env.ADMIN_SIGNUP_KEY ?? "roar";
    if (signupKey !== expectedKey) {
      json(response, 400, { success: false, message: "Invalid Admin Registration Key" });
      return;
    }

    const existingAdmin = await AdminModel.findOne({ userId });
    if (existingAdmin) {
      json(response, 400, { success: false, message: "Admin with this User ID already exists" });
      return;
    }

    const newAdmin = new AdminModel({
      userId,
      password: hashPassword(password),
      name,
      role: "Admin"
    });
    await newAdmin.save();

    json(response, 201, {
      success: true,
      data: {
        id: newAdmin.id,
        userId: newAdmin.userId,
        name: newAdmin.name,
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
      const admin = await AdminModel.findOne({ userId });
      if (admin && verifyPassword(password, admin.password)) {
        const token = signToken({ id: admin.id, userId: admin.userId, role: "Admin" }, secret);
        json(
          response,
          200,
          {
            success: true,
            data: {
              token,
              user: { id: admin.id, name: admin.name, userId: admin.userId, role: "Admin", requiresPasswordChange: admin.requiresPasswordChange }
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
              user: { id: teacher.id, name: teacher.name, userId: teacher.userId, role: "Teacher", subject: teacher.subject, gender: teacher.gender, requiresPasswordChange: teacher.requiresPasswordChange }
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
            user: { id: student.id, name: student.name, userId: student.userId, role: "Student", class: student.class || "Class 10", gender: student.gender, requiresPasswordChange: student.requiresPasswordChange, joined_at: (student.toObject({ defaults: false } as any) as any).joined_at || student._id.getTimestamp() }
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
      // Check if admin has userId matching the email format
      userDoc = await AdminModel.findOne({ userId: email });
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
      userDoc = await AdminModel.findOne({ userId: email });
    }

    if (!userDoc) {
      json(response, 404, { success: false, message: "User not found" });
      return;
    }

    // Hash using bcrypt and update
    userDoc.password = bcrypt.hashSync(newPassword, 10);
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
