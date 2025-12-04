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
        .from('students')
        .select(`
          *,
          sections!inner (
            id,
            name,
            semester,
            year,
            courses (
              id,
              code,
              name
            )
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'enrolled')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      const enrollments = (data as EnrollmentWithCourse[] || []).map((e: any) => ({
        id: e.id,
        student_id: e.student_id,
        section_id: e.section_id,
        status: e.status,
        enrolled_at: e.enrolled_at || '',
        courses: e.sections?.courses ? {
          id: e.sections.courses.id,
          code: e.sections.courses.code,
          name: e.sections.courses.name,
          semester: e.sections.semester,
          year: e.sections.year
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
      const { token, section_id } = call.request;
      
      // Support backward compatibility: if course_id is provided, we need to find a section
      // For now, we'll require section_id
      if (!section_id) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'section_id is required'
        });
      }
      
      const user = await authenticateToken(token);
      if (!user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      // Allow both students and faculty to enroll
      if (user.profile?.role !== 'student' && user.profile?.role !== 'faculty') {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Only students and faculty can enroll'
        });
      }

      // Check if section exists and is open
      const { data: section } = await supabase
        .from('sections')
        .select('*, course_id')
        .eq('id', section_id)
        .single();

      if (!section) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Section not found'
        });
      }

      if (!section.is_open) {
        return callback({
          code: grpc.status.FAILED_PRECONDITION,
          message: 'Section is not open'
        });
      }

      // Check enrollment count
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', section_id)
        .eq('status', 'enrolled');

      if (count !== null && count >= section.max_students) {
        return callback({
          code: grpc.status.RESOURCE_EXHAUSTED,
          message: 'Section is full'
        });
      }

      // Check if student is already enrolled in ANY section of the same course
      const { data: existingCourseEnrollment } = await supabase
        .from('students')
        .select(`
          *,
          sections!inner (
            id,
            course_id
          )
        `)
        .eq('student_id', user.id)
        .eq('sections.course_id', section.course_id)
        .eq('status', 'enrolled')
        .maybeSingle();

      if (existingCourseEnrollment) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'You are already enrolled in another section of this course'
        });
      }

      // Check if enrollment already exists in this specific section (any status)
      const { data: existing } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', user.id)
        .eq('section_id', section_id)
        .maybeSingle();

      if (existing) {
        // If already enrolled in this section, return error
        if (existing.status === 'enrolled') {
          return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: 'Already enrolled in this section'
          });
        }
        
        // If previously dropped, re-enroll by updating status
        if (existing.status === 'dropped') {
          const { data: updatedData, error: updateError } = await supabase
            .from('students')
            .update({ 
              status: 'enrolled',
              enrolled_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) throw updateError;

          const enrollment = {
            id: updatedData.id,
            student_id: updatedData.student_id,
            section_id: updatedData.section_id,
            status: updatedData.status,
            enrolled_at: updatedData.enrolled_at || ''
          };

          return callback(null, {
            message: 'Re-enrolled successfully',
            enrollment: enrollment as Enrollment
          });
        }
      }

      // Create new enrollment
      const { data, error } = await supabase
        .from('students')
        .insert([{
          student_id: user.id,
          section_id: section_id,
          status: 'enrolled'
        }])
        .select()
        .single();

      if (error) throw error;

      const enrollment = {
        id: data.id,
        student_id: data.student_id,
        section_id: data.section_id,
        status: data.status,
        enrolled_at: data.enrolled_at || ''
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
        .from('students')
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
        .from('students')
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
