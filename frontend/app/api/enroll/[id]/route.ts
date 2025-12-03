import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const ENROLL_SERVICE_URL = process.env.ENROLL_SERVICE_URL || 'localhost:4002';
const PROTO_PATH = path.join(process.cwd(), 'proto/enroll.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const enrollProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Create gRPC client
function getEnrollClient() {
  return new enrollProto.enroll.EnrollService(
    ENROLL_SERVICE_URL,
    grpc.credentials.createInsecure()
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || request.headers.get('x-access-token');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const client = getEnrollClient();
    
    return new Promise<NextResponse>((resolve) => {
      client.Drop({ token, id }, (error: any, response: any) => {
        if (error) {
          console.error('gRPC error:', error);
          const status = error.code === grpc.status.UNAUTHENTICATED ? 401
            : error.code === grpc.status.PERMISSION_DENIED ? 403
            : error.code === grpc.status.NOT_FOUND ? 404
            : 500;
          resolve(NextResponse.json(
            { error: error.message || 'Failed to drop enrollment' },
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

