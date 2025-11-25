import { query } from "./database"
import {
  validateCourses,
  getCourseTimetables,
  getStudentCurrentTimetables,
  detectTimetableConflicts,
} from "./validation"
import type { EnrollmentResult } from "./types"

/**
 * Save student course selections with comprehensive validation
 * @param studentId - The student's ID
 * @param courseIds - Array of course IDs to enroll in
 * @returns EnrollmentResult with success status and details
 */
export async function saveStudentCourseSelection(studentId: string, courseIds: number[]): Promise<EnrollmentResult> {
  // Validate input
  if (!studentId || !studentId.trim()) {
    return {
      success: false,
      message: "Invalid student ID provided",
    }
  }

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return {
      success: false,
      message: "At least one course must be selected",
    }
  }

  // Remove duplicates
  const uniqueCourseIds = [...new Set(courseIds)]

  try {
    // Get student and college info
    const studentResult = await query("SELECT id, college_id FROM students WHERE student_id = $1", [studentId])

    if (studentResult.rows.length === 0) {
      return {
        success: false,
        message: `Student with ID ${studentId} not found`,
      }
    }

    const { id: dbStudentId, college_id: collegeId } = studentResult.rows[0]

    // Validate courses
    const courseValidation = await validateCourses(uniqueCourseIds, collegeId)

    if (courseValidation.invalid.length > 0) {
      return {
        success: false,
        message: `Invalid courses for this college: ${courseValidation.invalid.join(", ")}`,
        failedCourses: courseValidation.invalid.map((id) => ({
          courseId: id,
          reason: "Course not found or does not belong to student's college",
        })),
      }
    }

    // Get timetables for new courses
    const newCourseTimetables = await getCourseTimetables(courseValidation.valid)

    // Check if any courses have no timetable
    const coursesWithoutTimetable = courseValidation.valid.filter(
      (courseId) => !newCourseTimetables.has(courseId) || newCourseTimetables.get(courseId)!.length === 0,
    )

    if (coursesWithoutTimetable.length > 0) {
      return {
        success: false,
        message: `Courses without timetable cannot be enrolled: ${coursesWithoutTimetable.join(", ")}`,
        failedCourses: coursesWithoutTimetable.map((courseId) => ({
          courseId,
          reason: "No timetable defined for this course",
        })),
      }
    }

    // Get student's current timetables
    const currentTimetables = await getStudentCurrentTimetables(dbStudentId)

    // Detect conflicts
    const conflicts = detectTimetableConflicts(currentTimetables, newCourseTimetables)

    if (conflicts.size > 0) {
      const failedCourses = Array.from(conflicts.entries()).map(([courseId, reason]) => ({
        courseId,
        reason,
      }))

      return {
        success: false,
        message: "Timetable conflict detected with selected courses",
        failedCourses,
      }
    }

    // All validations passed - save enrollments
    const enrolledCourses: number[] = []

    for (const courseId of courseValidation.valid) {
      try {
        await query(
          `INSERT INTO student_course_selections (student_id, course_id)
           VALUES ($1, $2)
           ON CONFLICT (student_id, course_id) DO NOTHING`,
          [dbStudentId, courseId],
        )
        enrolledCourses.push(courseId)
      } catch (error) {
        // Log error but continue with other courses
        console.error(`Failed to enroll course ${courseId}:`, error)
      }
    }

    return {
      success: true,
      message: `Successfully enrolled in ${enrolledCourses.length} course(s)`,
      enrolledCourses,
    }
  } catch (error) {
    console.error("Enrollment error:", error)
    return {
      success: false,
      message: "An unexpected error occurred during enrollment",
    }
  }
}

/**
 * Remove student from a course
 */
export async function removeStudentFromCourse(studentId: string, courseId: number): Promise<EnrollmentResult> {
  try {
    const studentResult = await query("SELECT id FROM students WHERE student_id = $1", [studentId])

    if (studentResult.rows.length === 0) {
      return {
        success: false,
        message: `Student with ID ${studentId} not found`,
      }
    }

    const dbStudentId = studentResult.rows[0].id

    const result = await query("DELETE FROM student_course_selections WHERE student_id = $1 AND course_id = $2", [
      dbStudentId,
      courseId,
    ])

    if (result.rowCount === 0) {
      return {
        success: false,
        message: "Student is not enrolled in this course",
      }
    }

    return {
      success: true,
      message: "Successfully removed from course",
    }
  } catch (error) {
    console.error("Removal error:", error)
    return {
      success: false,
      message: "An unexpected error occurred while removing from course",
    }
  }
}

/**
 * Get student's enrolled courses
 */
export async function getStudentEnrolledCourses(studentId: string) {
  try {
    const result = await query(
      `SELECT c.id, c.code, c.name, t.day_of_week, t.start_time, t.end_time
       FROM student_course_selections scs
       JOIN courses c ON scs.course_id = c.id
       LEFT JOIN timetables t ON c.id = t.course_id
       WHERE scs.student_id = (SELECT id FROM students WHERE student_id = $1)
       ORDER BY c.code, t.day_of_week, t.start_time`,
      [studentId],
    )

    return result.rows
  } catch (error) {
    console.error("Query error:", error)
    return []
  }
}
