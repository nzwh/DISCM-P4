import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
// Types are defined in proto files now

dotenv.config();

const PORT = process.env.PORT || 4003;
// __dirname is available in CommonJS (which we're using per tsconfig.json)
const PROTO_PATH = path.join(__dirname, '../proto/grade.proto');

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

const gradeProto = grpc.loadPackageDefinition(packageDefinition) as any;

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
const gradeService = {
  GetGrades: async (call: any, callback: any) => {
    try {
      const { token } = call.request;
      
      const auth = await authenticateToken(token);
      if (!auth) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Invalid token'
        });
      }

      if (auth.profile?.role !== 'student') {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Students only endpoint'
        });
      }

      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          students!inner (
            id,
            sections (
              id,
              name,
              semester,
              year,
              courses (
                code,
                name
              )
            )
          )
        `)
        .eq('students.student_id', auth.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const grades = (data || []).map((g: any) => ({
        id: g.id,
        grade: g.grade,
        percentage: g.percentage || 0,
        remarks: g.remarks || '',
        created_at: g.created_at,
        course: g.students?.sections?.courses ? {
          code: g.students.sections.courses.code,
          name: g.students.sections.courses.name,
          semester: g.students.sections.semester,
          year: g.students.sections.year
        } : null
      }));

      callback(null, { grades });
    } catch (error: any) {
      console.error('Error fetching grades:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to fetch grades'
      });
    }
  },

  GetCourseGrades: async (call: any, callback: any) => {
    try {
      const { token, section_id } = call.request;
      
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
          message: 'Faculty only endpoint'
        });
      }

      // Verify faculty owns section
      const { data: section } = await supabase
        .from('sections')
        .select('faculty_id')
        .eq('id', section_id)
        .single();

      if (!section || section.faculty_id !== auth.user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Cannot view grades for this section'
        });
      }

      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          students!inner (
            id,
            profiles:student_id (
              full_name,
              email
            )
          )
        `)
        .eq('students.section_id', section_id);

      if (error) throw error;

      const grades = (data || []).map((g: any) => ({
        id: g.id,
        grade: g.grade,
        percentage: g.percentage || 0,
        remarks: g.remarks || '',
        enrollment_id: g.enrollment_id,
        student: g.students?.profiles ? {
          full_name: g.students.profiles.full_name,
          email: g.students.profiles.email
        } : null
      }));

      callback(null, {
        grades,
        section_id: section_id
      });
    } catch (error: any) {
      console.error('Error fetching course grades:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to fetch grades'
      });
    }
  },

  UploadGrade: async (call: any, callback: any) => {
    try {
      const { token, enrollment_id, grade, percentage, remarks } = call.request;
      
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
          message: 'Only faculty can upload grades'
        });
      }

      if (!enrollment_id || !grade) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Enrollment ID and grade are required'
        });
      }

      // Verify student enrollment belongs to faculty's section
      // enrollment_id refers to students.id (the enrollment record)
      const { data: student } = await supabase
        .from('students')
        .select(`
          id,
          sections!inner (
            faculty_id
          )
        `)
        .eq('id', enrollment_id)
        .single();

      if (!student) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Student enrollment not found'
        });
      }

      if ((student as any).sections.faculty_id !== auth.user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Cannot upload grade for this student'
        });
      }

      // Check if grade already exists
      const { data: existingGrade } = await supabase
        .from('grades')
        .select('id')
        .eq('enrollment_id', student.id)
        .maybeSingle();

      if (existingGrade) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: 'Grade already exists. Use UpdateGrade to update.'
        });
      }

      // Create grade - enrollment_id refers to students.id (the enrollment record)
      const { data, error } = await supabase
        .from('grades')
        .insert([{
          enrollment_id: student.id,
          grade,
          percentage: percentage || null,
          remarks: remarks || null,
          uploaded_by: auth.user.id
        }])
        .select()
        .single();

      if (error) throw error;

      const gradeData = {
        id: data.id,
        enrollment_id: data.enrollment_id,
        grade: data.grade,
        percentage: data.percentage || 0,
        remarks: data.remarks || '',
        uploaded_by: data.uploaded_by,
        created_at: data.created_at
      };

      callback(null, {
        message: 'Grade uploaded successfully',
        grade: gradeData
      });
    } catch (error: any) {
      console.error('Error uploading grade:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to upload grade'
      });
    }
  },

  UpdateGrade: async (call: any, callback: any) => {
    try {
      const { token, id, grade, percentage, remarks } = call.request;
      
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
          message: 'Only faculty can update grades'
        });
      }

      // Verify grade belongs to faculty's section
      const { data: existingGrade } = await supabase
        .from('grades')
        .select(`
          id,
          students!inner (
            sections!inner (
              faculty_id
            )
          )
        `)
        .eq('id', id)
        .single();

      if (!existingGrade) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Grade not found'
        });
      }

      if ((existingGrade as any).students.sections.faculty_id !== auth.user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Cannot update this grade'
        });
      }

      // Update grade
      const updateData: any = {};
      if (grade !== undefined && grade !== '') updateData.grade = grade;
      if (percentage !== undefined) updateData.percentage = percentage;
      if (remarks !== undefined) updateData.remarks = remarks;

      const { data, error } = await supabase
        .from('grades')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const gradeData = {
        id: data.id,
        enrollment_id: data.enrollment_id,
        grade: data.grade,
        percentage: data.percentage || 0,
        remarks: data.remarks || '',
        uploaded_by: data.uploaded_by,
        created_at: data.created_at
      };

      callback(null, {
        message: 'Grade updated successfully',
        grade: gradeData
      });
    } catch (error: any) {
      console.error('Error updating grade:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to update grade'
      });
    }
  },

  DeleteGrade: async (call: any, callback: any) => {
    try {
      const { token, id } = call.request;
      
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
          message: 'Only faculty can delete grades'
        });
      }

      // Verify grade belongs to faculty's section
      const { data: existingGrade } = await supabase
        .from('grades')
        .select(`
          id,
          students!inner (
            sections!inner (
              faculty_id
            )
          )
        `)
        .eq('id', id)
        .single();

      if (!existingGrade) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'Grade not found'
        });
      }

      if ((existingGrade as any).students.sections.faculty_id !== auth.user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Cannot delete this grade'
        });
      }

      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', id);

      if (error) throw error;

      callback(null, { message: 'Grade deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting grade:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to delete grade'
      });
    }
  },

  GetCourseStats: async (call: any, callback: any) => {
    try {
      const { token, section_id } = call.request;
      
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
          message: 'Faculty only endpoint'
        });
      }

      // Verify ownership - section_id
      const { data: section } = await supabase
        .from('sections')
        .select('faculty_id')
        .eq('id', section_id)
        .single();

      if (!section || section.faculty_id !== auth.user.id) {
        return callback({
          code: grpc.status.PERMISSION_DENIED,
          message: 'Cannot view stats for this section'
        });
      }

      const { data, error } = await supabase
        .from('grades')
        .select(`
          percentage,
          students!inner (
            section_id
          )
        `)
        .eq('students.section_id', section_id);

      if (error) throw error;

      const percentages = (data || [])
        .map((g: any) => g.percentage)
        .filter((p: number | null) => p !== null) as number[];

      const stats = {
        total_graded: data?.length || 0,
        average: percentages.length > 0
          ? (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(2)
          : '',
        highest: percentages.length > 0 ? Math.max(...percentages) : 0,
        lowest: percentages.length > 0 ? Math.min(...percentages) : 0
      };

      callback(null, { stats, section_id: section_id });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Failed to fetch statistics'
      });
    }
  },

  HealthCheck: async (call: any, callback: any) => {
    callback(null, {
      status: 'healthy',
      service: 'grade-service',
      timestamp: new Date().toISOString()
    });
  }
};

// Create and start server
const server = new grpc.Server();
server.addService(gradeProto.grade.GradeService.service, gradeService);

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (error: Error | null, port: number) => {
    if (error) {
      console.error('Failed to start server:', error);
      return;
    }
    console.log(`✅ Grade Service (gRPC) running on port ${port}`);
    console.log(`📊 Health check available via gRPC`);
    server.start();
  }
);
