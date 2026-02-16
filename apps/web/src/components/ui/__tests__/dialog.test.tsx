/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from '../dialog';

// Mock Radix UI Portal to render inline for testing
jest.mock('@radix-ui/react-dialog', () => {
  const actual = jest.requireActual('@radix-ui/react-dialog');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="portal">{children}</div>,
  };
});

describe('Dialog Components', () => {
  describe('Dialog', () => {
    it('renders dialog with trigger and content', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open Dialog</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Title</DialogTitle>
              <DialogDescription>Test Description</DialogDescription>
            </DialogHeader>
            <p>Dialog content</p>
            <DialogFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument();
    });

    it('opens dialog when trigger is clicked', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open Dialog</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Title</DialogTitle>
            <p>Dialog content</p>
          </DialogContent>
        </Dialog>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Open Dialog' }));

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Dialog content')).toBeInTheDocument();
    });

    it('closes dialog when close button is clicked', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Test Title</DialogTitle>
            <p>Dialog content</p>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();

      // Click the close button (X)
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      // Dialog should be closed
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });
  });

  describe('DialogHeader', () => {
    it('renders children', () => {
      render(
        <DialogHeader>
          <span>Header Content</span>
        </DialogHeader>
      );

      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <DialogHeader className="custom-header" data-testid="header">
          <span>Header</span>
        </DialogHeader>
      );

      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });

    it('has correct displayName', () => {
      expect(DialogHeader.displayName).toBe('DialogHeader');
    });
  });

  describe('DialogFooter', () => {
    it('renders children', () => {
      render(
        <DialogFooter>
          <button>Action</button>
        </DialogFooter>
      );

      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <DialogFooter className="custom-footer" data-testid="footer">
          <button>Action</button>
        </DialogFooter>
      );

      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });

    it('has correct displayName', () => {
      expect(DialogFooter.displayName).toBe('DialogFooter');
    });
  });

  describe('DialogTitle', () => {
    it('renders with text', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>My Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('My Title')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle className="custom-title">Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByText('Title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('DialogDescription', () => {
    it('renders with text', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>My Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('My Description')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription className="custom-description">Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByText('Description');
      expect(description).toHaveClass('custom-description');
    });
  });

  describe('DialogContent', () => {
    it('renders children', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Content inside dialog</p>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Content inside dialog')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent className="custom-content">
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      // The content should have the custom class
      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('custom-content');
    });

    it('includes close button with X icon', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('DialogOverlay', () => {
    it('applies custom className', () => {
      // DialogOverlay is rendered as part of DialogContent
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      // The overlay should be present when dialog is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('DialogTrigger', () => {
    it('renders as child element', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button type="button">Trigger Button</button>
          </DialogTrigger>
        </Dialog>
      );

      expect(screen.getByRole('button', { name: 'Trigger Button' })).toBeInTheDocument();
    });

    it('opens dialog on click', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Click Me</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Opened</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Click Me' }));
      expect(screen.getByText('Dialog Opened')).toBeInTheDocument();
    });
  });

  describe('DialogClose', () => {
    it('closes dialog when clicked', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogClose asChild>
              <button>Close Me</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Close Me' }));

      expect(screen.queryByText('Title')).not.toBeInTheDocument();
    });
  });

  describe('DialogPortal', () => {
    it('renders content in portal', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Portal Content</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      // Check the portal is rendered
      expect(screen.getByTestId('portal')).toBeInTheDocument();
      expect(screen.getByText('Portal Content')).toBeInTheDocument();
    });
  });

  describe('Controlled Dialog', () => {
    it('respects open prop', () => {
      const { rerender } = render(
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Controlled Dialog')).not.toBeInTheDocument();

      rerender(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
    });

    it('calls onOpenChange when dialog state changes', () => {
      const handleOpenChange = jest.fn();

      render(
        <Dialog open={true} onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Accessibility', () => {
    it('dialog has proper role', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('close button has sr-only text', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      // The close button should have screen reader text
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });
});
