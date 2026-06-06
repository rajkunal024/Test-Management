import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { AdminModel, TeacherModel, StudentModel } from "../models/index.js";
import { hashPassword, verifyPassword, signToken } from "../utils/crypto.js";
import { getUserFromRequest } from "../middlewares/auth.js";

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
              user: { id: admin.id, name: admin.name, userId: admin.userId, role: "Admin" }
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
              user: { id: teacher.id, name: teacher.name, userId: teacher.userId, role: "Teacher", subject: teacher.subject }
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
              user: { id: student.id, name: student.name, userId: student.userId, role: "Student", class: student.class || "Class 10" }
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
    await userDoc.save();

    json(response, 200, { success: true, message: "Password updated successfully" });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error during password update" });
  }
};
