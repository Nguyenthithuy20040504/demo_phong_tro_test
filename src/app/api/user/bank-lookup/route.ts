import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bin, accountNumber } = await request.json();

    if (!bin || !accountNumber) {
      return NextResponse.json({ error: 'Missing information' }, { status: 400 });
    }

    const response = await fetch('https://api.vietqr.io/v2/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': '2b500bc7-ec20-44c1-807e-6f2a6213d9c4',
        'x-api-key': '04a0e117-c330-4baa-8814-639e49689b98'
      },
      body: JSON.stringify({
        bin,
        accountNumber
      })
    });

    const data = await response.json();

    if (data.code === '00' && data.data) {
      return NextResponse.json({ accountName: data.data.accountName });
    } else {
      return NextResponse.json({ error: data.desc || 'Account not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error in bank lookup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
