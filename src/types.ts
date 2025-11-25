export interface College {
  id: number
  name: string
  createdAt: Date
}

export interface Student {
  id: number
  studentId: string
  name: string
  collegeId: number
  createdAt: Date
}

export interface Course {
  id: number
  code: string
  name: string
  collegeId: number
  createdAt: Date
}

export interface Timetable {
  id: number
  courseId: number
  dayOfWeek: DayOfWeek
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  createdAt: Date
}

export interface StudentCourseSelection {
  id: number
  studentId: number
  courseId: number
  enrolledAt: Date
}

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"

export interface EnrollmentResult {
  success: boolean
  message: string
  enrolledCourses?: number[]
  failedCourses?: Array<{
    courseId: number
    reason: string
  }>
}

export interface TimeSlot {
  day: DayOfWeek
  startTime: string
  endTime: string
}

export interface ValidationError {
  code: string
  message: string
  details?: any
}
