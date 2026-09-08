import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrchestrator } from '@/core/atlas/atlas-orchestrator';

const RiskConfigSchema = z.object({
  maxLeverage: z.number().min(1).max(100),
  maxAssetConcentration: z.number().min(0).max(1),
  maxTotalExposure: z.number().min(0).max(1),
  maxNetExposure: z.number().min(0).max(1),
  maxTradeLoss: z.number().min(0),
  dailyLossLimit: z.number().min(0),
  minimumLiquidity: z.number().min(0).max(1),
  maxSlippage: z.number().min(0).max(1),
  maxFragilityScore: z.number().min(0).max(1),
  minAvailableCapital: z.number().min(0).max(1),
  maxHuntAllocation: z.number().min(0).max(1),
}).partial();

export async function GET() {
  try {
    const orchestrator = getOrchestrator();
    return NextResponse.json(orchestrator.getRiskConfig());
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to get risk config' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validatedData = RiskConfigSchema.parse(body);
    
    const orchestrator = getOrchestrator();
    const currentConfig = orchestrator.getRiskConfig();
    
    const newConfig = { ...currentConfig, ...validatedData };
    orchestrator.setRiskConfig(newConfig);
    
    return NextResponse.json({ success: true, riskConfig: newConfig });
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update risk config' }, { status: 500 });
  }
}
