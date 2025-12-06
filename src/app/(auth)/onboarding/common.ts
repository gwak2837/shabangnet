export enum OnboardingStep {
  Step1_ChooseMethod,
  Step2_EnterPassword,
  Step3a_PasskeySetup,
  Step3b_TOTPSetup,
  Step4_BackupCodes,
}

export interface StepProps {
  isPending: boolean
}
