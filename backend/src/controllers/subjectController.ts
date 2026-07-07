import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { checkRole, getUserFromRequest } from "../middlewares/auth.js";
import { SubjectModel, TopicModel, SubTopicModel, OrganizationModel } from "../models/index.js";

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
    const { name, program_ids, program_semesters } = body;
    
    if (!name || !name.trim()) {
      json(response, 400, { success: false, message: "Subject name is required" });
      return;
    }
    
    const existingSubject = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") } });
    if (existingSubject) {
      json(response, 400, { success: false, message: "Subject already exists" });
      return;
    }
    
    const adminUser = getUserFromRequest(request);
    const organization_id = adminUser?.organization_id || "";

    // Generate custom ID prefix based on organization initials
    let orgPrefix = "org";
    if (organization_id) {
      const org = await OrganizationModel.findOne({ id: organization_id });
      if (org && org.name) {
        const orgWords = org.name.trim().split(/\s+/);
        if (orgWords.length > 0) {
          const firstWord = orgWords[0];
          const lastWord = orgWords[orgWords.length - 1];
          orgPrefix = (firstWord[0] + (orgWords.length > 1 ? lastWord[0] : "")).toLowerCase();
        }
      }
    }

    const words = name.trim().split(/\s+/);
    const subSlug = words.length > 1
      ? words.map((w: string) => w[0]).join("").toLowerCase()
      : words[0].toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Generate unique 3-digit code
    let subjectId = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 100) {
      const randNum = Math.floor(100 + Math.random() * 900); // 100 to 999
      subjectId = `${orgPrefix}_${subSlug}-${randNum}`;
      const exists = await SubjectModel.findOne({ id: subjectId });
      if (!exists) {
        isUnique = true;
      }
      attempts++;
    }
    if (!isUnique) {
      subjectId = `${orgPrefix}_${subSlug}-${Date.now()}`;
    }

    const resolvedProgramIds = program_ids || (program_semesters ? program_semesters.map((ps: any) => ps.program_id) : []);

    const newSubject = new SubjectModel({
      id: subjectId,
      name: name.trim(),
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
    const { name, program_ids, program_semesters } = body;
    if (!name || !name.trim()) {
      json(response, 400, { success: false, message: "Subject name is required" });
      return;
    }

    const resolvedProgramIds = program_ids || (program_semesters ? program_semesters.map((ps: any) => ps.program_id) : []);

    const updated = await SubjectModel.findOneAndUpdate(
      { id: subjectId },
      {
        name: name.trim(),
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
