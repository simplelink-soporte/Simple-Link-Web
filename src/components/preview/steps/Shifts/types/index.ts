import { FormStepField } from "@/types/form-steps";
import { Theme, ViewType } from "../constants/responsive-styles";

export interface ShiftsPreviewProps {
  field: FormStepField;
  theme: Theme;
  viewType: ViewType;
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isPublicView?: boolean;
}

export interface WithResponsiveViewProps {
  theme: Theme;
  viewType: ViewType;
} 