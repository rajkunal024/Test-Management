import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { QuestionModel, TestModel, TopicModel, SubTopicModel } from "../models/index.js";

const escapeRegex = (string: string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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
    const questions = await QuestionModel.find({});
    json(response, 200, { success: true, data: questions });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const createQuestion = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const rawPayload = JSON.parse(await readBody(request));
    const payload = await resolveTopicAndSubTopic(rawPayload);
    const newQuestion = new QuestionModel({
      id: `q-pool-${Date.now()}`,
      ...payload,
    });
    await newQuestion.save();
    json(response, 201, { success: true, data: newQuestion });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body or error resolving topics" });
  }
};

export const updateQuestion = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const rawPayload = JSON.parse(await readBody(request));
    const payload = await resolveTopicAndSubTopic(rawPayload);
    const question = await QuestionModel.findOneAndUpdate({ id }, payload, { new: true });
    if (question) {
      json(response, 200, { success: true, data: question });
    } else {
      json(response, 404, { success: false, message: "Question not found" });
    }
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body or error resolving topics" });
  }
};

export const deleteQuestion = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
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
    const { test_id, questions } = JSON.parse(await readBody(request));
    
    await QuestionModel.deleteMany({ test_id });
    
    const newQuestions = questions.map((q: any, i: number) => ({
      id: q.id || `q-${test_id}-${Date.now()}-${i}`,
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
