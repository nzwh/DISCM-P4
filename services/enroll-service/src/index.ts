import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  AuthenticatedUser,
  Course,
  Enrollment,
  EnrollmentWithCourse,
  EnrollRequest
} from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

app.use(cors());
app.use(express.json());

// Extend Express Request type
interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Auth middleware
const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = { ...user, profile };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Root endpoint
app.get('/', (_req: Request, res: Response): void => {
  res.json({
    service: 'enroll-service',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      enrollments: '/api/enrollments',
      enroll: '/api/enroll',
      drop: '/api/enroll/:id'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (_req: Request, res: Response): void => {
  res.json({ 
    status: 'healthy', 
    service: 'enroll-service',
    timestamp: new Date().toISOString() 
  });
});

// Get user's enrollments
app.get('/api/enrollments', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
      .eq('student_id', req.user!.id)
      .eq('status', 'enrolled')
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    res.json({ enrollments: (data as EnrollmentWithCourse[]) || [] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Enroll in course
app.post('/api/enroll', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.profile?.role !== 'student') {
      res.status(403).json({ error: 'Only students can enroll' });
      return;
    }

    const { course_id }: EnrollRequest = req.body;

    // Check if course exists and is open
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .single();

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const typedCourse = course as Course;

    if (!typedCourse.is_open) {
      res.status(400).json({ error: 'Course is not open' });
      return;
    }

    // Check enrollment count
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course_id)
      .eq('status', 'enrolled');

    if (count !== null && count >= typedCourse.max_students) {
      res.status(400).json({ error: 'Course is full' });
      return;
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', req.user!.id)
      .eq('course_id', course_id)
      .eq('status', 'enrolled')
      .maybeSingle();

    if (existing) {
      res.status(409).json({ error: 'Already enrolled' });
      return;
    }

    // Create enrollment
    const { data, error } = await supabase
      .from('enrollments')
      .insert([{
        student_id: req.user!.id,
        course_id: course_id,
        status: 'enrolled'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ 
      message: 'Enrolled successfully', 
      enrollment: data as Enrollment 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// Drop course
app.delete('/api/enroll/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('id', req.params.id)
      .single();

    if (!enrollment || enrollment.student_id !== req.user!.id) {
      res.status(403).json({ error: 'Cannot drop this enrollment' });
      return;
    }

    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'dropped' })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Course dropped successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to drop course' });
  }
});

app.listen(PORT, (): void => {
  console.log(`Enrollment Service running on port ${PORT}`);
});