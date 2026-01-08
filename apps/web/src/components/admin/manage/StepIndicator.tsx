/**
 * StepIndicator Component
 * Shows step buttons for delete/create workflow
 */

type Step = "delete" | "create";

interface StepIndicatorProps {
  readonly currentStep: Step;
  readonly completed: boolean;
  readonly onStepChange: (step: Step) => void;
}

export function StepIndicator({
  currentStep,
  completed,
  onStepChange,
}: StepIndicatorProps) {
  const handleDeleteClick = () => {
    if (!completed) {
      onStepChange("delete");
    }
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !completed) {
      e.preventDefault();
      onStepChange("delete");
    }
  };

  const handleCreateClick = () => {
    onStepChange("create");
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onStepChange("create");
    }
  };

  return (
    <div className="flex gap-4">
      <button
        type="button"
        className={`flex-1 p-3 rounded-lg text-center cursor-pointer transition ${
          currentStep === "delete"
            ? "bg-primary text-white"
            : "bg-surface text-text-secondary hover:bg-surface-dark"
        }`}
        onClick={handleDeleteClick}
        onKeyDown={handleDeleteKeyDown}
        aria-label="Step 1: Delete admin account"
      >
        <p className="text-sm font-semibold">Step 1: Delete</p>
      </button>
      <button
        type="button"
        className={`flex-1 p-3 rounded-lg text-center cursor-pointer transition ${
          currentStep === "create"
            ? "bg-primary text-white"
            : "bg-surface text-text-secondary hover:bg-surface-dark"
        }`}
        onClick={handleCreateClick}
        onKeyDown={handleCreateKeyDown}
        aria-label="Step 2: Create admin account"
      >
        <p className="text-sm font-semibold">Step 2: Create</p>
      </button>
    </div>
  );
}
