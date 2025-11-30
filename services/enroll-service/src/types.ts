import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  year: number;
  is_open: boolean;
  max_students: number;
  created_at?: string;
  updated_at?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  status: 'enrolled' | 'dropped';
  enrolled_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnrollmentWithCourse extends Enrollment {
  courses: Course;
}

export interface AuthenticatedUser extends User {
  profile?: Profile | null;
}

export interface EnrollRequest {
  course_id: string;
}