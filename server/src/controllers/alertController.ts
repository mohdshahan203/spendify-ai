import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { dbService } from '../services/dbService';

export const getAlerts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const alerts = await dbService.alert.findMany({
      where: { userId, resolved: false }
    });

    res.status(200).json(alerts);
  } catch (error: any) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
};

export const resolveAlert = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { alertId } = req.body;
    if (!alertId) {
      return res.status(400).json({ error: 'Alert ID is required.' });
    }

    const updatedAlert = await dbService.alert.update({
      where: { id: alertId },
      data: { resolved: true }
    });

    res.status(200).json({
      message: 'Alert resolved successfully.',
      alert: updatedAlert
    });
  } catch (error: any) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert.' });
  }
};
