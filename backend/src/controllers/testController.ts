import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import { checkRole } from "../middlewares/auth.js";
import { TestModel, ResultModel, StudentModel, QuestionModel, NotificationModel } from "../models/index.js";
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
    if (newTest.status === "live") {
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
    if (existingTest.status === "live" && start && now >= start) {
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
      if (isNowLive) {
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
    if (existingTest.status === "live" && start && now >= start) {
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
