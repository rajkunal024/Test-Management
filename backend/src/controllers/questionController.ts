import { IncomingMessage, ServerResponse } from "node:http";
import { ImageKit } from "@imagekit/nodejs";
import { json, readBody, readBodyBuffer } from "../middlewares/utils.js";
import { QuestionModel, TestModel, TopicModel, SubTopicModel, SubjectModel, TeacherModel } from "../models/index.js";
import { getUserFromRequest } from "../middlewares/auth.js";

let imageKitclient: ImageKit | null = null;
const getImageKitClient = () => {
  if (!imageKitclient) {
    imageKitclient = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    });
  }
  return imageKitclient;
};

const escapeRegex = (string: string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const isTeacherAuthorizedForSubject = async (teacherSubject: string, topicId?: string, subjectId?: string, subjectName?: string) => {
  if (subjectName && subjectName.trim().toLowerCase() !== teacherSubject.toLowerCase()) {
    return false;
  }
  if (topicId && topicId !== "new") {
    const topic = await TopicModel.findOne({ id: topicId });
    if (topic) {
      const subject = await SubjectModel.findOne({ id: topic.subject_id });
      if (subject && subject.name.toLowerCase() === teacherSubject.toLowerCase()) {
        return true;
      }
      return false;
    }
  }
  if (subjectId) {
    const subject = await SubjectModel.findOne({ id: subjectId });
    if (subject && subject.name.toLowerCase() === teacherSubject.toLowerCase()) {
      return true;
    }
    return false;
  }
  return true;
};

const resolveTopicAndSubTopic = async (payload: any) => {
  let topic_id = payload.topic_id;
  let sub_topic_id = payload.sub_topic_id;
  const subject_id = payload.subject_id;

  const tName = payload.new_topic_name || payload.topic_name;
  if ((topic_id === "new" || !topic_id) && tName && tName.trim() && subject_id) {
    const nameTrim = tName.trim();
    let topic = await TopicModel.findOne({
      subject_id: subject_id,
      name: { $regex: new RegExp(`^${escapeRegex(nameTrim)}$`, "i") }
    });
    if (!topic) {
      const count = await TopicModel.countDocuments();
      const newId = `topic-${Date.now()}-${count + 1}`;
      topic = new TopicModel({
        id: newId,
        name: nameTrim,
        subject_id: subject_id
      });
      await topic.save();
    }
    topic_id = topic.id;
  }

  const stName = payload.new_sub_topic_name || payload.sub_topic_name;
  if ((sub_topic_id === "new" || !sub_topic_id) && stName && stName.trim() && topic_id) {
    const subNameTrim = stName.trim();
    let subTopic = await SubTopicModel.findOne({
      topic_id: topic_id,
      name: { $regex: new RegExp(`^${escapeRegex(subNameTrim)}$`, "i") }
    });
    if (!subTopic) {
      const count = await SubTopicModel.countDocuments();
      const newId = `subtopic-${Date.now()}-${count + 1}`;
      subTopic = new SubTopicModel({
        id: newId,
        name: subNameTrim,
        topic_id: topic_id
      });
      await subTopic.save();
    }
    sub_topic_id = subTopic.id;
  }

  const cleanPayload = { ...payload };
  if (topic_id && topic_id !== "new") {
    cleanPayload.topic_id = topic_id;
  } else {
    delete cleanPayload.topic_id;
  }
  if (sub_topic_id && sub_topic_id !== "new") {
    cleanPayload.sub_topic_id = sub_topic_id;
  } else {
    delete cleanPayload.sub_topic_id;
  }
  delete cleanPayload.new_topic_name;
  delete cleanPayload.new_sub_topic_name;
  delete cleanPayload.topic_name;
  delete cleanPayload.sub_topic_name;
  delete cleanPayload.subject_id;

  return cleanPayload;
};

export const getQuestions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    const query: any = {};

    if (user && user.role === "Teacher") {
      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (teacher) {
        const subject = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${escapeRegex(teacher.subject)}$`, "i") } });
        if (subject) {
          const topics = await TopicModel.find({ subject_id: subject.id });
          const topicIds = topics.map(t => t.id);
          query.topic_id = { $in: topicIds };
        } else {
          query.topic_id = { $in: [] };
        }
      } else {
        query.topic_id = { $in: [] };
      }
    }

    const questions = await QuestionModel.find(query);
    json(response, 200, { success: true, data: questions });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const createQuestion = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    const rawPayload = JSON.parse(await readBody(request));

    if (user && user.role === "Teacher") {
      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (!teacher) {
        json(response, 403, { success: false, message: "Teacher account not found." });
        return;
      }

      const authorized = await isTeacherAuthorizedForSubject(
        teacher.subject,
        rawPayload.topic_id,
        rawPayload.subject_id,
        rawPayload.subject
      );

      if (!authorized) {
        json(response, 403, { success: false, message: `You are not allowed to upload/create questions for a subject other than ${teacher.subject}.` });
        return;
      }
    }

    const payload = await resolveTopicAndSubTopic(rawPayload);
    const newQuestion = new QuestionModel({
      id: `q-pool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      created_by: user ? user.userId : undefined,
      ...payload,
    });
    await newQuestion.save();
    json(response, 201, { success: true, data: newQuestion });
  } catch (e: any) {
    console.error("Error in createQuestion:", e);
    json(response, 400, { success: false, message: e.message || "Invalid JSON body or error resolving topics" });
  }
};

export const updateQuestion = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const user = getUserFromRequest(request);
    const rawPayload = JSON.parse(await readBody(request));

    const existingQuestion = await QuestionModel.findOne({ id });
    if (!existingQuestion) {
      json(response, 404, { success: false, message: "Question not found" });
      return;
    }

    if (user && user.role === "Teacher") {
      if (existingQuestion.created_by && existingQuestion.created_by !== user.userId) {
        json(response, 403, { success: false, message: "You cannot update questions created by other teachers." });
        return;
      }
      if (!existingQuestion.created_by) {
        json(response, 403, { success: false, message: "Only administrators can edit legacy system questions." });
        return;
      }

      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (!teacher) {
        json(response, 403, { success: false, message: "Teacher account not found." });
        return;
      }

      const targetTopic = rawPayload.topic_id || existingQuestion.topic_id;
      const targetSubject = rawPayload.subject_id;
      const authorized = await isTeacherAuthorizedForSubject(
        teacher.subject,
        targetTopic,
        targetSubject,
        rawPayload.subject
      );

      if (!authorized) {
        json(response, 403, { success: false, message: `You are not allowed to set questions to a subject other than ${teacher.subject}.` });
        return;
      }
    }

    const payload = await resolveTopicAndSubTopic(rawPayload);
    const question = await QuestionModel.findOneAndUpdate({ id }, payload, { new: true });
    if (question) {
      json(response, 200, { success: true, data: question });
    } else {
      json(response, 404, { success: false, message: "Question not found" });
    }
  } catch (e: any) {
    console.error("Error in updateQuestion:", e);
    json(response, 400, { success: false, message: e.message || "Invalid JSON body or error resolving topics" });
  }
};

export const deleteQuestion = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const user = getUserFromRequest(request);
    const existingQuestion = await QuestionModel.findOne({ id });
    if (!existingQuestion) {
      json(response, 404, { success: false, message: "Question not found" });
      return;
    }

    if (user && user.role === "Teacher") {
      if (existingQuestion.created_by && existingQuestion.created_by !== user.userId) {
        json(response, 403, { success: false, message: "You cannot delete questions created by other teachers." });
        return;
      }
      if (!existingQuestion.created_by) {
        json(response, 403, { success: false, message: "Only administrators can delete legacy system questions." });
        return;
      }
    }

    const result = await QuestionModel.deleteOne({ id });
    if (result.deletedCount > 0) {
      json(response, 200, { success: true, message: "Question deleted successfully" });
    } else {
      json(response, 404, { success: false, message: "Question not found" });
    }
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const bulkQuestions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    const { test_id, questions } = JSON.parse(await readBody(request));

    const test = await TestModel.findOne({ id: test_id });
    if (!test) {
      json(response, 404, { success: false, message: "Test not found" });
      return;
    }

    const now = new Date().getTime();
    const start = test.start_time ? new Date(test.start_time).getTime() : 0;
    const hasStarted = (test.status === "live" || test.status === "scheduled") && (!start || now >= start);
    if (hasStarted) {
      json(response, 400, { success: false, message: "Cannot edit questions for a test that has already started" });
      return;
    }

    if (user && user.role === "Teacher") {
      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (!teacher) {
        json(response, 403, { success: false, message: "Teacher account not found." });
        return;
      }

      const testSubjects = Array.isArray(test.subject) ? test.subject : [test.subject];
      const matchesSubject = testSubjects.some(s => s.toLowerCase() === teacher.subject.toLowerCase());

      if (!matchesSubject) {
        json(response, 403, { success: false, message: `You are not authorized to manage questions for a test of subject ${test.subject}.` });
        return;
      }
    }

    await QuestionModel.deleteMany({ test_id });

    const newQuestions = questions.map((q: any, i: number) => ({
      id: q.id || `q-${test_id}-${Date.now()}-${i}`,
      created_by: user ? user.userId : undefined,
      ...q,
      test_id
    }));
    await QuestionModel.insertMany(newQuestions);

    const qIds = newQuestions.map((q: any) => q.id);
    await TestModel.findOneAndUpdate({ id: test_id }, { questions: qIds });

    json(response, 200, {
      success: true,
      data: newQuestions
    });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const fetchBulkQuestions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const { question_ids } = JSON.parse(await readBody(request));
    const questions = await QuestionModel.find({ id: { $in: question_ids } });
    json(response, 200, {
      success: true,
      data: questions
    });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const uploadQuestionImage = async (request: IncomingMessage, response: ServerResponse) => {
  try {
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
    let fileName = `img-${Date.now()}.png`;
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
      fileName: "question_" + Date.now(),
      folder: "questions"
    });

    json(response, 200, { success: true, image_url: ikData.url });
  } catch (e) {
    console.error("Error uploading question image:", e);
    json(response, 500, { success: false, message: "Internal server error during image upload" });
  }
};
