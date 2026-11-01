import mongoose from "mongoose";
import { connectDB } from "./index.js";
import {
  OrganizationModel,
  ParikshyaAdminModel,
  SubjectModel,
  TopicModel,
  SubTopicModel,
  TeacherModel,
  StudentModel,
  AdminModel,
  PassageModel,
  QuestionModel,
  ResultModel,
  TestModel,
  NotificationModel,
  SessionModel,
  ClassModel
} from "../models/index.js";
import { hashPassword } from "../utils/crypto.js";

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const loadEnv = () => {
  const envPath = join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const index = trimmed.indexOf("=");
          if (index !== -1) {
            const key = trimmed.substring(0, index).trim();
            const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, "");
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn("Could not read .env file:", e);
    }
  }
};
loadEnv();

const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/parikshya";

async function runMigration() {
  console.log("Connecting to database at:", mongoUri);
  await connectDB(mongoUri);
  console.log("Connected successfully to database.");

  // 1. Seed Default Organization
  let defaultOrgId = "tester";
  let defaultOrg = await OrganizationModel.findOne({ $or: [{ id: defaultOrgId }, { code: "TESTER" }] });
  if (!defaultOrg) {
    console.log("Default Organization 'tester' not found. Creating...");
    defaultOrg = new OrganizationModel({
      id: defaultOrgId,
      name: "tester",
      code: "TESTER",
      logo: "",
      contactEmail: "admin@examportal.com",
      phone: "+1-123-456-7890",
      address: "123 Main St, Tech City",
      status: "Active",
      securityFeatures: {
        cameraMonitoring: true,
        microphoneMonitoring: true,
        fullscreenMode: true,
        tabSwitchingDetection: true,
        screenSharingDetection: true,
        copyPasteDisabled: true,
        rightClickDisabled: true,
        developerToolsDetection: true,
        multipleMonitorDetection: true,
        faceDetection: true,
        browserLock: true,
        autoSave: true,
        screenRecordingDetection: true,
        printDisabled: true
      }
    });
    await defaultOrg.save();
    console.log("Created Default Organization: tester");
  } else {
    defaultOrgId = defaultOrg.id;
    console.log(`Default Organization '${defaultOrg.name}' already exists with ID: ${defaultOrgId}`);
  }

  // 2. Seed Default Parikshya Admin
  const parikshyaAdminEmail = "admin@parikshya.com";
  let parikshyaAdmin = await ParikshyaAdminModel.findOne({ email: parikshyaAdminEmail });
  if (!parikshyaAdmin) {
    console.log("Parikshya Admin user not found. Seeding...");
    parikshyaAdmin = new ParikshyaAdminModel({
      id: "parikshya-admin-1",
      email: parikshyaAdminEmail,
      password: hashPassword("ParikshyaAdmin123!"),
      name: "Parikshya Admin User",
      role: "PARIKSHYA_ADMIN"
    });
    await parikshyaAdmin.save();
    console.log("Parikshya Admin seeded successfully.");
  } else {
    console.log("Parikshya Admin already exists.");
  }

  // 3. Seed Default Academic Session
  const sessionCount = await SessionModel.countDocuments({ organization_id: defaultOrgId });
  if (sessionCount === 0) {
    await SessionModel.create({
      id: `session-${defaultOrgId}-1`,
      name: "2026-2027",
      isCurrent: true,
      organization_id: defaultOrgId
    });
    console.log("Seeded default academic session: 2026-2027.");
  }

  // 4. Seed Default Subjects
  console.log("Checking default subjects...");
  const defaultSubjects = [
    { id: "sub-math", name: "Mathematics", organization_id: defaultOrgId },
    { id: "sub-cs", name: "Computer Science", organization_id: defaultOrgId },
    { id: "sub-dsa", name: "DSA", organization_id: defaultOrgId },
    { id: "sub-oops", name: "OOPS", organization_id: defaultOrgId },
    { id: "sub-physics", name: "Physics", organization_id: defaultOrgId },
    { id: "sub-chem", name: "Chemistry", organization_id: defaultOrgId },
    { id: "sub-eng", name: "English", organization_id: defaultOrgId }
  ];
  for (const sub of defaultSubjects) {
    const exists = await SubjectModel.findOne({ id: sub.id, organization_id: defaultOrgId });
    if (!exists) {
      await SubjectModel.create(sub);
    }
  }

  // 5. Seed Default Faculty / Teachers
  console.log("Checking default faculty accounts...");
  const defaultTeachers = [
    {
      userId: "teacher1",
      name: "Aqsa Teacher",
      email: "teacher1@tester.teacher.com",
      password: hashPassword("abc123"),
      subject: "DSA",
      subjects: ["DSA", "OOPS"],
      dob: "1990-01-10",
      gender: "Female",
      organization_id: defaultOrgId
    },
    {
      userId: "teacher2",
      name: "David Miller",
      email: "teacher2@tester.teacher.com",
      password: hashPassword("abc123"),
      subject: "Mathematics",
      subjects: ["Mathematics"],
      dob: "1988-03-22",
      gender: "Male",
      organization_id: defaultOrgId
    }
  ];
  for (const t of defaultTeachers) {
    const exists = await TeacherModel.findOne({ userId: t.userId, organization_id: defaultOrgId });
    if (!exists) {
      await TeacherModel.create(t);
    }
  }

  // 6. Seed Default Students
  console.log("Checking default student accounts...");
  const defaultStudents = [
    {
      userId: "student1",
      name: "Ben Student",
      email: "student1@tester.student.com",
      password: hashPassword("abc123"),
      class: "Semester 1",
      semester: 1,
      session: "2026-2027",
      dob: "2002-05-15",
      gender: "Male",
      organization_id: defaultOrgId
    },
    {
      userId: "student2",
      name: "Alice Johnson",
      email: "student2@tester.student.com",
      password: hashPassword("abc123"),
      class: "Semester 1",
      semester: 1,
      session: "2026-2027",
      dob: "2003-08-20",
      gender: "Female",
      organization_id: defaultOrgId
    },
    {
      userId: "student3",
      name: "Charlie Brown",
      email: "student3@tester.student.com",
      password: hashPassword("abc123"),
      class: "Semester 1",
      semester: 1,
      session: "2026-2027",
      dob: "2003-11-12",
      gender: "Male",
      organization_id: defaultOrgId
    }
  ];
  for (const stu of defaultStudents) {
    const exists = await StudentModel.findOne({ userId: stu.userId, organization_id: defaultOrgId });
    if (!exists) {
      await StudentModel.create(stu);
    }
  }

  // 7. Seed Default Test Configurations
  console.log("Checking default test configurations...");
  const test1Exists = await TestModel.findOne({ id: "test-mock-1" });
  if (!test1Exists) {
    await TestModel.create({
      id: "test-mock-1",
      name: "tester-mock-test",
      type: "mcq",
      subject: "Mathematics",
      correct_marks: 4,
      wrong_marks: 1,
      unattempt_marks: 0,
      difficulty: "medium",
      total_time: 60,
      total_marks: 100,
      total_questions: 25,
      status: "completed",
      class: "Semester 1",
      organization_id: defaultOrgId,
      created_at: new Date()
    });
  }
  const test2Exists = await TestModel.findOne({ id: "test-mock-2" });
  if (!test2Exists) {
    await TestModel.create({
      id: "test-mock-2",
      name: "testing-test5",
      type: "mcq",
      subject: "Mathematics",
      correct_marks: 4,
      wrong_marks: 1,
      unattempt_marks: 0,
      difficulty: "hard",
      total_time: 45,
      total_marks: 80,
      total_questions: 20,
      status: "completed",
      class: "Semester 1",
      organization_id: defaultOrgId,
      created_at: new Date()
    });
  }

  // 8. Multi-tenant fallback for all collections
  const collectionsToMigrate = [
    { name: "Subject", model: SubjectModel },
    { name: "Topic", model: TopicModel },
    { name: "SubTopic", model: SubTopicModel },
    { name: "Teacher", model: TeacherModel },
    { name: "Student", model: StudentModel },
    { name: "Admin", model: AdminModel },
    { name: "Passage", model: PassageModel },
    { name: "Question", model: QuestionModel },
    { name: "Result", model: ResultModel },
    { name: "Test", model: TestModel },
    { name: "Notification", model: NotificationModel }
  ];

  for (const col of collectionsToMigrate) {
    await col.model.updateMany(
      { organization_id: { $exists: false } },
      { $set: { organization_id: defaultOrgId } }
    );
  }

  console.log("Database Seeding & Migration completed successfully!");
  await mongoose.disconnect();
  console.log("Disconnected from database.");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
