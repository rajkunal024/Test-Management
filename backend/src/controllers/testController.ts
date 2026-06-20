import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { checkRole } from "../middlewares/auth.js";
import { TestModel, ResultModel, StudentModel, QuestionModel, NotificationModel, SubjectModel, TopicModel, SubTopicModel } from "../models/index.js";
import { performShareResults } from "../services/shareService.js";

const distributeQuestionsIntoSections = async (testQuestions: string[], sections: any[]) => {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return sections;
  }

  // Load all question documents
  const questionDocs = await QuestionModel.find({ id: { $in: testQuestions } });
  
  // Group question IDs by their subject name (lowercase for robust match)
  const questionsBySubject: Record<string, string[]> = {};
  for (const q of questionDocs) {
    if (q.topic_id) {
      const topic = await TopicModel.findOne({ id: q.topic_id });
      if (topic) {
        const subject = await SubjectModel.findOne({ id: topic.subject_id });
        if (subject) {
          const subName = subject.name.toLowerCase().trim();
          if (!questionsBySubject[subName]) {
            questionsBySubject[subName] = [];
          }
          questionsBySubject[subName].push(q.id);
        }
      }
    }
  }

  // For each section, assign matching questions
  return sections.map((sec: any) => {
    const secSub = (sec.subject || "").toLowerCase().trim();
    return {
      name: sec.name,
      subject: sec.subject,
      duration: sec.duration,
      questions_count: Number(sec.questions_count || 0),
      questions: questionsBySubject[secSub] || []
    };
  });
};

const calculateTestDifficulty = async (questionIds: string[], defaultDiff: string): Promise<string> => {
  if (!questionIds || questionIds.length === 0) return defaultDiff;
  const questionDocs = await QuestionModel.find({ id: { $in: questionIds } });
  const total = questionDocs.length;
  if (total === 0) return defaultDiff;

  let easyCount = 0;
  let mediumCount = 0;
  let hardCount = 0;

  for (const q of questionDocs) {
    const diff = (q.difficulty || "").toLowerCase().trim();
    if (diff === "easy") {
      easyCount++;
    } else if (diff === "medium") {
      mediumCount++;
    } else if (diff === "hard" || diff === "difficult") {
      hardCount++;
    }
  }

  if (hardCount > 0.5 * total) {
    return "hard";
  }
  if (hardCount > 0) {
    return "medium";
  }
  if (mediumCount > 0.5 * total) {
    return "medium";
  }
  if (easyCount > 0.5 * total) {
    return "easy";
  }
  return "medium";
};

export const getTests = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const now = new Date().getTime();
    const tests = await TestModel.find({});
    for (const test of tests) {
      if (test.status === "scheduled" && test.start_time) {
        const start = new Date(test.start_time).getTime();
        if (now >= start) {
          test.status = "live";
          await test.save();
        }
      }
    }
    json(response, 200, { success: true, data: tests });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const createTest = async (request: IncomingMessage, response: ServerResponse) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Forbidden: Only admins can manage tests" });
    return;
  }
  try {
    const payload = JSON.parse(await readBody(request));
    if (payload.sections && Array.isArray(payload.sections) && payload.sections.length > 0) {
      const sumDurations = payload.sections.reduce((acc: number, sec: any) => acc + Number(sec.duration || 0), 0);
      if (payload.total_time !== undefined && sumDurations !== Number(payload.total_time)) {
        json(response, 400, { success: false, message: "The sum of section durations must equal the total test time" });
        return;
      }
      const sumQuestions = payload.sections.reduce((acc: number, sec: any) => acc + Number(sec.questions_count || 0), 0);
      if (payload.total_questions !== undefined && sumQuestions !== Number(payload.total_questions)) {
        json(response, 400, { success: false, message: "The sum of section question counts must equal the total questions target" });
        return;
      }
    }

    if (payload.start_time && payload.end_time) {
      const start = new Date(payload.start_time).getTime();
      const end = new Date(payload.end_time).getTime();
      if (end < start) {
        json(response, 400, { success: false, message: "End time slot cannot be earlier than start time slot" });
        return;
      }
      const slotMins = Math.floor((end - start) / (60 * 1000));
      if (payload.sections && Array.isArray(payload.sections) && payload.sections.length > 0) {
        const sumDurations = payload.sections.reduce((acc: number, sec: any) => acc + Number(sec.duration || 0), 0);
        if (sumDurations > slotMins) {
          json(response, 400, { success: false, message: "The sum of section durations cannot be greater than the schedule time slot duration" });
          return;
        }
        for (const sec of payload.sections) {
          if (Number(sec.duration || 0) > slotMins) {
            json(response, 400, { success: false, message: `Section duration (${sec.duration} mins) cannot be greater than the schedule time slot (${slotMins} mins)` });
            return;
          }
        }
      } else {
        if (payload.total_time !== undefined && Number(payload.total_time) > slotMins) {
          json(response, 400, { success: false, message: "Test duration cannot be greater than the schedule time slot duration" });
          return;
        }
      }
    }
    let sections = payload.sections;
    if (sections && Array.isArray(sections) && sections.length > 0) {
      sections = await distributeQuestionsIntoSections(payload.questions || [], sections);
    }
    let difficulty = payload.difficulty || "medium";
    if (payload.questions && Array.isArray(payload.questions) && payload.questions.length > 0) {
      difficulty = await calculateTestDifficulty(payload.questions, difficulty);
    }
    const newTest = new TestModel({
      id: `test-${Date.now()}`,
      ...payload,
      difficulty,
      sections,
      questions: payload.questions || [],
      created_at: new Date()
    });
    await newTest.save();
    const nowTime = new Date().getTime();
    const startTime = newTest.start_time ? new Date(newTest.start_time).getTime() : 0;
    const isUpcomingTest = startTime && nowTime < startTime;

    if (newTest.status === "live" && !isUpcomingTest) {
      try {
        const query = newTest.class ? { class: newTest.class } : {};
        const students = await StudentModel.find(query);
        for (const student of students) {
          await NotificationModel.create({
            user_id: student.userId,
            message: `A new test '${newTest.name}' is now live! Attempt it before it ends.`,
            type: "test_live",
            test_id: newTest.id,
            test_name: newTest.name,
            organization_id: newTest.organization_id || student.organization_id
          });
        }
      } catch (err) {
        console.error("Failed to create live test notification:", err);
      }
    }
    json(response, 201, { success: true, data: newTest });
  } catch (e: any) {
    console.error("Error in createTest:", e);
    json(response, 400, { success: false, message: e.message || "Invalid JSON body" });
  }
};

export const getTestById = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const test = await TestModel.findOne({ id });
    if (test) {
      json(response, 200, { success: true, data: test });
    } else {
      json(response, 404, { success: false, message: "Test not found" });
    }
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const updateTest = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Forbidden: Only admins can manage tests" });
    return;
  }
  try {
    const existingTest = await TestModel.findOne({ id });
    if (!existingTest) {
      json(response, 404, { success: false, message: "Test not found" });
      return;
    }

    const now = new Date().getTime();
    const start = existingTest.start_time ? new Date(existingTest.start_time).getTime() : 0;
    const hasStarted = (existingTest.status === "live" || existingTest.status === "scheduled") && (!start || now >= start);
    if (hasStarted) {
      json(response, 400, { success: false, message: "Cannot edit a test that has already started" });
      return;
    }

    const payload = JSON.parse(await readBody(request));
    const startTime = payload.start_time !== undefined ? payload.start_time : existingTest.start_time;
    const endTime = payload.end_time !== undefined ? payload.end_time : existingTest.end_time;
    const totalTime = payload.total_time !== undefined ? payload.total_time : existingTest.total_time;
    const totalQuestions = payload.total_questions !== undefined ? payload.total_questions : existingTest.total_questions;
    const sectionsVal = payload.sections !== undefined ? payload.sections : existingTest.sections;

    if (sectionsVal && Array.isArray(sectionsVal) && sectionsVal.length > 0) {
      const sumDurations = sectionsVal.reduce((acc: number, sec: any) => acc + Number(sec.duration || 0), 0);
      if (totalTime !== undefined && sumDurations !== Number(totalTime)) {
        json(response, 400, { success: false, message: "The sum of section durations must equal the total test time" });
        return;
      }
      const sumQuestions = sectionsVal.reduce((acc: number, sec: any) => acc + Number(sec.questions_count || 0), 0);
      if (totalQuestions !== undefined && sumQuestions !== Number(totalQuestions)) {
        json(response, 400, { success: false, message: "The sum of section question counts must equal the total questions target" });
        return;
      }
    }

    if (startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (end < start) {
        json(response, 400, { success: false, message: "End time slot cannot be earlier than start time slot" });
        return;
      }
      const slotMins = Math.floor((end - start) / (60 * 1000));
      if (sectionsVal && Array.isArray(sectionsVal) && sectionsVal.length > 0) {
        const sumDurations = sectionsVal.reduce((acc: number, sec: any) => acc + Number(sec.duration || 0), 0);
        if (sumDurations > slotMins) {
          json(response, 400, { success: false, message: "The sum of section durations cannot be greater than the schedule time slot duration" });
          return;
        }
        for (const sec of sectionsVal) {
          if (Number(sec.duration || 0) > slotMins) {
            json(response, 400, { success: false, message: `Section duration (${sec.duration} mins) cannot be greater than the schedule time slot (${slotMins} mins)` });
            return;
          }
        }
      } else {
        if (totalTime !== undefined && Number(totalTime) > slotMins) {
          json(response, 400, { success: false, message: "Test duration cannot be greater than the schedule time slot duration" });
          return;
        }
      }
    }

    let sections = payload.sections || existingTest.sections;
    const testQuestions = payload.questions !== undefined ? payload.questions : existingTest.questions;
    if (sections && Array.isArray(sections) && sections.length > 0) {
      payload.sections = await distributeQuestionsIntoSections(testQuestions, sections);
    }
    let difficulty = payload.difficulty !== undefined ? payload.difficulty : existingTest.difficulty;
    if (testQuestions && Array.isArray(testQuestions) && testQuestions.length > 0) {
      difficulty = await calculateTestDifficulty(testQuestions, difficulty);
    }
    payload.difficulty = difficulty;
    const isNowLive = payload.status === "live" && existingTest.status !== "live";
    const test = await TestModel.findOneAndUpdate({ id }, payload, { new: true });
    if (test) {
      const nowTime = new Date().getTime();
      const startTime = test.start_time ? new Date(test.start_time).getTime() : 0;
      const isUpcomingTest = startTime && nowTime < startTime;

      if (isNowLive && !isUpcomingTest) {
        try {
          const query = test.class ? { class: test.class } : {};
          const students = await StudentModel.find(query);
          for (const student of students) {
            await NotificationModel.create({
              user_id: student.userId,
              message: `A new test '${test.name}' is now live! Attempt it before it ends.`,
              type: "test_live",
              test_id: test.id,
              test_name: test.name,
              organization_id: test.organization_id || student.organization_id
            });
          }
        } catch (err) {
          console.error("Failed to create live test notification:", err);
        }
      }
      json(response, 200, { success: true, data: test });
    } else {
      json(response, 404, { success: false, message: "Test not found" });
    }
  } catch (e: any) {
    console.error("Error in updateTest:", e);
    json(response, 400, { success: false, message: e.message || "Invalid JSON body" });
  }
};

export const deleteTest = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Forbidden: Only admins can manage tests" });
    return;
  }
  try {
    const existingTest = await TestModel.findOne({ id });
    if (!existingTest) {
      json(response, 404, { success: false, message: "Test not found" });
      return;
    }

    const now = new Date().getTime();
    const start = existingTest.start_time ? new Date(existingTest.start_time).getTime() : 0;
    const hasStarted = (existingTest.status === "live" || existingTest.status === "scheduled") && (!start || now >= start);
    if (hasStarted) {
      json(response, 400, { success: false, message: "Cannot delete a test that has already started" });
      return;
    }

    const result = await TestModel.deleteOne({ id });
    if (result.deletedCount > 0) {
      await QuestionModel.deleteMany({ test_id: id });
      json(response, 200, { success: true, message: "Test deleted successfully" });
    } else {
      json(response, 404, { success: false, message: "Test not found" });
    }
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const shareResults = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Forbidden: Only admins can manage tests" });
    return;
  }
  try {
    const test = await TestModel.findOne({ id });
    if (!test) {
      json(response, 404, { success: false, message: "Test not found" });
      return;
    }

    if (test.results_shared) {
      json(response, 400, { success: false, message: "Results already shared" });
      return;
    }

    await performShareResults(id);
    const updatedTest = await TestModel.findOne({ id });

    json(response, 200, { success: true, data: updatedTest });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error sharing results" });
  }
};

export const bulkCreateTestFromCsv = async (request: IncomingMessage, response: ServerResponse) => {
  if (!checkRole(request, ["Admin"])) {
    json(response, 403, { success: false, message: "Forbidden: Only admins can manage tests" });
    return;
  }
  try {
    const body = JSON.parse(await readBody(request));
    const { name, total_time, correct_marks, wrong_marks, unattempt_marks, type, class: className, status, questions, total_questions, start_time, end_time } = body;

    if (!name || !total_time || !correct_marks || !questions || !Array.isArray(questions)) {
      json(response, 400, { success: false, message: "Missing required fields or invalid questions list" });
      return;
    }

    const testId = `test-${Date.now()}`;
    const questionIds: string[] = [];
    const subjectsSet = new Set<string>();
    const subjectIdsSet = new Set<string>();
    const topicsSet = new Set<string>();
    const subTopicsSet = new Set<string>();
    let difficulty = "easy"; // default difficulty

    const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Keep track of counts for generating unique IDs and summary
    let subjectCount = await SubjectModel.countDocuments();
    let topicCount = await TopicModel.countDocuments();
    let subTopicCount = await SubTopicModel.countDocuments();

    let totalRows = questions.length;
    let newSubjects = 0;
    let newTopics = 0;
    let newSubTopics = 0;
    let newQuestions = 0;
    let reusedQuestions = 0;
    let failedRows = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const {
        question,
        option1,
        option2,
        option3,
        option4,
        correct_option,
        difficulty: qDiff,
        class: qClass,
        topic: qTopicName,
        sub_topic: qSubTopicName,
        subject: qSubjectName
      } = q;

      // Row Validation
      const rowErrors: string[] = [];
      if (!question || !question.trim()) {
        rowErrors.push("Question is required");
      }
      if (!correct_option || !correct_option.trim()) {
        rowErrors.push("Correct option is required");
      }
      if (!qSubjectName || !qSubjectName.trim()) {
        rowErrors.push("Subject is required");
      }
      if (!option1 || !option1.trim()) {
        rowErrors.push("Option 1 is required");
      }
      if (!option2 || !option2.trim()) {
        rowErrors.push("Option 2 is required");
      }

      let resolvedCorrectOption = "";
      if (rowErrors.length === 0) {
        const coTrim = correct_option.trim().toLowerCase();
        const optVal1 = (option1 || "").trim().toLowerCase();
        const optVal2 = (option2 || "").trim().toLowerCase();
        const optVal3 = (option3 || "").trim().toLowerCase();
        const optVal4 = (option4 || "").trim().toLowerCase();

        if (["option1", "option2", "option3", "option4"].includes(coTrim)) {
          resolvedCorrectOption = coTrim;
        } else if (coTrim === "a") {
          resolvedCorrectOption = "option1";
        } else if (coTrim === "b") {
          resolvedCorrectOption = "option2";
        } else if (coTrim === "c") {
          resolvedCorrectOption = "option3";
        } else if (coTrim === "d") {
          resolvedCorrectOption = "option4";
        } else if (coTrim === optVal1) {
          resolvedCorrectOption = "option1";
        } else if (coTrim === optVal2) {
          resolvedCorrectOption = "option2";
        } else if (coTrim === optVal3 && optVal3) {
          resolvedCorrectOption = "option3";
        } else if (coTrim === optVal4 && optVal4) {
          resolvedCorrectOption = "option4";
        } else {
          rowErrors.push(`Correct option "${correct_option}" does not match A, B, C, D or any of the provided options`);
        }
      }

      if (rowErrors.length > 0) {
        failedRows++;
        errors.push({ row: i + 2, error: rowErrors.join(", ") });
        continue;
      }

      // Default Topic and Subtopic names to "General" if not provided
      const topicName = (qTopicName && qTopicName.trim()) ? qTopicName.trim() : "General";
      const subTopicName = (qSubTopicName && qSubTopicName.trim()) ? qSubTopicName.trim() : "General";

      // Split subject by commas to support multiple subjects
      const subjectParts = qSubjectName.split(",").map((s: string) => s.trim()).filter(Boolean);
      if (subjectParts.length === 0) {
        failedRows++;
        errors.push({ row: i + 2, error: "Subject is required" });
        continue;
      }

      let firstQId = "";

      for (let subIndex = 0; subIndex < subjectParts.length; subIndex++) {
        const subName = subjectParts[subIndex];

        // 1. Resolve Subject
        let subjectDoc = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${escapeRegex(subName)}$`, "i") } });
        if (!subjectDoc) {
          subjectCount++;
          subjectDoc = new SubjectModel({
            id: `sub-${subjectCount}`,
            name: subName
          });
          await subjectDoc.save();
          newSubjects++;
        }
        subjectsSet.add(subjectDoc.name);
        subjectIdsSet.add(subjectDoc.id);
        const subject_id = subjectDoc.id;

        // 2. Resolve Topic
        let topicDoc = await TopicModel.findOne({
          subject_id,
          name: { $regex: new RegExp(`^${escapeRegex(topicName)}$`, "i") }
        });
        if (!topicDoc) {
          topicCount++;
          topicDoc = new TopicModel({
            id: `topic-${Date.now()}-${topicCount}`,
            name: topicName,
            subject_id
          });
          await topicDoc.save();
          newTopics++;
        }
        topicsSet.add(topicDoc.id);
        const topic_id = topicDoc.id;

        // 3. Resolve SubTopic
        let subTopicDoc = await SubTopicModel.findOne({
          topic_id,
          name: { $regex: new RegExp(`^${escapeRegex(subTopicName)}$`, "i") }
        });
        if (!subTopicDoc) {
          subTopicCount++;
          subTopicDoc = new SubTopicModel({
            id: `subtopic-${Date.now()}-${subTopicCount}`,
            name: subTopicName,
            topic_id
          });
          await subTopicDoc.save();
          newSubTopics++;
        }
        subTopicsSet.add(subTopicDoc.id);
        const sub_topic_id = subTopicDoc.id;

        // Class and difficulty default fallback
        const cleanClass = qClass || className || "Class 10";
        const cleanDiff = qDiff ? qDiff.toLowerCase().trim() : "easy";
        if (cleanDiff === "medium" || cleanDiff === "hard") {
          difficulty = cleanDiff;
        }

        // 4. Resolve Question (check if it already exists under this topic to prevent duplicates)
        let questionDoc = await QuestionModel.findOne({
          question: { $regex: new RegExp(`^${escapeRegex(question.trim())}$`, "i") },
          topic_id
        });

        if (!questionDoc) {
          const qId = `q-csv-${testId}-${Date.now()}-${i}-${subIndex}`;
          questionDoc = new QuestionModel({
            id: qId,
            question: question.trim(),
            option1: option1.trim(),
            option2: option2.trim(),
            option3: option3 ? option3.trim() : "",
            option4: option4 ? option4.trim() : "",
            correct_option: resolvedCorrectOption,
            difficulty: cleanDiff,
            class: cleanClass,
            topic_id,
            sub_topic_id,
            test_id: testId
          });
          await questionDoc.save();
          newQuestions++;
        } else {
          reusedQuestions++;
        }

        // Only add the first subject's question ID to prevent duplicate questions in the test itself
        if (subIndex === 0) {
          firstQId = questionDoc.id;
        }
      }

      if (firstQId) {
        questionIds.push(firstQId);
      }
    }

    if (questionIds.length === 0) {
      json(response, 400, {
        success: false,
        message: "No valid questions were resolved from the CSV",
        errors
      });
      return;
    }

    const testSubjectNames = Array.from(subjectsSet);
    const resolvedSubject = testSubjectNames.length === 1 ? testSubjectNames[0] : testSubjectNames;
    const cleanStatus = status === "live" ? "live" : "draft";

    let sections = body.sections;
    if (sections && Array.isArray(sections) && sections.length > 0) {
      sections = await distributeQuestionsIntoSections(questionIds, sections);
    }

    const testDifficulty = await calculateTestDifficulty(questionIds, difficulty);
    const newTest = new TestModel({
      id: testId,
      name,
      type: type || "practice",
      subject: resolvedSubject,
      subject_id: Array.from(subjectIdsSet)[0] || undefined,
      subject_ids: Array.from(subjectIdsSet),
      topics: Array.from(topicsSet),
      sub_topics: Array.from(subTopicsSet),
      correct_marks: Number(correct_marks),
      wrong_marks: Number(wrong_marks || 0),
      unattempt_marks: Number(unattempt_marks || 0),
      difficulty: testDifficulty,
      total_time: Number(total_time),
      total_marks: Number(correct_marks) * (total_questions !== undefined && total_questions !== null && !isNaN(Number(total_questions)) && Number(total_questions) > 0 ? Number(total_questions) : questionIds.length),
      total_questions: total_questions !== undefined && total_questions !== null && !isNaN(Number(total_questions)) && Number(total_questions) > 0 ? Number(total_questions) : questionIds.length,
      status: cleanStatus,
      questions: questionIds,
      sections,
      created_at: new Date(),
      class: className || questions[0]?.class || "Class 10",
      start_time,
      end_time
    });

    await newTest.save();

    const nowTime = new Date().getTime();
    const startTime = newTest.start_time ? new Date(newTest.start_time).getTime() : 0;
    const isUpcomingTest = startTime && nowTime < startTime;

    if (newTest.status === "live" && !isUpcomingTest) {
      try {
        const query = newTest.class ? { class: newTest.class } : {};
        const students = await StudentModel.find(query);
        for (const student of students) {
          await NotificationModel.create({
            user_id: student.userId,
            message: `A new test '${newTest.name}' is now live! Attempt it before it ends.`,
            type: "test_live",
            test_id: newTest.id,
            test_name: newTest.name,
            organization_id: newTest.organization_id || student.organization_id
          });
        }
      } catch (err) {
        console.error("Failed to create live test notification:", err);
      }
    }

    json(response, 201, {
      success: true,
      data: newTest,
      summary: {
        totalRows,
        newSubjects,
        newTopics,
        newSubTopics,
        newQuestions,
        reusedQuestions,
        failedRows
      },
      errors
    });
  } catch (e) {
    console.error("Error bulk creating test from CSV:", e);
    json(response, 500, { success: false, message: "Server error during test import" });
  }
};
