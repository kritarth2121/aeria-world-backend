import { query } from "./database"
import type { DayOfWeek } from "./types"

/**
 * Add timetable slot for a course
 */
export async function addCourseTimetable(
  courseId: number,
  dayOfWeek: DayOfWeek,
  startTime: string,
  endTime: string,
): Promise<{ success: boolean; message: string; slotId?: number }> {
  try {
    // Validate course exists
    const courseResult = await query("SELECT id, college_id FROM courses WHERE id = $1", [courseId])

    if (courseResult.rows.length === 0) {
      return { success: false, message: "Course not found" }
    }

    // Validate time format
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return { success: false, message: "Invalid time format. Use HH:MM" }
    }

    if (startTime >= endTime) {
      return { success: false, message: "Start time must be before end time" }
    }

    const result = await query(
      `INSERT INTO timetables (course_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3::time, $4::time)
       RETURNING id`,
      [courseId, dayOfWeek, startTime, endTime],
    )

    return {
      success: true,
      message: "Timetable slot added successfully",
      slotId: result.rows[0].id,
    }
  } catch (error) {
    console.error("Add timetable error:", error)
    return { success: false, message: "Failed to add timetable slot" }
  }
}

/**
 * Update course timetable with conflict checking
 */
export async function updateCourseTimetable(
  timetableId: number,
  dayOfWeek?: DayOfWeek,
  startTime?: string,
  endTime?: string,
): Promise<{ success: boolean; message: string; conflictingStudents?: string[] }> {
  try {
    // Get current timetable
    const currentResult = await query(
      "SELECT course_id, day_of_week, start_time, end_time FROM timetables WHERE id = $1",
      [timetableId],
    )

    if (currentResult.rows.length === 0) {
      return { success: false, message: "Timetable slot not found" }
    }

    const current = currentResult.rows[0]
    const newDay = dayOfWeek || current.day_of_week
    const newStart = startTime || current.start_time
    const newEnd = endTime || current.end_time

    // Validate new time
    if (newStart >= newEnd) {
      return { success: false, message: "Start time must be before end time" }
    }

    // Check for conflicts with enrolled students
    const conflictResult = await query(
      `SELECT DISTINCT s.student_id
       FROM student_course_selections scs
       JOIN students s ON scs.student_id = s.id
       JOIN timetables t ON scs.course_id = t.course_id
       WHERE scs.course_id = $1
       AND t.id != $2
       AND t.day_of_week = $3
       AND t.start_time < $5::time
       AND t.end_time > $4::time`,
      [current.course_id, timetableId, newDay, newStart, newEnd],
    )

    const conflictingStudents = conflictResult.rows.map((row) => row.student_id)

    if (conflictingStudents.length > 0) {
      return {
        success: false,
        message: `Cannot update: ${conflictingStudents.length} student(s) would have conflicting schedules`,
        conflictingStudents,
      }
    }

    // Update timetable
    await query(
      `UPDATE timetables 
       SET day_of_week = $1, start_time = $2::time, end_time = $3::time
       WHERE id = $4`,
      [newDay, newStart, newEnd, timetableId],
    )

    return { success: true, message: "Timetable updated successfully" }
  } catch (error) {
    console.error("Update timetable error:", error)
    return { success: false, message: "Failed to update timetable" }
  }
}

/**
 * Delete course timetable slot
 */
export async function deleteTimetableSlot(timetableId: number): Promise<{ success: boolean; message: string }> {
  try {
    const result = await query("DELETE FROM timetables WHERE id = $1", [timetableId])

    if (result.rowCount === 0) {
      return { success: false, message: "Timetable slot not found" }
    }

    return { success: true, message: "Timetable slot deleted successfully" }
  } catch (error) {
    console.error("Delete timetable error:", error)
    return { success: false, message: "Failed to delete timetable slot" }
  }
}

/**
 * Helper function to validate time format
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}
