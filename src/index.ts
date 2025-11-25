import { initializeDatabase, closeDatabase } from "./database"
import { saveStudentCourseSelection, getStudentEnrolledCourses, removeStudentFromCourse } from "./enrollment-service"
import { addCourseTimetable } from "./admin-service"

// Example usage
async function main() {
  const DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/enrollment_db"

  try {
    initializeDatabase(DATABASE_URL)
    console.log("Database initialized")

    // Example: Save student course selection
    const result = await saveStudentCourseSelection("STU001", [1, 2, 3])
    console.log("Enrollment result:", result)

    // Example: Get student enrolled courses
    const courses = await getStudentEnrolledCourses("STU001")
    console.log("Enrolled courses:", courses)

    // Example: Remove from course
    const removeResult = await removeStudentFromCourse("STU001", 1)
    console.log("Removal result:", removeResult)

    // Example: Add timetable slot
    const timetableResult = await addCourseTimetable(1, "Monday", "09:00", "10:30")
    console.log("Timetable result:", timetableResult)
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await closeDatabase()
  }
}

main()
