import React, { useCallback, useState } from 'react';
import { FormikProps } from 'formik';
import * as yup from 'yup';
import moveDecimal from 'move-decimal-point';
import { bigNumberify } from 'ethers/utils';
import { useHistory } from 'react-router-dom';
import { defineMessages } from 'react-intl';
import { ROOT_DOMAIN_ID } from '@colony/colony-js';

import { pipe, mapPayload, withMeta } from '~utils/actions';
import { Address } from '~types/index';
import { ActionTypes } from '~redux/index';
import Dialog, { ActionDialogProps, DialogProps } from '~core/Dialog';
import { ActionForm } from '~core/Fields';
import { WizardDialogType } from '~utils/hooks';

import DialogForm from './TransferFundsDialogForm';
import { getTokenDecimalsWithFallback } from '~utils/tokens';

const MSG = defineMessages({
  amountZero: {
    id: 'dashboard.TransferFundsDialog.amountZero',
    defaultMessage: 'Amount must be greater than zero',
  },
  noBalance: {
    id: 'dashboard.CreatePaymentDialog.TransferFundsDialog.noBalance',
    defaultMessage: 'Insufficient balance in from domain pot',
  },
});

export interface FormValues {
  forceAction: boolean;
  fromDomain?: string;
  toDomain?: string;
  amount: string;
  tokenAddress?: Address;
  annotation: string;
}

interface CustomWizardDialogProps extends ActionDialogProps {
  fromDomain?: number;
}

type Props = DialogProps &
  Partial<WizardDialogType<object>> &
  CustomWizardDialogProps;

const displayName = 'dashboard.TransferFundsDialog';

const TransferFundsDialog = ({
  colony: { tokens = [], colonyAddress, nativeTokenAddress, colonyName },
  colony,
  fromDomain,
  callStep,
  prevStep,
  cancel,
  close,
  isVotingExtensionEnabled,
}: Props) => {
  const [isForce, setIsForce] = useState(false);
  const history = useHistory();

  const getFormAction = useCallback(
    (actionType: 'SUBMIT' | 'ERROR' | 'SUCCESS') => {
      const actionEnd = actionType === 'SUBMIT' ? '' : `_${actionType}`;

      return isVotingExtensionEnabled && !isForce
        ? ActionTypes[`COLONY_MOTION_MOVE_FUNDS${actionEnd}`]
        : ActionTypes[`COLONY_ACTION_MOVE_FUNDS${actionEnd}`];
    },
    [isVotingExtensionEnabled, isForce],
  );

  const validationSchema = yup.object().shape({
    fromDomain: yup.number().required(),
    toDomain: yup.number().required(),
    amount: yup
      .number()
      .required()
      .moreThan(0, () => MSG.amountZero),
    tokenAddress: yup.string().address().required(),
    annotation: yup.string().max(4000),
  });

  const transform = useCallback(
    pipe(
      mapPayload(
        ({
          tokenAddress,
          amount: transferAmount,
          fromDomain: sourceDomain,
          toDomain,
          annotation: annotationMessage,
        }) => {
          const selectedToken = tokens.find(
            (token) => token.address === tokenAddress,
          );
          const decimals = getTokenDecimalsWithFallback(
            selectedToken && selectedToken.decimals,
          );

          // Convert amount string with decimals to BigInt (eth to wei)
          const amount = bigNumberify(moveDecimal(transferAmount, decimals));

          return {
            colonyAddress,
            colonyName,
            fromDomainId: parseInt(sourceDomain, 10),
            toDomainId: parseInt(toDomain, 10),
            amount,
            tokenAddress,
            annotationMessage,
          };
        },
      ),
      withMeta({ history }),
    ),
    [],
  );

  return (
    <ActionForm
      initialValues={{
        forceAction: false,
        fromDomain: fromDomain ? String(fromDomain) : ROOT_DOMAIN_ID.toString(),
        toDomain: undefined,
        amount: '',
        tokenAddress: nativeTokenAddress,
        annotation: undefined,
      }}
      validationSchema={validationSchema}
      submit={getFormAction('SUBMIT')}
      error={getFormAction('ERROR')}
      success={getFormAction('SUCCESS')}
      onSuccess={close}
      transform={transform}
      validateOnChange
    >
      {(formValues: FormikProps<FormValues>) => {
        if (formValues.values.forceAction !== isForce) {
          setIsForce(formValues.values.forceAction);
        }
        return (
          <Dialog cancel={cancel}>
            <DialogForm
              {...formValues}
              colony={colony}
              isVotingExtensionEnabled={isVotingExtensionEnabled}
              back={prevStep && callStep ? () => callStep(prevStep) : undefined}
            />
          </Dialog>
        );
      }}
    </ActionForm>
  );
};

TransferFundsDialog.displayName = displayName;

export default TransferFundsDialog;
