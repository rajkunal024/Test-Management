import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { StudentModel, TeacherModel } from "../models/index.js";
import { hashPassword } from "../utils/crypto.js";

export const getUsers = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const students = await StudentModel.find({});
    const teachers = await TeacherModel.find({});
    
    const allUsers = [
      ...students.map((s: any) => ({
        id: s._id,
        userId: s.userId,
        name: s.name,
        email: s.email,
        dob: s.dob,
        role: "Student"
      })),
      ...teachers.map((t: any) => ({
        id: t._id,
        userId: t.userId,
        name: t.name,
        email: t.email,
        dob: t.dob,
        role: "Teacher",
        subject: t.subject
      }))
    ];
    
    json(response, 200, { success: true, data: allUsers });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error retrieving users" });
  }
};

export const createUser = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { role, name, email, dob, password, subject } = body;
    
    if (!role || !name || !email || !dob || !password) {
      json(response, 400, { success: false, message: "Missing required fields" });
      return;
    }
    
    if (role === "Teacher") {
      if (!subject) {
        json(response, 400, { success: false, message: "Subject is required for teachers" });
        return;
      }
      
      const existingTeacher = await TeacherModel.findOne({ $or: [{ userId: email }, { email }] });
      if (existingTeacher) {
        json(response, 400, { success: false, message: "Teacher with this email already exists" });
        return;
      }
      
      const newTeacher = new TeacherModel({
        userId: email,
        password: hashPassword(password),
        name,
        role: "Teacher",
        subject,
        email,
        dob
      });
      await newTeacher.save();
      json(response, 201, { success: true, data: newTeacher });
    } else if (role === "Student") {
      const existingStudent = await StudentModel.findOne({ $or: [{ userId: email }, { email }] });
      if (existingStudent) {
        json(response, 400, { success: false, message: "Student with this email already exists" });
        return;
      }
      
      const newStudent = new StudentModel({
        userId: email,
        password: hashPassword(password),
        name,
        role: "Student",
        email,
        dob,
        results: []
      });
      await newStudent.save();
      json(response, 201, { success: true, data: newStudent });
    } else {
      json(response, 400, { success: false, message: "Invalid role" });
    }
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body or registration error" });
  }
};
