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

export interface Grade {
  id: string;
  enrollment_id: string;
  grade: string;
  percentage?: number;
  remarks?: string;
  uploaded_by: string;
  created_at: string;
}

export interface UploadGradeDto {
  enrollment_id: string;
  grade: string;
  percentage?: number;
  remarks?: string;
}

export interface UpdateGradeDto {
  grade?: string;
  percentage?: number;
  remarks?: string;
}