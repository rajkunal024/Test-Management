import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { checkRole } from "../middlewares/auth.js";
import { TestModel, ResultModel, StudentModel, QuestionModel, NotificationModel, SubjectModel, TopicModel, SubTopicModel } from "../models/index.js";
import { performShareResults } from "../services/shareService.js";

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
    if (payload.start_time && payload.end_time) {
      const start = new Date(payload.start_time).getTime();
      const end = new Date(payload.end_time).getTime();
      if (end < start) {
        json(response, 400, { success: false, message: "End time slot cannot be earlier than start time slot" });
        return;
      }
    }
    const newTest = new TestModel({
      id: `test-${Date.now()}`,
      ...payload,
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
            test_name: newTest.name
          });
        }
      } catch (err) {
        console.error("Failed to create live test notification:", err);
      }
    }
    json(response, 201, { success: true, data: newTest });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
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
    if (payload.start_time && payload.end_time) {
      const start = new Date(payload.start_time).getTime();
      const end = new Date(payload.end_time).getTime();
      if (end < start) {
        json(response, 400, { success: false, message: "End time slot cannot be earlier than start time slot" });
        return;
      }
    }
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
              test_name: test.name
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
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
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
      difficulty,
      total_time: Number(total_time),
      total_marks: Number(correct_marks) * (total_questions !== undefined && total_questions !== null && !isNaN(Number(total_questions)) && Number(total_questions) > 0 ? Number(total_questions) : questionIds.length),
      total_questions: total_questions !== undefined && total_questions !== null && !isNaN(Number(total_questions)) && Number(total_questions) > 0 ? Number(total_questions) : questionIds.length,
      status: cleanStatus,
      questions: questionIds,
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
            test_name: newTest.name
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
