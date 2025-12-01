import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateToken } from './middleware/auth';
import { Course, CreateCourseDto } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'course-service',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      courses: '/api/courses',
      course: '/api/courses/:id'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'course-service',
    timestamp: new Date().toISOString()
  });
});

// Get all courses
app.get('/api/courses', authenticateToken, async (req: Request, res: Response) => {
  try {
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

    res.json({ courses: data || [] });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get single course
app.get('/api/courses/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

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
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get enrollment count
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id)
      .eq('status', 'enrolled');

    res.json({
      ...data,
      enrolled_count: count || 0
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create course (faculty only)
app.post('/api/courses', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.profile?.role !== 'faculty') {
      res.status(403).json({ error: 'Only faculty can create courses' });
      return;
    }

    const { code, name, description, max_students, semester, year }: CreateCourseDto = req.body;

    if (!code || !name || !semester || !year) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const { data, error } = await supabase
      .from('courses')
      .insert([{
        code,
        name,
        description,
        faculty_id: req.user.id,
        max_students: max_students || 30,
        semester,
        year,
        is_open: true
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Course created successfully',
      course: data
    });
  } catch (error: any) {
    console.error('Error creating course:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Course code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create course' });
    }
  }
});

// Update course (faculty only)
app.put('/api/courses/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.profile?.role !== 'faculty') {
      res.status(403).json({ error: 'Only faculty can update courses' });
      return;
    }

    const { id } = req.params;
    const { name, description, max_students, is_open } = req.body;

    // Verify course belongs to faculty
    const { data: course } = await supabase
      .from('courses')
      .select('faculty_id')
      .eq('id', id)
      .single();

    if (!course || course.faculty_id !== req.user.id) {
      res.status(403).json({ error: 'Cannot update this course' });
      return;
    }

    const { data, error } = await supabase
      .from('courses')
      .update({
        name,
        description,
        max_students,
        is_open
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Course updated successfully',
      course: data
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Course Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});