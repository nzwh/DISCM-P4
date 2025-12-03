import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import {
  AuthenticatedUser,
  Course,
  Enrollment,
  EnrollmentWithCourse,
} from './types';

dotenv.config();

const PORT = process.env.PORT || 4002;
// __dirname is available in CommonJS (which we're using per tsconfig.json)
const PROTO_PATH = path.join(__dirname, '../proto/enroll.proto');

const supabase: SupabaseClient = createClient(
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

const enrollProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Authentication helper
async function authenticateToken(token: string): Promise<AuthenticatedUser | null> {
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

    return { ...user, profile } as AuthenticatedUser;
  } catch (error) {
    return null;
  }
}

// Implement service methods
const enrollService = {
  GetEnrollments: async (call: any, callback: any) => {
    try {
      const { token } = call.request;
      
      const user = await authenticateToken(token);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            id,
            code,
            name,
            semester,
            year
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'enrolled')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      const enrollments = (data as EnrollmentWithCourse[] || []).map((e: any) => ({
        id: e.id,
        student_id: e.student_id,
        course_id: e.course_id,
        status: e.status,
        enrolled_at: e.enrolled_at || '',
        created_at: e.created_at || '',
        updated_at: e.updated_at || '',
        courses: e.courses ? {
          id: e.courses.id,
          code: e.courses.code,
          name: e.courses.name,
          semester: e.courses.semester,
          year: e.courses.year
        } : null
      }));

      callback(null, { enrollments });
    } catch (error: any) {
      console.error('Error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to fetch enrollments'
      });
    }
  },

  Enroll: async (call: any, callback: any) => {
    try {
      const { token, course_id } = call.request;
      
      const user = await authenticateToken(token);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      if (user.profile?.role !== 'student') {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only students can enroll'
        });
      }

      // Check if course exists and is open
      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', course_id)
        .single();

      if (!course) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Course not found'
        });
      }

      const typedCourse = course as Course;

      if (!typedCourse.is_open) {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: 'Course is not open'
        });
      }

      // Check enrollment count
      const { count } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course_id)
        .eq('status', 'enrolled');

      if (count !== null && count >= typedCourse.max_students) {
        return callback({
          code: grpc.status.RESOURCE_EXHAUSTED,
          message: 'Course is full'
        });
      }

      // Check if already enrolled
      const { data: existing } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', course_id)
        .eq('status', 'enrolled')
        .maybeSingle();

      if (existing) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'Already enrolled'
        });
      }

      // Create enrollment
      const { data, error } = await supabase
        .from('enrollments')
        .insert([{
          student_id: user.id,
          course_id: course_id,
          status: 'enrolled'
        }])
        .select()
        .single();

      if (error) throw error;

      const enrollment = {
        id: data.id,
        student_id: data.student_id,
        course_id: data.course_id,
        status: data.status,
        enrolled_at: data.enrolled_at || '',
        created_at: data.created_at || '',
        updated_at: data.updated_at || ''
      };

      callback(null, {
        message: 'Enrolled successfully',
        enrollment: enrollment as Enrollment
      });
    } catch (error: any) {
      console.error('Error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to enroll'
      });
    }
  },

  Drop: async (call: any, callback: any) => {
    try {
      const { token, id } = call.request;
      
      const user = await authenticateToken(token);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('id', id)
        .single();

      if (!enrollment || enrollment.student_id !== user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Cannot drop this enrollment'
        });
      }

      const { error } = await supabase
        .from('enrollments')
        .update({ status: 'dropped' })
        .eq('id', id);

      if (error) throw error;

      callback(null, { message: 'Course dropped successfully' });
    } catch (error: any) {
      console.error('Error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to drop course'
      });
    }
  },

  HealthCheck: async (call: any, callback: any) => {
    callback(null, {
      status: 'healthy',
      service: 'enroll-service',
      timestamp: new Date().toISOString()
    });
  }
};

// Create and start server
const server = new grpc.Server();
server.addService(enrollProto.enroll.EnrollService.service, enrollService);

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (error: Error | null, port: number) => {
    if (error) {
      console.error('Failed to start server:', error);
      return;
    }
    console.log(`✅ Enrollment Service (gRPC) running on port ${port}`);
    console.log(`📊 Health check available via gRPC`);
    server.start();
  }
);
