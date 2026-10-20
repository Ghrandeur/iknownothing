import { applications } from "@/db/schema";

type ApplicationRow = typeof applications.$inferSelect;

export function applicationsToCsv(rows: ApplicationRow[]) {
  const headers = [
    "applicationNumber",
    "status",
    "paymentStatus",
    "title",
    "firstName",
    "lastName",
    "email",
    "phone",
    "dateOfBirth",
    "age",
    "stateOfOrigin",
    "lga",
    "nationality",
    "occupation",
    "city",
    "educationLevel",
    "institution",
    "courseOfStudy",
    "graduationYear",
    "height",
    "bust",
    "waist",
    "hips",
    "dressSize",
    "hairColor",
    "eyeColor",
    "talents",
    "hobbies",
    "languages",
    "platformSource",
    "whyParticipate",
    "advocacyInterest",
    "communityProject",
    "leadershipExperience",
    "socialImpact",
    "careerGoals",
    "emergencyName",
    "emergencyPhone",
    "emergencyRelationship",
    "idDocumentPath",
    "headshotPath",
    "fullBodyPath",
    "amountPaid",
    "createdAt",
  ];

  const escape = (val: unknown) => {
    const str = val == null ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h as keyof ApplicationRow])).join(",")),
  ];
  return lines.join("\n");
}
