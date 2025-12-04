import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'localhost:4000';
const PROTO_PATH = path.join(process.cwd(), 'proto/auth.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const authProto = grpc.loadPackageDefinition(packageDefinition) as any;

// Create gRPC client
function getAuthClient() {
  return new authProto.auth.AuthService(
    AUTH_SERVICE_URL,
    grpc.credentials.createInsecure()
  );
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || request.headers.get('x-access-token');

    const client = getAuthClient();

    return new Promise<NextResponse>((resolve) => {
      client.Logout({ token: token || '' }, (error: any, response: any) => {
        if (error) {
          console.error('gRPC error:', error);
          // Still return success - client will clear tokens anyway
          resolve(NextResponse.json({ message: 'Logout successful' }));
        } else {
          resolve(NextResponse.json(response));
        }
      });
    });
  } catch (error: any) {
    console.error('API error:', error);
    // Still return success for logout
    return NextResponse.json({ message: 'Logout successful' });
  }
}

