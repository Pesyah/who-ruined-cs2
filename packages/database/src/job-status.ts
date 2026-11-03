export const ACTIVE_JOB_STAGES = [
  'PARSING',
  'NORMALIZING',
  'VALIDATING',
  'FEATURIZING',
  'SCORING',
] as const;

export const UNFINISHED_JOB_STATUSES = [
  'QUEUED',
  ...ACTIVE_JOB_STAGES,
] as const;
