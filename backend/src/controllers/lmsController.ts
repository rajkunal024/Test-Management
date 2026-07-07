import { IncomingMessage, ServerResponse } from "node:http";
import { ImageKit } from "@imagekit/nodejs";
import { json, readBody, readBodyBuffer } from "../middlewares/utils.js";
import { getUserFromRequest, checkRole } from "../middlewares/auth.js";
import { MaterialModel, OrganizationModel, TeacherModel, AdminModel } from "../models/index.js";

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

    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const program_id = requestUrl.searchParams.get("program_id");
    const semester = requestUrl.searchParams.get("semester");
    const subject_id = requestUrl.searchParams.get("subject_id");

    const query: Record<string, any> = {
      organization_id: user.organization_id
    };

    if (program_id) query.program_id = program_id;
    if (semester) query.semester = Number(semester);
    if (subject_id) query.subject_id = subject_id;

    const materials = await MaterialModel.find(query).sort({ created_at: -1 });
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

  // Get organization configuration to make sure LMS is only used by colleges
  try {
    const org = await OrganizationModel.findOne({ id: user.organization_id });
    if (org?.orgType !== "College") {
      json(response, 400, { success: false, message: "LMS features are restricted to colleges only" });
      return;
    }
  } catch (err) {
    console.error("LMS organization check failed:", err);
  }

  try {
    const contentType = request.headers["content-type"] || "";
    let payload: Record<string, any> = {};
    let fileUrl = "";

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
              if (headers["content-type"]) {
                fileMime = headers["content-type"];
              }
            } else {
              payload[fieldName] = data.toString("utf-8").trim();
            }
          }
        }

        index = nextBoundaryIndex;
      }

      if (fileBuffer && fileBuffer.length > 0) {
        // Size Check: 10MB limit
        if (fileBuffer.length > 10 * 1024 * 1024) {
          json(response, 400, { success: false, message: "File size limit is 10MB" });
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

    const { title, description, resource_type, program_id, semester, subject_id, readme_content, html_content } = payload;
    const finalFileUrl = fileUrl || payload.file_url || "";
    const finalResourceType = resource_type || "document";

    if (!title || !title.trim()) {
      json(response, 400, { success: false, message: "Title is required" });
      return;
    }
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

    let userDoc: any = null;
    if (user.role === "Teacher") {
      userDoc = await TeacherModel.findOne({ userId: user.userId });
      if (userDoc) {
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

    const newMaterial = new MaterialModel({
      id: `mat-${Date.now()}`,
      title: title.trim(),
      description: description ? description.trim() : "",
      file_url: finalFileUrl,
      readme_content: readme_content ? String(readme_content).trim() : "",
      html_content: html_content ? String(html_content).trim() : "",
      resource_type: finalResourceType,
      organization_id: user.organization_id,
      program_id,
      semester: Number(semester),
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

    if (material.resource_type !== "readme" && material.resource_type !== "html") {
      json(response, 400, { success: false, message: "Only README and HTML materials can be edited" });
      return;
    }

    if (user.role === "Teacher" && material.uploaded_by !== user.userId) {
      json(response, 403, { success: false, message: "Forbidden: You did not upload this material" });
      return;
    }

    const payload = JSON.parse(await readBody(request));
    const { title, description, readme_content, html_content, program_id, semester, subject_id } = payload;

    if (!title || !title.trim()) {
      json(response, 400, { success: false, message: "Title is required" });
      return;
    }
    if (!program_id || !semester || !subject_id) {
      json(response, 400, { success: false, message: "Program, Semester, and Subject are required" });
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

    material.title = title.trim();
    material.description = description ? description.trim() : "";
    material.program_id = program_id;
    material.semester = Number(semester);
    material.subject_id = subject_id;
    
    if (material.resource_type === "readme") {
      material.readme_content = String(readme_content).trim();
    } else if (material.resource_type === "html") {
      material.html_content = String(html_content).trim();
    }

    await material.save();
    json(response, 200, { success: true, data: material });
  } catch (e: any) {
    console.error("UPDATE MATERIAL EXCEPTION:", e);
    json(response, 500, { success: false, message: e.message || "Server error" });
  }
};
