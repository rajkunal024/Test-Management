import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { TestModel, ResultModel, QuestionModel } from "../models/index.js";

const seedRandom = (seedStr: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  let seed = h >>> 0;

  return () => {
    let z = (seed += 0x6d2b79f5 | 0);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
};

const getDeterministicSubset = <T,>(array: T[], count: number, seed: string): T[] => {
  if (array.length <= count) return array;
  
  const temp = [...array];
  const rand = seedRandom(seed);
  const result: T[] = [];
  
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * temp.length);
    result.push(temp.splice(idx, 1)[0]);
  }
  
  return result;
};

export const getAttempts = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const attempts = await ResultModel.find({});
    json(response, 200, {
      success: true,
      data: attempts
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error retrieving attempts" });
  }
};

export const createAttempt = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const payload = JSON.parse(await readBody(request));
    const { test_id, user_id, answers = {}, time_spent = 0 } = payload;
    
    const test = await TestModel.findOne({ id: test_id });
    if (!test) {
      json(response, 404, { success: false, message: "Test not found" });
      return;
    }

    // Enforce slot validation
    if (test.start_time && test.end_time) {
      const now = new Date().getTime();
      const start = new Date(test.start_time).getTime();
      const end = new Date(test.end_time).getTime();
      if (now < start || now > end) {
        json(response, 400, { success: false, message: "This test is not currently active. You can only attempt it within its scheduled time slot." });
        return;
      }
    }

    // Enforce one student attempt only
    const userIdStr = user_id || "student";
    const existingAttempt = await ResultModel.findOne({ test_id, user_id: userIdStr });
    if (existingAttempt) {
      json(response, 400, { success: false, message: "You have already attempted this test." });
      return;
    }
    
    // Get all questions for this test by their linked IDs
    const rawQuestions = await QuestionModel.find({ id: { $in: test.questions || [] } });
    const sortedQuestions = [...rawQuestions].sort((a: any, b: any) => (a.id || "").localeCompare(b.id || ""));
    const seed = `${userIdStr}-${test.id}`;
    const questions = getDeterministicSubset(sortedQuestions, test.total_questions, seed);
    
    let correct_answers = 0;
    let wrong_answers = 0;
    let unattempted = 0;
    let score = 0;
    
    const test_copy = questions.map((q: any) => ({
      id: q.id,
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      correct_option: q.correct_option,
      selected_option: answers[q.id ?? ""] || ""
    }));
    
    questions.forEach((q: any) => {
      const selected = answers[q.id ?? ""];
      if (selected === undefined || selected === null || selected === "") {
        unattempted++;
        score += Number(test.unattempt_marks ?? 0);
      } else if (selected === q.correct_option) {
        correct_answers++;
        score += Number(test.correct_marks ?? 0);
      } else {
        wrong_answers++;
        const penalty = Number(test.wrong_marks ?? 0);
        score += penalty < 0 ? penalty : -penalty;
      }
    });
    
    const newAttempt = new ResultModel({
      test_id,
      test_name: test.name,
      user_id: user_id || "student",
      score,
      correct_answers,
      wrong_answers,
      unattempted,
      answers,
      time_spent,
      test_copy,
      submitted_at: new Date()
    });
    
    await newAttempt.save();
    
    json(response, 201, {
      success: true,
      data: newAttempt
    });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};
