import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { PassageModel, SubjectModel, TeacherModel, QuestionModel } from "../models/index.js";
import { getUserFromRequest } from "../middlewares/auth.js";

const escapeRegex = (string: string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

export const getPassages = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    const query: any = {};

    if (user && user.role === "Teacher") {
      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (teacher) {
        const subject = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${escapeRegex(teacher.subject)}$`, "i") } });
        if (subject) {
          query.subject_id = subject.id;
        } else {
          query.subject_id = "";
        }
      } else {
        query.subject_id = "";
      }
    }

    const passages = await PassageModel.find(query);
    json(response, 200, { success: true, data: passages });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const getPassageById = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const passage = await PassageModel.findOne({ id });
    if (!passage) {
      json(response, 404, { success: false, message: "Passage not found" });
      return;
    }
    json(response, 200, { success: true, data: passage });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const createPassage = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    const rawPayload = JSON.parse(await readBody(request));

    if (user && user.role === "Teacher") {
      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (!teacher) {
        json(response, 403, { success: false, message: "Teacher account not found." });
        return;
      }
      const subject = await SubjectModel.findOne({ id: rawPayload.subject_id });
      if (!subject || subject.name.toLowerCase() !== teacher.subject.toLowerCase()) {
        json(response, 403, { success: false, message: `You are not allowed to create passages for other than ${teacher.subject}.` });
        return;
      }
    }

    const newPassage = new PassageModel({
      id: `passage-${Date.now()}`,
      created_by: user ? user.userId : undefined,
      title: rawPayload.title,
      content: rawPayload.content,
      subject_id: rawPayload.subject_id,
      class: rawPayload.class,
    });
    await newPassage.save();
    json(response, 201, { success: true, data: newPassage });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const updatePassage = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const user = getUserFromRequest(request);
    const rawPayload = JSON.parse(await readBody(request));

    const existingPassage = await PassageModel.findOne({ id });
    if (!existingPassage) {
      json(response, 404, { success: false, message: "Passage not found" });
      return;
    }

    if (user && user.role === "Teacher") {
      if (existingPassage.created_by && existingPassage.created_by !== user.userId) {
        json(response, 403, { success: false, message: "You cannot update passages created by other teachers." });
        return;
      }
    }

    const updated = await PassageModel.findOneAndUpdate({ id }, {
      title: rawPayload.title,
      content: rawPayload.content,
      class: rawPayload.class,
    }, { new: true });

    json(response, 200, { success: true, data: updated });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const deletePassage = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const user = getUserFromRequest(request);
    const existingPassage = await PassageModel.findOne({ id });
    if (!existingPassage) {
      json(response, 404, { success: false, message: "Passage not found" });
      return;
    }

    if (user && user.role === "Teacher") {
      if (existingPassage.created_by && existingPassage.created_by !== user.userId) {
        json(response, 403, { success: false, message: "You cannot delete passages created by other teachers." });
        return;
      }
    }

    await PassageModel.deleteOne({ id });
    await QuestionModel.updateMany({ passage_id: id }, { $set: { passage_id: null } });

    json(response, 200, { success: true, message: "Passage deleted successfully" });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const getQuestionsForPassage = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const questions = await QuestionModel.find({ passage_id: id });
    json(response, 200, { success: true, data: questions });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};
