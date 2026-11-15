import { connectDb } from '@/lib/db';
import { InstitutionModel } from '@/core/tenant/institution.model';
import { StudentModel } from '@/modules/students/student.model';
import { SupplierModel } from '@/modules/menus/supplier.model';
import { IngredientModel, type IngredientUnit } from '@/modules/menus/ingredient.model';
import { DishModel } from '@/modules/menus/dish.model';
import { RecipeModel } from '@/modules/menus/recipe.model';
import { MenuModel } from '@/modules/menus/menu.model';
import { AttendanceModel, type MealType } from '@/modules/attendance/attendance.model';
import { MealConsumptionModel } from '@/modules/attendance/consumption.model';
import { PreparationPlanModel } from '@/modules/planning/plan.model';
import { ServiceActualModel } from '@/modules/actuals/actual.model';
import { FoodWasteModel } from '@/modules/waste/waste.model';
import { UserModel } from '@/modules/users/user.model';
import { hashPassword } from '@/modules/users/user.service';
import { logger } from '@/lib/logger';

export interface SeedResult {
  institutionId: string;
  counts: {
    students: number;
    suppliers: number;
    ingredients: number;
    dishes: number;
    recipes: number;
    menus: number;
    attendance: number;
    consumption: number;
    plans: number;
    actuals: number;
    waste: number;
  };
}

export async function seedDemoData(targetInstId = 'inst_thapar_demo'): Promise<SeedResult> {
  await connectDb();

  // 1. Upsert Demo Institution
  const institution = await InstitutionModel.findOneAndUpdate(
    { code: 'THAPAR_DEMO' },
    {
      $set: {
        name: 'Thapar Institute of Engineering & Technology (Demo)',
        code: 'THAPAR_DEMO',
        slug: 'thapar-demo',
        timezone: 'Asia/Kolkata',
        contactEmail: 'mess.admin@thapar.edu',
        currency: 'INR',
        diningHalls: [
          { id: 'hall_a', name: 'Hostel A & B (Boys Mess)', capacity: 600, active: true },
          { id: 'hall_b', name: 'Hostel C & D (Girls Mess)', capacity: 500, active: true },
          { id: 'hall_c', name: 'Post-Graduate Dining Hall', capacity: 350, active: true },
        ],
        active: true,
        isSynthetic: true,
      },
    },
    { upsert: true, new: true },
  );

  const institutionId = targetInstId || String(institution._id);

  // 1b. Upsert Demo Portal Users
  const defaultPasswordHash = await hashPassword('Password123!');
  const demoUsers = [
    {
      email: 'admin@thapar.edu',
      fullName: 'Dr. Rajesh Sharma (Dean of Student Affairs)',
      role: 'admin' as const,
      hallIds: ['hall_a', 'hall_b', 'hall_c'],
    },
    {
      email: 'manager@thapar.edu',
      fullName: 'Col. Vikram Singh (Mess Manager)',
      role: 'mess_manager' as const,
      hallIds: ['hall_a', 'hall_b', 'hall_c'],
    },
    {
      email: 'kitchen@thapar.edu',
      fullName: 'Chef Ramu Verma (Head Chef)',
      role: 'kitchen_staff' as const,
      hallIds: ['hall_a', 'hall_b'],
    },
    {
      email: 'student@thapar.edu',
      fullName: 'Aarav Mehta (Mess Committee Rep)',
      role: 'student' as const,
      hallIds: ['hall_a'],
    },
  ];

  for (const u of demoUsers) {
    await UserModel.findOneAndUpdate(
      { institutionId, email: u.email },
      {
        $set: {
          institutionId,
          email: u.email,
          fullName: u.fullName,
          hashedPassword: defaultPasswordHash,
          role: u.role,
          hallIds: u.hallIds,
          active: true,
          isEmailVerified: true,
          isSynthetic: true,
        },
      },
      { upsert: true },
    );
  }

  // 2. Upsert Suppliers
  const rawSuppliers = [
    {
      name: 'Punjab Agro Fresh Co-op',
      contactPerson: 'Harpreet Singh',
      phone: '+91-98140-11223',
      address: 'Grain Market Yard 4, Patiala',
      category: 'produce' as const,
    },
    {
      name: 'Verka Milk Producers Union',
      contactPerson: 'Gurinder Kaur',
      phone: '+91-98720-44556',
      address: 'Industrial Focal Point, Patiala',
      category: 'dairy' as const,
    },
    {
      name: 'Doaba Wholesale Provisions',
      contactPerson: 'Raman Aggarwal',
      phone: '+91-94170-77889',
      address: 'Wholesale Mandi, Sirhind Road',
      category: 'groceries' as const,
    },
  ];

  const supplierMap = new Map<string, string>();
  for (const s of rawSuppliers) {
    const doc = await SupplierModel.findOneAndUpdate(
      { institutionId, name: s.name },
      { $set: { ...s, institutionId, isSynthetic: true, active: true, paymentTermsDays: 30 } },
      { upsert: true, new: true },
    );
    supplierMap.set(s.name, String(doc._id));
  }

  // 3. Upsert Ingredients (All money values strictly integer paise)
  const rawIngredients: Array<{
    name: string;
    category: 'grain' | 'pulse' | 'vegetable' | 'dairy' | 'spice' | 'oil' | 'dry_ration';
    unit: IngredientUnit;
    costPerUnitPaise: number;
    currentStock: number;
    storageType: 'dry' | 'cold_storage' | 'ambient';
    supplierName: string;
  }> = [
    { name: 'Basmati Rice (Tibar)', category: 'grain', unit: 'kg', costPerUnitPaise: 5400, currentStock: 450, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
    { name: 'Sharbati Whole Wheat Atta', category: 'grain', unit: 'kg', costPerUnitPaise: 3600, currentStock: 800, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
    { name: 'Toor Dal Premium', category: 'pulse', unit: 'kg', costPerUnitPaise: 13800, currentStock: 250, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
    { name: 'Chana Dal Desi', category: 'pulse', unit: 'kg', costPerUnitPaise: 8200, currentStock: 200, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
    { name: 'Mustard Oil (Kachi Ghani)', category: 'oil', unit: 'l', costPerUnitPaise: 14000, currentStock: 180, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
    { name: 'Fresh Milk (Full Cream)', category: 'dairy', unit: 'l', costPerUnitPaise: 6200, currentStock: 300, storageType: 'cold_storage', supplierName: 'Verka Milk Producers Union' },
    { name: 'Fresh Malai Paneer', category: 'dairy', unit: 'kg', costPerUnitPaise: 37000, currentStock: 120, storageType: 'cold_storage', supplierName: 'Verka Milk Producers Union' },
    { name: 'Table Curd / Dahi', category: 'dairy', unit: 'kg', costPerUnitPaise: 7200, currentStock: 150, storageType: 'cold_storage', supplierName: 'Verka Milk Producers Union' },
    { name: 'Potatoes (Pahari Aloo)', category: 'vegetable', unit: 'kg', costPerUnitPaise: 2400, currentStock: 400, storageType: 'ambient', supplierName: 'Punjab Agro Fresh Co-op' },
    { name: 'Onions (Nasik Red)', category: 'vegetable', unit: 'kg', costPerUnitPaise: 3500, currentStock: 300, storageType: 'ambient', supplierName: 'Punjab Agro Fresh Co-op' },
    { name: 'Hybrid Tomatoes', category: 'vegetable', unit: 'kg', costPerUnitPaise: 3200, currentStock: 220, storageType: 'cold_storage', supplierName: 'Punjab Agro Fresh Co-op' },
    { name: 'Ginger-Garlic Paste', category: 'spice', unit: 'kg', costPerUnitPaise: 12500, currentStock: 45, storageType: 'cold_storage', supplierName: 'Punjab Agro Fresh Co-op' },
    { name: 'Garam Masala Blend', category: 'spice', unit: 'kg', costPerUnitPaise: 48000, currentStock: 30, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
    { name: 'Poha (Medium Flakes)', category: 'grain', unit: 'kg', costPerUnitPaise: 4400, currentStock: 160, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
    { name: 'Premium CTC Tea', category: 'dry_ration', unit: 'kg', costPerUnitPaise: 29000, currentStock: 65, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
    { name: 'Refined Sugar (Sulfur-free)', category: 'dry_ration', unit: 'kg', costPerUnitPaise: 4300, currentStock: 350, storageType: 'dry', supplierName: 'Doaba Wholesale Provisions' },
  ];

  const ingredientMap = new Map<string, { id: string; unit: IngredientUnit }>();
  for (const ing of rawIngredients) {
    const supplierId = supplierMap.get(ing.supplierName);
    const doc = await IngredientModel.findOneAndUpdate(
      { institutionId, name: ing.name },
      {
        $set: {
          institutionId,
          name: ing.name,
          category: ing.category,
          unit: ing.unit,
          costPerUnitPaise: ing.costPerUnitPaise,
          currentStock: ing.currentStock,
          reorderThreshold: 20,
          shelfLifeDays: ing.category === 'dairy' ? 4 : 45,
          storageType: ing.storageType,
          supplierId,
          active: true,
          isSynthetic: true,
        },
      },
      { upsert: true, new: true },
    );
    ingredientMap.set(ing.name, { id: String(doc._id), unit: ing.unit });
  }

  // 4. Upsert Dishes
  const rawDishes = [
    { name: 'Aloo Paratha with Curd', category: 'main' as const, portionGrams: 250, costPerPortionPaise: 2400, vegetarian: true },
    { name: 'Masala Chai', category: 'beverage' as const, portionGrams: 150, costPerPortionPaise: 800, vegetarian: true },
    { name: 'Batata Poha', category: 'snack' as const, portionGrams: 180, costPerPortionPaise: 1400, vegetarian: true },
    { name: 'Dal Tadka Special', category: 'side' as const, portionGrams: 200, costPerPortionPaise: 2200, vegetarian: true },
    { name: 'Jeera Rice', category: 'rice' as const, portionGrams: 200, costPerPortionPaise: 1600, vegetarian: true },
    { name: 'Shahi Paneer', category: 'main' as const, portionGrams: 220, costPerPortionPaise: 4800, vegetarian: true },
    { name: 'Butter Tandoori Roti', category: 'bread' as const, portionGrams: 60, costPerPortionPaise: 600, vegetarian: true },
    { name: 'Gulab Jamun (2 pcs)', category: 'dessert' as const, portionGrams: 80, costPerPortionPaise: 1800, vegetarian: true },
  ];

  const dishMap = new Map<string, string>();
  for (const d of rawDishes) {
    const doc = await DishModel.findOneAndUpdate(
      { institutionId, name: d.name },
      { $set: { ...d, institutionId, active: true } },
      { upsert: true, new: true },
    );
    dishMap.set(d.name, String(doc._id));
  }

  // 5. Upsert Recipes (BOM)
  for (const [dishName, dishId] of dishMap.entries()) {
    let ingredientsList: Array<{ ingredientId: string; quantity: number; unit: IngredientUnit; wastePercentage: number }> = [];

    if (dishName === 'Aloo Paratha with Curd') {
      const atta = ingredientMap.get('Sharbati Whole Wheat Atta');
      const aloo = ingredientMap.get('Potatoes (Pahari Aloo)');
      const dahi = ingredientMap.get('Table Curd / Dahi');
      if (atta && aloo && dahi) {
        ingredientsList = [
          { ingredientId: atta.id, quantity: 10, unit: 'kg', wastePercentage: 2 },
          { ingredientId: aloo.id, quantity: 12, unit: 'kg', wastePercentage: 8 },
          { ingredientId: dahi.id, quantity: 8, unit: 'kg', wastePercentage: 0 },
        ];
      }
    } else if (dishName === 'Shahi Paneer') {
      const paneer = ingredientMap.get('Fresh Malai Paneer');
      const tomato = ingredientMap.get('Hybrid Tomatoes');
      const milk = ingredientMap.get('Fresh Milk (Full Cream)');
      if (paneer && tomato && milk) {
        ingredientsList = [
          { ingredientId: paneer.id, quantity: 15, unit: 'kg', wastePercentage: 0 },
          { ingredientId: tomato.id, quantity: 10, unit: 'kg', wastePercentage: 5 },
          { ingredientId: milk.id, quantity: 8, unit: 'l', wastePercentage: 0 },
        ];
      }
    } else if (dishName === 'Dal Tadka Special') {
      const toor = ingredientMap.get('Toor Dal Premium');
      const oil = ingredientMap.get('Mustard Oil (Kachi Ghani)');
      if (toor && oil) {
        ingredientsList = [
          { ingredientId: toor.id, quantity: 12, unit: 'kg', wastePercentage: 1 },
          { ingredientId: oil.id, quantity: 2, unit: 'l', wastePercentage: 0 },
        ];
      }
    }

    if (ingredientsList.length > 0) {
      await RecipeModel.findOneAndUpdate(
        { institutionId, dishId, version: 1 },
        {
          $set: {
            institutionId,
            dishId,
            version: 1,
            yieldPortions: 100,
            ingredients: ingredientsList,
            instructions: `Standard mess batch procedure for 100 portions of ${dishName}.`,
            isSynthetic: true,
          },
        },
        { upsert: true, new: true },
      );
    }
  }

  // 6. Upsert Cyclical Menu
  const dishIds = Array.from(dishMap.values());
  for (let day = 0; day < 7; day++) {
    await MenuModel.findOneAndUpdate(
      { institutionId, name: 'Standard Hostel Weekly Menu', dayOfWeek: day },
      {
        $set: {
          institutionId,
          name: 'Standard Hostel Weekly Menu',
          cycleType: 'weekly',
          dayOfWeek: day,
          status: 'published',
          meals: {
            breakfast: [
              { dishId: dishIds[0], portionGrams: 250, mandatory: true },
              { dishId: dishIds[1], portionGrams: 150, mandatory: true },
            ],
            lunch: [
              { dishId: dishIds[3], portionGrams: 200, mandatory: true },
              { dishId: dishIds[4], portionGrams: 200, mandatory: true },
              { dishId: dishIds[6], portionGrams: 60, mandatory: true },
            ],
            snacks: [
              { dishId: dishIds[2], portionGrams: 180, mandatory: true },
              { dishId: dishIds[1], portionGrams: 150, mandatory: true },
            ],
            dinner: [
              { dishId: dishIds[5], portionGrams: 220, mandatory: true },
              { dishId: dishIds[6], portionGrams: 60, mandatory: true },
              { dishId: dishIds[4], portionGrams: 200, mandatory: true },
              { dishId: dishIds[7], portionGrams: 80, mandatory: false },
            ],
          },
          isSynthetic: true,
        },
      },
      { upsert: true, new: true },
    );
  }

  // 7. Upsert Students (30 sample hostel students)
  const studentIds: string[] = [];
  const halls = ['hall_a', 'hall_b', 'hall_c'];
  for (let i = 1; i <= 30; i++) {
    const roll = `2024CS${String(i).padStart(3, '0')}`;
    const hall = halls[(i - 1) % halls.length];
    const doc = await StudentModel.findOneAndUpdate(
      { institutionId, enrollmentNumber: roll },
      {
        $set: {
          institutionId,
          enrollmentNumber: roll,
          fullName: `Student ${i}`,
          email: `student${i}@thapar.edu`,
          hostelName: (i % 2 === 0 ? 'Hostel B' : 'Hostel A'),
          roomNumber: `${100 + i}`,
          messHallId: hall,
          dietaryPreference: i % 5 === 0 ? 'jain' : 'vegetarian',
          mealPlanStatus: 'active',
          rfidCardId: `RFID_${roll}`,
          isSynthetic: true,
        },
      },
      { upsert: true, new: true },
    );
    studentIds.push(String(doc._id));
  }

  // 8. Generate Synthetic Historical Data for the Past 14 Days
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
  const today = new Date();

  for (let d = 14; d >= 1; d--) {
    const dateObj = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
    const dateKey = dateObj.toISOString().slice(0, 10);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const hallId of halls) {
      for (const meal of mealTypes) {
        // Attendance count drops slightly on weekends
        const nominalCapacity = hallId === 'hall_a' ? 480 : hallId === 'hall_b' ? 390 : 280;
        const actualAttendance = Math.round(nominalCapacity * (isWeekend ? 0.75 : 0.94));
        const plannedPortions = Math.round(actualAttendance * 1.08); // 8% kitchen buffer

        // (a) Record Attendance Swipes for enrolled sample students
        for (let sIdx = 0; sIdx < Math.min(10, studentIds.length); sIdx++) {
          const clientUuid = `synth-att-${dateKey}-${hallId}-${meal}-${sIdx}`;
          await AttendanceModel.findOneAndUpdate(
            { institutionId, clientUuid },
            {
              $set: {
                institutionId,
                clientUuid,
                studentRef: `2024CS${String(sIdx + 1).padStart(3, '0')}`,
                studentId: studentIds[sIdx],
                messHallId: hallId,
                serviceDate: dateKey,
                mealType: meal,
                method: sIdx % 3 === 0 ? 'rfid' : 'qr',
                scannedAt: dateObj,
                deviceId: `pos_tablet_${hallId}_1`,
                offlineSynced: false,
                clockSkewSeconds: 0,
                isSynthetic: true,
              },
            },
            { upsert: true },
          );
        }

        // (b) Meal Consumption record
        await MealConsumptionModel.findOneAndUpdate(
          { institutionId, messHallId: hallId, serviceDate: dateKey, mealType: meal },
          {
            $set: {
              institutionId,
              messHallId: hallId,
              serviceDate: dateKey,
              mealType: meal,
              totalSwipes: actualAttendance,
              headcountEstimate: actualAttendance,
              guestMeals: isWeekend ? 15 : 4,
              staffMeals: 8,
              verifiedBy: 'head_cook_sharma',
              verifiedAt: dateObj,
              isSynthetic: true,
            },
          },
          { upsert: true },
        );

        // (c) Preparation Plan
        await PreparationPlanModel.findOneAndUpdate(
          { institutionId, messHallId: hallId, serviceDate: dateKey, mealType: meal },
          {
            $set: {
              institutionId,
              messHallId: hallId,
              serviceDate: dateKey,
              mealType: meal,
              forecastedHeadcount: actualAttendance,
              bufferPercentage: 8,
              plannedPortions,
              items: [
                {
                  dishId: dishIds[meal === 'breakfast' ? 0 : 5],
                  dishName: meal === 'breakfast' ? 'Aloo Paratha with Curd' : 'Shahi Paneer',
                  plannedPortions,
                  estimatedCostPaise: 3500,
                },
              ],
              totalEstimatedCostPaise: plannedPortions * 3500,
              status: 'completed',
              approvedBy: 'mess_manager_singh',
              isSynthetic: true,
            },
          },
          { upsert: true },
        );

        // (d) Service Actuals (Prepared vs Served vs Leftover)
        const servedCount = actualAttendance;
        const leftoverCount = plannedPortions - servedCount;
        await ServiceActualModel.findOneAndUpdate(
          {
            institutionId,
            messHallId: hallId,
            serviceDate: dateKey,
            mealType: meal,
            dishId: dishIds[meal === 'breakfast' ? 0 : 5],
          },
          {
            $set: {
              institutionId,
              messHallId: hallId,
              serviceDate: dateKey,
              mealType: meal,
              dishId: dishIds[meal === 'breakfast' ? 0 : 5],
              dishName: meal === 'breakfast' ? 'Aloo Paratha with Curd' : 'Shahi Paneer',
              quantityPrepared: plannedPortions,
              quantityServed: servedCount,
              quantityLeftover: leftoverCount,
              unit: 'portion',
              recordedBy: 'cook_helper_verma',
              recordedAt: dateObj,
              isSynthetic: true,
            },
          },
          { upsert: true },
        );

        // (e) Food Waste Record
        if (leftoverCount > 0) {
          const wasteKg = Number((leftoverCount * 0.22).toFixed(2));
          const lossPaise = leftoverCount * 2500;
          await FoodWasteModel.findOneAndUpdate(
            { institutionId, messHallId: hallId, serviceDate: dateKey, mealType: meal },
            {
              $set: {
                institutionId,
                messHallId: hallId,
                serviceDate: dateKey,
                mealType: meal,
                dishId: dishIds[meal === 'breakfast' ? 0 : 5],
                wasteType: 'unserved_leftover',
                quantityKg: wasteKg,
                financialLossPaise: lossPaise,
                reasonCode: isWeekend ? 'low_attendance_holiday' : 'over_preparation',
                recordedBy: 'mess_supervisor',
                disposalMethod: 'biogas',
                isSynthetic: true,
              },
            },
            { upsert: true },
          );
        }
      }
    }
  }

  const counts = {
    students: await StudentModel.countDocuments({ institutionId }),
    suppliers: await SupplierModel.countDocuments({ institutionId }),
    ingredients: await IngredientModel.countDocuments({ institutionId }),
    dishes: await DishModel.countDocuments({ institutionId }),
    recipes: await RecipeModel.countDocuments({ institutionId }),
    menus: await MenuModel.countDocuments({ institutionId }),
    attendance: await AttendanceModel.countDocuments({ institutionId }),
    consumption: await MealConsumptionModel.countDocuments({ institutionId }),
    plans: await PreparationPlanModel.countDocuments({ institutionId }),
    actuals: await ServiceActualModel.countDocuments({ institutionId }),
    waste: await FoodWasteModel.countDocuments({ institutionId }),
  };

  logger.info({ institutionId, counts }, 'demo seed data generated successfully');
  return { institutionId, counts };
}

// Direct execution from CLI
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDemoData()
    .then((res) => {
      // eslint-disable-next-line no-console
      console.log('Seed completed successfully:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Seed execution failed:', err);
      process.exit(1);
    });
}
