import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL || 'localhost:4001';
const PROTO_PATH = path.join(process.cwd(), 'proto/course.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const courseProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Create gRPC client
function getCourseClient() {
  return new courseProto.course.CourseService(
    COURSE_SERVICE_URL,
    grpc.credentials.createInsecure()
  );
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || request.headers.get('x-access-token');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const client = getCourseClient();
    
    return new Promise<NextResponse>((resolve) => {
      client.GetCourses({ token }, (error: any, response: any) => {
        if (error) {
          console.error('gRPC error:', error);
          const status = error.code === grpc.status.UNAUTHENTICATED ? 401 : 500;
          resolve(NextResponse.json(
            { error: error.message || 'Failed to fetch courses' },
            { status }
          ));
        } else {
          resolve(NextResponse.json(response));
        }
      });
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

