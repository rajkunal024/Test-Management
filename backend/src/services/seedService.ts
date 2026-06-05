import {
  QuestionModel,
  StudentModel,
  TeacherModel,
  AdminModel,
  ResultModel,
  TestModel,
} from "../models/index.js";
import { hashPassword } from "../utils/crypto.js";

export const seedDatabase = async () => {
  try {


    // Migrate existing users with plain-text passwords to hashed passwords
    const admins = await AdminModel.find({});
    for (const admin of admins) {
      if (admin.password && !admin.password.includes(":")) {
        admin.password = hashPassword(admin.password);
        await admin.save();
        console.log(`Migrated Admin ${admin.userId} password to hash.`);
      }
    }

    const teachers = await TeacherModel.find({});
    for (const teacher of teachers) {
      if (teacher.password && !teacher.password.includes(":")) {
        teacher.password = hashPassword(teacher.password);
        await teacher.save();
        console.log(`Migrated Teacher ${teacher.userId} password to hash.`);
      }
    }

    const students = await StudentModel.find({});
    for (const student of students) {
      let updated = false;
      if (student.password && !student.password.includes(":")) {
        student.password = hashPassword(student.password);
        updated = true;
        console.log(`Migrated Student ${student.userId} password to hash.`);
      }
      if (!student.class) {
        student.class = "Class 10";
        updated = true;
        console.log(`Migrated Student ${student.userId} class to Class 10.`);
      }
      if (updated) {
        await student.save();
      }
    }

    const testsToMigrate = await TestModel.find({});
    for (const test of testsToMigrate) {
      if (!test.class) {
        test.class = "Class 10";
        await test.save();
        console.log(`Migrated Test ${test.name} class to Class 10.`);
      }
    }

    const questionsToMigrate = await QuestionModel.find({});
    for (const q of questionsToMigrate) {
      if (!q.class) {
        q.class = "Class 10";
        await q.save();
      }
    }

    // Migrate existing attempts in the database that have all questions in test_copy instead of the subset
    const attempts = await ResultModel.find({});
    for (const attempt of attempts) {
      const test = await TestModel.findOne({ id: attempt.test_id });
      if (test && attempt.test_copy && attempt.test_copy.length > test.total_questions) {
        console.log(`Cleaning up attempt database record for student ${attempt.user_id} on test ${test.name} (length ${attempt.test_copy.length} -> ${test.total_questions})`);
        
        const baseQuestions = attempt.test_copy;
        const sortedQuestions = [...baseQuestions].sort((a: any, b: any) => (a.id || "").localeCompare(b.id || ""));
        const seed = `${attempt.user_id}-${test.id}`;
        
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

        const subset = getDeterministicSubset(sortedQuestions, test.total_questions, seed);
        
        attempt.set("test_copy", subset);
        await attempt.save();
        console.log(`Successfully migrated attempt database record.`);
      }
    }

    // Initialize tab_switches for legacy attempts
    const result = await ResultModel.updateMany(
      { tab_switches: { $exists: false } },
      { $set: { tab_switches: 0 } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Initialized tab_switches field for ${result.modifiedCount} legacy attempts.`);
    }
  } catch (err) {
    console.error("Seeding error:", err);
  }
};
