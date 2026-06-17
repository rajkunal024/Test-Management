import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "node:http";
import { activeStreams } from "../controllers/attemptController.js";
import { TestModel, TeacherModel, NotificationModel } from "../models/index.js";

interface TeacherConnection {
  ws: WebSocket;
  test_id: string;
}

interface StudentConnection {
  ws: WebSocket;
  test_id: string;
  user_id: string;
  username: string;
}

const teachers = new Set<TeacherConnection>();
const students = new Set<StudentConnection>();

export const setupProctorWebSocketServer = (wss: WebSocketServer) => {
  wss.on("connection", async (ws: WebSocket, request: IncomingMessage) => {
    try {
      const requestUrl = new URL(request.url ?? "", `http://${request.headers.host ?? "127.0.0.1"}`);
      const role = requestUrl.searchParams.get("role");
      const test_id = requestUrl.searchParams.get("test_id");

      if (!test_id) {
        ws.close(4000, "test_id is required");
        return;
      }

      if (role === "student") {
        const user_id = requestUrl.searchParams.get("user_id");
        const username = requestUrl.searchParams.get("username") || user_id || "Student";

        if (!user_id) {
          ws.close(4001, "user_id is required");
          return;
        }

        const studentConn: StudentConnection = { ws, test_id, user_id, username };
        students.add(studentConn);

        console.log(`[WS] Student '${username}' (${user_id}) connected for test '${test_id}'`);

        ws.on("message", async (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === "frame") {
              const { frame, screenFrame, hasVideo, hasAudio } = message;

              // 1. Update the shared activeStreams map (used as fallback for HTTP polling)
              const key = `${test_id}-${user_id}`;
              const isNewStream = !activeStreams.has(key);

              activeStreams.set(key, {
                test_id,
                user_id,
                username,
                frame: frame || "",
                screenFrame: screenFrame || "",
                hasVideo: !!hasVideo,
                hasAudio: !!hasAudio,
                lastSeen: Date.now()
              });

              // 2. Trigger teacher notification if this is a newly started attempt stream
              if (isNewStream) {
                try {
                  const testObj = await TestModel.findOne({ id: test_id });
                  if (testObj) {
                    const msg = `Student '${username}' (${user_id}) has started attempting the test '${testObj.name}' with live video proctoring active.`;
                    
                    const alreadyNotified = await NotificationModel.findOne({
                      type: "student_attempt_started",
                      test_id: test_id,
                      message: { $regex: `\\(${user_id}\\)` }
                    });

                    if (!alreadyNotified) {
                      const testSubjects = Array.isArray(testObj.subject) ? testObj.subject : [testObj.subject];
                      const teachersList = await TeacherModel.find({
                        subject: { $in: testSubjects }
                      });
                      const targetTeachers = teachersList.length > 0 ? teachersList : await TeacherModel.find({});

                      for (const t of targetTeachers) {
                        await NotificationModel.create({
                          user_id: t.userId,
                          message: msg,
                          type: "student_attempt_started",
                          test_id: testObj.id,
                          test_name: testObj.name
                        });
                      }
                    }
                  }
                } catch (err) {
                  console.error("Failed to notify teachers on WebSocket stream start:", err);
                }
              }

              // 3. Relay frame update to all teachers monitoring this test_id
              const broadcastPayload = JSON.stringify({
                type: "frame_update",
                user_id,
                username,
                frame,
                screenFrame,
                hasVideo: !!hasVideo,
                hasAudio: !!hasAudio,
                lastSeen: Date.now()
              });

              for (const t of teachers) {
                if (t.test_id === test_id && t.ws.readyState === WebSocket.OPEN) {
                  t.ws.send(broadcastPayload);
                }
              }
            } else if (message.type === "chat_message") {
              const { text } = message;
              const chatPayload = JSON.stringify({
                type: "chat_message",
                sender_id: user_id,
                sender_name: username,
                text,
                timestamp: Date.now()
              });

              for (const t of teachers) {
                if (t.test_id === test_id && t.ws.readyState === WebSocket.OPEN) {
                  t.ws.send(chatPayload);
                }
              }
            }
          } catch (e) {
            // Silently ignore errors
          }
        });

        ws.on("close", () => {
          students.delete(studentConn);
          console.log(`[WS] Student '${username}' (${user_id}) disconnected`);

          // Notify teachers of the student disconnection
          const disconnectPayload = JSON.stringify({
            type: "student_disconnected",
            user_id
          });

          for (const t of teachers) {
            if (t.test_id === test_id && t.ws.readyState === WebSocket.OPEN) {
              t.ws.send(disconnectPayload);
            }
          }
        });

        ws.on("error", (err) => {
          console.error(`[WS] Student error for '${user_id}':`, err);
        });

      } else if (role === "teacher") {
        const teacherConn: TeacherConnection = { ws, test_id };
        teachers.add(teacherConn);

        console.log(`[WS] Teacher connected to monitor test '${test_id}'`);

        // Send initial list of active streams for this test
        const now = Date.now();
        const initialStreams = Array.from(activeStreams.values())
          .filter(val => val.test_id === test_id && (now - val.lastSeen <= 10000))
          .map(val => ({
            user_id: val.user_id,
            username: val.username,
            frame: val.frame,
            screenFrame: val.screenFrame,
            hasVideo: val.hasVideo,
            hasAudio: val.hasAudio,
            lastSeen: val.lastSeen
          }));

        ws.send(JSON.stringify({
          type: "initial_streams",
          streams: initialStreams
        }));

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === "chat_message") {
              const { target_user_id, text } = message;
              const chatPayload = JSON.stringify({
                type: "chat_message",
                sender: "Proctor",
                text,
                timestamp: Date.now()
              });

              if (target_user_id === "broadcast") {
                for (const s of students) {
                  if (s.test_id === test_id && s.ws.readyState === WebSocket.OPEN) {
                    s.ws.send(chatPayload);
                  }
                }
              } else {
                for (const s of students) {
                  if (s.test_id === test_id && s.user_id === target_user_id && s.ws.readyState === WebSocket.OPEN) {
                    s.ws.send(chatPayload);
                  }
                }
              }

              // Relay to other teachers monitoring this test
              if (target_user_id !== "broadcast") {
                const teacherRelayPayload = JSON.stringify({
                  type: "chat_message",
                  sender_id: target_user_id,
                  sender_name: "Proctor",
                  text,
                  timestamp: Date.now()
                });
                for (const t of teachers) {
                  if (t.test_id === test_id && t.ws !== ws && t.ws.readyState === WebSocket.OPEN) {
                    t.ws.send(teacherRelayPayload);
                  }
                }
              }
            }
          } catch (e) {
            // Ignore
          }
        });

        ws.on("close", () => {
          teachers.delete(teacherConn);
          console.log(`[WS] Teacher disconnected from monitoring test '${test_id}'`);
        });

        ws.on("error", (err) => {
          console.error(`[WS] Teacher error for test '${test_id}':`, err);
        });
      } else {
        ws.close(4002, "Invalid role parameter");
      }
    } catch (err) {
      console.error("Error establishing WebSocket client connection:", err);
      ws.close(5000, "Internal Server Error");
    }
  });
};
