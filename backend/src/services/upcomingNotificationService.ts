import { TestModel, NotificationModel, StudentModel } from "../models/index.js";

export const startUpcomingNotificationJob = () => {
  // Check every 10 seconds
  setInterval(async () => {
    try {
      const now = new Date().getTime();
      const fiveMinutesFromNow = now + 5 * 60 * 1000;

      // Find all live or scheduled tests
      const tests = await TestModel.find({
        status: { $in: ["live", "scheduled"] }
      });

      for (const test of tests) {
        if (!test.start_time) continue;
        const start = new Date(test.start_time).getTime();
        if (isNaN(start)) continue;

        const lateEntryMinutes = test.lateEntryTime !== undefined ? Number(test.lateEntryTime) : 0;
        const lateEntryCutoff = start + lateEntryMinutes * 60 * 1000;
        if (now > lateEntryCutoff) {
          continue;
        }
        if (start > now && start <= fiveMinutesFromNow) {
          const alreadyNotifiedUpcoming = await NotificationModel.findOne({
            test_id: test.id,
            type: "test_upcoming"
          });

          if (!alreadyNotifiedUpcoming) {
            console.log(`Sending upcoming notification (5 mins before) for test: ${test.name}`);
            let query = {};
            if (test.class) {
              if (test.class.includes("-sem-")) {
                const parts = test.class.split("-sem-");
                const program_id = parts[0];
                const clean_program_id = program_id.startsWith("program-") ? program_id.replace("program-", "") : program_id;
                const prefixed_program_id = `program-${clean_program_id}`;
                const semester = parseInt(parts[1], 10);
                query = {
                  $or: [
                    { class: test.class },
                    { program_id: program_id, semester },
                    { program_id: clean_program_id, semester },
                    { program_id: prefixed_program_id, semester }
                  ]
                };
              } else {
                query = { class: test.class };
              }
            }
            const students = await StudentModel.find(query);
            for (const student of students) {
              const rawStudent = student.toObject({ defaults: false } as any) as any;
              const studentJoined = rawStudent.joined_at ? new Date(rawStudent.joined_at).getTime() : student._id.getTimestamp().getTime();
              if (start < studentJoined) {
                continue;
              }
              await NotificationModel.create({
                user_id: student.userId,
                message: `Upcoming test '${test.name}' will start in 5 minutes.`,
                type: "test_upcoming",
                test_id: test.id,
                test_name: test.name,
                organization_id: test.organization_id || student.organization_id
              });
            }
          }
        }

        // 2. Send live notification (2 minutes before the test starts)
        const twoMinutesBeforeStart = start - 2 * 60 * 1000;
        if (now >= twoMinutesBeforeStart && (!test.end_time || new Date(test.end_time).getTime() > now)) {
          const alreadyNotifiedLive = await NotificationModel.findOne({
            test_id: test.id,
            type: "test_live"
          });

          if (!alreadyNotifiedLive) {
            console.log(`Sending live notification (2 mins before) for test: ${test.name}`);
            let query = {};
            if (test.class) {
              if (test.class.includes("-sem-")) {
                const parts = test.class.split("-sem-");
                const program_id = parts[0];
                const clean_program_id = program_id.startsWith("program-") ? program_id.replace("program-", "") : program_id;
                const prefixed_program_id = `program-${clean_program_id}`;
                const semester = parseInt(parts[1], 10);
                query = {
                  $or: [
                    { class: test.class },
                    { program_id: program_id, semester },
                    { program_id: clean_program_id, semester },
                    { program_id: prefixed_program_id, semester }
                  ]
                };
              } else {
                query = { class: test.class };
              }
            }
            const students = await StudentModel.find(query);
            for (const student of students) {
              const rawStudent = student.toObject({ defaults: false } as any) as any;
              const studentJoined = rawStudent.joined_at ? new Date(rawStudent.joined_at).getTime() : student._id.getTimestamp().getTime();
              if (start < studentJoined) {
                continue;
              }
              await NotificationModel.create({
                user_id: student.userId,
                message: `Upcoming test '${test.name}' starts in 2 minutes. Get ready!`,
                type: "test_live",
                test_id: test.id,
                test_name: test.name,
                organization_id: test.organization_id || student.organization_id
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Upcoming notification background check failed:", err);
    }
  }, 10000);
};
