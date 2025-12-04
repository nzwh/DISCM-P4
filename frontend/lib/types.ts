class Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;

  constructor(data: Partial<Profile> = {}) {
    this.id = data.id || '';
    this.email = data.email || '';
    this.full_name = data.full_name || '';
    this.role = data.role || '';
    this.created_at = data.created_at || '';
    this.updated_at = data.updated_at || '';
  }
}

class Course {
  id: string;
  code: string;
  name: string;
  description: string;

  max_students: number;
  semester: string;
  year: number;
  
  is_open: boolean;
  created_at: string;
  faculty_id: string;

  constructor(data: Partial<Course> = {}) {
    this.id = data.id || '';
    this.code = data.code || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.max_students = data.max_students || 0;
    this.semester = data.semester || '';
    this.year = data.year || new Date().getFullYear();
    this.is_open = data.is_open || false;
    this.created_at = data.created_at || '';
    this.faculty_id = data.faculty_id || '';
  }
}

export { Profile, Course };