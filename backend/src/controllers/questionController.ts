import { IncomingMessage, ServerResponse } from "node:http";
import { ImageKit } from "@imagekit/nodejs";
import { json, readBody, readBodyBuffer } from "../middlewares/utils.js";
import { QuestionModel, TestModel, TopicModel, SubTopicModel, SubjectModel, TeacherModel } from "../models/index.js";
import { getUserFromRequest } from "../middlewares/auth.js";

let imageKitclient: ImageKit | null = null;
const getImageKitClient = () => {
  if (!imageKitclient) {
    imageKitclient = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    });
  }
  return imageKitclient;
};

const escapeRegex = (string: string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const isTeacherAuthorizedForSubject = async (teacherSubject: string, topicId?: string, subjectId?: string, subjectName?: string) => {
  if (subjectName && subjectName.trim().toLowerCase() !== teacherSubject.toLowerCase()) {
    return false;
  }
  if (topicId && topicId !== "new") {
    const topic = await TopicModel.findOne({ id: topicId });
    if (topic) {
      const subject = await SubjectModel.findOne({ id: topic.subject_id });
      if (subject && subject.name.toLowerCase() === teacherSubject.toLowerCase()) {
        return true;
      }
      return false;
    }
  }
  if (subjectId) {
    const subject = await SubjectModel.findOne({ id: subjectId });
    if (subject && subject.name.toLowerCase() === teacherSubject.toLowerCase()) {
      return true;
    }
    return false;
  }
  return true;
};

const resolveTopicAndSubTopic = async (payload: any) => {
  let topic_id = payload.topic_id;
  let sub_topic_id = payload.sub_topic_id;
  const subject_id = payload.subject_id;

  const tName = payload.new_topic_name || payload.topic_name;
  if ((topic_id === "new" || !topic_id) && tName && tName.trim() && subject_id) {
    const nameTrim = tName.trim();
    let topic = await TopicModel.findOne({
      subject_id: subject_id,
      name: { $regex: new RegExp(`^${escapeRegex(nameTrim)}$`, "i") }
    });
    if (!topic) {
      const count = await TopicModel.countDocuments();
      const newId = `topic-${Date.now()}-${count + 1}`;
      topic = new TopicModel({
        id: newId,
        name: nameTrim,
        subject_id: subject_id
      });
      await topic.save();
    }
    topic_id = topic.id;
  }

  const stName = payload.new_sub_topic_name || payload.sub_topic_name;
  if ((sub_topic_id === "new" || !sub_topic_id) && stName && stName.trim() && topic_id) {
    const subNameTrim = stName.trim();
    let subTopic = await SubTopicModel.findOne({
      topic_id: topic_id,
      name: { $regex: new RegExp(`^${escapeRegex(subNameTrim)}$`, "i") }
    });
    if (!subTopic) {
      const count = await SubTopicModel.countDocuments();
      const newId = `subtopic-${Date.now()}-${count + 1}`;
      subTopic = new SubTopicModel({
        id: newId,
        name: subNameTrim,
        topic_id: topic_id
      });
      await subTopic.save();
    }
    sub_topic_id = subTopic.id;
  }

  const cleanPayload = { ...payload };
  if (topic_id && topic_id !== "new") {
    cleanPayload.topic_id = topic_id;
  } else {
    delete cleanPayload.topic_id;
  }
  if (sub_topic_id && sub_topic_id !== "new") {
    cleanPayload.sub_topic_id = sub_topic_id;
  } else {
    delete cleanPayload.sub_topic_id;
  }
  delete cleanPayload.new_topic_name;
  delete cleanPayload.new_sub_topic_name;
  delete cleanPayload.topic_name;
  delete cleanPayload.sub_topic_name;
  delete cleanPayload.subject_id;

  return cleanPayload;
};

export const getQuestions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    const query: any = {};

    if (user && user.role === "Teacher") {
      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (teacher) {
        const subject = await SubjectModel.findOne({ name: { $regex: new RegExp(`^${escapeRegex(teacher.subject)}$`, "i") } });
        if (subject) {
          const topics = await TopicModel.find({ subject_id: subject.id });
          const topicIds = topics.map(t => t.id);
          query.topic_id = { $in: topicIds };
        } else {
          query.topic_id = { $in: [] };
        }
      } else {
        query.topic_id = { $in: [] };
      }
    }

    const questions = await QuestionModel.find(query);
    json(response, 200, { success: true, data: questions });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const createQuestion = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    const rawPayload = JSON.parse(await readBody(request));

    if (user && user.role === "Teacher") {
      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (!teacher) {
        json(response, 403, { success: false, message: "Teacher account not found." });
        return;
      }

      const authorized = await isTeacherAuthorizedForSubject(
        teacher.subject,
        rawPayload.topic_id,
        rawPayload.subject_id,
        rawPayload.subject
      );

      if (!authorized) {
        json(response, 403, { success: false, message: `You are not allowed to upload/create questions for a subject other than ${teacher.subject}.` });
        return;
      }
    }

    const payload = await resolveTopicAndSubTopic(rawPayload);
    const newQuestion = new QuestionModel({
      id: `q-pool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      created_by: user ? user.userId : undefined,
      ...payload,
    });
    await newQuestion.save();
    json(response, 201, { success: true, data: newQuestion });
  } catch (e: any) {
    console.error("Error in createQuestion:", e);
    json(response, 400, { success: false, message: e.message || "Invalid JSON body or error resolving topics" });
  }
};

export const updateQuestion = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const user = getUserFromRequest(request);
    const rawPayload = JSON.parse(await readBody(request));

    const existingQuestion = await QuestionModel.findOne({ id });
    if (!existingQuestion) {
      json(response, 404, { success: false, message: "Question not found" });
      return;
    }

    if (user && user.role === "Teacher") {
      if (existingQuestion.created_by && existingQuestion.created_by !== user.userId) {
        json(response, 403, { success: false, message: "You cannot update questions created by other teachers." });
        return;
      }
      if (!existingQuestion.created_by) {
        json(response, 403, { success: false, message: "Only administrators can edit legacy system questions." });
        return;
      }

      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (!teacher) {
        json(response, 403, { success: false, message: "Teacher account not found." });
        return;
      }

      const targetTopic = rawPayload.topic_id || existingQuestion.topic_id;
      const targetSubject = rawPayload.subject_id;
      const authorized = await isTeacherAuthorizedForSubject(
        teacher.subject,
        targetTopic,
        targetSubject,
        rawPayload.subject
      );

      if (!authorized) {
        json(response, 403, { success: false, message: `You are not allowed to set questions to a subject other than ${teacher.subject}.` });
        return;
      }
    }

    const payload = await resolveTopicAndSubTopic(rawPayload);
    const question = await QuestionModel.findOneAndUpdate({ id }, payload, { new: true });
    if (question) {
      json(response, 200, { success: true, data: question });
    } else {
      json(response, 404, { success: false, message: "Question not found" });
    }
  } catch (e: any) {
    console.error("Error in updateQuestion:", e);
    json(response, 400, { success: false, message: e.message || "Invalid JSON body or error resolving topics" });
  }
};

export const deleteQuestion = async (request: IncomingMessage, response: ServerResponse, id: string) => {
  try {
    const user = getUserFromRequest(request);
    const existingQuestion = await QuestionModel.findOne({ id });
    if (!existingQuestion) {
      json(response, 404, { success: false, message: "Question not found" });
      return;
    }

    if (user && user.role === "Teacher") {
      if (existingQuestion.created_by && existingQuestion.created_by !== user.userId) {
        json(response, 403, { success: false, message: "You cannot delete questions created by other teachers." });
        return;
      }
      if (!existingQuestion.created_by) {
        json(response, 403, { success: false, message: "Only administrators can delete legacy system questions." });
        return;
      }
    }

    const result = await QuestionModel.deleteOne({ id });
    if (result.deletedCount > 0) {
      json(response, 200, { success: true, message: "Question deleted successfully" });
    } else {
      json(response, 404, { success: false, message: "Question not found" });
    }
  } catch (e) {
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const bulkQuestions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = getUserFromRequest(request);
    const { test_id, questions } = JSON.parse(await readBody(request));

    const test = await TestModel.findOne({ id: test_id });
    if (!test) {
      json(response, 404, { success: false, message: "Test not found" });
      return;
    }

    const now = new Date().getTime();
    const start = test.start_time ? new Date(test.start_time).getTime() : 0;
    const hasStarted = (test.status === "live" || test.status === "scheduled") && (!start || now >= start);
    if (hasStarted) {
      json(response, 400, { success: false, message: "Cannot edit questions for a test that has already started" });
      return;
    }

    if (user && user.role === "Teacher") {
      const teacher = await TeacherModel.findOne({ userId: user.userId });
      if (!teacher) {
        json(response, 403, { success: false, message: "Teacher account not found." });
        return;
      }

      const testSubjects = Array.isArray(test.subject) ? test.subject : [test.subject];
      const matchesSubject = testSubjects.some(s => s.toLowerCase() === teacher.subject.toLowerCase());

      if (!matchesSubject) {
        json(response, 403, { success: false, message: `You are not authorized to manage questions for a test of subject ${test.subject}.` });
        return;
      }
    }

    await QuestionModel.deleteMany({ test_id });

    const newQuestions = questions.map((q: any, i: number) => ({
      id: q.id || `q-${test_id}-${Date.now()}-${i}`,
      created_by: user ? user.userId : undefined,
      ...q,
      test_id
    }));
    await QuestionModel.insertMany(newQuestions);

    const qIds = newQuestions.map((q: any) => q.id);
    await TestModel.findOneAndUpdate({ id: test_id }, { questions: qIds });

    json(response, 200, {
      success: true,
      data: newQuestions
    });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const fetchBulkQuestions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const { question_ids } = JSON.parse(await readBody(request));
    const questions = await QuestionModel.find({ id: { $in: question_ids } });
    json(response, 200, {
      success: true,
      data: questions
    });
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON body" });
  }
};

export const uploadQuestionImage = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const contentType = request.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      json(response, 400, { success: false, message: "Request must be multipart/form-data" });
      return;
    }

    const bodyBuffer = await readBodyBuffer(request);
    
    // Parse boundary
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      json(response, 400, { success: false, message: "No multipart boundary found" });
      return;
    }
    
    let boundaryStr = boundaryMatch[1].trim();
    if (boundaryStr.startsWith('"') && boundaryStr.endsWith('"')) {
      boundaryStr = boundaryStr.slice(1, -1);
    }
    const boundary = "--" + boundaryStr;
    const boundaryBuffer = Buffer.from(boundary);
    
    let fileBuffer: Buffer | null = null;
    let fileName = `img-${Date.now()}.png`;
    let fileMime = "image/png";
    
    let index = 0;
    while (true) {
      const start = bodyBuffer.indexOf(boundaryBuffer, index);
      if (start === -1) break;
      
      const nextBoundaryIndex = bodyBuffer.indexOf(boundaryBuffer, start + boundaryBuffer.length);
      if (nextBoundaryIndex === -1) break;
      
      const part = bodyBuffer.subarray(start + boundaryBuffer.length, nextBoundaryIndex);
      const crlf2 = Buffer.from("\r\n\r\n");
      const headerEnd = part.indexOf(crlf2);
      if (headerEnd !== -1) {
        const headerText = part.subarray(0, headerEnd).toString("utf-8");
        // Data starts after \r\n\r\n and ends before trailing \r\n (2 bytes)
        const data = part.subarray(headerEnd + crlf2.length, part.length - 2);
        
        // Parse headers
        const headers: Record<string, string> = {};
        headerText.split("\r\n").forEach(line => {
          const colon = line.indexOf(":");
          if (colon !== -1) {
            const key = line.substring(0, colon).trim().toLowerCase();
            const value = line.substring(colon + 1).trim();
            headers[key] = value;
          }
        });
        
        const disposition = headers["content-disposition"] || "";
        const nameMatch = disposition.match(/name="([^"]+)"/);
        const filenameMatch = disposition.match(/filename="([^"]+)"/);
        
        if (nameMatch && nameMatch[1] === "file") {
          fileBuffer = data;
          if (filenameMatch) {
            fileName = filenameMatch[1];
          }
          if (headers["content-type"]) {
            fileMime = headers["content-type"];
          }
          break; // Found our file
        }
      }
      
      index = nextBoundaryIndex;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      json(response, 400, { success: false, message: "No file content uploaded under field 'file'." });
      return;
    }

    // Check size limit: 5MB
    if (fileBuffer.length > 5 * 1024 * 1024) {
      json(response, 400, { success: false, message: "Image size should be less than 5MB" });
      return;
    }

    // Check allowed formats
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    if (!allowedMimes.includes(fileMime) && !allowedExtensions.includes(ext)) {
      json(response, 400, { success: false, message: "Allowed formats are JPG, JPEG, PNG, WEBP." });
      return;
    }

    const ikData = await getImageKitClient().files.upload({
      file: fileBuffer.toString("base64"),
      fileName: "question_" + Date.now(),
      folder: "questions"
    });

    json(response, 200, { success: true, image_url: ikData.url });
  } catch (e) {
    console.error("Error uploading question image:", e);
    json(response, 500, { success: false, message: "Internal server error during image upload" });
  }
};

export const generateAIQuestions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const { topic, difficulty, class: classLevel, count } = JSON.parse(await readBody(request));
    
    if (!topic) {
      json(response, 400, { success: false, message: "Topic prompt is required" });
      return;
    }

    const qCount = Math.min(Math.max(Number(count) || 2, 1), 10);
    const diff = (difficulty || "Medium").trim();
    const cl = (classLevel || "Class 10").trim();

    // Premium predefined topic map
    const lowerTopic = topic.toLowerCase().trim();
    let questionsList: any[] = [];

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        console.log(`Calling Gemini to generate questions for topic: "${topic}"...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const aiResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a professional educational assessment developer that creates multiple choice questions.
Generate ${qCount} multiple choice questions (MCQs) for class/grade ${cl} on the topic of '${topic}' with a difficulty level of '${diff}'.
Return ONLY a valid JSON object in this format (no markdown blocks, no formatting wrapper, just raw JSON):
{
  "questions": [
    {
      "question": "Question text...",
      "option1": "Option 1...",
      "option2": "Option 2...",
      "option3": "Option 3...",
      "option4": "Option 4...",
      "correct_option": "option1"
    }
  ]
}
Choose correct_option to be one of 'option1', 'option2', 'option3', 'option4'. Do not add any explanation or extra text outside the JSON structure.`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7
            }
          })
        });

        if (aiResponse.ok) {
          const resData: any = await aiResponse.json();
          const content = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.questions)) {
              questionsList = parsed.questions;
              console.log(`Successfully generated ${questionsList.length} questions from Gemini.`);
            }
          }
        } else {
          console.warn("Gemini API returned error status:", aiResponse.status, await aiResponse.text());
        }
      } catch (err) {
        console.error("Gemini API call failed, falling back to simulation:", err);
      }
    }

    if (questionsList.length === 0) {
      console.log("Using simulated fallback question generator.");
      if (lowerTopic.includes("photo") || lowerTopic.includes("plant") || lowerTopic.includes("chlorophyll")) {
        questionsList = [
          {
            question: "Which of the following is the primary site of photosynthesis in a plant cell?",
            option1: "Chloroplast",
            option2: "Mitochondria",
            option3: "Ribosome",
            option4: "Golgi Apparatus",
            correct_option: "option1"
          },
          {
            question: "What are the essential raw materials required for the process of photosynthesis?",
            option1: "Carbon dioxide and Water",
            option2: "Oxygen and Glucose",
            option3: "Carbon dioxide and Oxygen",
            option4: "Nitrogen and Carbon dioxide",
            correct_option: "option1"
          },
          {
            question: "During photosynthesis, which gas is released as a byproduct?",
            option1: "Oxygen",
            option2: "Carbon dioxide",
            option3: "Nitrogen",
            option4: "Hydrogen",
            correct_option: "option1"
          },
          {
            question: "Which light wavelength is most effective for driving the process of photosynthesis?",
            option1: "Blue and Red light",
            option2: "Green and Yellow light",
            option3: "Infrared light",
            option4: "Ultraviolet light",
            correct_option: "option1"
          },
          {
            question: "What is the primary function of the stomata during photosynthesis?",
            option1: "To facilitate gas exchange (CO2 intake and O2 release)",
            option2: "To absorb sunlight",
            option3: "To transport water from roots",
            option4: "To store starch",
            correct_option: "option1"
          }
        ];
      } else if (lowerTopic.includes("equation") || lowerTopic.includes("algebra") || lowerTopic.includes("math")) {
        questionsList = [
          {
            question: `Solve for x in the equation: 4x - 7 = 17.`,
            option1: "x = 6",
            option2: "x = 4",
            option3: "x = 8",
            option4: "x = 5",
            correct_option: "option1"
          },
          {
            question: `What is the value of y if 2y + 10 = 3y - 5?`,
            option1: "y = 15",
            option2: "y = 5",
            option3: "y = 10",
            option4: "y = -15",
            correct_option: "option1"
          },
          {
            question: `Which of the following is the slope-intercept form of a linear equation?`,
            option1: "y = mx + c",
            option2: "ax + by = c",
            option3: "y - y1 = m(x - x1)",
            option4: "x/a + y/b = 1",
            correct_option: "option1"
          },
          {
            question: `If a system of two linear equations has no solution, what can be said about their graphs?`,
            option1: "The lines are parallel and never intersect.",
            option2: "The lines intersect at exactly one point.",
            option3: "The lines are coincident (overlapping).",
            option4: "The lines are perpendicular.",
            correct_option: "option1"
          },
          {
            question: `Solve the system of equations: x + y = 10 and x - y = 4. What is the value of x?`,
            option1: "x = 7",
            option2: "x = 3",
            option3: "x = 6",
            option4: "x = 8",
            correct_option: "option1"
          }
        ];
      } else {
        // Dynamic fallback based on user's topic
        const titleCaseTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
        questionsList = [
          {
            question: `Which of the following options represents the primary definition or fundamental concept of ${titleCaseTopic}?`,
            option1: `A core framework and systematic study governing the properties of ${topic}.`,
            option2: `An obsolete theory that has been superseded in modern studies of ${topic}.`,
            option3: `A completely unrelated secondary reaction that does not affect ${topic}.`,
            option4: `A hypothetical construct with no real-world evidence or applications.`,
            correct_option: "option1"
          },
          {
            question: `In the context of ${cl} studies, what is the most significant practical application of ${titleCaseTopic}?`,
            option1: `Enabling precise optimization and control of processes involving ${topic}.`,
            option2: `Serving as a decorative element in research literature.`,
            option3: `Replacing all computational models with simple manual calculations.`,
            option4: `Decreasing the overall efficiency of industrial workflows.`,
            correct_option: "option1"
          },
          {
            question: `Which parameter is most crucial to monitor when conducting an experiment regarding ${titleCaseTopic}?`,
            option1: `The rate of change and environmental threshold limits of ${topic}.`,
            option2: `The volume of external ambient noise in the laboratory.`,
            option3: `The color of the container storing the research logs.`,
            option4: `The number of pages in the instruction guide.`,
            correct_option: "option1"
          },
          {
            question: `What is a common misconception about the principles of ${titleCaseTopic}?`,
            option1: `That it operates independently of other scientific variables.`,
            option2: `That it requires careful calibration and validation.`,
            option3: `That it has been extensively documented by modern researchers.`,
            option4: `That it forms a fundamental block of the ${cl} curriculum.`,
            correct_option: "option1"
          },
          {
            question: `Which of the following advanced theories is directly derived from the study of ${titleCaseTopic}?`,
            option1: `The unified field model explaining the long-term behavior of ${topic}.`,
            option2: `The static state hypothesis which completely denies the existence of ${topic}.`,
            option3: `The isolated system model which neglects external inputs entirely.`,
            option4: `A legacy index that is no longer referenced in contemporary research.`,
            correct_option: "option1"
          }
        ];
      }
    }


    const resultQuestions = questionsList.slice(0, qCount).map((q, idx) => {
      return {
        id: `q-gen-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        difficulty: diff,
        class: cl
      };
    });

    json(response, 200, { success: true, data: resultQuestions });
  } catch (e: any) {
    console.error("Error in generateAIQuestions:", e);
    json(response, 500, { success: false, message: e.message || "Failed to generate questions" });
  }
};
