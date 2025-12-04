import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  role: 'student' | 'faculty' | 'admin';
  created_at?: string;
  updated_at?: string;
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

export interface Enrollment {
  id: string;
  student_id: string;
  section_id: string;
  status: 'enrolled' | 'dropped';
  enrolled_at?: string;
}

export interface EnrollmentWithCourse extends Enrollment {
  courses: Course & {
    semester: string;
    year: string;
  };
}

export interface AuthenticatedUser extends User {
  profile?: Profile | null;
}

export interface EnrollRequest {
  course_id: string;
}