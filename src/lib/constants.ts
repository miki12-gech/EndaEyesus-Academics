export const ACADEMIC_YEARS = [
  "2ኛ ዓመት (2nd Year)",
  "3ኛ ዓመት (3rd Year)",
  "4ኛ ዓመት (4th Year)",
  "5ኛ ዓመት (5th Year)",
  "6ኛ ዓመት (6th Year)",
  "ተመራቂ (GC / Graduating Class)",
] as const;

export const COLLEGES = [
  "EIT-M (የምሕንድስናና ቴክኖሎጂ ኢንስቲትዩት)",
  "CNCS (የተፈጥሮና ቀመር ሳይንስ ኮሌጅ)",
  "CDANR (የደረቅ መሬት እርሻና ተፈጥሮ ሀብት ኮሌጅ)",
  "CSSL (የማኅበራዊ ሳይንስና ቋንቋዎች ኮሌጅ)",
  "CLG (የሕግና አስተዳደር ኮሌጅ)",
  "CBE (የቢዝነስና ኢኮኖሚክስ ኮሌጅ)",
  "CVM (የእንስሳት ሕክምና ኮሌጅ)",
  "CHS (የጤና ሳይንስ ኮሌጅ)",
  "ሌላ (Other)",
] as const;

export const SERVICE_ROLES = [
  "ዋና ክፍል (Main Dept. Head/Member)",
  "ንዑስ ክፍል (Sub-Committee)",
  "አገልጋይ / አስተባባሪ (Active Servant)",
  "አባል ብቻ (Regular Member)",
] as const;

export const SERVICE_DEPARTMENTS = [
  "ፅሕፈት ቤት",
  "ትምህርት",
  "መዝሙር እና ኪነጥበብ",
  "ሞያና አገልግሎት",
  "ልማት",
  "ኦዲት እና ኢንስፔክሽን",
  "ባችና ማስተባበርያ",
  "አባላት ጉዳይ",
  "አባል ብቻ (ክፍል የለኝም)",
  "ሌላ (Other)",
] as const;

export const CGPA_RANGES = [
  "3.75 – 4.00 (ከፍተኛ / Great Distinction)",
  "3.25 – 3.74 (በጣም ጥሩ / Distinction)",
  "2.75 – 3.24 (ጥሩ / Good Standing)",
  "2.00 – 2.74 (መካከለኛ / Pass)",
  "ከ2.00 በታች (Warning / ልዩ ድጋፍ የሚፈልግ)",
  "መግለጽ አልፈልግም",
] as const;

export const ACADEMIC_CHALLENGES = [
  "የተደገመ ኮርስ (F / D) አለብኝ",
  "የአገልግሎትና የትምህርት ጊዜ መጣበብ",
  "የMajor ኮርሶች ከባድ መሆን",
  "የመውጫ ፈተና (Exit Exam) ዝግጅት ጭንቀት",
  "የመመረቂያ ጽሑፍ (Thesis / Senior Project) እገዛ",
  "የትምህርት ቁሳቁስ / ኮፒ / ኢኮኖሚ ድጋፍ",
  "ምንም ችግር የለብኝም",
  "ሌላ (Other)",
] as const;

export const SUPPORT_NEEDS = [
  "የMajor ኮርስ ቲቶሪያል ወይም የጥናት ቡድን",
  "የExit Exam ዝግጅትና Mock Test",
  "የThesis / Project የመምህራን እገዛ",
  "የሶፍትዌርና ሙያ ሥልጠና (Programming, AutoCAD, SPSS...)",
  "የአካዳሚክ ምክርና የጊዜ አጠቃቀም ድጋፍ",
  "የመጻሕፍት፣ ሃንድአውትና Past Exam ድጋፍ",
  "ሌላ (Other)",
] as const;

export const RED_FLAG_CHALLENGES = new Set<string>([
  "የተደገመ ኮርስ (F / D) አለብኝ",
  "የአገልግሎትና የትምህርት ጊዜ መጣበብ",
  "የትምህርት ቁሳቁስ / ኮፒ / ኢኮኖሚ ድጋፍ",
]);

export const RED_FLAG_CGPA = "ከ2.00 በታች (Warning / ልዩ ድጋፍ የሚፈልግ)";

export interface AcademicProfilePayload {
  fullName: string;
  phoneNumber: string;
  gender: string;
  academicYear: string;
  college: string;
  collegeOther?: string;
  department: string;
  residence: string;
  dormInfo?: string;
  serviceRole: string;
  serviceDept: string;
  serviceDeptOther?: string;
  cgpaRange: string;
  challenges: string[];
  challengeOther?: string;
  supportNeeds: string[];
  supportOther?: string;
  canHelpWith?: string;
  additionalNotes?: string;
}

export interface AcademicProfileRow {
  id: number;
  telegram_id: string;
  telegram_username: string | null;
  full_name: string;
  phone_number: string;
  gender: string;
  academic_year: string;
  college: string;
  college_other: string | null;
  department: string;
  residence: string;
  dorm_info: string | null;
  service_role: string;
  service_dept: string;
  service_dept_other: string | null;
  cgpa_range: string;
  challenges: string[];
  challenge_other: string | null;
  support_needs: string[];
  support_other: string | null;
  can_help_with: string | null;
  additional_notes: string | null;
  is_red_flag: boolean;
  created_at: string;
  updated_at: string;
}
