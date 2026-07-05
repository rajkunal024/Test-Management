import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { StudentModel, TeacherModel } from "../models/index.js";
import { hashPassword } from "../utils/crypto.js";
import { checkRole } from "../middlewares/auth.js";

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
        role: "Student",
        class: s.class,
        session: s.session,
        program_id: s.program_id,
        semester: s.semester,
        gender: s.gender,
        requiresPasswordChange: s.requiresPasswordChange,
        joined_at: (s.toObject({ defaults: false } as any) as any).joined_at || s._id.getTimestamp(),
        profilePicture: s.profilePicture
      })),
      ...teachers.map((t: any) => ({
        id: t._id,
        userId: t.userId,
        name: t.name,
        email: t.email,
        dob: t.dob,
        role: "Teacher",
        subject: t.subject,
        gender: t.gender,
        requiresPasswordChange: t.requiresPasswordChange,
        profilePicture: t.profilePicture
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
    const { role, name, email, dob, password, subject, subjects, gender, program_id, program_ids, semester, session } = body;
    
    if (!role || !name || !email || !dob || !gender) {
      json(response, 400, { success: false, message: "Missing required fields (role, name, email, dob, gender)" });
      return;
    }

    const cleanGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
    if (cleanGender !== "Male" && cleanGender !== "Female") {
      json(response, 400, { success: false, message: "Gender must be 'Male' or 'Female'" });
      return;
    }
    
    if (role === "Teacher") {
      const existingTeacher = await TeacherModel.findOne({ $or: [{ userId: email }, { email }] });
      if (existingTeacher) {
        json(response, 400, { success: false, message: "Teacher with this email already exists" });
        return;
      }
      
      const teacherProgramIds = program_ids || (program_id ? [program_id] : []);
      const teacherSubjects = subjects || (subject ? [subject] : []);

      const newTeacher = new TeacherModel({
        userId: email,
        password: hashPassword(password || "abc123"),
        name,
        role: "Teacher",
        subject: subject || (teacherSubjects[0] || ""),
        subjects: teacherSubjects,
        program_id: program_id || (teacherProgramIds[0] || null),
        program_ids: teacherProgramIds,
        email,
        dob,
        gender: cleanGender,
        requiresPasswordChange: true
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
        password: hashPassword(password || "abc123"),
        name,
        role: "Student",
        email,
        dob,
        class: program_id ? `${program_id}-sem-${semester || 1}` : (body.class || null),
        session: session || null,
        program_id: program_id || null,
        semester: semester || null,
        gender: cleanGender,
        requiresPasswordChange: true,
        joined_at: body.joined_at ? new Date(body.joined_at) : new Date(),
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

export const bulkCreateUsers = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const { users } = JSON.parse(await readBody(request));
    if (!Array.isArray(users)) {
      json(response, 400, { success: false, message: "Payload must be an array under 'users'" });
      return;
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const { role, name, email, dob, gender, subject, subjects, program_ids, class: className, program_id, semester, session } = u;

      if (!role || !name || !email || !dob || !gender) {
        errors.push(`Row ${i + 1}: Missing required fields (role, name, email, dob, gender)`);
        continue;
      }

      const cleanRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
      const cleanGender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();

      if (cleanRole !== "Student" && cleanRole !== "Teacher") {
        errors.push(`Row ${i + 1}: Invalid role '${role}' (must be Student or Teacher)`);
        continue;
      }

      if (cleanGender !== "Male" && cleanGender !== "Female") {
        errors.push(`Row ${i + 1}: Invalid gender '${gender}' (must be Male or Female)`);
        continue;
      }

      if (cleanRole === "Teacher") {
        const existingTeacher = await TeacherModel.findOne({ $or: [{ userId: email }, { email }] });
        if (existingTeacher) {
          errors.push(`Row ${i + 1}: Teacher with email ${email} already exists`);
          continue;
        }

        const teacherProgramIds = program_ids || (program_id ? (typeof program_id === "string" ? program_id.split(";").map((s: string) => s.trim()) : [program_id]) : []);
        const teacherSubjects = subjects || (subject ? (typeof subject === "string" ? subject.split(";").map((s: string) => s.trim()) : [subject]) : []);

        const newTeacher = new TeacherModel({
          userId: email,
          password: hashPassword("abc123"),
          name,
          role: "Teacher",
          subject: subject || (teacherSubjects[0] || ""),
          subjects: teacherSubjects,
          program_id: program_id || (teacherProgramIds[0] || null),
          program_ids: teacherProgramIds,
          email,
          dob,
          gender: cleanGender,
          requiresPasswordChange: true
        });
        await newTeacher.save();
        results.push(newTeacher);
      } else {
        const existingStudent = await StudentModel.findOne({ $or: [{ userId: email }, { email }] });
        if (existingStudent) {
          errors.push(`Row ${i + 1}: Student with email ${email} already exists`);
          continue;
        }

        const newStudent = new StudentModel({
          userId: email,
          password: hashPassword("abc123"),
          name,
          role: "Student",
          email,
          dob,
          gender: cleanGender,
          class: program_id ? `${program_id}-sem-${semester || 1}` : (className || null),
          session: session || null,
          program_id: program_id || null,
          semester: semester || null,
          results: [],
          requiresPasswordChange: true,
          joined_at: u.joined_at ? new Date(u.joined_at) : new Date()
        });
        await newStudent.save();
        results.push(newStudent);
      }
    }

    json(response, 200, {
      success: true,
      count: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body or bulk import error" });
  }
};

export const updateUser = async (request: IncomingMessage, response: ServerResponse, userId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized: Admins only" });
    return;
  }
  try {
    const body = JSON.parse(await readBody(request));
    const { role, name, email, dob, gender, subject, subjects, program_id, program_ids, class: className, session, semester } = body;

    let updatedDoc = null;
    if (role === "Teacher") {
      updatedDoc = await TeacherModel.findOneAndUpdate(
        { userId },
        {
          name,
          email,
          dob,
          gender,
          subject,
          subjects,
          program_ids
        },
        { new: true }
      );
    } else if (role === "Student") {
      updatedDoc = await StudentModel.findOneAndUpdate(
        { userId },
        {
          name,
          email,
          dob,
          gender,
          class: className,
          session,
          program_id,
          semester
        },
        { new: true }
      );
    }

    if (!updatedDoc) {
      json(response, 404, { success: false, message: "User not found" });
      return;
    }

    json(response, 200, { success: true, data: updatedDoc });
  } catch (e) {
    console.error("Update user error:", e);
    json(response, 500, { success: false, message: "Internal server error" });
  }
};

export const deleteUser = async (request: IncomingMessage, response: ServerResponse, userId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized: Admins only" });
    return;
  }
  try {
    const teacherDeleted = await TeacherModel.findOneAndDelete({ userId });
    const studentDeleted = await StudentModel.findOneAndDelete({ userId });

    if (!teacherDeleted && !studentDeleted) {
      json(response, 404, { success: false, message: "User not found" });
      return;
    }

    json(response, 200, { success: true, message: "User deleted successfully" });
  } catch (e) {
    console.error("Delete user error:", e);
    json(response, 500, { success: false, message: "Internal server error" });
  }
};
