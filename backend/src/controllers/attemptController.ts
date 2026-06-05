import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { TestModel, ResultModel, QuestionModel, TeacherModel, NotificationModel } from "../models/index.js";

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
    const { test_id, user_id, answers = {}, time_spent = 0, tab_switches = 0 } = payload;
    
    const test = await TestModel.findOne({ id: test_id });
    if (!test) {
      json(response, 404, { success: false, message: "Test not found" });
      return;
    }

    // Enforce slot validation with a 5-minute submission grace period
    if (test.start_time && test.end_time) {
      const now = new Date().getTime();
      const start = new Date(test.start_time).getTime();
      const end = new Date(test.end_time).getTime();
      // Allow 10 minutes grace period for auto-submit network latency/processing
      if (now < start || now > end + 10 * 60 * 1000) {
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
      tab_switches,
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

export interface ActiveStreamState {
  test_id: string;
  user_id: string;
  username: string;
  frame: string;
  hasVideo: boolean;
  hasAudio: boolean;
  lastSeen: number;
}

export const activeStreams = new Map<string, ActiveStreamState>();

export const saveStreamFrame = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const payload = JSON.parse(await readBody(request));
    const { test_id, user_id, username, frame, hasVideo, hasAudio } = payload;
    if (!test_id || !user_id) {
      json(response, 400, { success: false, message: "test_id and user_id are required" });
      return;
    }
    const key = `${test_id}-${user_id}`;
    const isNewStream = !activeStreams.has(key);

    activeStreams.set(key, {
      test_id,
      user_id,
      username: username || user_id,
      frame: frame || "",
      hasVideo: !!hasVideo,
      hasAudio: !!hasAudio,
      lastSeen: Date.now()
    });

    if (isNewStream) {
      try {
        const testObj = await TestModel.findOne({ id: test_id });
        if (testObj) {
          const studentName = username || user_id;
          const msg = `Student '${studentName}' (${user_id}) has started attempting the test '${testObj.name}' with live video proctoring active.`;
          
          // Check if notification already exists for this specific student and test
          const alreadyNotified = await NotificationModel.findOne({
            type: "student_attempt_started",
            test_id: test_id,
            message: { $regex: `\\(${user_id}\\)` }
          });

          if (!alreadyNotified) {
            const testSubjects = Array.isArray(testObj.subject) ? testObj.subject : [testObj.subject];
            const teachers = await TeacherModel.find({
              subject: { $in: testSubjects }
            });
            const targetTeachers = teachers.length > 0 ? teachers : await TeacherModel.find({});
            
            for (const t of targetTeachers) {
              await NotificationModel.create({
                user_id: t.userId,
                message: msg,
                type: "student_attempt_started",
                test_id: testObj.id,
                test_name: testObj.name
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to trigger teacher notification on stream start:", err);
      }
    }

    json(response, 200, { success: true });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const getActiveStreams = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const test_id = requestUrl.searchParams.get("test_id");
    if (!test_id) {
      json(response, 400, { success: false, message: "test_id is required" });
      return;
    }

    const now = Date.now();
    const result = [];
    for (const [key, val] of activeStreams.entries()) {
      if (now - val.lastSeen > 10000) {
        activeStreams.delete(key);
        continue;
      }
      if (val.test_id === test_id) {
        result.push({
          user_id: val.user_id,
          username: val.username,
          frame: val.frame,
          hasVideo: val.hasVideo,
          hasAudio: val.hasAudio,
          lastSeen: val.lastSeen
        });
      }
    }

    json(response, 200, { success: true, data: result });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

