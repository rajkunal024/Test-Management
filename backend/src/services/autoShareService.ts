import { TestModel, ResultModel, StudentModel } from "../models/index.js";
import { performShareResults } from "./shareService.js";

export const checkAndShareResults = async (testId: string) => {
  try {
    const test = await TestModel.findOne({ id: testId });
    if (!test) return;

    if (test.results_shared) return;

    // Check if start_time is set
    if (!test.start_time) return;

    const startTimeMs = new Date(test.start_time).getTime();
    const durationMs = Number(test.total_time || 0) * 60 * 1000;
    const officialEndTimeMs = startTimeMs + durationMs;
    const now = Date.now();

    // 1. Check if official timeslot has completed (timeslot completed == true)
    if (now < officialEndTimeMs) {
      return;
    }

    // 2. Check if all assigned students have completed or their entry window has expired
    const query = test.class ? { class: test.class } : {};
    const students = await StudentModel.find(query);

    const lateLimitMins = Number(test.lateEntryTime ?? 0);
    const lateCutoffMs = startTimeMs + (lateLimitMins * 60 * 1000);

    for (const student of students) {
      const attempt = await ResultModel.findOne({ test_id: testId, user_id: student.userId });
      const maxEndTimeMs = startTimeMs + (10 * 60 * 1000) + durationMs;

      if (!attempt) {
        // Did not attempt. We must wait if they could still start/write.
        if (now < maxEndTimeMs) {
          return;
        }
      } else if (attempt.status === "draft") {
        // Unfinished draft attempt. If writing window expired, auto-submit.
        if (now >= maxEndTimeMs) {
          console.log(`Auto-submitting draft attempt for student '${student.userId}' on test '${testId}'...`);
          attempt.status = "submitted";
          attempt.submitted_at = new Date();
          await attempt.save();
        } else {
          // Bounded writing window still active. Wait.
          return;
        }
      }
    }

    // Both conditions met -> Share results!
    console.log(`Auto-share conditions met for test '${test.name}' (${test.id}). Sharing results...`);
    await performShareResults(testId);
  } catch (err) {
    console.error(`Error in checkAndShareResults for test ${testId}:`, err);
  }
};

export const startAutoShareJob = () => {
  // Check every 30 seconds
  setInterval(async () => {
    try {
      const activeTests = await TestModel.find({
        results_shared: false,
        start_time: { $exists: true, $ne: null }
      });

      for (const test of activeTests) {
        await checkAndShareResults(test.id);
      }
    } catch (err) {
      console.error("Error in startAutoShareChecker interval loop:", err);
    }
  }, 30000);
};
