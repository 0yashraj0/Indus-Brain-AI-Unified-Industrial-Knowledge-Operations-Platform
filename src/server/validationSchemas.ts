import { z } from 'zod';

// Reusable primitive validation rules
export const safeIdSchema = z.string()
  .trim()
  .min(2, { message: 'ID too short' })
  .max(100, { message: 'ID too long' })
  .regex(/^[a-zA-Z0-9_\-]+$/, { message: 'ID contains invalid characters' });

export const safeNameSchema = z.string()
  .trim()
  .min(1, { message: 'Name cannot be empty' })
  .max(150, { message: 'Name too long' })
  .regex(/^[^\x00-\x1F\x7F<>]*$/, { message: 'Name contains invalid control or HTML characters' });

export const safeRoleSchema = z.enum(['owner', 'manager', 'worker']);

export const safeEmailSchema = z.string()
  .trim()
  .email({ message: 'Invalid email format' })
  .max(100, { message: 'Email address too long' });

export const loginSchema = z.object({
  id: safeIdSchema,
  password: z.string().min(1, { message: 'Password is required' }).max(200, { message: 'Password too long' })
}).strict();

export const logSchema = z.object({
  user: safeNameSchema,
  role: safeNameSchema,
  action: z.string().trim().min(1).max(300)
}).strict();

export const accountActionSchema = z.object({
  action: z.enum(['add', 'update', 'delete', 'updatePassword']),
  account: z.object({
    id: safeIdSchema,
    name: safeNameSchema,
    role: safeRoleSchema,
    department: z.string().trim().max(100).optional(),
    password: z.string().min(1).max(200).optional(),
    photo: z.string().optional()
  }).optional(),
  targetId: safeIdSchema.optional(),
  currentUserId: safeIdSchema.optional(),
  newPassword: z.string().min(6, { message: 'Password must be at least 6 characters' }).max(200).optional()
}).strict();

export const reportSchema = z.object({
  report: z.object({
    id: safeIdSchema,
    title: safeNameSchema,
    type: z.string().trim().min(1).max(100),
    description: z.string().trim().max(5000),
    workerName: safeNameSchema.optional(),
    photo: z.string().max(20000000).optional(), // Base64 data URI bound
    timestamp: z.string().max(100).optional()
  })
}).strict();

export const documentUploadSchema = z.object({
  name: safeNameSchema,
  text: z.string().min(1, { message: 'Document text cannot be empty' }).max(20000000, { message: 'Text exceeds maximum limit' }),
  size: z.string().max(50),
  uploadedAt: z.string().max(100).optional(),
  version: z.number().int().positive().optional()
}).strict();

export const documentActionSchema = z.object({
  action: z.enum(['rename', 'approve', 'delete', 'new_version']),
  id: safeIdSchema,
  name: safeNameSchema.optional(),
  text: z.string().max(20000000).optional(),
  uploadedAt: z.string().max(100).optional(),
  status: z.enum(['Approved', 'Rejected', 'Pending']).optional()
}).strict();

export const chatSessionActionSchema = z.object({
  action: z.enum(['create', 'rename', 'delete', 'list']),
  userId: safeIdSchema,
  sessionId: safeIdSchema.optional().nullable(),
  title: z.string().trim().max(150).optional().nullable()
}).strict();

export const chatStreamSchema = z.object({
  userId: safeIdSchema,
  sessionId: safeIdSchema,
  message: z.string().trim().min(1, { message: 'Message cannot be empty' }).max(50000, { message: 'Message too long' }),
  imageBase64: z.string().max(35000000, { message: 'Image too large' }).optional().nullable()
}).strict();

export const equipmentActionSchema = z.object({
  action: z.enum(['add', 'update', 'delete']),
  equipment: z.object({
    id: safeIdSchema,
    name: safeNameSchema,
    department: z.string().trim().max(100).optional(),
    location: z.string().trim().max(200).optional(),
    manual: z.string().trim().max(200).optional(),
    sop: z.string().trim().max(5000).optional(),
    safetyGear: z.array(z.string().trim().max(100)).optional(),
    machineType: z.string().trim().max(100).optional(),
    manualCategory: z.string().trim().max(100).optional(),
    files: z.array(z.any()).optional()
  })
}).strict();

export const emergencyUpdateSchema = z.object({
  emergency: z.object({
    fireProcedures: z.string().max(10000).optional(),
    chemicalSpillSops: z.string().max(10000).optional(),
    firstAid: z.string().max(10000).optional(),
    emergencyShutdown: z.string().max(10000).optional(),
    evacuationProcedures: z.string().max(10000).optional(),
    assemblyPoints: z.string().max(10000).optional(),
    emergencyContacts: z.array(z.object({
      name: safeNameSchema,
      phone: z.string().trim().max(50),
      role: z.string().trim().max(100)
    })).optional()
  })
}).strict();

export const ttsSchema = z.object({
  text: z.string().trim().min(1, { message: 'Text is required' }).max(5000, { message: 'Text too long for voice synthesis' })
}).strict();
