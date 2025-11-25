import { query } from "./database"
import type { DayOfWeek, TimeSlot } from "./types"

/**
 * Check if two time slots overlap
 */
function doTimesSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day !== slot2.day) {
    return false
  }

  const start1 = timeToMinutes(slot1.startTime)
  const end1 = timeToMinutes(slot1.endTime)
  const start2 = timeToMinutes(slot2.startTime)
  const end2 = timeToMinutes(slot2.endTime)

  return start1 < end2 && start2 < end1
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/**
 * Validate student exists and belongs to college
 */
export async function validateStudent(studentId: string, collegeId: number): Promise<{ id: number } | null> {
  const result = await query("SELECT id FROM students WHERE student_id = $1 AND college_id = $2", [
    studentId,
    collegeId,
  ])
  return result.rows[0] || null
}

/**
 * Validate courses exist and belong to college
 */
export async function validateCourses(
  courseIds: number[],
  collegeId: number,
): Promise<{ valid: number[]; invalid: number[] }> {
  if (courseIds.length === 0) {
    return { valid: [], invalid: [] }
  }

  const placeholders = courseIds.map((_, i) => `$${i + 1}`).join(",")
  const result = await query(
    `SELECT id FROM courses WHERE id IN (${placeholders}) AND college_id = $${courseIds.length + 1}`,
    [...courseIds, collegeId],
  )

  const validIds = new Set(result.rows.map((row) => row.id))
  const invalid = courseIds.filter((id) => !validIds.has(id))

  return {
    valid: courseIds.filter((id) => validIds.has(id)),
    invalid,
  }
}

/**
 * Get timetable for courses
 */
export async function getCourseTimetables(courseIds: number[]): Promise<Map<number, TimeSlot[]>> {
  if (courseIds.length === 0) {
    return new Map()
  }

  const placeholders = courseIds.map((_, i) => `$${i + 1}`).join(",")
  const result = await query(
    `SELECT course_id, day_of_week, start_time, end_time 
     FROM timetables 
     WHERE course_id IN (${placeholders})
     ORDER BY course_id, day_of_week, start_time`,
    courseIds,
  )

  const timetables = new Map<number, TimeSlot[]>()
  result.rows.forEach((row) => {
    if (!timetables.has(row.course_id)) {
      timetables.set(row.course_id, [])
    }
    timetables.get(row.course_id)!.push({
      day: row.day_of_week as DayOfWeek,
      startTime: row.start_time,
      endTime: row.end_time,
    })
  })

  return timetables
}

/**
 * Get student's current course timetables
 */
export async function getStudentCurrentTimetables(studentId: number): Promise<TimeSlot[]> {
  const result = await query(
    `SELECT DISTINCT t.day_of_week, t.start_time, t.end_time
     FROM timetables t
     JOIN student_course_selections scs ON t.course_id = scs.course_id
     WHERE scs.student_id = $1
     ORDER BY t.day_of_week, t.start_time`,
    [studentId],
  )

  return result.rows.map((row) => ({
    day: row.day_of_week as DayOfWeek,
    startTime: row.start_time,
    endTime: row.end_time,
  }))
}

/**
 * Detect timetable conflicts
 */
export function detectTimetableConflicts(
  existingSlots: TimeSlot[],
  newCourses: Map<number, TimeSlot[]>,
): Map<number, string> {
  const conflicts = new Map<number, string>()

  for (const [courseId, slots] of newCourses.entries()) {
    for (const newSlot of slots) {
      // Check against existing enrollments
      for (const existingSlot of existingSlots) {
        if (doTimesSlotsOverlap(newSlot, existingSlot)) {
          conflicts.set(
            courseId,
            `Conflicts with existing enrollment on ${existingSlot.day} ${existingSlot.startTime}-${existingSlot.endTime}`,
          )
          break
        }
      }

      if (conflicts.has(courseId)) break

      // Check against other new courses being enrolled
      for (const [otherCourseId, otherSlots] of newCourses.entries()) {
        if (courseId === otherCourseId) continue
        if (conflicts.has(courseId)) break

        for (const otherSlot of otherSlots) {
          if (doTimesSlotsOverlap(newSlot, otherSlot)) {
            conflicts.set(
              courseId,
              `Conflicts with ${otherCourseId} on ${otherSlot.day} ${otherSlot.startTime}-${otherSlot.endTime}`,
            )
            break
          }
        }
      }
    }
  }

  return conflicts
}
