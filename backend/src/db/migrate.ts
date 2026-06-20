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
  NotificationModel
} from "../models/index.js";
import { hashPassword } from "../utils/crypto.js";

// Tiny helper to load .env since we run this script directly
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
  const defaultOrgId = "tester";
  let defaultOrg = await OrganizationModel.findOne({ id: defaultOrgId });
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
    console.log("Default Organization 'tester' already exists.");
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

  // 3. Migrate all existing collections to have organization_id
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

  console.log("Starting data migration for multi-tenancy...");
  for (const col of collectionsToMigrate) {
    console.log(`Migrating missing organization_ids in collection: ${col.name}...`);
    const result = await col.model.updateMany(
      { organization_id: { $exists: false } },
      { $set: { organization_id: defaultOrgId } }
    );
    console.log(`- Matched and updated: ${result.modifiedCount} documents in ${col.name}.`);
  }

  console.log("Migration and Seeding completed successfully.");
  await mongoose.disconnect();
  console.log("Disconnected from database.");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
