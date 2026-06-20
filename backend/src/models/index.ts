import mongoose, { Schema } from "mongoose";
import { tenantContext } from "../utils/context.js";

// Global Mongoose Multi-Tenancy Plugin
mongoose.plugin((schema: any) => {
  // Intercept all queries and count actions to filter by tenant context organization_id
  schema.pre(['find', 'findOne', 'countDocuments', 'estimatedDocumentCount', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndUpdate', 'findOneAndDelete', 'replaceOne'], function(this: any, next: any) {
    const store = tenantContext.getStore();
    if (store && store.organization_id) {
      const modelName = this.model?.modelName;
      if (modelName !== "Organization" && modelName !== "ParikshyaAdmin") {
        const query = this.getQuery();
        if (query && query.organization_id === undefined) {
          this.where({ organization_id: store.organization_id });
        }
      }
    }
    next();
  });

  // Automatically assign organization_id to newly created documents
  schema.pre('validate', function(this: any, next: any) {
    const store = tenantContext.getStore();
    if (store && store.organization_id) {
      const modelName = this.constructor?.modelName;
      if (modelName !== "Organization" && modelName !== "ParikshyaAdmin") {
        if (!this.organization_id) {
          this.organization_id = store.organization_id;
        }
      }
    }
    next();
  });
});

export const OrganizationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  logo: { type: String, default: "" },
  contactEmail: { type: String, required: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  securityFeatures: {
    type: Map,
    of: Boolean,
    default: {
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
  },
  createdAt: { type: Date, default: Date.now }
});
export const OrganizationModel = mongoose.model("Organization", OrganizationSchema);

export const ParikshyaAdminSchema = new Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "PARIKSHYA_ADMIN" }
});
export const ParikshyaAdminModel = mongoose.model("ParikshyaAdmin", ParikshyaAdminSchema);

export const SubjectSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  organization_id: { type: String, required: true }
});
export const SubjectModel = mongoose.model("Subject", SubjectSchema);

export const TopicSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject_id: { type: String, required: true },
  organization_id: { type: String, required: true }
});
TopicSchema.index({ name: 1, subject_id: 1, organization_id: 1 }, { unique: true });
export const TopicModel = mongoose.model("Topic", TopicSchema);

export const SubTopicSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  topic_id: { type: String, required: true },
  organization_id: { type: String, required: true }
});
export const SubTopicModel = mongoose.model("SubTopic", SubTopicSchema);

const parseDobToDdmmyy = (dob: string): string => {
  if (!dob) return "000000";
  const clean = dob.replace(/[^0-9]/g, "");
  if (/^\d{8}$/.test(clean)) {
    if (dob.indexOf("-") === 4 || dob.indexOf("/") === 4 || parseInt(clean.substring(0, 4)) > 1900) {
      const year = clean.substring(2, 4);
      const month = clean.substring(4, 6);
      const day = clean.substring(6, 8);
      return `${day}${month}${year}`;
    } else {
      const day = clean.substring(0, 2);
      const month = clean.substring(2, 4);
      const year = clean.substring(6, 8);
      return `${day}${month}${year}`;
    }
  }
  if (/^\d{6}$/.test(clean)) {
    return clean;
  }
  try {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).substring(2, 4);
      return `${day}${month}${year}`;
    }
  } catch (e) {}
  return "000000";
};

const parseJoiningDate = (date: any): string => {
  if (!date) return "00";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "00";
  const day = String(d.getDate()).padStart(2, '0');
  return day;
};


export const TeacherSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "Teacher" },
  subject: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dob: { type: String, required: true },
  gender: { type: String, enum: ["Male", "Female"], default: "Male" },
  requiresPasswordChange: { type: Boolean, default: false },
  profilePicture: { type: String, default: "" },
  joined_at: { type: Date, default: Date.now },
  organization_id: { type: String, required: true }
});
TeacherSchema.pre("validate", async function (this: any, next) {
  if (this.isModified("name") || this.isModified("subject") || this.isModified("organization_id") || this.isModified("joined_at") || this.isNew) {
    try {
      const org = await mongoose.model("Organization").findOne({ id: this.organization_id });
      const orgName = (org?.name || "tester").toLowerCase().replace(/\s+/g, "");
      const userName = this.name.toLowerCase().replace(/\s+/g, "");
      this.email = `${userName}@${orgName}.teacher.com`;
      
      const subjectClean = (this.subject || "subject").toLowerCase().replace(/\s+/g, "");
      const datePart = parseJoiningDate(this.joined_at || new Date());
      this.userId = `${userName}_${subjectClean}_${datePart}`;
    } catch (err) {
      console.error("Error setting teacher email/userId in pre-validate:", err);
    }
  }
  next();
});
export const TeacherModel = mongoose.model("Teacher", TeacherSchema);

export const StudentSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "Student" },
  email: { type: String, required: true, unique: true },
  dob: { type: String, required: true },
  class: { type: String },
  gender: { type: String, enum: ["Male", "Female"], default: "Male" },
  requiresPasswordChange: { type: Boolean, default: false },
  profilePicture: { type: String, default: "" },
  joined_at: { type: Date, default: Date.now },
  organization_id: { type: String, required: true },
  results: [{
    test_id: { type: String, required: true },
    test_name: { type: String, required: true },
    score: { type: Number, required: true },
    total_marks: { type: Number, required: true },
    submitted_at: { type: Date, default: Date.now }
  }]
});
StudentSchema.pre("validate", async function (this: any, next) {
  if (this.isModified("name") || this.isModified("organization_id") || this.isModified("dob") || this.isNew) {
    try {
      const org = await mongoose.model("Organization").findOne({ id: this.organization_id });
      const orgName = (org?.name || "tester").toLowerCase().replace(/\s+/g, "");
      const userName = this.name.toLowerCase().replace(/\s+/g, "");
      this.email = `${userName}@${orgName}.student.com`;
      
      const dobPart = parseDobToDdmmyy(this.dob);
      this.userId = `${userName}_${dobPart}`;
    } catch (err) {
      console.error("Error setting student email/userId in pre-validate:", err);
    }
  }
  next();
});
export const StudentModel = mongoose.model("Student", StudentSchema);

export const AdminSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "Admin" },
  email: { type: String, unique: true },
  requiresPasswordChange: { type: Boolean, default: false },
  profilePicture: { type: String, default: "" },
  organization_id: { type: String, required: true }
});
AdminSchema.pre("validate", async function (this: any, next) {
  if (this.isModified("name") || this.isModified("organization_id") || this.isNew) {
    try {
      const org = await mongoose.model("Organization").findOne({ id: this.organization_id });
      const orgName = (org?.name || "tester").toLowerCase().replace(/\s+/g, "");
      const userName = this.name.toLowerCase().replace(/\s+/g, "");
      this.email = `${userName}@${orgName}.admin.com`;
      
      const matches = this.userId && this.userId.match(/^admin\d+$/);
      if (!matches) {
        let n = 1;
        while (true) {
          const candidate = `admin${n}`;
          const exists = await mongoose.model("Admin").findOne({ userId: candidate, organization_id: this.organization_id });
          if (!exists || exists._id.equals(this._id)) {
            this.userId = candidate;
            break;
          }
          n++;
        }
      }
    } catch (err) {
      console.error("Error setting admin email in pre-validate:", err);
    }
  }
  next();
});
export const AdminModel = mongoose.model("Admin", AdminSchema);

export const PassageSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  subject_id: { type: String, required: true },
  class: { type: String },
  created_by: { type: String },
  organization_id: { type: String, required: true }
});
export const PassageModel = mongoose.model("Passage", PassageSchema);

export const QuestionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, default: "mcq" },
  passage_id: { type: String, default: null },
  question: { type: String, required: true },
  option1: { type: String },
  option2: { type: String },
  option3: { type: String },
  option4: { type: String },
  correct_option: { type: String },
  difficulty: { type: String, default: "easy" },
  test_id: { type: String },
  topic_id: { type: String },
  sub_topic_id: { type: String },
  media_url: { type: String },
  image_url: { type: String, default: "" },
  class: { type: String },
  created_by: { type: String },
  organization_id: { type: String, required: true }
});
export const QuestionModel = mongoose.model("Question", QuestionSchema);

export const ResultSchema = new Schema({
  test_id: { type: String, required: true },
  test_name: { type: String },
  user_id: { type: String, required: true },
  score: { type: Number, required: true },
  correct_answers: { type: Number, required: true },
  wrong_answers: { type: Number, required: true },
  unattempted: { type: Number, required: true },
  answers: { type: Map, of: String },
  time_spent: { type: Number, required: true },
  tab_switches: { type: Number, default: 0 },
  submitted_at: { type: Date, default: Date.now },
  organization_id: { type: String, required: true },
  test_copy: [{
    id: { type: String },
    type: { type: String, default: "mcq" },
    passage_id: { type: String, default: null },
    question: { type: String },
    option1: { type: String },
    option2: { type: String },
    option3: { type: String },
    option4: { type: String },
    correct_option: { type: String },
    selected_option: { type: String },
    image_url: { type: String, default: "" }
  }]
});
export const ResultModel = mongoose.model("Result", ResultSchema);

export const TestSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  subject: { type: Schema.Types.Mixed, required: true },
  subject_id: { type: String },
  subject_ids: { type: [String], default: [] },
  topics: { type: [String], default: [] },
  sub_topics: { type: [String], default: [] },
  correct_marks: { type: Number, required: true },
  wrong_marks: { type: Number, required: true },
  unattempt_marks: { type: Number, required: true },
  difficulty: { type: String, required: true },
  total_time: { type: Number, required: true },
  total_marks: { type: Number, required: true },
  total_questions: { type: Number, required: true },
  status: { type: String, default: "draft" },
  questions: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
  start_time: { type: String },
  end_time: { type: String },
  results_shared: { type: Boolean, default: false },
  class: { type: String },
  organization_id: { type: String, required: true },
  sections: {
    type: [{
      name: { type: String, required: true },
      subject: { type: String, required: true },
      duration: { type: Number, required: true },
      questions_count: { type: Number, required: true },
      questions: { type: [String], default: [] }
    }],
    default: undefined
  }
});
export const TestModel = mongoose.model("Test", TestSchema);

export const NotificationSchema = new Schema({
  user_id: { type: String, default: "all" },
  message: { type: String, required: true },
  type: { type: String, required: true },
  test_id: { type: String, required: true },
  test_name: { type: String, required: true },
  read_by: { type: [String], default: [] },
  cleared_by: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
  organization_id: { type: String, required: true }
});
export const NotificationModel = mongoose.model("Notification", NotificationSchema);
