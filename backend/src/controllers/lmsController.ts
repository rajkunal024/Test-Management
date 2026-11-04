import { IncomingMessage, ServerResponse } from "node:http";
import { ImageKit } from "@imagekit/nodejs";
import { json, readBody, readBodyBuffer } from "../middlewares/utils.js";
import { getUserFromRequest, checkRole } from "../middlewares/auth.js";
import { MaterialModel, OrganizationModel, TeacherModel, AdminModel, StudentModel, SubjectModel } from "../models/index.js";

let imageKitclient: ImageKit | null = null;
const getImageKitClient = () => {
  if (!imageKitclient) {
    imageKitclient = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    });
  }
  return imageKitclient;
};

export const getMaterials = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      json(response, 401, { success: false, message: "Unauthorized" });
      return;
    }

    const org = await OrganizationModel.findOne({ id: user.organization_id });
    const isLmsEnabled = org ? (org.get("lmsEnabled") !== undefined ? Boolean(org.get("lmsEnabled")) : (org.get("orgType") === "College")) : false;
    if (!isLmsEnabled) {
      json(response, 403, { success: false, message: "LMS feature is not enabled for your organization" });
      return;
    }

    const isSchool = org ? org.get("orgType") !== "College" : true;
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const program_id = requestUrl.searchParams.get("program_id");
    const semester = requestUrl.searchParams.get("semester");
    const subject_id = requestUrl.searchParams.get("subject_id");
    const class_name = requestUrl.searchParams.get("class");

    const query: Record<string, any> = {
      organization_id: user.organization_id
    };

    if (subject_id) query.subject_id = subject_id;

    if (user.role === "Student") {
      const student = await StudentModel.findOne({ userId: user.userId, organization_id: user.organization_id });
      if (isSchool) {
        const studentClass = (student?.class || class_name || "").trim();
        if (studentClass) {
          query.$or = [{ class: studentClass }, { class: "all" }, { class: "All" }];
        }
        // If subject_id is specified, ensure it is assigned to this student's class
        if (subject_id && studentClass) {
          const subjectDoc = await SubjectModel.findOne({ id: subject_id, organization_id: user.organization_id });
          if (subjectDoc && subjectDoc.classes && subjectDoc.classes.length > 0) {
            if (!subjectDoc.classes.includes(studentClass)) {
              json(response, 200, { success: true, data: [] });
              return;
            }
          }
        }
      } else {
        const studentProg = student?.program_id || program_id;
        const studentSem = student?.semester || (semester ? Number(semester) : undefined);
        if (studentProg) query.program_id = studentProg;
        if (studentSem) query.semester = Number(studentSem);
      }
    } else {
      if (isSchool) {
        if (class_name) {
          query.$or = [{ class: class_name }, { class: "all" }, { class: "All" }];
        }
      } else {
        if (program_id) query.program_id = program_id;
        if (semester) query.semester = Number(semester);
        if (class_name) {
          query.$or = [{ class: class_name }, { class: "all" }, { class: "" }, { class: null }, { program_id: class_name }];
        }
      }
    }

    let materials = await MaterialModel.find(query).sort({ created_at: -1 });

    // For school student, also make sure materials whose subject is strictly linked only to other classes are excluded
    if (user.role === "Student" && isSchool) {
      const student = await StudentModel.findOne({ userId: user.userId, organization_id: user.organization_id });
      const studentClass = (student?.class || class_name || "").trim();
      if (studentClass) {
        const allSubjects = await SubjectModel.find({ organization_id: user.organization_id });
        const disallowedSubjectIds = new Set<string>();
        for (const s of allSubjects) {
          if (s.classes && s.classes.length > 0 && !s.classes.includes(studentClass)) {
            disallowedSubjectIds.add(s.id);
          }
        }
        if (disallowedSubjectIds.size > 0) {
          materials = materials.filter(m => !disallowedSubjectIds.has(m.subject_id));
        }
      }
    }

    json(response, 200, { success: true, data: materials });
  } catch (e: any) {
    console.error("GET MATERIALS EXCEPTION:", e);
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const createMaterial = async (request: IncomingMessage, response: ServerResponse) => {
  const user = await getUserFromRequest(request);
  if (!user || (user.role !== "Teacher" && user.role !== "Admin")) {
    json(response, 403, { success: false, message: "Forbidden: Faculty or admin only" });
    return;
  }

  let org: any = null;
  try {
    org = await OrganizationModel.findOne({ id: user.organization_id });
    const isLmsEnabled = org ? (org.get("lmsEnabled") !== undefined ? Boolean(org.get("lmsEnabled")) : (org.get("orgType") === "College")) : false;
    if (!isLmsEnabled) {
      json(response, 403, { success: false, message: "LMS feature is not enabled for your organization" });
      return;
    }
  } catch (err) {
    console.error("LMS organization check failed:", err);
  }

  const isSchool = org?.get("orgType") !== "College";

  try {
    const contentType = request.headers["content-type"] || "";
    let payload: Record<string, any> = {};
    let fileUrl = "";
    let uploadedFileName = "";
    let uploadedFileMime = "";
    let fileBufferData: Buffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const bodyBuffer = await readBodyBuffer(request);
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      if (!boundaryMatch) {
        json(response, 400, { success: false, message: "No boundary found in multipart payload" });
        return;
      }

      let boundaryStr = boundaryMatch[1].trim();
      if (boundaryStr.startsWith('"') && boundaryStr.endsWith('"')) {
        boundaryStr = boundaryStr.slice(1, -1);
      }
      const boundary = "--" + boundaryStr;
      const boundaryBuffer = Buffer.from(boundary);

      let fileBuffer: Buffer | null = null;
      let fileName = "";
      let fileMime = "";

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
          const data = part.subarray(headerEnd + crlf2.length, part.length - 2);

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

          if (nameMatch) {
            const fieldName = nameMatch[1];
            if (filenameMatch) {
              fileBuffer = data;
              fileName = filenameMatch[1];
              uploadedFileName = fileName;
              if (headers["content-type"]) {
                fileMime = headers["content-type"];
                uploadedFileMime = fileMime;
              }
            } else {
              payload[fieldName] = data.toString("utf-8").trim();
            }
          }
        }

        index = nextBoundaryIndex;
      }

      fileBufferData = fileBuffer;
      if (fileBuffer && fileBuffer.length > 0) {
        // Size Check: 10MB limit
        if (fileBuffer.length > 10 * 1024 * 1024) {
          json(response, 400, { success: false, message: "File size limit is 10MB" });
          return;
        }

        // For school, verify uploaded file is PDF
        if (isSchool && !fileName.toLowerCase().endsWith(".pdf")) {
          json(response, 400, { success: false, message: "School teachers can only upload PDF documents (.pdf)" });
          return;
        }

        const cleanFileName = "lms_" + Date.now() + "_" + fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const ikData = await getImageKitClient().files.upload({
          file: fileBuffer.toString("base64"),
          fileName: cleanFileName,
          folder: "lms"
        });
        fileUrl = ikData.url || "";
      }
    } else {
      payload = JSON.parse(await readBody(request));
    }

    const {
      title,
      description,
      resource_type,
      program_id,
      semester,
      subject_id,
      readme_content,
      html_content,
      text_content,
      class: classInput
    } = payload;
    const finalFileUrl = fileUrl || payload.file_url || "";
    const finalResourceType = resource_type || "document";

    if (!title || !title.trim()) {
      json(response, 400, { success: false, message: "Title is required" });
      return;
    }

    if (isSchool) {
      if (finalResourceType !== "document" && finalResourceType !== "text") {
        json(response, 400, { success: false, message: "School teachers can only upload PDF documents or write text" });
        return;
      }
      if (finalResourceType === "document") {
        if (!finalFileUrl.trim() && !fileBufferData) {
          json(response, 400, { success: false, message: "PDF file or URL is required" });
          return;
        }
        if (finalFileUrl && !finalFileUrl.toLowerCase().split("?")[0].endsWith(".pdf") && (!uploadedFileName || !uploadedFileName.toLowerCase().endsWith(".pdf"))) {
          json(response, 400, { success: false, message: "Only PDF documents (.pdf) can be uploaded for schools" });
          return;
        }
      }
      if (finalResourceType === "text" && !String(text_content || "").trim()) {
        json(response, 400, { success: false, message: "Text content is required" });
        return;
      }
      if (!subject_id) {
        json(response, 400, { success: false, message: "Subject is required" });
        return;
      }
    } else {
      if (!program_id || !semester || !subject_id) {
        json(response, 400, { success: false, message: "Program, Semester, and Subject identifiers are required" });
        return;
      }
      if (finalResourceType === "readme" && !String(readme_content || "").trim()) {
        json(response, 400, { success: false, message: "README.md content is required" });
        return;
      }
      if (finalResourceType === "html" && !String(html_content || "").trim()) {
        json(response, 400, { success: false, message: "HTML Article content is required" });
        return;
      }
      if (finalResourceType !== "readme" && finalResourceType !== "html" && !finalFileUrl.trim()) {
        json(response, 400, { success: false, message: "File or URL is required" });
        return;
      }
    }

    let userDoc: any = null;
    if (user.role === "Teacher") {
      userDoc = await TeacherModel.findOne({ userId: user.userId });
      if (userDoc && !isSchool) {
        const teacherProgs = userDoc.program_ids || [];
        const hasProgram = teacherProgs.includes(program_id) || userDoc.program_id === program_id;
        if (!hasProgram) {
          json(response, 403, { success: false, message: "Forbidden: You are not assigned to this program" });
          return;
        }
      }
    } else if (user.role === "Admin") {
      userDoc = await AdminModel.findOne({ userId: user.userId });
    }
    const uploadedByName = userDoc?.name || "Faculty Member";

    const assignedClass = classInput || (isSchool ? (program_id || "") : "");
    const assignedProgram = program_id || (isSchool ? assignedClass : "");
    const assignedSemester = semester ? Number(semester) : 1;

    if (isSchool) {
      if (!assignedClass || !assignedClass.trim()) {
        json(response, 400, { success: false, message: "Target class is required for school LMS material" });
        return;
      }
      const subjectDoc = await SubjectModel.findOne({ id: subject_id, organization_id: user.organization_id });
      if (subjectDoc && subjectDoc.classes && subjectDoc.classes.length > 0) {
        if (!subjectDoc.classes.includes(assignedClass) && assignedClass !== "all") {
          json(response, 400, {
            success: false,
            message: `Subject '${subjectDoc.name}' is only linked to classes: ${subjectDoc.classes.join(", ")}`
          });
          return;
        }
      }
    }

    const newMaterial = new MaterialModel({
      id: `mat-${Date.now()}`,
      title: title.trim(),
      description: description ? description.trim() : "",
      file_url: finalFileUrl,
      readme_content: readme_content ? String(readme_content).trim() : "",
      html_content: html_content ? String(html_content).trim() : "",
      text_content: text_content ? String(text_content).trim() : "",
      resource_type: finalResourceType,
      organization_id: user.organization_id,
      program_id: assignedProgram,
      semester: assignedSemester,
      class: assignedClass,
      subject_id,
      uploaded_by: user.userId,
      uploaded_by_name: uploadedByName
    });

    await newMaterial.save();
    json(response, 201, { success: true, data: newMaterial });
  } catch (e: any) {
    console.error("CREATE MATERIAL EXCEPTION:", e);
    json(response, 500, { success: false, message: e.message || "Server error" });
  }
};

export const deleteMaterial = async (request: IncomingMessage, response: ServerResponse, materialId: string) => {
  const user = await getUserFromRequest(request);
  if (!user || (user.role !== "Teacher" && user.role !== "Admin")) {
    json(response, 403, { success: false, message: "Forbidden" });
    return;
  }

  try {
    const material = await MaterialModel.findOne({ id: materialId });
    if (!material) {
      json(response, 404, { success: false, message: "Material not found" });
      return;
    }

    // Authorization: Only the teacher who uploaded or Admin can delete
    if (user.role === "Teacher" && material.uploaded_by !== user.userId) {
      json(response, 403, { success: false, message: "Forbidden: You did not upload this material" });
      return;
    }

    await MaterialModel.findOneAndDelete({ id: materialId });
    json(response, 200, { success: true, message: "Material deleted successfully" });
  } catch (e: any) {
    console.error("DELETE MATERIAL EXCEPTION:", e);
    json(response, 500, { success: false, message: "Server error" });
  }
};

export const updateMaterial = async (request: IncomingMessage, response: ServerResponse, materialId: string) => {
  const user = await getUserFromRequest(request);
  if (!user || (user.role !== "Teacher" && user.role !== "Admin")) {
    json(response, 403, { success: false, message: "Forbidden" });
    return;
  }

  try {
    const material = await MaterialModel.findOne({ id: materialId });
    if (!material) {
      json(response, 404, { success: false, message: "Material not found" });
      return;
    }

    if (material.resource_type !== "readme" && material.resource_type !== "html" && material.resource_type !== "text") {
      json(response, 400, { success: false, message: "Only README, HTML, and Text materials can be edited" });
      return;
    }

    if (user.role === "Teacher" && material.uploaded_by !== user.userId) {
      json(response, 403, { success: false, message: "Forbidden: You did not upload this material" });
      return;
    }

    const payload = JSON.parse(await readBody(request));
    const { title, description, readme_content, html_content, text_content, program_id, semester, subject_id, class: classInput } = payload;

    if (!title || !title.trim()) {
      json(response, 400, { success: false, message: "Title is required" });
      return;
    }
    if (!subject_id) {
      json(response, 400, { success: false, message: "Subject is required" });
      return;
    }

    if (material.resource_type === "readme" && !String(readme_content || "").trim()) {
      json(response, 400, { success: false, message: "README.md content is required" });
      return;
    }
    if (material.resource_type === "html" && !String(html_content || "").trim()) {
      json(response, 400, { success: false, message: "HTML Article content is required" });
      return;
    }
    if (material.resource_type === "text" && !String(text_content || "").trim()) {
      json(response, 400, { success: false, message: "Text content is required" });
      return;
    }

    material.title = title.trim();
    material.description = description ? description.trim() : "";
    if (program_id) material.program_id = program_id;
    if (semester !== undefined) material.semester = Number(semester);
    if (classInput !== undefined) material.class = classInput;
    material.subject_id = subject_id;

    const org = await OrganizationModel.findOne({ id: user.organization_id });
    const isSchool = org ? org.get("orgType") !== "College" : true;
    if (isSchool && material.class) {
      const subjectDoc = await SubjectModel.findOne({ id: subject_id, organization_id: user.organization_id });
      if (subjectDoc && subjectDoc.classes && subjectDoc.classes.length > 0) {
        if (!subjectDoc.classes.includes(material.class) && material.class !== "all") {
          json(response, 400, {
            success: false,
            message: `Subject '${subjectDoc.name}' is only linked to classes: ${subjectDoc.classes.join(", ")}`
          });
          return;
        }
      }
    }
    
    if (material.resource_type === "readme") {
      material.readme_content = String(readme_content).trim();
    } else if (material.resource_type === "html") {
      material.html_content = String(html_content).trim();
    } else if (material.resource_type === "text") {
      material.text_content = String(text_content).trim();
    }

    await material.save();
    json(response, 200, { success: true, data: material });
  } catch (e: any) {
    console.error("UPDATE MATERIAL EXCEPTION:", e);
    json(response, 500, { success: false, message: e.message || "Server error" });
  }
};
