import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
// Types are defined in proto files now

dotenv.config();

const PORT = process.env.PORT || 4001;
// __dirname is available in CommonJS (which we're using per tsconfig.json)
const PROTO_PATH = path.join(__dirname, '../proto/course.proto');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const courseProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Authentication helper
async function authenticateToken(token: string): Promise<{ user: any; profile: any } | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { user, profile };
  } catch (error) {
    return null;
  }
}

// Implement service methods
const courseService = {
  GetCourses: async (call: any, callback: any) => {
    try {
      const { token } = call.request;
      
      const auth = await authenticateToken(token);
      if (!auth) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      // Get sections (which are the enrollable units) with course and faculty info
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          courses (
            id,
            code,
            name,
            description
          ),
          faculty:faculty_id (
            full_name,
            email
          )
        `)
        .eq('is_open', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const courses = (data || []).map((s: any) => ({
        id: s.id, // section id
        section_id: s.id,
        course_id: s.course_id,
        code: s.courses?.code || '',
        name: s.courses?.name || '',
        description: s.courses?.description || '',
        section_name: s.name || '',
        faculty_id: s.faculty_id || '',
        max_students: s.max_students,
        semester: s.semester,
        year: s.year,
        is_open: s.is_open,
        created_at: s.created_at,
        faculty: s.faculty ? {
          full_name: s.faculty.full_name,
          email: s.faculty.email
        } : null
      }));

      callback(null, { courses });
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to fetch courses'
      });
    }
  },

  GetCourse: async (call: any, callback: any) => {
    try {
      const { token, id } = call.request;
      
      const auth = await authenticateToken(token);
      if (!auth) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      // Get section (id is section_id now)
      const { data, error } = await supabase
        .from('sections')
        .select(`
          *,
          courses (
            id,
            code,
            name,
            description
          ),
          faculty:faculty_id (
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Section not found'
        });
      }

      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', id)
        .eq('status', 'enrolled');

      const course = {
        id: data.id, // section id
        section_id: data.id,
        course_id: data.course_id,
        code: data.courses?.code || '',
        name: data.courses?.name || '',
        description: data.courses?.description || '',
        section_name: data.name || '',
        faculty_id: data.faculty_id || '',
        max_students: data.max_students,
        semester: data.semester,
        year: data.year,
        is_open: data.is_open,
        created_at: data.created_at,
        faculty: data.faculty ? {
          full_name: data.faculty.full_name,
          email: data.faculty.email
        } : null
      };

      callback(null, { course, enrolled_count: count || 0 });
    } catch (error: any) {
      console.error('Error fetching course:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to fetch course'
      });
    }
  },

  CreateCourse: async (call: any, callback: any) => {
    try {
      const { token, code, name, description, section_name, max_students, semester, year } = call.request;
      
      const auth = await authenticateToken(token);
      if (!auth) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      if (auth.profile?.role !== 'faculty') {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only faculty can create courses'
        });
      }

      if (!code || !name || !semester || !year) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Missing required fields'
        });
      }

      // First, check if course exists, if not create it
      let { data: existingCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      let courseId: string;
      
      if (!existingCourse) {
        // Create new course
        const { data: newCourse, error: courseError } = await supabase
          .from('courses')
          .insert([{
            code,
            name,
            description: description || null
          }])
          .select()
          .single();

        if (courseError) {
          if (courseError.code === '23505') {
            return callback({
              code: grpc.status.ALREADY_EXISTS,
              message: 'Course code already exists'
            });
          }
          throw courseError;
        }
        courseId = newCourse.id;
      } else {
        courseId = existingCourse.id;
      }

      // Create section for this course
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .insert([{
          course_id: courseId,
          faculty_id: auth.user.id,
          name: section_name || `${code} Section`,
          max_students: max_students || 30,
          semester,
          year,
          is_open: true
        }])
        .select()
        .single();

      if (sectionError) throw sectionError;

      const course = {
        id: section.id, // return section id
        section_id: section.id,
        course_id: section.course_id,
        code: code,
        name: name,
        description: description || '',
        section_name: section.name,
        faculty_id: section.faculty_id,
        max_students: section.max_students,
        semester: section.semester,
        year: section.year,
        is_open: section.is_open,
        created_at: section.created_at,
        faculty: null
      };

      callback(null, {
        message: 'Course and section created successfully',
        course
      });
    } catch (error: any) {
      console.error('Error creating course:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to create course'
      });
    }
  },

  UpdateCourse: async (call: any, callback: any) => {
    try {
      const { token, id, name, description, section_name, max_students, is_open } = call.request;
      
      const auth = await authenticateToken(token);
      if (!auth) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      if (auth.profile?.role !== 'faculty') {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only faculty can update courses'
        });
      }

      // id is section_id now
      const { data: section } = await supabase
        .from('sections')
        .select('faculty_id, course_id')
        .eq('id', id)
        .single();

      if (!section || section.faculty_id !== auth.user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Cannot update this section'
        });
      }

      // Update section
      const sectionUpdateData: any = {};
      if (section_name !== undefined) sectionUpdateData.name = section_name;
      if (max_students !== undefined) sectionUpdateData.max_students = max_students;
      if (is_open !== undefined) sectionUpdateData.is_open = is_open;

      if (Object.keys(sectionUpdateData).length > 0) {
        const { error: sectionError } = await supabase
          .from('sections')
          .update(sectionUpdateData)
          .eq('id', id);

        if (sectionError) throw sectionError;
      }

      // Update course if name or description changed
      const courseUpdateData: any = {};
      if (name !== undefined) courseUpdateData.name = name;
      if (description !== undefined) courseUpdateData.description = description;

      if (Object.keys(courseUpdateData).length > 0) {
        const { error: courseError } = await supabase
          .from('courses')
          .update(courseUpdateData)
          .eq('id', section.course_id);

        if (courseError) throw courseError;
      }

      // Fetch updated data
      const { data: updatedSection, error: fetchError } = await supabase
        .from('sections')
        .select(`
          *,
          courses (
            id,
            code,
            name,
            description
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const updatedCourse = {
        id: updatedSection.id,
        section_id: updatedSection.id,
        course_id: updatedSection.course_id,
        code: updatedSection.courses?.code || '',
        name: updatedSection.courses?.name || '',
        description: updatedSection.courses?.description || '',
        section_name: updatedSection.name,
        faculty_id: updatedSection.faculty_id || '',
        max_students: updatedSection.max_students,
        semester: updatedSection.semester,
        year: updatedSection.year,
        is_open: updatedSection.is_open,
        created_at: updatedSection.created_at,
        faculty: null
      };

      callback(null, {
        message: 'Course updated successfully',
        course: updatedCourse
      });
    } catch (error: any) {
      console.error('Error updating course:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to update course'
      });
    }
  },

  HealthCheck: async (call: any, callback: any) => {
    callback(null, {
      status: 'healthy',
      service: 'course-service',
      timestamp: new Date().toISOString()
    });
  }
};

// Create and start server
const server = new grpc.Server();
server.addService(courseProto.course.CourseService.service, courseService);

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (error: Error | null, port: number) => {
    if (error) {
      console.error('Failed to start server:', error);
      return;
    }
    console.log(`✅ Course Service (gRPC) running on port ${port}`);
    console.log(`📊 Health check available via gRPC`);
    server.start();
  }
);
