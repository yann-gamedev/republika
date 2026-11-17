import { CONTROL_CHAR_PATTERN } from '@republika/shared';

import { copy } from '@/copy/id';

export interface InaugurationValues {
  readonly presidentName: string;
  readonly cabinetName: string;
}

export interface InaugurationErrors {
  readonly presidentName?: string;
  readonly cabinetName?: string;
}

export function validateInauguration(values: InaugurationValues): InaugurationErrors {
  const errors: {
    presidentName?: string;
    cabinetName?: string;
  } = {};
  const presidentName = values.presidentName.trim();

  if (presidentName.length === 0) {
    errors.presidentName = copy.inauguration.errorRequired;
  } else if (presidentName.length < 2) {
    errors.presidentName = copy.inauguration.errorShort;
  } else if (presidentName.length > 40) {
    errors.presidentName = copy.inauguration.errorLong;
  } else if (CONTROL_CHAR_PATTERN.test(presidentName)) {
    errors.presidentName = copy.inauguration.errorControl;
  }

  if (values.cabinetName.trim().length > 40) {
    errors.cabinetName = copy.inauguration.errorCabinetLong;
  }

  return errors;
}
