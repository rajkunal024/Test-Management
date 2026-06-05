import { TestModel, ResultModel, StudentModel, NotificationModel, QuestionModel } from "../models/index.js";

export const performShareResults = async (testId: string) => {
  try {
    const test = await TestModel.findOne({ id: testId });
    if (!test) return;

    if (test.results_shared) return;

    test.results_shared = true;
    await test.save();

    try {
      const query = test.class ? { class: test.class } : {};
      const students = await StudentModel.find(query);
      for (const student of students) {
        await NotificationModel.create({
          user_id: student.userId,
          message: `Results for test '${test.name}' have been declared. Check your scorecard.`,
          type: "result_declared",
          test_id: test.id,
          test_name: test.name
        });
      }
    } catch (err) {
      console.error("Failed to create result declaration notification:", err);
    }

    const attempts = await ResultModel.find({ test_id: testId });
    for (const result of attempts) {
      const student = await StudentModel.findOne({ userId: result.user_id });
      if (student) {
        // Ensure no duplicate result is pushed
        const alreadyExists = student.results.some(r => r.test_id === test.id);
        if (!alreadyExists) {
          student.results.push({
            test_id: test.id,
            test_name: test.name,
            score: result.score,
            total_marks: test.total_marks,
            submitted_at: result.submitted_at || new Date()
          });
          await student.save();
        }
      }
    }

    // Delete test questions from global bank
    await QuestionModel.deleteMany({ test_id: testId });

    console.log(`Results for test '${test.name}' (${test.id}) successfully shared.`);
  } catch (err) {
    console.error(`Error in performShareResults for test ${testId}:`, err);
  }
};
