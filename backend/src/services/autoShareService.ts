import { TestModel, ResultModel, StudentModel, NotificationModel, QuestionModel } from "../models/index.js";
import { performShareResults } from "./shareService.js";

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

const getSectionalQuestions = <T extends { id?: string }>(
  test: any,
  sortedQuestions: T[],
  seed: string
): T[] => {
  if (test.sections && test.sections.length > 0) {
    const selected: T[] = [];
    const usedIds = new Set<string>();

    test.sections.forEach((sec: any) => {
      const secQuestionIds = new Set(sec.questions || []);
      const secAllQuestions = sortedQuestions.filter(q => q.id && secQuestionIds.has(q.id) && !usedIds.has(q.id));
      const secCount = Number(sec.questions_count ?? secAllQuestions.length);
      const secSelected = getDeterministicSubset(secAllQuestions, secCount, seed + "-" + sec.name);
      
      secSelected.forEach((q) => {
        if (q.id && !usedIds.has(q.id)) {
          selected.push(q);
          usedIds.add(q.id);
        }
      });
    });

    return selected;
  }

  return getDeterministicSubset(sortedQuestions, test.total_questions, seed);
};

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

    for (const student of students) {
      const attempt = await ResultModel.findOne({ test_id: testId, user_id: student.userId });
      const graceLimitMins = Number(test.graceTime ?? 0);
      const maxEndTimeMs = startTimeMs + (graceLimitMins * 60 * 1000) + durationMs;

      if (!attempt) {
        // Did not attempt. We must wait if they could still start/write.
        if (now < maxEndTimeMs) {
          return;
        }
      } else if (attempt.status === "draft") {
        // Unfinished draft attempt. If writing window expired, auto-submit.
        if (now >= maxEndTimeMs) {
          console.log(`Auto-submitting draft attempt for student '${student.userId}' on test '${testId}'...`);
          
          // Re-calculate results based on already saved answers to be 100% robust
          const answersObj: Record<string, string> = {};
          if (attempt.answers) {
            if (attempt.answers instanceof Map) {
              attempt.answers.forEach((val: string, key: string) => {
                answersObj[key] = val;
              });
            } else {
              Object.assign(answersObj, attempt.answers);
            }
          }

          const rawQuestions = await QuestionModel.find({ id: { $in: test.questions || [] } });
          const sortedQuestions = [...rawQuestions].sort((a: any, b: any) => (a.id || "").localeCompare(b.id || ""));
          const seed = `${student.userId}-${test.id}`;
          const questions = getSectionalQuestions(test, sortedQuestions, seed);

          let correct_answers = 0;
          let wrong_answers = 0;
          let unattempted = 0;
          let score = 0;

          const test_copy = questions.map((q: any) => ({
            id: q.id,
            type: q.type || "mcq",
            passage_id: q.passage_id || null,
            question: q.question,
            option1: q.option1,
            option2: q.option2,
            option3: q.option3,
            option4: q.option4,
            correct_option: q.correct_option,
            selected_option: answersObj[q.id ?? ""] || "",
            media_url: q.media_url,
            image_url: q.image_url
          }));

          questions.forEach((q: any) => {
            const selected = answersObj[q.id ?? ""];
            if (selected === undefined || selected === null || selected === "") {
              unattempted++;
              score += Number(test.unattempt_marks ?? 0);
            } else {
              const correctParts = (q.correct_option || "").split(",").map((o: string) => o.trim()).filter(Boolean).sort();
              const selectedParts = (selected || "").split(",").map((o: string) => o.trim()).filter(Boolean).sort();

              const isMatch = correctParts.length > 0 &&
                              selectedParts.length === correctParts.length &&
                              selectedParts.every((val: string, index: number) => val === correctParts[index]);

              const isMSQ = (q.correct_option || "").includes(",");

              if (isMatch) {
                correct_answers++;
                score += Number(test.correct_marks ?? 0);
              } else {
                wrong_answers++;
                if (isMSQ) {
                  score += 0;
                } else {
                  const penalty = Number(test.wrong_marks ?? 0);
                  score += penalty < 0 ? penalty : -penalty;
                }
              }
            }
          });

          attempt.score = score;
          attempt.correct_answers = correct_answers;
          attempt.wrong_answers = wrong_answers;
          attempt.unattempted = unattempted;
          attempt.test_copy = test_copy as any;
          attempt.status = "submitted";
          (attempt as any).submission_type = "Auto Submission";
          attempt.submitted_at = new Date();
          await attempt.save();

          // Create notification for student
          await NotificationModel.create({
            user_id: student.userId,
            message: `Your test '${test.name}' was automatically submitted because the writing window expired.`,
            type: "test_submitted",
            test_id: test.id,
            test_name: test.name,
            organization_id: test.organization_id
          });
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
  // Check every 60 seconds (every minute)
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
  }, 60000);
};
