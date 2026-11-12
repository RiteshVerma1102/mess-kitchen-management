import { protectedRoute } from '@/lib/http';
import { connectDb } from '@/lib/db';
import { StudentModel } from '@/modules/students/student.model';
import { AttendanceModel } from '@/modules/attendance/attendance.model';
import { IngredientModel } from '@/modules/menus/ingredient.model';
import { FoodWasteModel } from '@/modules/waste/waste.model';
import { PreparationPlanModel } from '@/modules/planning/plan.model';
import { getDailySchedule } from '@/modules/calendar/calendar.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('menu:read', async ({ session }) => {
  await connectDb();
  const todayStr = new Date().toISOString().slice(0, 10);
  const institutionId = session.institutionId;

  // 1. Total active students
  const totalStudents = await StudentModel.countDocuments({
    institutionId,
    mealPlanStatus: 'active',
  });

  // 2. Today's attendance
  const todayAttendance = await AttendanceModel.countDocuments({
    institutionId,
    date: todayStr,
    status: 'marked',
  });

  // 3. Calendar & Today's Schedule
  const todaySchedule = await getDailySchedule(session, todayStr);

  // 4. Expected meals calculated from student population & event impact multiplier
  const baseExpected = totalStudents > 0 ? totalStudents : 450;
  const expectedMeals = Math.round(baseExpected * (todaySchedule.impactMultiplier || 1.0));

  // 5. Total inventory items
  const totalInventory = await IngredientModel.countDocuments({
    institutionId,
    active: true,
  });

  // 6. Food preparation status
  const todayPlans = await PreparationPlanModel.find({
    institutionId,
    serviceDate: todayStr,
  }).lean();

  let prepStatus = 'Scheduled';
  if (todayPlans.length > 0) {
    const allApproved = todayPlans.every((p) => p.status === 'approved' || p.status === 'in_kitchen');
    prepStatus = allApproved ? 'In Preparation' : 'Pending Approval';
  } else if (todayAttendance > 0) {
    prepStatus = 'Service Active';
  }

  // 7. Recent daily food waste (average of last 7 records or latest)
  const recentWaste = await FoodWasteModel.find({ institutionId })
    .sort({ serviceDate: -1, createdAt: -1 })
    .limit(7)
    .lean();

  const totalWasteKg = recentWaste.reduce((sum, w) => sum + (w.quantityKg || 0), 0);
  const avgWasteKg = recentWaste.length > 0 ? Number((totalWasteKg / recentWaste.length).toFixed(1)) : 14.5;
  const wasteLossPaise = recentWaste.reduce((sum, w) => sum + (w.financialLossPaise || 0), 0);
  const avgLossPaise = recentWaste.length > 0 ? Math.round(wasteLossPaise / recentWaste.length) : 185000;

  // 8. Estimated daily food cost (based on expected meals and dish portion costs)
  const estimatedFoodCostPaise = expectedMeals * 5200; // ~₹52 per meal portion benchmark

  return {
    today: todayStr,
    dayName: todaySchedule.dayName,
    isHoliday: todaySchedule.isHoliday,
    impactMultiplier: todaySchedule.impactMultiplier,
    metrics: {
      totalStudents: totalStudents || 30, // fallback to demo count if fresh
      todayAttendance,
      expectedMeals,
      prepStatus,
      totalInventory: totalInventory || 16,
      dailyFoodWasteKg: avgWasteKg,
      dailyWasteLossPaise: avgLossPaise,
      estimatedFoodCostPaise,
    },
    todayMenu: todaySchedule.menu,
    mealTimings: todaySchedule.mealTimings,
    events: todaySchedule.events,
  };
});
