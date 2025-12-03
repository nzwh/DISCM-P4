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

      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          faculty:faculty_id (
            full_name,
            email
          )
        `)
        .eq('is_open', true)
        .order('code');

      if (error) throw error;

      const courses = (data || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description || '',
        faculty_id: c.faculty_id || '',
        max_students: c.max_students,
        semester: c.semester,
        year: c.year,
        is_open: c.is_open,
        created_at: c.created_at,
        faculty: c.faculty ? {
          full_name: c.faculty.full_name,
          email: c.faculty.email
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

      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
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
          message: 'Course not found'
        });
      }

      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', id)
        .eq('status', 'enrolled');

      const course = {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || '',
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
      const { token, code, name, description, max_students, semester, year } = call.request;
      
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

      const { data, error } = await supabase
        .from('courses')
        .insert([{
          code,
          name,
          description: description || null,
          faculty_id: auth.user.id,
          max_students: max_students || 30,
          semester,
          year,
          is_open: true
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: 'Course code already exists'
          });
        }
        throw error;
      }

      const course = {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || '',
        faculty_id: data.faculty_id || '',
        max_students: data.max_students,
        semester: data.semester,
        year: data.year,
        is_open: data.is_open,
        created_at: data.created_at,
        faculty: null
      };

      callback(null, {
        message: 'Course created successfully',
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
      const { token, id, name, description, max_students, is_open } = call.request;
      
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

      const { data: course } = await supabase
        .from('courses')
        .select('faculty_id')
        .eq('id', id)
        .single();

      if (!course || course.faculty_id !== auth.user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Cannot update this course'
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (max_students !== undefined) updateData.max_students = max_students;
      if (is_open !== undefined) updateData.is_open = is_open;

      const { data, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedCourse = {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || '',
        faculty_id: data.faculty_id || '',
        max_students: data.max_students,
        semester: data.semester,
        year: data.year,
        is_open: data.is_open,
        created_at: data.created_at,
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
