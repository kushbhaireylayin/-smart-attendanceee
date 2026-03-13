import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const leaves = await prisma.sickLeave.findMany({
      where: { studentId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(leaves);
  } catch (error) {
    console.error('Error fetching student leaves:', error);
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 });
  }
}