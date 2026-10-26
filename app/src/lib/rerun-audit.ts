/** Sentence stored on the audit log when an administrator re-runs checks. */
export function rerunFinishedSummary(grade: { letter: string; score: number } | null): string {
  if (!grade) return "Checks finished. No new grade was stored.";
  return `Checks finished. Grade ${grade.letter} (${grade.score}). The same grade is on this file and on the application.`;
}

/**
 * Fields copied onto the verification run. `score` is what the audit list prints.
 * It stays equal to the grade on the file.
 */
export function rerunGradeFields(grade: { letter: string; score: number; confidence: string; recommendation: string }): {
  score: number;
  gradeLetter: string;
  gradeScore: number;
  gradeConfidence: string;
  recommendation: string;
} {
  return {
    score: grade.score,
    gradeLetter: grade.letter,
    gradeScore: grade.score,
    gradeConfidence: grade.confidence,
    recommendation: grade.recommendation,
  };
}

/** Latest score for the audit list. The graded score is the one on the file. */
export function auditRunScore(row: { score?: number | null; gradeScore?: number | null }): number | null {
  if (typeof row.gradeScore === "number") return row.gradeScore;
  return typeof row.score === "number" ? row.score : null;
}
