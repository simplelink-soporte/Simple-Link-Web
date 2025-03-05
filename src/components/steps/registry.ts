import { USER_STEP } from './users';
import { LOCATION_STEP } from './location';
import { SHIFTS_STEP } from './shifts';
import { ITEMS_STEP } from './items';
import { ANNOUNCEMENTS_STEP } from './announcements';
import { COUPONS_STEP } from './coupons';
import { PAYMENT_STEP } from './payment';
import { SUMMARY_STEP } from './summary';
import { FAREWELL_STEP } from './farewell';

export const STEPS_REGISTRY = {
  [USER_STEP.id]: USER_STEP,
  [LOCATION_STEP.id]: LOCATION_STEP,
  [SHIFTS_STEP.id]: SHIFTS_STEP,
  [ITEMS_STEP.id]: ITEMS_STEP,
  [ANNOUNCEMENTS_STEP.id]: ANNOUNCEMENTS_STEP,
  [COUPONS_STEP.id]: COUPONS_STEP,
  [PAYMENT_STEP.id]: PAYMENT_STEP,
  [SUMMARY_STEP.id]: SUMMARY_STEP,
  [FAREWELL_STEP.id]: FAREWELL_STEP,
} as const;

export type StepType = keyof typeof STEPS_REGISTRY; 