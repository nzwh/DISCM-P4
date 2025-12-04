export interface User {
  id: string;
  email: string;
  profile?: Profile;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'faculty';
  created_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface Section {
  id: string;
  course_id: string;
  faculty_id: string;
  name: string;
  max_students: number;
  created_at?: string;
  semester: string;
  year: string;
  is_open: boolean;
}

export interface CreateCourseDto {
  code: string;
  name: string;
  description?: string;
  section_name?: string;
  max_students?: number;
  semester: string;
  year: string;
}