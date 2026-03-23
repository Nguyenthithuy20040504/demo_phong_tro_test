import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import SaaSPayment from '@/models/SaaSPayment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
             return NextResponse.json({ error: 'No session' }, { status: 401 });
        }
        
        await dbConnect();
        const count = await SaaSPayment.countDocuments({});
        const models = Object.keys(mongoose.models);
        
        // Mask the URI to hide password but show the cluster and database name
        const dbUri = process.env.MONGODB_URI || 'not found';
        const maskedUri = dbUri.replace(/\/\/.*:.*@/, '//****:****@');

        return NextResponse.json({ 
            status: 'connected', 
            count,
            sessionUser: session.user,
            models,
            maskedUri,
            env: process.env.NODE_ENV
        });
    } catch (error: any) {
        return NextResponse.json({ 
            status: 'error', 
            message: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
}
