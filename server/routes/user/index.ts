import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { storage } from '../../storage';
import { userProfileUpdateSchema } from '@shared/schema';
import { FileUploadRequest } from '../shared/types/express';
import { requireAuth } from '../shared/middleware/auth';
import { validateRequest } from '../shared/middleware/validation';

const router = Router();

// Configure multer for profile picture uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/profile-pictures',
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply authentication middleware to all routes
router.use(requireAuth);

// Update user profile
router.put("/profile", validateRequest(userProfileUpdateSchema), async (req: FileUploadRequest, res: Response) => {
  try {
    await storage.updateUserProfile(req.user.id, req.body);
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Upload profile picture
router.post("/profile/picture", upload.single('picture'), async (req: FileUploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    await storage.updateProfilePicture(req.user.id, req.file);
    res.json({ message: "Profile picture updated successfully" });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ error: "Failed to upload profile picture" });
  }
});

export default router; 