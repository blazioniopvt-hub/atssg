'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export interface DropdownProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative inline-block', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Dropdown.displayName = 'Dropdown';

export interface DropdownTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DropdownTrigger = React.forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
      </button>
    );
  }
);
DropdownTrigger.displayName = 'DropdownTrigger';

export interface DropdownContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const DropdownContent = React.forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-950 shadow-md',
          className
        )}
        {...props}
      />
    );
  }
);
DropdownContent.displayName = 'DropdownContent';

export interface DropdownItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onSelect?: () => void;
}

const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ className, onSelect, children, onKeyDown, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={0}
        className={cn(
          'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-primary-100 focus:text-primary-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.();
          }
          onKeyDown?.(e);
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownItem.displayName = 'DropdownItem';

export interface DropdownSeparatorProps
  extends React.HTMLAttributes<HTMLHRElement> {}

const DropdownSeparator = React.forwardRef<HTMLHRElement, DropdownSeparatorProps>(
  ({ className, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn('-mx-1 my-1 h-0 border-t border-gray-200', className)}
      {...props}
    />
  )
);
DropdownSeparator.displayName = 'DropdownSeparator';

export { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator };
export default Dropdown;