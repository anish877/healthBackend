// src/routes/dailyLogRoutes.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { userMiddleware } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/daily-progress
 * Returns the completion status of the user's daily log components for a specific date
 */
router.get('/', userMiddleware, async (req, res): Promise<void> => {
  try {
    //@ts-expect-error: no need here
    const userId = req.user.id;
    const dateParam = req.query.date as string;
    
    // If no date provided, use today's date
    const date = dateParam 
      ? new Date(dateParam) 
      : new Date();
    
    // Set time to midnight for consistent date comparison
    date.setHours(0, 0, 0, 0);
    
    // Find the daily log for this user and date
    const dailyLog = await prisma.dailyLog.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      include: {
        nutrition: true,
        sleep: true,
        mood: true,
        water: true,
      },
    });

    if (!dailyLog) {
        res.status(200).json({
        success: true,
        data: {
          exists: false,
          progress: {
            nutrition: false,
            sleep: false,
            mood: false,
            water: false,
          },
          completionPercentage: 0,
        },
      });
      return 
    }

    // Calculate which components are complete
    const progress = {
      nutrition: !!dailyLog.nutrition,
      sleep: !!dailyLog.sleep,
      mood: !!dailyLog.mood,
      water: !!dailyLog.water,
    };

    // Calculate completion percentage
    const completedCount = Object.values(progress).filter(val => val).length;
    const totalComponents = Object.keys(progress).length;
    const completionPercentage = Math.round((completedCount / totalComponents) * 100);

    res.status(200).json({
      success: true,
      data: {
        exists: true,
        progress,
        completionPercentage,
        dailyLogId: dailyLog.id,
      },
    });
    return 
  } catch (error) {
    console.error('Error fetching daily progress:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch daily progress',
      },
    });
    return 
  }
});

export default router;