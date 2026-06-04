import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { checkRole } from "../middlewares/auth.js";
import { SubjectModel, TopicModel, SubTopicModel } from "../models/index.js";

export const getSubjects = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const subjects = await SubjectModel.find({});
    json(response, 200, { success: true, data: subjects });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const createSubject = async (request: IncomingMessage, response: ServerResponse) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Unauthorized: Admins only" });
    return;
  }
  try {
    const body = JSON.parse(await readBody(request));
    const { name } = body;
    
    if (!name || !name.trim()) {
      json(response, 400, { success: false, message: "Subject name is required" });
      return;
    }
    
    const existingSubject = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (existingSubject) {
      json(response, 400, { success: false, message: "Subject already exists" });
      return;
    }
    
    const count = await SubjectModel.countDocuments();
    const subjectId = `sub-${count + 1}`;
    
    const newSubject = new SubjectModel({
      id: subjectId,
      name: name.trim()
    });
    await newSubject.save();
    json(response, 201, { success: true, data: newSubject });
  } catch (e) {
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
