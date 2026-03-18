import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getServerSession } from 'next-auth/next'
import { hasPermission } from '@/lib/permissions'
import { Role } from '@prisma/client'
import { randomBytes } from 'crypto'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'products')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await getServerSession()
    if (!session?.user) {
      return Response.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Permission check (admin only)
    const userRole = (session.user as any).role as Role
    if (!hasPermission(userRole, 'change_prices')) {
      // Using change_prices as admin permission
      return Response.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return Response.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: 'Nur JPG, PNG, WebP und GIF erlaubt' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: 'Datei zu groß (max 5MB)' },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    try {
      await mkdir(UPLOAD_DIR, { recursive: true })
    } catch (err) {
      // Directory might already exist
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${randomBytes(8).toString('hex')}.${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Return URL
    const url = `/uploads/products/${filename}`
    return Response.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return Response.json({ error: 'Upload fehlgeschlagen' }, { status: 500 })
  }
}
