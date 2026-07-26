import { describe, it, expect } from 'vitest';

type OrderStatus = 'submitted' | 'pending_waiter_review' | 'confirmed' | 'in_kitchen' | 'ready' | 'served';

type Transition = {
  from: OrderStatus;
  to: OrderStatus;
  waiterConfirmationEnabled: boolean;
  role?: 'cameriere' | 'cucina';
};

function isValidTransition(t: Transition): boolean {
  const { from, to, waiterConfirmationEnabled, role } = t;

  if (from === 'submitted' && to === 'pending_waiter_review') {
    return waiterConfirmationEnabled === true;
  }
  if (from === 'submitted' && to === 'confirmed') {
    return waiterConfirmationEnabled === false;
  }
  if (from === 'pending_waiter_review' && to === 'confirmed') {
    return role === 'cameriere';
  }
  if (from === 'confirmed' && to === 'in_kitchen') {
    return role === 'cucina';
  }
  if (from === 'in_kitchen' && to === 'ready') {
    return role === 'cucina';
  }
  if (from === 'ready' && to === 'served') {
    return role === 'cameriere';
  }
  return false;
}

describe('order state machine', () => {
  it('submitted -> pending_waiter_review with waiter confirmation enabled', () => {
    expect(isValidTransition({ from: 'submitted', to: 'pending_waiter_review', waiterConfirmationEnabled: true })).toBe(true);
  });

  it('submitted -> confirmed with waiter confirmation disabled', () => {
    expect(isValidTransition({ from: 'submitted', to: 'confirmed', waiterConfirmationEnabled: false })).toBe(true);
  });

  it('pending_waiter_review -> confirmed by cameriere', () => {
    expect(isValidTransition({ from: 'pending_waiter_review', to: 'confirmed', waiterConfirmationEnabled: true, role: 'cameriere' })).toBe(true);
  });

  it('confirmed -> in_kitchen by cucina', () => {
    expect(isValidTransition({ from: 'confirmed', to: 'in_kitchen', waiterConfirmationEnabled: true, role: 'cucina' })).toBe(true);
  });

  it('in_kitchen -> ready by cucina', () => {
    expect(isValidTransition({ from: 'in_kitchen', to: 'ready', waiterConfirmationEnabled: true, role: 'cucina' })).toBe(true);
  });

  it('ready -> served by cameriere', () => {
    expect(isValidTransition({ from: 'ready', to: 'served', waiterConfirmationEnabled: true, role: 'cameriere' })).toBe(true);
  });

  // Invalid transitions
  it('submitted -> confirmed when waiter confirmation is enabled', () => {
    expect(isValidTransition({ from: 'submitted', to: 'confirmed', waiterConfirmationEnabled: true })).toBe(false);
  });

  it('submitted -> pending_waiter_review when waiter confirmation is disabled', () => {
    expect(isValidTransition({ from: 'submitted', to: 'pending_waiter_review', waiterConfirmationEnabled: false })).toBe(false);
  });

  it('pending_waiter_review -> confirmed by cucina (wrong role)', () => {
    expect(isValidTransition({ from: 'pending_waiter_review', to: 'confirmed', waiterConfirmationEnabled: true, role: 'cucina' })).toBe(false);
  });

  it('confirmed -> in_kitchen by cameriere (wrong role)', () => {
    expect(isValidTransition({ from: 'confirmed', to: 'in_kitchen', waiterConfirmationEnabled: true, role: 'cameriere' })).toBe(false);
  });

  it('in_kitchen -> served (invalid direct transition)', () => {
    expect(isValidTransition({ from: 'in_kitchen', to: 'served', waiterConfirmationEnabled: true, role: 'cucina' })).toBe(false);
  });

  it('submitted -> ready (invalid direct transition)', () => {
    expect(isValidTransition({ from: 'submitted', to: 'ready', waiterConfirmationEnabled: true, role: 'cucina' })).toBe(false);
  });
});
