import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const port = Number(process.env.PORT ?? 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

const json = (response: ServerResponse, statusCode: number, body: unknown) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": frontendOrigin,
    "Access-Control-Allow-Credentials": "true",
  });
  response.end(JSON.stringify(body));
};

const readBody = async (request: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

interface DB {
  subjects: any[];
  topics: any[];
  sub_topics: any[];
  tests: any[];
  questions: any[];
}

const dbPath = join(process.cwd(), "src", "db.json");

let db: DB;
try {
  db = JSON.parse(readFileSync(dbPath, "utf-8"));
} catch (e) {
  console.error("Error reading db.json, initializing empty state", e);
  db = { subjects: [], topics: [], sub_topics: [], tests: [], questions: [] };
}

const saveDb = () => {
  try {
    writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving db.json", e);
  }
};

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";

  if (method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": frontendOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    });
    response.end();
    return;
  }

  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const path = requestUrl.pathname;

  if (path === "/api/health") {
    json(response, 200, { success: true, service: "preproute-backend" });
    return;
  }

  // POST /api/auth/login
  if (path === "/api/auth/login" && method === "POST") {
    try {
      const body = JSON.parse(await readBody(request));
      json(response, 200, {
        success: true,
        data: {
          token: "mock-jwt-token-xyz-12345",
          user: {
            id: "usr-admin",
            name: body.userId || "Alex Wando",
            userId: body.userId || "admin",
            role: "Admin",
            email: "admin@preproute.com"
          }
        }
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // GET /api/subjects
  if (path === "/api/subjects" && method === "GET") {
    json(response, 200, {
      success: true,
      data: db.subjects
    });
    return;
  }

  // GET /api/topics/subject/:subjectId
  if (path.startsWith("/api/topics/subject/") && method === "GET") {
    const subjectId = path.replace("/api/topics/subject/", "");
    const topics = db.topics.filter(t => t.subject_id === subjectId);
    json(response, 200, {
      success: true,
      data: topics
    });
    return;
  }

  // POST /api/sub-topics/multi-topics
  if (path === "/api/sub-topics/multi-topics" && method === "POST") {
    try {
      const { topicIds } = JSON.parse(await readBody(request));
      const subTopics = db.sub_topics.filter(st => topicIds.includes(st.topic_id));
      json(response, 200, {
        success: true,
        data: subTopics
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // GET /api/tests
  if (path === "/api/tests" && method === "GET") {
    json(response, 200, {
      success: true,
      data: db.tests
    });
    return;
  }

  // GET /api/tests/:id
  if (path.startsWith("/api/tests/") && !path.endsWith("/edit") && !path.endsWith("/questions") && !path.endsWith("/preview") && method === "GET") {
    const id = path.replace("/api/tests/", "");
    const test = db.tests.find(t => t.id === id);
    if (test) {
      json(response, 200, {
        success: true,
        data: test
      });
    } else {
      json(response, 404, { success: false, message: "Test not found" });
    }
    return;
  }

  // POST /api/tests
  if (path === "/api/tests" && method === "POST") {
    try {
      const payload = JSON.parse(await readBody(request));
      const newTest = {
        id: `test-${Date.now()}`,
        ...payload,
        questions: payload.questions || [],
        created_at: new Date().toISOString()
      };
      db.tests.push(newTest);
      saveDb();
      json(response, 201, {
        success: true,
        data: newTest
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // PUT /api/tests/:id
  if (path.startsWith("/api/tests/") && method === "PUT") {
    try {
      const id = path.replace("/api/tests/", "");
      const index = db.tests.findIndex(t => t.id === id);
      if (index !== -1) {
        const payload = JSON.parse(await readBody(request));
        db.tests[index] = {
          ...db.tests[index],
          ...payload
        };
        saveDb();
        json(response, 200, {
          success: true,
          data: db.tests[index]
        });
      } else {
        json(response, 404, { success: false, message: "Test not found" });
      }
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // DELETE /api/tests/:id
  if (path.startsWith("/api/tests/") && method === "DELETE") {
    const id = path.replace("/api/tests/", "");
    const index = db.tests.findIndex(t => t.id === id);
    if (index !== -1) {
      db.tests.splice(index, 1);
      db.questions = db.questions.filter(q => q.test_id !== id);
      saveDb();
      json(response, 200, {
        success: true,
        message: "Test deleted successfully"
      });
    } else {
      json(response, 404, { success: false, message: "Test not found" });
    }
    return;
  }

  // POST /api/questions/bulk
  if (path === "/api/questions/bulk" && method === "POST") {
    try {
      const { test_id, questions } = JSON.parse(await readBody(request));
      
      db.questions = db.questions.filter(q => q.test_id !== test_id);
      
      const newQuestions = questions.map((q: any, i: number) => ({
        id: q.id || `q-${test_id}-${Date.now()}-${i}`,
        ...q,
        test_id
      }));
      db.questions.push(...newQuestions);
      
      const testIndex = db.tests.findIndex(t => t.id === test_id);
      if (testIndex !== -1) {
        db.tests[testIndex].questions = newQuestions.map((q: any) => q.id);
      }
      
      saveDb();
      json(response, 200, {
        success: true,
        data: newQuestions
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  // POST /api/questions/fetchBulk
  if (path === "/api/questions/fetchBulk" && method === "POST") {
    try {
      const { question_ids } = JSON.parse(await readBody(request));
      const questions = db.questions.filter(q => question_ids.includes(q.id));
      json(response, 200, {
        success: true,
        data: questions
      });
    } catch (e) {
      json(response, 400, { success: false, message: "Invalid JSON body" });
    }
    return;
  }

  json(response, 404, { success: false, message: "Route not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PrepRoute backend listening at http://127.0.0.1:${port}`);
});

