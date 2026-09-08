import { describe, it, expect } from 'vitest';
import { ExecutionController } from '../execution-controller';

describe('Execution Controller Safety', () => {
  const mockAdapter = {
    executeOrder: async (order: any) => ({
      orderId: '123',
      executedPrice: 100,
      executedQuantity: order.quantity
    })
  } as any;

  const controller = new ExecutionController(mockAdapter);

  const proposal = { id: 'p1', asset: 'BTC', direction: 'LONG' } as any;

  it('Throws error if referee DENY', async () => {
    const decision = { decision: 'DENY' } as any;
    await expect(controller.execute(proposal, decision, 100)).rejects.toThrow(/EXECUTION BLOCKED/);
  });

  it('Succeeds on ALLOW and uses approvedAllocation', async () => {
    const decision = { decision: 'ALLOW', approvedAllocation: 1000 } as any;
    const res = await controller.execute(proposal, decision, 100);
    expect(res.executedQuantity).toBe(10); // 1000 / 100
  });

  it('Succeeds on RESIZE and uses approvedAllocation', async () => {
    const decision = { decision: 'RESIZE', approvedAllocation: 500 } as any;
    const res = await controller.execute(proposal, decision, 100);
    expect(res.executedQuantity).toBe(5); // 500 / 100
  });
});
