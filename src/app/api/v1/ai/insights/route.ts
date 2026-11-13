import { NextRequest, NextResponse } from 'next/server';
import { getGeminiDemandInsights } from '@/lib/gemini';
import { z } from 'zod';

const aiInsightSchema = z.object({
  date: z.string().default(new Date().toISOString().slice(0, 10)),
  meals: z
    .array(
      z.object({
        mealType: z.string(),
        dishNames: z.array(z.string()),
        predictedCount: z.number().nonnegative(),
      }),
    )
    .default([
      { mealType: 'Breakfast', dishNames: ['Masala Dosa', 'Sambhar', 'Coconut Chutney'], predictedCount: 380 },
      { mealType: 'Lunch', dishNames: ['Paneer Butter Masala', 'Dal Makhani', 'Jeera Rice', 'Roti'], predictedCount: 650 },
      { mealType: 'Snacks', dishNames: ['Crispy Samosa', 'Masala Chai'], predictedCount: 420 },
      { mealType: 'Dinner', dishNames: ['Shahi Biryani', 'Mixed Veg Raita', 'Gulab Jamun'], predictedCount: 610 },
    ]),
  weather: z.string().optional().default('Clear, 26°C'),
  hasExamOrEvent: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const weather = searchParams.get('weather') || 'Clear, 26°C';
    const hasExamOrEvent = searchParams.get('event') === 'true';

    const insights = await getGeminiDemandInsights({
      date,
      weather,
      hasExamOrEvent,
      meals: [
        { mealType: 'Breakfast', dishNames: ['Masala Dosa', 'Sambhar', 'Chutney'], predictedCount: 380 },
        { mealType: 'Lunch', dishNames: ['Paneer Butter Masala', 'Dal Makhani', 'Rice'], predictedCount: 650 },
        { mealType: 'Snacks', dishNames: ['Crispy Samosa', 'Chai'], predictedCount: 420 },
        { mealType: 'Dinner', dishNames: ['Shahi Biryani', 'Veg Raita'], predictedCount: 610 },
      ],
    });

    return NextResponse.json({ success: true, data: insights });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to generate AI insights' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = aiInsightSchema.parse(body);

    const insights = await getGeminiDemandInsights(parsed);
    return NextResponse.json({ success: true, data: insights });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Invalid insight request' },
      { status: 400 },
    );
  }
}
