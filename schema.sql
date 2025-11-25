-- Colleges Table
CREATE TABLE colleges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  college_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
);

-- Courses Table
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  college_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
  UNIQUE(code, college_id)
);

-- Timetable Table
CREATE TABLE timetables (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL,
  day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CHECK (end_time > start_time)
);

-- Student Course Selections Table
CREATE TABLE student_course_selections (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE(student_id, course_id)
);

-- Indexes for performance
CREATE INDEX idx_students_college ON students(college_id);
CREATE INDEX idx_courses_college ON courses(college_id);
CREATE INDEX idx_timetables_course ON timetables(course_id);
CREATE INDEX idx_selections_student ON student_course_selections(student_id);
CREATE INDEX idx_selections_course ON student_course_selections(course_id);
