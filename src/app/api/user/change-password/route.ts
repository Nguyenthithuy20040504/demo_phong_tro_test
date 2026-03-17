import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserService } from '@/services/user.service';
import { changePasswordSchema } from '@/validations/user.schema';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request payload
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.error.format() 
      }, { status: 422 });
    }

    const result = await UserService.changePassword(session.user.email, validation.data);
    
    if (!result?.success) {
       return NextResponse.json({ error: result?.message || 'Failed to change password' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
