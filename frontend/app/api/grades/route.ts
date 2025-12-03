import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const GRADE_SERVICE_URL = process.env.GRADE_SERVICE_URL || 'localhost:4003';
const PROTO_PATH = path.join(process.cwd(), 'proto/grade.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const gradeProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Create gRPC client
function getGradeClient() {
  return new gradeProto.grade.GradeService(
    GRADE_SERVICE_URL,
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

    const client = getGradeClient();
    
    return new Promise<NextResponse>((resolve) => {
      client.GetGrades({ token }, (error: any, response: any) => {
        if (error) {
          console.error('gRPC error:', error);
          const status = error.code === grpc.status.UNAUTHENTICATED ? 401
            : error.code === grpc.status.PERMISSION_DENIED ? 403
            : 500;
          resolve(NextResponse.json(
            { error: error.message || 'Failed to fetch grades' },
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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || request.headers.get('x-access-token');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const body = await request.json();
    const { enrollment_id, grade, percentage, remarks } = body;

    if (!enrollment_id || !grade) {
      return NextResponse.json(
        { error: 'enrollment_id and grade are required' },
        { status: 400 }
      );
    }

    const client = getGradeClient();
    
    return new Promise<NextResponse>((resolve) => {
      client.UploadGrade(
        {
          token,
          enrollment_id,
          grade,
          percentage: percentage || 0,
          remarks: remarks || ''
        },
        (error: any, response: any) => {
          if (error) {
            console.error('gRPC error:', error);
            const status = error.code === grpc.status.UNAUTHENTICATED ? 401
              : error.code === grpc.status.PERMISSION_DENIED ? 403
              : error.code === grpc.status.NOT_FOUND ? 404
              : error.code === grpc.status.ALREADY_EXISTS ? 409
              : error.code === grpc.status.INVALID_ARGUMENT ? 400
              : 500;
            resolve(NextResponse.json(
              { error: error.message || 'Failed to upload grade' },
              { status }
            ));
          } else {
            resolve(NextResponse.json(response, { status: 201 }));
          }
        }
      );
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

