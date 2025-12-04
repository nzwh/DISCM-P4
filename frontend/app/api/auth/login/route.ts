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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const client = getAuthClient();

    return new Promise<NextResponse>((resolve) => {
      client.Login({ email, password }, (error: any, response: any) => {
        if (error) {
          console.error('gRPC error:', error);
          const status = error.code === grpc.status.UNAUTHENTICATED ? 401
            : error.code === grpc.status.INVALID_ARGUMENT ? 400
            : 500;
          resolve(NextResponse.json(
            { error: error.message || 'Login failed' },
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

