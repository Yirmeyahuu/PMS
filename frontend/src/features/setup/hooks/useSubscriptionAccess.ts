import { useSubscriptionStatus } from './useSubscription';
import { isSubscriptionActive } from '../services/subscription.api';
import { useAuthStore } from '@/store/auth.store';

export function useSubscriptionAccess() {
  const { isAuthenticated } = useAuthStore();
  const { data: subscription, isLoading } = useSubscriptionStatus(isAuthenticated);
  const isActive = isSubscriptionActive(subscription);

  return {
    isSubscriptionActive: isActive,
    isSubscriptionLoading: isLoading,
    subscription,
    // Helper explicitly meant for disabling action buttons in Read-Only mode
    isActionAllowed: isActive,
  };
}
