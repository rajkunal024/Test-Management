import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { checkRole, getUserFromRequest } from "../middlewares/auth.js";
import { SubjectModel, TopicModel, SubTopicModel } from "../models/index.js";

export const getSubjects = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const subjects = await SubjectModel.find({});
    json(response, 200, { success: true, data: subjects });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

export const createSubject = async (request: IncomingMessage, response: ServerResponse) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized: Admins only" });
    return;
  }
  try {
    const body = JSON.parse(await readBody(request));
    const { name, program_id, program_ids, program_semesters } = body;
    
    if (!name || !name.trim()) {
      json(response, 400, { success: false, message: "Subject name is required" });
      return;
    }
    
    const existingSubject = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") } });
    if (existingSubject) {
      json(response, 400, { success: false, message: "Subject already exists" });
      return;
    }
    
    const subjectId = `sub-${Date.now()}`;
    
    const adminUser = getUserFromRequest(request);
    const organization_id = adminUser?.organization_id || "";

    const resolvedProgramIds = program_ids || (program_semesters ? program_semesters.map((ps: any) => ps.program_id) : (program_id ? [program_id] : []));
    const resolvedProgramId = program_id || (resolvedProgramIds[0] || null);

    const newSubject = new SubjectModel({
      id: subjectId,
      name: name.trim(),
      program_id: resolvedProgramId,
      program_ids: resolvedProgramIds,
      program_semesters: program_semesters || [],
      organization_id
    });
    await newSubject.save();
    json(response, 201, { success: true, data: newSubject });
  } catch (e) {
    console.error("CREATE SUBJECT EXCEPTION:", e);
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const getTopicsBySubject = async (request: IncomingMessage, response: ServerResponse, subjectId: string) => {
  try {
    const topics = await TopicModel.find({ subject_id: subjectId });
    json(response, 200, { success: true, data: topics });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const getSubtopicsByTopics = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const { topicIds } = JSON.parse(await readBody(request));
    const subTopics = await SubTopicModel.find({ topic_id: { $in: topicIds } });
    json(response, 200, { success: true, data: subTopics });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const updateSubject = async (request: IncomingMessage, response: ServerResponse, subjectId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized: Admins only" });
    return;
  }
  try {
    const body = JSON.parse(await readBody(request));
    const { name, program_id, program_ids, program_semesters } = body;
    if (!name || !name.trim()) {
      json(response, 400, { success: false, message: "Subject name is required" });
      return;
    }

    const resolvedProgramIds = program_ids || (program_semesters ? program_semesters.map((ps: any) => ps.program_id) : (program_id ? [program_id] : []));
    const resolvedProgramId = program_id || (resolvedProgramIds[0] || null);

    const updated = await SubjectModel.findOneAndUpdate(
      { id: subjectId },
      {
        name: name.trim(),
        program_id: resolvedProgramId,
        program_ids: resolvedProgramIds,
        program_semesters: program_semesters || []
      },
      { new: true }
    );

    if (!updated) {
      json(response, 404, { success: false, message: "Subject not found" });
      return;
    }

    json(response, 200, { success: true, data: updated });
  } catch (e) {
    console.error("UPDATE SUBJECT EXCEPTION:", e);
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const deleteSubject = async (request: IncomingMessage, response: ServerResponse, subjectId: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized: Admins only" });
    return;
  }
  try {
    const deleted = await SubjectModel.findOneAndDelete({ id: subjectId });
    if (!deleted) {
      json(response, 404, { success: false, message: "Subject not found" });
      return;
    }
    json(response, 200, { success: true, message: "Subject deleted successfully" });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};
