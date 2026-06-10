import mongoose, { Schema } from "mongoose";

export const SubjectSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true }
});
export const SubjectModel = mongoose.model("Subject", SubjectSchema);

export const TopicSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject_id: { type: String, required: true }
});
TopicSchema.index({ name: 1, subject_id: 1 }, { unique: true });
export const TopicModel = mongoose.model("Topic", TopicSchema);

export const SubTopicSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  topic_id: { type: String, required: true }
});
export const SubTopicModel = mongoose.model("SubTopic", SubTopicSchema);

export const TeacherSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "Teacher" },
  subject: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dob: { type: String, required: true },
  gender: { type: String, enum: ["Male", "Female"], default: "Male" },
  requiresPasswordChange: { type: Boolean, default: false }
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
  joined_at: { type: Date, default: Date.now },
  results: [{
    test_id: { type: String, required: true },
    test_name: { type: String, required: true },
    score: { type: Number, required: true },
    total_marks: { type: Number, required: true },
    submitted_at: { type: Date, default: Date.now }
  }]
});
export const StudentModel = mongoose.model("Student", StudentSchema);

export const AdminSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "Admin" },
  requiresPasswordChange: { type: Boolean, default: false }
});
export const AdminModel = mongoose.model("Admin", AdminSchema);

export const QuestionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, default: "mcq" },
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
  created_by: { type: String }
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
  test_copy: [{
    id: { type: String },
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
  class: { type: String }
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
  created_at: { type: Date, default: Date.now }
});
export const NotificationModel = mongoose.model("Notification", NotificationSchema);
