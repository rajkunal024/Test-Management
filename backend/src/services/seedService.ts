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


    const isAlreadyHashed = (pwd: string) => {
      if (!pwd) return false;
      if (pwd.includes(":")) return true;
      if (pwd.startsWith("$2a$") || pwd.startsWith("$2b$") || pwd.startsWith("$2y$")) return true;
      return false;
    };

    // Migrate existing users with plain-text passwords to hashed passwords
    const admins = await AdminModel.find({});
    for (const admin of admins) {
      let updated = false;
      if (admin.password && !isAlreadyHashed(admin.password)) {
        admin.password = hashPassword(admin.password);
        updated = true;
        console.log(`Migrated Admin ${admin.userId} password to hash.`);
      }
      const usernameDefault = `${admin.userId.toLowerCase()}@parikshya.admin.com`;
      const legacyUsernameDefault = `${admin.userId.toLowerCase()}@admin.com`;
      const nameStr = admin.name || admin.userId || "admin";
      const namePrefix = nameStr.toLowerCase().replace(/\s+/g, "");
      const nameDefault = namePrefix.includes("@") ? namePrefix : `${namePrefix}@parikshya.admin.com`;

      if (
        !(admin as any).email || 
        (admin as any).email === usernameDefault || 
        (admin as any).email === legacyUsernameDefault ||
        (admin as any).email.endsWith("@admin.com")
      ) {
        (admin as any).email = nameDefault;
        updated = true;
        console.log(`Migrated Admin ${admin.userId} email to ${(admin as any).email}.`);
      }
      if (updated) {
        await admin.save();
      }
    }

    const teachers = await TeacherModel.find({});
    for (const teacher of teachers) {
      let updated = false;
      if (teacher.password && !isAlreadyHashed(teacher.password)) {
        teacher.password = hashPassword(teacher.password);
        updated = true;
        console.log(`Migrated Teacher ${teacher.userId} password to hash.`);
      }
      if (teacher.gender !== "Female") {
        teacher.gender = "Female";
        updated = true;
        console.log(`Migrated Teacher ${teacher.userId} gender to Female.`);
      }
      if (updated) {
        await teacher.save();
      }
    }

    const students = await StudentModel.find({});
    for (const student of students) {
      let updated = false;
      if (student.password && !isAlreadyHashed(student.password)) {
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

    // Migrate student joined_at using $exists check to bypass Mongoose default behavior
    const legacyStudents = await StudentModel.find({ joined_at: { $exists: false } });
    for (const student of legacyStudents) {
      student.joined_at = student._id.getTimestamp();
      await student.save();
      console.log(`Migrated Student ${student.userId} joined_at to ${student._id.getTimestamp()}.`);
    }

    const testsToMigrate = await TestModel.find({});
    for (const test of testsToMigrate) {
      let updated = false;
      if (!test.class) {
        test.class = "Class 10";
        updated = true;
        console.log(`Migrated Test ${test.name} class to Class 10.`);
      }

      // Calculate dynamic test difficulty based on questions
      const questionIds = test.questions || [];
      const questionDocs = await QuestionModel.find({ id: { $in: questionIds } });
      const total = questionDocs.length;
      let targetDifficulty = test.difficulty || "medium";

      if (total > 0) {
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
          targetDifficulty = "hard";
        } else if (hardCount > 0) {
          targetDifficulty = "medium";
        } else if (mediumCount > 0.5 * total) {
          targetDifficulty = "medium";
        } else if (easyCount > 0.5 * total) {
          targetDifficulty = "easy";
        } else {
          targetDifficulty = "medium";
        }
      }

      if (test.difficulty !== targetDifficulty) {
        test.difficulty = targetDifficulty;
        updated = true;
        console.log(`Updated Test ${test.name} difficulty to ${targetDifficulty} based on dynamic calculation.`);
      }

      if (updated) {
        await test.save();
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
