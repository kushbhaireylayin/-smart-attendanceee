import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/sick-leave - Student submits a sick leave
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fromDate, toDate, reason, document } = await req.json();

    // Validate required fields
    if (!fromDate || !toDate || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate dates
    if (new Date(fromDate) > new Date(toDate)) {
      return NextResponse.json({ error: 'From date cannot be after to date' }, { status: 400 });
    }

    let documentUrl: string | undefined;

    // Handle file upload if document exists
    if (document && typeof document === 'string' && document.startsWith('data:')) {
      try {
        // Extract base64 data
        const matches = document.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid file format');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Validate file size (max 5MB)
        if (buffer.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
        }

        // Determine file extension
        let ext = '.jpg';
        if (mimeType.includes('pdf')) ext = '.pdf';
        else if (mimeType.includes('png')) ext = '.png';
        else if (mimeType.includes('gif')) ext = '.gif';
        else if (mimeType.includes('jpeg')) ext = '.jpg';

        const fileName = `leave-${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const uploadDir = path.join(process.cwd(), 'public/uploads/sick-leave');
        const filePath = path.join(uploadDir, fileName);
        
        // Create directory if it doesn't exist
        await mkdir(uploadDir, { recursive: true });
        
        // Save file
        await writeFile(filePath, buffer);
        
        documentUrl = `/uploads/sick-leave/${fileName}`;
        console.log('File saved:', documentUrl);
      } catch (fileError) {
        console.error('File upload error:', fileError);
        // Continue without file if upload fails
      }
    }

    // Create sick leave record
    const sickLeave = await prisma.sickLeave.create({
      data: {
        studentId: session.user.id,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        reason,
        documentUrl,
        status: 'PENDING',
      },
    });

    return NextResponse.json(sickLeave, { status: 201 });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    );
  }
}

// GET /api/sick-leave - Admin gets all leaves (with filters)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');

    const where: any = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const leaves = await prisma.sickLeave.findMany({
      where,
      include: { 
        student: { 
          select: { 
            name: true, 
            email: true, 
            rollNumber: true,
            department: true,
            semester: true
          } 
        } 
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(leaves);
  } catch (error) {
    console.error('Error fetching sick leaves:', error);
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 });
  }
}