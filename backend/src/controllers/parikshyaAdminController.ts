import { IncomingMessage, ServerResponse } from "node:http";
import { json, readBody } from "../middlewares/utils.js";
import {
  OrganizationModel,
  ParikshyaAdminModel,
  StudentModel,
  TeacherModel,
  AdminModel,
  TestModel,
  ResultModel,
  QuestionModel
} from "../models/index.js";
import { hashPassword, verifyPassword, signToken } from "../utils/crypto.js";
import { requestOtp, verifyOtp as checkOtp, deleteOtp } from "../utils/otpStore.js";

// Parikshya Admin Authentication
export const parikshyaAdminLogin = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const { email, password } = JSON.parse(await readBody(request));
    if (!email || !password) {
      json(response, 400, { success: false, message: "Email and password are required" });
      return;
    }

    const parikshyaAdmin = await ParikshyaAdminModel.findOne({ email });
    if (!parikshyaAdmin || !verifyPassword(password, parikshyaAdmin.password)) {
      json(response, 401, { success: false, message: "Invalid email or password" });
      return;
    }

    const secret = process.env.JWT_SECRET ?? "dev_jwt_secret_key_change_me";
    const token = signToken({ id: parikshyaAdmin.id, userId: parikshyaAdmin.email, role: "PARIKSHYA_ADMIN" }, secret);

    json(
      response,
      200,
      {
        success: true,
        data: {
          token,
          user: { id: parikshyaAdmin.id, name: parikshyaAdmin.name, email: parikshyaAdmin.email, role: "PARIKSHYA_ADMIN" }
        }
      },
      {
        "Set-Cookie": `token=${token}; Path=/; HttpOnly; SameSite=Lax`
      }
    );
  } catch (e) {
    json(response, 400, { success: false, message: "Invalid JSON payload" });
  }
};

// Platform-level Dashboard Statistics
export const getDashboardStats = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const totalOrganizations = await OrganizationModel.countDocuments();
    const totalStudents = await StudentModel.countDocuments();
    const totalTeachers = await TeacherModel.countDocuments();
    const totalOrganizationAdmins = await AdminModel.countDocuments();
    const totalTestsConducted = await ResultModel.countDocuments();

    // Active users: sum of users whose organizations are active
    const activeOrgs = await OrganizationModel.find({ status: "Active" }).select("id");
    const activeOrgIds = activeOrgs.map(o => o.id);

    const activeStudents = await StudentModel.countDocuments({ organization_id: { $in: activeOrgIds } });
    const activeTeachers = await TeacherModel.countDocuments({ organization_id: { $in: activeOrgIds } });
    const activeAdmins = await AdminModel.countDocuments({ organization_id: { $in: activeOrgIds } });
    const totalActiveUsers = activeStudents + activeTeachers + activeAdmins;

    json(response, 200, {
      success: true,
      data: {
        totalOrganizations,
        totalStudents,
        totalTeachers,
        totalOrganizationAdmins,
        totalTestsConducted,
        totalActiveUsers
      }
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to load dashboard statistics" });
  }
};

// Analytics Data
export const getAnalytics = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const activeOrgsCount = await OrganizationModel.countDocuments({ status: "Active" });
    const totalOrgs = await OrganizationModel.find();
    
    // User Distribution
    const totalStudents = await StudentModel.countDocuments();
    const totalTeachers = await TeacherModel.countDocuments();
    const totalOrganizationAdmins = await AdminModel.countDocuments();
    const userDistribution = [
      { role: "Student", count: totalStudents },
      { role: "Teacher", count: totalTeachers },
      { role: "Admin", count: totalOrganizationAdmins }
    ];

    // Security Features Usage (count organizations enabling each feature)
    const featureKeys = [
      "cameraMonitoring", "microphoneMonitoring", "fullscreenMode", "tabSwitchingDetection",
      "screenSharingDetection", "copyPasteDisabled", "rightClickDisabled", "developerToolsDetection",
      "multipleMonitorDetection", "faceDetection", "browserLock", "autoSave",
      "screenRecordingDetection", "printDisabled"
    ];
    
    const featureUsage = featureKeys.map(key => {
      let count = 0;
      totalOrgs.forEach(org => {
        const feats = org.get("securityFeatures");
        if (feats && feats.get(key) === true) {
          count++;
        }
      });
      return { feature: key, count };
    });

    // Mock trend analytics for visual display
    const organizationGrowth = [
      { month: "Jan", count: Math.max(1, Math.round(totalOrgs.length * 0.4)) },
      { month: "Feb", count: Math.max(1, Math.round(totalOrgs.length * 0.5)) },
      { month: "Mar", count: Math.max(1, Math.round(totalOrgs.length * 0.7)) },
      { month: "Apr", count: Math.max(1, Math.round(totalOrgs.length * 0.8)) },
      { month: "May", count: Math.max(1, Math.round(totalOrgs.length * 0.9)) },
      { month: "Jun", count: totalOrgs.length }
    ];

    const totalResults = await ResultModel.countDocuments();
    const monthlyTestCount = [
      { month: "Jan", count: Math.round(totalResults * 0.3) },
      { month: "Feb", count: Math.round(totalResults * 0.45) },
      { month: "Mar", count: Math.round(totalResults * 0.6) },
      { month: "Apr", count: Math.round(totalResults * 0.75) },
      { month: "May", count: Math.round(totalResults * 0.9) },
      { month: "Jun", count: totalResults }
    ];

    json(response, 200, {
      success: true,
      data: {
        activeOrganizations: activeOrgsCount,
        userDistribution,
        featureUsage,
        organizationGrowth,
        monthlyTestCount
      }
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to load analytics data" });
  }
};

// Organization List
export const listOrganizations = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const orgs = await OrganizationModel.find().sort({ createdAt: -1 });
    const orgsData = [];

    for (const org of orgs) {
      const students = await StudentModel.countDocuments({ organization_id: org.id });
      const teachers = await TeacherModel.countDocuments({ organization_id: org.id });
      const admins = await AdminModel.countDocuments({ organization_id: org.id });

      // Get first/main admin email or name
      const mainAdmin = await AdminModel.findOne({ organization_id: org.id }).sort({ userId: 1 });

      orgsData.push({
        id: org.id,
        name: org.name,
        code: org.code,
        logo: org.logo,
        contactEmail: org.contactEmail,
        phone: org.phone,
        address: org.address,
        status: org.status,
        createdAt: org.createdAt,
        securityFeatures: org.get("securityFeatures"),
        counts: {
          students,
          teachers,
          admins
        },
        adminName: mainAdmin ? mainAdmin.name : "N/A",
        adminEmail: mainAdmin ? mainAdmin.email : "N/A",
        brandingBannerText: org.get("brandingBannerText"),
        brandingColor: org.get("brandingColor")
      });
    }

    json(response, 200, { success: true, data: orgsData });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to list organizations" });
  }
};

// Create Organization
export const createOrganization = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const {
      name,
      code,
      logo,
      contactEmail,
      phone,
      address,
      status,
      brandingBannerText,
      brandingColor
    } = body;

    if (!name || !code || !contactEmail) {
      json(response, 400, { success: false, message: "Required fields are missing" });
      return;
    }

    const orgCodeUpper = code.toUpperCase().trim();
    const existingOrg = await OrganizationModel.findOne({
      $or: [{ code: orgCodeUpper }, { contactEmail: contactEmail.toLowerCase().trim() }]
    });

    if (existingOrg) {
      json(response, 400, { success: false, message: "Organization with this Code or Email already exists" });
      return;
    }

    // Generate unique ID
    const orgId = `org-${Date.now()}`;

    const newOrg = new OrganizationModel({
      id: orgId,
      name,
      code: orgCodeUpper,
      logo: logo || "",
      contactEmail: contactEmail.toLowerCase().trim(),
      phone: phone || "",
      address: address || "",
      status: status || "Active",
      brandingBannerText: brandingBannerText || "Welcome to Parikshya Online Testing Portal",
      brandingColor: brandingColor || "#4B52DC",
    });

    await newOrg.save();

    json(response, 201, {
      success: true,
      message: "Organization created successfully",
      data: {
        organization: newOrg
      }
    });
  } catch (e) {
    console.error("Error creating organization:", e);
    json(response, 500, { success: false, message: "Failed to create organization" });
  }
};

// Organization Detailed Info & Statistics
export const getOrganizationDetails = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
    const pathParts = url.pathname.split("/");
    const orgId = pathParts[pathParts.length - 1];

    const org = await OrganizationModel.findOne({ id: orgId });
    if (!org) {
      json(response, 404, { success: false, message: "Organization not found" });
      return;
    }

    const students = await StudentModel.countDocuments({ organization_id: orgId });
    const teachers = await TeacherModel.countDocuments({ organization_id: orgId });
    const admins = await AdminModel.countDocuments({ organization_id: orgId });
    const testsCreated = await TestModel.countDocuments({ organization_id: orgId });
    const testsConducted = await ResultModel.countDocuments({ organization_id: orgId });
    const questionPoolSize = await QuestionModel.countDocuments({ organization_id: orgId });
    
    // Active users in this organization
    const activeUsers = students + teachers + admins;

    const mainAdmin = await AdminModel.findOne({ organization_id: orgId }).sort({ userId: 1 });

    json(response, 200, {
      success: true,
      data: {
        organization: {
          id: org.id,
          name: org.name,
          code: org.code,
          logo: org.logo,
          contactEmail: org.contactEmail,
          phone: org.phone,
          address: org.address,
          status: org.status,
          createdAt: org.createdAt,
          securityFeatures: org.get("securityFeatures"),
          adminName: mainAdmin ? mainAdmin.name : "N/A",
          adminEmail: mainAdmin ? mainAdmin.email : "N/A",
          brandingBannerText: org.get("brandingBannerText"),
          brandingColor: org.get("brandingColor")
        },
        stats: {
          students,
          teachers,
          admins,
          testsCreated,
          testsConducted,
          questionPoolSize,
          activeUsers
        }
      }
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to load organization details" });
  }
};

// Configure Exam Security Features
export const updateSecurityFeatures = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
    const pathParts = url.pathname.split("/");
    const orgId = pathParts[pathParts.length - 2]; // Format is /api/parikshya-admin/organizations/:id/security-features

    const { securityFeatures } = JSON.parse(await readBody(request));
    if (!securityFeatures) {
      json(response, 400, { success: false, message: "Security features configuration is required" });
      return;
    }

    const org = await OrganizationModel.findOne({ id: orgId });
    if (!org) {
      json(response, 404, { success: false, message: "Organization not found" });
      return;
    }

    org.set("securityFeatures", securityFeatures);
    await org.save();

    json(response, 200, {
      success: true,
      message: "Security features configuration updated successfully",
      data: org
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to update security features configuration" });
  }
};

// Activate / Deactivate Organization Status
export const updateOrganizationStatus = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
    const pathParts = url.pathname.split("/");
    const orgId = pathParts[pathParts.length - 2]; // Format is /api/parikshya-admin/organizations/:id/status

    const { status } = JSON.parse(await readBody(request));
    if (status !== "Active" && status !== "Inactive") {
      json(response, 400, { success: false, message: "Invalid status value. Must be Active or Inactive." });
      return;
    }

    const org = await OrganizationModel.findOneAndUpdate(
      { id: orgId },
      { status },
      { new: true }
    );

    if (!org) {
      json(response, 404, { success: false, message: "Organization not found" });
      return;
    }

    json(response, 200, {
      success: true,
      message: `Organization status updated to ${status} successfully`,
      data: org
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to update organization status" });
  }
};

// Global Users Directory (Read-Only)
export const listUsers = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
    const search = url.searchParams.get("search")?.toLowerCase().trim() || "";
    const role = url.searchParams.get("role") || "";
    const orgIdFilter = url.searchParams.get("organization_id") || "";

    const usersList: any[] = [];
    const orgs = await OrganizationModel.find().select("id name");
    const orgsMap = new Map(orgs.map(o => [o.id, o.name]));

    // Helper to check filters
    const matchesFilter = (user: any, orgName: string) => {
      const matchSearch = !search || 
        user.name.toLowerCase().includes(search) || 
        user.email.toLowerCase().includes(search) ||
        orgName.toLowerCase().includes(search);
      
      const matchOrg = !orgIdFilter || user.organization_id === orgIdFilter;
      return matchSearch && matchOrg;
    };

    // 1. Fetch Admins
    if (!role || role === "Admin") {
      const admins = await AdminModel.find();
      admins.forEach(u => {
        const orgName = orgsMap.get(u.organization_id) || "Default Organization";
        if (matchesFilter(u, orgName)) {
          usersList.push({
            id: u.userId,
            name: u.name,
            email: u.email || "N/A",
            role: "Admin",
            class: "N/A",
            organizationId: u.organization_id,
            organization: orgName,
            status: "Active",
            lastLogin: "N/A",
            profilePicture: u.profilePicture || "",
            gender: "N/A",
            dob: "N/A"
          });
        }
      });
    }

    // 2. Fetch Teachers
    if (!role || role === "Teacher") {
      const teachers = await TeacherModel.find();
      teachers.forEach(u => {
        const orgName = orgsMap.get(u.organization_id) || "Default Organization";
        if (matchesFilter(u, orgName)) {
          usersList.push({
            id: u.userId,
            name: u.name,
            email: u.email,
            role: "Teacher",
            class: u.subject || "N/A", // Teachers hold subject in class column or details
            organizationId: u.organization_id,
            organization: orgName,
            status: "Active",
            lastLogin: "N/A",
            profilePicture: u.profilePicture || "",
            gender: u.gender || "Male",
            dob: u.dob || "N/A"
          });
        }
      });
    }

    // 3. Fetch Students
    if (!role || role === "Student") {
      const students = await StudentModel.find();
      students.forEach(u => {
        const orgName = orgsMap.get(u.organization_id) || "Default Organization";
        if (matchesFilter(u, orgName)) {
          usersList.push({
            id: u.userId,
            name: u.name,
            email: u.email,
            role: "Student",
            class: u.class || "Class 10",
            organizationId: u.organization_id,
            organization: orgName,
            status: "Active",
            lastLogin: "N/A",
            profilePicture: u.profilePicture || "",
            gender: u.gender || "Male",
            dob: u.dob || "N/A"
          });
        }
      });
    }

    json(response, 200, { success: true, data: usersList });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to fetch users directory" });
  }
};

// Get User Profile (Read-Only)
export const getUserDetails = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
    const pathParts = url.pathname.split("/");
    const userId = decodeURIComponent(pathParts[pathParts.length - 1]);

    let userDoc: any = await StudentModel.findOne({ userId });
    let role = "Student";

    if (!userDoc) {
      userDoc = await TeacherModel.findOne({ userId });
      role = "Teacher";
    }

    if (!userDoc) {
      userDoc = await AdminModel.findOne({ userId });
      role = "Admin";
    }

    if (!userDoc) {
      json(response, 404, { success: false, message: "User not found" });
      return;
    }

    const org = await OrganizationModel.findOne({ id: userDoc.organization_id });
    const orgName = org ? org.name : "Default Organization";

    const userData = {
      id: userDoc.userId,
      name: userDoc.name,
      email: userDoc.email || "N/A",
      role,
      organization: orgName,
      organizationId: userDoc.organization_id,
      dob: userDoc.dob || "N/A",
      gender: userDoc.gender || "N/A",
      class: userDoc.class || userDoc.subject || "N/A",
      registrationDate: userDoc.joined_at || userDoc._id.getTimestamp(),
      lastLogin: "N/A",
      status: "Active",
      profilePicture: userDoc.profilePicture || ""
    };

    json(response, 200, { success: true, data: userData });
  } catch (e) {
    json(response, 500, { success: false, message: "Failed to get user profile details" });
  }
};

export const updateOrganization = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const url = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
    const pathParts = url.pathname.split("/");
    const orgId = pathParts[pathParts.length - 1];

    const body = JSON.parse(await readBody(request));
    const {
      name,
      contactEmail,
      phone,
      address,
      logo,
      adminName,
      adminEmail,
      brandingBannerText,
      brandingColor
    } = body;

    const org = await OrganizationModel.findOne({ id: orgId });
    if (!org) {
      json(response, 404, { success: false, message: "Organization not found" });
      return;
    }

    if (name) org.name = name;
    if (logo !== undefined) org.logo = logo;
    if (contactEmail) org.contactEmail = contactEmail.toLowerCase().trim();
    if (phone !== undefined) org.phone = phone;
    if (address !== undefined) org.address = address;
    if (brandingBannerText !== undefined) org.set("brandingBannerText", brandingBannerText);
    if (brandingColor !== undefined) org.set("brandingColor", brandingColor);

    await org.save();

    if (adminName || adminEmail) {
      const mainAdmin = await AdminModel.findOne({ organization_id: orgId }).sort({ userId: 1 });
      if (mainAdmin) {
        if (adminName) mainAdmin.name = adminName;
        if (adminEmail) {
          const newEmail = adminEmail.toLowerCase().trim();
          if (newEmail !== mainAdmin.email) {
            const existingAdmin = await AdminModel.findOne({
              $or: [{ userId: newEmail }, { email: newEmail }],
              _id: { $ne: mainAdmin._id }
            });
            if (existingAdmin) {
              json(response, 400, { success: false, message: "Admin email is already in use" });
              return;
            }
            mainAdmin.email = newEmail;
            mainAdmin.userId = newEmail;
          }
        }
        await mainAdmin.save();
      }
    }

    json(response, 200, {
      success: true,
      message: "Organization details updated successfully",
      data: org
    });
  } catch (e) {
    console.error("Error updating organization:", e);
    json(response, 500, { success: false, message: "Failed to update organization details" });
  }
};

// Change Parikshya Admin Password
export const changeParikshyaAdminPassword = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const { getUserFromRequest } = await import("../middlewares/auth.js");
    const user = getUserFromRequest(request);
    if (!user || user.role !== "PARIKSHYA_ADMIN") {
      json(response, 401, { success: false, message: "Unauthorized" });
      return;
    }

    const { oldPassword, newPassword, confirmPassword } = JSON.parse(await readBody(request));
    if (!oldPassword || !newPassword || !confirmPassword) {
      json(response, 400, { success: false, message: "Old password, new password, and re-entered new password are required" });
      return;
    }

    if (newPassword !== confirmPassword) {
      json(response, 400, { success: false, message: "New passwords do not match" });
      return;
    }

    const admin = await ParikshyaAdminModel.findOne({ email: user.userId });
    if (!admin) {
      json(response, 404, { success: false, message: "Parikshya Admin account not found" });
      return;
    }

    if (!verifyPassword(oldPassword, admin.password)) {
      json(response, 400, { success: false, message: "Incorrect old password" });
      return;
    }

    admin.password = hashPassword(newPassword);
    await admin.save();

    json(response, 200, { success: true, message: "Password changed successfully" });
  } catch (e) {
    console.error("Error changing parikshya admin password:", e);
    json(response, 500, { success: false, message: "Failed to change password" });
  }
};

// Forgot Password
export const forgotParikshyaAdminPassword = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email } = body;

    if (!email) {
      json(response, 400, { success: false, message: "Email is required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      json(response, 400, { success: false, message: "Invalid email format" });
      return;
    }

    const admin = await ParikshyaAdminModel.findOne({ email });
    if (!admin) {
      json(response, 404, { success: false, message: "Parikshya Admin not found" });
      return;
    }

    const otpResult = requestOtp(email);
    if (!otpResult.success) {
      json(response, 429, { 
        success: false, 
        message: `Too many OTP requests. Please wait ${otpResult.cooldownLeft} seconds before trying again.` 
      });
      return;
    }

    // Print OTP in backend terminal
    console.log(`
================================================
PARIKSHYA ADMIN FORGOT PASSWORD REQUEST
Email: ${email}
OTP: ${otpResult.otp}
Expires In: 10 Minutes
================================================
`);

    json(response, 200, {
      success: true,
      message: "OTP generated successfully"
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error during OTP generation" });
  }
};

// Verify OTP
export const verifyParikshyaAdminOtp = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email, otp } = body;

    if (!email || !otp) {
      json(response, 400, { success: false, message: "Email and OTP are required" });
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      json(response, 400, { success: false, message: "OTP must be exactly 6 digits" });
      return;
    }

    const verification = checkOtp(email, otp);
    if (!verification.success) {
      json(response, 400, { success: false, message: verification.message });
      return;
    }

    json(response, 200, {
      success: true,
      message: "OTP verified"
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error during OTP verification" });
  }
};

// Reset Password
export const resetParikshyaAdminPassword = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const body = JSON.parse(await readBody(request));
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      json(response, 400, { success: false, message: "Email, OTP, and new password are required" });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      json(response, 400, { 
        success: false, 
        message: "Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, and one number" 
      });
      return;
    }

    const verification = checkOtp(email, otp);
    if (!verification.success) {
      json(response, 400, { success: false, message: verification.message });
      return;
    }

    const admin = await ParikshyaAdminModel.findOne({ email });
    if (!admin) {
      json(response, 404, { success: false, message: "Parikshya Admin not found" });
      return;
    }

    admin.password = hashPassword(newPassword);
    await admin.save();

    deleteOtp(email);

    json(response, 200, {
      success: true,
      message: "Password reset successful"
    });
  } catch (e) {
    json(response, 500, { success: false, message: "Server error during password reset" });
  }
};

// List all questions across all organizations (for platform admin)
export const listAllQuestions = async (request: IncomingMessage, response: ServerResponse) => {
  try {
    const questions = await QuestionModel.find({});
    
    // Fetch all organizations to map their names
    const orgs = await OrganizationModel.find({});
    const orgMap = new Map(orgs.map(o => [o.id, o.name]));

    // Fetch all teachers to map their names
    const teachers = await TeacherModel.find({});
    const teacherMap = new Map(teachers.map(t => [t.userId, t.name]));

    const questionsData = questions.map((q: any) => {
      const orgName = orgMap.get(q.organization_id) || "N/A";
      const teacherName = q.created_by ? (teacherMap.get(q.created_by) || q.created_by) : "System";
      return {
        id: q.id,
        question: q.question,
        type: q.type,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        difficulty: q.difficulty,
        class: q.class || "N/A",
        created_by: teacherName,
        teacherId: q.created_by || "",
        organization_id: q.organization_id,
        organizationName: orgName,
        image_url: q.image_url || ""
      };
    });

    json(response, 200, { success: true, data: questionsData });
  } catch (e) {
    console.error("Error listing all questions:", e);
    json(response, 500, { success: false, message: "Failed to list all questions" });
  }
};



