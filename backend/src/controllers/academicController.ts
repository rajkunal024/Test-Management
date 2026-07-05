import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { ClassModel, SessionModel, ProgramModel, StudentModel, SemesterModel } from "../models/index.js";
import { checkRole, getUserFromRequest } from "../middlewares/auth.js";

export const getClasses = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const classes = await ClassModel.find({}).sort({ numericOrder: 1 });
    json(response, 200, { success: true, data: classes });
  } catch (e) {
    json(response, 500, { success: false, message: "Error retrieving classes" });
  }
};

export const createClass = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { name, numericOrder } = body;

    if (!name || numericOrder === undefined) {
      json(response, 400, { success: false, message: "Class name and numeric order are required" });
      return;
    }

    const classId = `class-${Date.now()}`;
    const newClass = new ClassModel({
      id: classId,
      name,
      numericOrder: Number(numericOrder)
    });

    await newClass.save();
    json(response, 201, { success: true, data: newClass });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to create class" });
  }
};

export const getSessions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const sessions = await SessionModel.find({}).sort({ name: -1 });
    json(response, 200, { success: true, data: sessions });
  } catch (e) {
    json(response, 500, { success: false, message: "Error retrieving sessions" });
  }
};

export const createSession = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { name, isCurrent } = body;

    if (!name) {
      json(response, 400, { success: false, message: "Session name is required" });
      return;
    }

    const sessionId = `session-${Date.now()}`;

    // If marked as current, unset previous current sessions under this tenant
    if (isCurrent) {
      await SessionModel.updateMany({ isCurrent: true }, { isCurrent: false });
    }

    const newSession = new SessionModel({
      id: sessionId,
      name,
      isCurrent: !!isCurrent
    });

    await newSession.save();
    json(response, 201, { success: true, data: newSession });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to create session" });
  }
};

export const getPrograms = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const programs = await ProgramModel.find({}).sort({ name: 1 });
    json(response, 200, { success: true, data: programs });
  } catch (e) {
    json(response, 500, { success: false, message: "Error retrieving programs" });
  }
};

export const createProgram = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { name, code, totalSemesters } = body;

    if (!name || !code) {
      json(response, 400, { success: false, message: "Program name and code are required" });
      return;
    }

    const programId = `program-${Date.now()}`;
    const newProgram = new ProgramModel({
      id: programId,
      name,
      code: code.toUpperCase().trim(),
      totalSemesters: totalSemesters ? Number(totalSemesters) : 10
    });

    await newProgram.save();
    json(response, 201, { success: true, data: newProgram });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to create program" });
  }
};

export const promoteSchoolStudents = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { sourceSession, targetSession, sourceClass, targetClass } = body;

    if (!sourceSession || !targetSession || !sourceClass || !targetClass) {
      json(response, 400, { success: false, message: "All parameters (sourceSession, targetSession, sourceClass, targetClass) are required" });
      return;
    }

    if (sourceSession === targetSession) {
      json(response, 400, { success: false, message: "Current session and next session cannot be the same" });
      return;
    }

    if (sourceClass === targetClass) {
      json(response, 400, { success: false, message: "Current class and next class cannot be the same" });
      return;
    }

    const students = await StudentModel.find({
      class: sourceClass,
      session: sourceSession
    });

    if (students.length === 0) {
      json(response, 404, { success: false, message: "No students found in the source class and session" });
      return;
    }

    const promoted: string[] = [];
    const failedToQualify: { name: string; score: number }[] = [];
    const alreadyPromoted: string[] = [];

    for (const student of students) {
      // 1. Check if already promoted in this target session (one promotion per session constraint)
      const hasTargetHistory = student.academicHistory.some((h: any) => h.session === targetSession);
      if (hasTargetHistory || student.session === targetSession) {
        alreadyPromoted.push(student.name);
        continue;
      }

      // 2. Evaluate average marks in current session
      const lastPromotion = student.academicHistory.length > 0 
        ? student.academicHistory[student.academicHistory.length - 1].promotedAt 
        : null;

      const currentSessionResults = (student.results || []).filter((r: any) => {
        return !lastPromotion || r.submitted_at > lastPromotion;
      });

      let totalScore = 0;
      let totalMaxMarks = 0;
      currentSessionResults.forEach((r: any) => {
        totalScore += r.score;
        totalMaxMarks += r.total_marks;
      });

      const avgPercent = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0;

      // Must be strictly greater than 35%
      if (avgPercent <= 35) {
        failedToQualify.push({ name: student.name, score: Math.round(avgPercent * 100) / 100 });
        continue;
      }

      // 3. Promote Student
      student.academicHistory.push({
        session: student.session,
        class: student.class,
        promotedAt: new Date()
      });

      student.class = targetClass;
      student.session = targetSession;

      await student.save();
      promoted.push(student.name);
    }

    json(response, 200, {
      success: true,
      message: "School student promotion batch completed.",
      data: {
        promotedCount: promoted.length,
        promoted,
        failedToQualify,
        alreadyPromoted
      }
    });
  } catch (e) {
    console.error("Error promoting school students:", e);
    json(response, 500, { success: false, message: "Promotion processing failed" });
  }
};

export const promoteCollegeStudents = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { programId, currentSemester, targetSemester } = body;

    if (!programId || currentSemester === undefined || targetSemester === undefined) {
      json(response, 400, { success: false, message: "Missing required fields (programId, currentSemester, targetSemester)" });
      return;
    }

    if (Number(currentSemester) === Number(targetSemester)) {
      json(response, 400, { success: false, message: "Current semester and target semester cannot be the same" });
      return;
    }

    const program = await ProgramModel.findOne({ id: programId });
    if (!program) {
      json(response, 404, { success: false, message: "Specified program not found" });
      return;
    }

    const students = await StudentModel.find({
      program_id: programId,
      semester: Number(currentSemester)
    });

    if (students.length === 0) {
      json(response, 404, { success: false, message: "No students found in the specified program and semester" });
      return;
    }

    const isGraduating = Number(targetSemester) > program.totalSemesters;
    const promoted: string[] = [];

    for (const student of students) {
      student.academicHistory.push({
        session: student.session,
        semester: student.semester,
        promotedAt: new Date()
      });

      if (isGraduating) {
        student.semester = null as any;
        student.class = "Alumni";
      } else {
        student.semester = Number(targetSemester);
        student.class = `${student.program_id}-sem-${Number(targetSemester)}`;
      }

      await student.save();
      promoted.push(student.name);
    }

    json(response, 200, {
      success: true,
      message: isGraduating 
        ? `Successfully graduated ${promoted.length} final semester students.` 
        : `Successfully promoted ${promoted.length} students to Semester ${targetSemester}.`,
      data: {
        promotedCount: promoted.length,
        promoted
      }
    });
  } catch (e) {
    console.error("Error promoting college students:", e);
    json(response, 500, { success: false, message: "College promotion processing failed" });
  }
};

export const setCurrentSession = async (request: IncomingMessage, response: ServerResponse, sessionId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized" });
    return;
  }
  try {
    if (!sessionId) {
      json(response, 400, { success: false, message: "Session ID is required" });
      return;
    }

    // Set all other sessions isCurrent = false
    await SessionModel.updateMany({ isCurrent: true }, { isCurrent: false });

    // Set this session isCurrent = true
    const updated = await SessionModel.findOneAndUpdate({ id: sessionId }, { isCurrent: true }, { new: true });

    if (!updated) {
      json(response, 404, { success: false, message: "Session not found" });
      return;
    }

    json(response, 200, { success: true, data: updated });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to set current session" });
  }
};

export const updateProgram = async (request: IncomingMessage, response: ServerResponse, programId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized" });
    return;
  }
  try {
    const body = JSON.parse(await readBody(request));
    const { name, code, totalSemesters } = body;
    const updated = await ProgramModel.findOneAndUpdate(
      { id: programId },
      { name, code, totalSemesters },
      { new: true }
    );
    if (!updated) {
      json(response, 404, { success: false, message: "Program not found" });
      return;
    }
    json(response, 200, { success: true, data: updated });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to update program" });
  }
};

export const deleteProgram = async (request: IncomingMessage, response: ServerResponse, programId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized" });
    return;
  }
  try {
    const deleted = await ProgramModel.findOneAndDelete({ id: programId });
    if (!deleted) {
      json(response, 404, { success: false, message: "Program not found" });
      return;
    }
    json(response, 200, { success: true, message: "Program deleted successfully" });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to delete program" });
  }
};

export const createSemester = async (request: IncomingMessage, response: ServerResponse) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized" });
    return;
  }
  try {
    const body = JSON.parse(await readBody(request));
    const { name } = body;
    if (!name) {
      json(response, 400, { success: false, message: "Semester name is required" });
      return;
    }
    const semesterId = `sem-${Date.now()}`;
    
    const adminUser = getUserFromRequest(request);
    const organization_id = adminUser?.organization_id || "";

    const newSemester = new SemesterModel({
      id: semesterId,
      name,
      organization_id
    });
    await newSemester.save();
    json(response, 201, { success: true, data: newSemester });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to create semester" });
  }
};

export const getSemesters = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const semesters = await SemesterModel.find({});
    json(response, 200, { success: true, data: semesters });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to get semesters" });
  }
};

export const updateSemester = async (request: IncomingMessage, response: ServerResponse, semesterId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized" });
    return;
  }
  try {
    const body = JSON.parse(await readBody(request));
    const { name } = body;
    const updated = await SemesterModel.findOneAndUpdate(
      { id: semesterId },
      { name },
      { new: true }
    );
    if (!updated) {
      json(response, 404, { success: false, message: "Semester not found" });
      return;
    }
    json(response, 200, { success: true, data: updated });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to update semester" });
  }
};

export const deleteSemester = async (request: IncomingMessage, response: ServerResponse, semesterId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized" });
    return;
  }
  try {
    const deleted = await SemesterModel.findOneAndDelete({ id: semesterId });
    if (!deleted) {
      json(response, 404, { success: false, message: "Semester not found" });
      return;
    }
    json(response, 200, { success: true, message: "Semester deleted successfully" });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to delete semester" });
  }
};
