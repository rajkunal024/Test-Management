import { TestModel } from "../models/index.js";
import { performShareResults } from "./shareService.js";

export const startAutoShareJob = () => {
  // Check every 30 seconds
  setInterval(async () => {
    try {
      const now = new Date().getTime();
      // Find tests that are live or scheduled and results are not shared yet
      const candidates = await TestModel.find({
        status: { $in: ["live", "scheduled"] },
        results_shared: { $ne: true }
      });

      for (const test of candidates) {
        if (!test.end_time) continue;
        const end = new Date(test.end_time).getTime();
        if (!isNaN(end) && end <= now) {
          console.log(`Auto-sharing results for test '${test.name}' (ended at ${test.end_time})`);
          await performShareResults(test.id);
        }
      }
    } catch (err) {
      console.error("Auto-share background check failed:", err);
    }
  }, 30000);
};

