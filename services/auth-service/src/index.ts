import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { User, Profile } from './types';

dotenv.config();

const PORT = process.env.PORT || 4000;
const PROTO_PATH = path.join(__dirname, '../proto/auth.proto');

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

const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Implement service methods
const authService = {
  Login: async (call: any, callback: any) => {
    try {
      const { email, password } = call.request;

      if (!email || !password) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Email and password are required'
        });
      }

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: error.message || 'Invalid credentials'
        });
      }

      if (!data.session || !data.user) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: 'Login failed'
        });
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        full_name: profile?.full_name || '',
        role: profile?.role || 'student'
      };

      callback(null, {
        message: 'Login successful',
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user
      });
    } catch (error: any) {
      console.error('Login error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Login failed'
      });
    }
  },

  Signup: async (call: any, callback: any) => {
    try {
      const { email, password, full_name, role } = call.request;

      if (!email || !password) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'Email and password are required'
        });
      }

      // Create auth user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return callback({
          code: grpc.status.ALREADY_EXISTS,
          message: error.message || 'Signup failed'
        });
      }

      if (!data.user) {
        return callback({
          code: grpc.status.INTERNAL,
          message: 'User creation failed'
        });
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: full_name || email.split('@')[0],
          role: role || 'student'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        full_name: full_name || email.split('@')[0],
        role: role || 'student'
      };

      callback(null, {
        message: 'Signup successful',
        access_token: data.session?.access_token || '',
        refresh_token: data.session?.refresh_token || '',
        user
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      callback({
        code: grpc.status.INTERNAL,
        message: 'Signup failed'
      });
    }
  },

  ValidateToken: async (call: any, callback: any) => {
    try {
      const { token } = call.request;

      if (!token) {
        return callback(null, { valid: false, user: null });
      }

      // Validate token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return callback(null, { valid: false, user: null });
      }

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const userData: User = {
        id: user.id,
        email: user.email || '',
        full_name: profile?.full_name || '',
        role: profile?.role || 'student'
      };

      callback(null, {
        valid: true,
        user: userData
      });
    } catch (error: any) {
      console.error('Token validation error:', error);
      callback(null, { valid: false, user: null });
    }
  },

  Logout: async (call: any, callback: any) => {
    try {
      const { token } = call.request;

      if (token) {
        // Sign out from Supabase (invalidates the session server-side)
        await supabase.auth.admin.signOut(token);
      }

      callback(null, { message: 'Logout successful' });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still return success - client will clear tokens anyway
      callback(null, { message: 'Logout successful' });
    }
  },

  HealthCheck: async (call: any, callback: any) => {
    callback(null, {
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString()
    });
  }
};

// Create and start server
const server = new grpc.Server();
server.addService(authProto.auth.AuthService.service, authService);

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (error: Error | null, port: number) => {
    if (error) {
      console.error('Failed to start server:', error);
      return;
    }
    console.log(`✅ Auth Service (gRPC) running on port ${port}`);
    console.log(`🔐 Handles: Login, Signup, ValidateToken, Logout`);
    server.start();
  }
);

