import React from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveStyleKey } from '../constants/responsive-styles';
import { WithResponsiveViewProps } from '../types';

interface WithResponsiveViewOptions {
  styleKey?: ResponsiveStyleKey;
  mobileClassName?: string;
  desktopClassName?: string;
  fullWidth?: boolean;
  disableWrapper?: boolean;
}

export function withResponsiveView<P extends WithResponsiveViewProps>(
  WrappedComponent: React.ComponentType<P>,
  options: WithResponsiveViewOptions = {}
) {
  const {
    styleKey,
    mobileClassName = '',
    desktopClassName = '',
    fullWidth = false,
    disableWrapper = false
  } = options;

  return function WithResponsiveViewComponent(props: P) {
    const { viewType, theme } = props;

    if (disableWrapper) {
      return <WrappedComponent {...props} />;
    }

    return (
      <div
        className={cn(
          'relative',
          fullWidth ? 'w-full' : 'max-w-screen-lg mx-auto',
          viewType === 'mobile' ? mobileClassName : desktopClassName,
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        )}
      >
        <WrappedComponent {...props} />
      </div>
    );
  };
} 