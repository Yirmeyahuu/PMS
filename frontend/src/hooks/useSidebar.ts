import { useSidebarContext } from '@/contexts/SidebarContext';

/**
 * Custom hook for accessing sidebar state
 * Provides utility methods and state for responsive layouts
 */
export const useSidebar = () => {
  const context = useSidebarContext();

  /**
   * Get responsive font size based on sidebar state
   */
  const getFontSize = (collapsedSize: string, expandedSize: string) => {
    return context.isExpanded || context.isMobile ? expandedSize : collapsedSize;
  };

  /**
   * Get responsive spacing based on sidebar state
   */
  const getSpacing = (collapsedSpacing: string, expandedSpacing: string) => {
    return context.isExpanded || context.isMobile ? expandedSpacing : collapsedSpacing;
  };

  /**
   * Get responsive grid columns
   */
  const getGridCols = (collapsedCols: number, expandedCols: number) => {
    return context.isExpanded || context.isMobile ? expandedCols : collapsedCols;
  };

  /**
   * Get responsive width class
   */
  const getWidthClass = (collapsedClass: string, expandedClass: string) => {
    return context.isExpanded || context.isMobile ? expandedClass : collapsedClass;
  };

  /**
   * Get responsive padding
   */
  const getPadding = (collapsedPadding: string, expandedPadding: string) => {
    return context.isExpanded || context.isMobile ? expandedPadding : collapsedPadding;
  };

  return {
    ...context,
    getFontSize,
    getSpacing,
    getGridCols,
    getWidthClass,
    getPadding,
  };
};