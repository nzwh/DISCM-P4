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
  faculty_id?: string;
  max_students: number;
  semester: string;
  year: number;
  is_open: boolean;
  created_at: string;
}

export interface CreateCourseDto {
  code: string;
  name: string;
  description?: string;
  max_students?: number;
  semester: string;
  year: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}