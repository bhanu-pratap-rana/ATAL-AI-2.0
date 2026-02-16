/**
 * Tests for StepIndicator Component
 *
 * Tests step indicator functionality including:
 * - Step rendering
 * - Active step styling
 * - Click handlers
 * - Keyboard navigation
 * - Completed state behavior
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { StepIndicator } from "@/components/admin/manage/StepIndicator";

describe("StepIndicator", () => {
  describe("rendering", () => {
    it("should render both step buttons", () => {
      const onStepChange = jest.fn();
      render(
        <StepIndicator
          currentStep="delete"
          completed={false}
          onStepChange={onStepChange}
        />
      );

      expect(
        screen.getByRole("button", { name: /step 1: delete/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /step 2: create/i })
      ).toBeInTheDocument();
    });

    it("should show step labels", () => {
      render(
        <StepIndicator
          currentStep="delete"
          completed={false}
          onStepChange={() => {}}
        />
      );

      expect(screen.getByText("Step 1: Delete")).toBeInTheDocument();
      expect(screen.getByText("Step 2: Create")).toBeInTheDocument();
    });
  });

  describe("active step styling", () => {
    it("should highlight delete step when active", () => {
      render(
        <StepIndicator
          currentStep="delete"
          completed={false}
          onStepChange={() => {}}
        />
      );

      const deleteButton = screen.getByRole("button", {
        name: /step 1: delete/i,
      });
      expect(deleteButton).toHaveClass("bg-primary", "text-white");
    });

    it("should highlight create step when active", () => {
      render(
        <StepIndicator
          currentStep="create"
          completed={false}
          onStepChange={() => {}}
        />
      );

      const createButton = screen.getByRole("button", {
        name: /step 2: create/i,
      });
      expect(createButton).toHaveClass("bg-primary", "text-white");
    });

    it("should not highlight inactive step", () => {
      render(
        <StepIndicator
          currentStep="delete"
          completed={false}
          onStepChange={() => {}}
        />
      );

      const createButton = screen.getByRole("button", {
        name: /step 2: create/i,
      });
      expect(createButton).toHaveClass("bg-surface", "text-text-secondary");
    });
  });

  describe("click handlers", () => {
    it("should call onStepChange with 'delete' when delete button clicked", () => {
      const onStepChange = jest.fn();
      render(
        <StepIndicator
          currentStep="create"
          completed={false}
          onStepChange={onStepChange}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /step 1: delete/i })
      );

      expect(onStepChange).toHaveBeenCalledWith("delete");
    });

    it("should call onStepChange with 'create' when create button clicked", () => {
      const onStepChange = jest.fn();
      render(
        <StepIndicator
          currentStep="delete"
          completed={false}
          onStepChange={onStepChange}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /step 2: create/i })
      );

      expect(onStepChange).toHaveBeenCalledWith("create");
    });
  });

  describe("completed state", () => {
    it("should not call onStepChange for delete when completed", () => {
      const onStepChange = jest.fn();
      render(
        <StepIndicator
          currentStep="create"
          completed={true}
          onStepChange={onStepChange}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /step 1: delete/i })
      );

      expect(onStepChange).not.toHaveBeenCalled();
    });

    it("should still allow navigating to create when completed", () => {
      const onStepChange = jest.fn();
      render(
        <StepIndicator
          currentStep="delete"
          completed={true}
          onStepChange={onStepChange}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /step 2: create/i })
      );

      expect(onStepChange).toHaveBeenCalledWith("create");
    });
  });

  describe("keyboard navigation", () => {
    it("should handle Enter key on create button", () => {
      const onStepChange = jest.fn();
      render(
        <StepIndicator
          currentStep="delete"
          completed={false}
          onStepChange={onStepChange}
        />
      );

      fireEvent.keyDown(
        screen.getByRole("button", { name: /step 2: create/i }),
        { key: "Enter" }
      );

      expect(onStepChange).toHaveBeenCalledWith("create");
    });

    it("should handle Space key on create button", () => {
      const onStepChange = jest.fn();
      render(
        <StepIndicator
          currentStep="delete"
          completed={false}
          onStepChange={onStepChange}
        />
      );

      fireEvent.keyDown(
        screen.getByRole("button", { name: /step 2: create/i }),
        { key: " " }
      );

      expect(onStepChange).toHaveBeenCalledWith("create");
    });

    it("should not call onStepChange for delete on Enter when completed", () => {
      const onStepChange = jest.fn();
      render(
        <StepIndicator
          currentStep="create"
          completed={true}
          onStepChange={onStepChange}
        />
      );

      fireEvent.keyDown(
        screen.getByRole("button", { name: /step 1: delete/i }),
        { key: "Enter" }
      );

      expect(onStepChange).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have proper aria-labels", () => {
      render(
        <StepIndicator
          currentStep="delete"
          completed={false}
          onStepChange={() => {}}
        />
      );

      expect(
        screen.getByLabelText("Step 1: Delete admin account")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Step 2: Create admin account")
      ).toBeInTheDocument();
    });
  });
});
