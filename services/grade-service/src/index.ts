import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateToken } from './middleware/auth';
import { UploadGradeDto, UpdateGradeDto } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'grade-service',
    timestamp: new Date().toISOString()
  });
});

// Get student's grades
app.get('/api/grades', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.profile?.role !== 'student') {
      res.status(403).json({ error: 'Students only endpoint' });
      return;
    }

    const { data, error } = await supabase
      .from('grades')
      .select(`
        *,
        enrollments!inner (
          id,
          courses (
            code,
            name,
            semester,
            year
          )
        )
      `)
      .eq('enrollments.student_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const grades = (data || []).map((g: any) => ({
      id: g.id,
      grade: g.grade,
      percentage: g.percentage,
      remarks: g.remarks,
      course: g.enrollments.courses,
      created_at: g.created_at
    }));

    res.json({ grades });
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

// Get grades for a course (faculty only)
app.get('/api/grades/course/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.profile?.role !== 'faculty') {
      res.status(403).json({ error: 'Faculty only endpoint' });
      return;
    }

    const { courseId } = req.params;

    // Verify faculty owns course
    const { data: course } = await supabase
      .from('courses')
      .select('faculty_id')
      .eq('id', courseId)
      .single();

    if (!course || course.faculty_id !== req.user.id) {
      res.status(403).json({ error: 'Cannot view grades for this course' });
      return;
    }

    const { data, error } = await supabase
      .from('grades')
      .select(`
        *,
        enrollments!inner (
          id,
          profiles:student_id (
            full_name,
            email
          )
        )
      `)
      .eq('enrollments.course_id', courseId);

    if (error) throw error;

    const grades = (data || []).map((g: any) => ({
      id: g.id,
      grade: g.grade,
      percentage: g.percentage,
      remarks: g.remarks,
      student: g.enrollments.profiles,
      enrollment_id: g.enrollment_id
    }));

    res.json({
      grades,
      course_id: courseId
    });
  } catch (error) {
    console.error('Error fetching course grades:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

// Upload grade (faculty only)
app.post('/api/grades', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.profile?.role !== 'faculty') {
      res.status(403).json({ error: 'Only faculty can upload grades' });
      return;
    }

    const { enrollment_id, grade, percentage, remarks }: UploadGradeDto = req.body;

    if (!enrollment_id || !grade) {
      res.status(400).json({ error: 'Enrollment ID and grade are required' });
      return;
    }

    // Verify enrollment belongs to faculty's course
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select(`
        id,
        courses!inner (
          faculty_id
        )
      `)
      .eq('id', enrollment_id)
      .single();

    if (!enrollment) {
      res.status(404).json({ error: 'Enrollment not found' });
      return;
    }

    if ((enrollment as any).courses.faculty_id !== req.user.id) {
      res.status(403).json({ error: 'Cannot upload grade for this enrollment' });
      return;
    }

    // Check if grade already exists
    const { data: existingGrade } = await supabase
      .from('grades')
      .select('id')
      .eq('enrollment_id', enrollment_id)
      .maybeSingle();

    if (existingGrade) {
      res.status(409).json({ error: 'Grade already exists. Use PUT to update.' });
      return;
    }

    // Create grade
    const { data, error } = await supabase
      .from('grades')
      .insert([{
        enrollment_id,
        grade,
        percentage: percentage || null,
        remarks: remarks || null,
        uploaded_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Grade uploaded successfully',
      grade: data
    });
  } catch (error) {
    console.error('Error uploading grade:', error);
    res.status(500).json({ error: 'Failed to upload grade' });
  }
});

// Update grade (faculty only)
app.put('/api/grades/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.profile?.role !== 'faculty') {
      res.status(403).json({ error: 'Only faculty can update grades' });
      return;
    }

    const { id } = req.params;
    const { grade, percentage, remarks }: UpdateGradeDto = req.body;

    // Verify grade belongs to faculty's course
    const { data: existingGrade } = await supabase
      .from('grades')
      .select(`
        id,
        enrollments!inner (
          courses!inner (
            faculty_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (!existingGrade) {
      res.status(404).json({ error: 'Grade not found' });
      return;
    }

    if ((existingGrade as any).enrollments.courses.faculty_id !== req.user.id) {
      res.status(403).json({ error: 'Cannot update this grade' });
      return;
    }

    // Update grade
    const updateData: any = {};
    if (grade !== undefined) updateData.grade = grade;
    if (percentage !== undefined) updateData.percentage = percentage;
    if (remarks !== undefined) updateData.remarks = remarks;

    const { data, error } = await supabase
      .from('grades')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Grade updated successfully',
      grade: data
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

// Delete grade (faculty only)
app.delete('/api/grades/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.profile?.role !== 'faculty') {
      res.status(403).json({ error: 'Only faculty can delete grades' });
      return;
    }

    const { id } = req.params;

    // Verify grade belongs to faculty's course
    const { data: existingGrade } = await supabase
      .from('grades')
      .select(`
        id,
        enrollments!inner (
          courses!inner (
            faculty_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (!existingGrade) {
      res.status(404).json({ error: 'Grade not found' });
      return;
    }

    if ((existingGrade as any).enrollments.courses.faculty_id !== req.user.id) {
      res.status(403).json({ error: 'Cannot delete this grade' });
      return;
    }

    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ error: 'Failed to delete grade' });
  }
});

// Get statistics for a course (faculty only)
app.get('/api/grades/stats/course/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.profile?.role !== 'faculty') {
      res.status(403).json({ error: 'Faculty only endpoint' });
      return;
    }

    const { courseId } = req.params;

    // Verify ownership
    const { data: course } = await supabase
      .from('courses')
      .select('faculty_id')
      .eq('id', courseId)
      .single();

    if (!course || course.faculty_id !== req.user.id) {
      res.status(403).json({ error: 'Cannot view stats for this course' });
      return;
    }

    const { data, error } = await supabase
      .from('grades')
      .select(`
        percentage,
        enrollments!inner (
          course_id
        )
      `)
      .eq('enrollments.course_id', courseId);

    if (error) throw error;

    const percentages = (data || [])
      .map((g: any) => g.percentage)
      .filter((p: number | null) => p !== null) as number[];

    const stats = {
      total_graded: data?.length || 0,
      average: percentages.length > 0
        ? (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(2)
        : null,
      highest: percentages.length > 0 ? Math.max(...percentages) : null,
      lowest: percentages.length > 0 ? Math.min(...percentages) : null
    };

    res.json({ stats, course_id: courseId });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Grade Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});