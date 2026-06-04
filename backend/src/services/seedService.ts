import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  SubjectModel,
  TopicModel,
  SubTopicModel,
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
    const dbPath = join(process.cwd(), "src", "db.json");
    let seedData: any = { subjects: [], topics: [], sub_topics: [], tests: [], questions: [] };
    if (existsSync(dbPath)) {
      seedData = JSON.parse(readFileSync(dbPath, "utf-8"));
    }

    const subjectsCount = await SubjectModel.countDocuments();
    if (subjectsCount === 0 && seedData.subjects?.length > 0) {
      await SubjectModel.insertMany(seedData.subjects);
      console.log("Seeded subjects.");
    }

    const topicsCount = await TopicModel.countDocuments();
    if (topicsCount === 0 && seedData.topics?.length > 0) {
      await TopicModel.insertMany(seedData.topics);
      console.log("Seeded topics.");
    }

    const subTopicsCount = await SubTopicModel.countDocuments();
    if (subTopicsCount === 0 && seedData.sub_topics?.length > 0) {
      await SubTopicModel.insertMany(seedData.sub_topics);
      console.log("Seeded sub-topics.");
    }

    const questionsCount = await QuestionModel.countDocuments();
    if (questionsCount === 0 && seedData.questions?.length > 0) {
      await QuestionModel.insertMany(seedData.questions);
      console.log("Seeded questions.");
    }

    const studentCount = await StudentModel.countDocuments();
    if (studentCount === 0) {
      await StudentModel.create({
        userId: "student",
        password: hashPassword("student"),
        name: "Student User",
        role: "Student",
        email: "student@preproute.com",
        dob: "2005-01-01",
        results: []
      });
      console.log("Seeded student account.");
    }

    const teacherCount = await TeacherModel.countDocuments();
    if (teacherCount === 0) {
      await TeacherModel.insertMany([
        { userId: "math_teacher", password: hashPassword("teacher"), name: "Math Teacher", role: "Teacher", subject: "Mathematics", email: "math_teacher@preproute.com", dob: "1985-05-15" },
        { userId: "physics_teacher", password: hashPassword("teacher"), name: "Physics Teacher", role: "Teacher", subject: "Physics", email: "physics_teacher@preproute.com", dob: "1988-08-20" },
        { userId: "chemistry_teacher", password: hashPassword("teacher"), name: "Chemistry Teacher", role: "Teacher", subject: "Chemistry", email: "chemistry_teacher@preproute.com", dob: "1990-10-10" }
      ]);
      console.log("Seeded teacher accounts.");
    }

    const adminCount = await AdminModel.countDocuments();
    if (adminCount === 0) {
      await AdminModel.create({
        userId: "vedant-admin",
        password: hashPassword("vedant123"),
        name: "Vedant Admin",
        role: "Admin"
      });
      console.log("Seeded default admin account.");
    }

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
      if (student.password && !student.password.includes(":")) {
        student.password = hashPassword(student.password);
        await student.save();
        console.log(`Migrated Student ${student.userId} password to hash.`);
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
  } catch (err) {
    console.error("Seeding error:", err);
  }
};
