import React, { useMemo, useEffect, useCallback } from 'react';
import { FormikProps } from 'formik';
import { defineMessages, FormattedMessage } from 'react-intl';
import BigNumber from 'bn.js';
import moveDecimal from 'move-decimal-point';

import { Address, ColonyRoles } from '~types/index';
import { useDataFetcher, useSelector } from '~utils/hooks';
import Button from '~core/Button';
import DialogSection from '~core/Dialog/DialogSection';
import { Select, Input, FormStatus } from '~core/Fields';
import Heading from '~core/Heading';

import { domainsFetcher } from '../../../dashboard/fetchers';
import {
  tokenBalanceSelector,
  userHasRole,
} from '../../../dashboard/selectors';
import { walletAddressSelector } from '../../../users/selectors';

import styles from './TokensMoveDialogForm.css';
import { FormValues } from './TokensMoveDialog';
import EthUsd from '~core/EthUsd';
import Numeral from '~core/Numeral';
import { ZERO_ADDRESS } from '~utils/web3/constants';

const MSG = defineMessages({
  title: {
    id: 'admin.Tokens.TokensMoveDialogForm.title',
    defaultMessage: 'Move Funds',
  },
  from: {
    id: 'admin.Tokens.TokensMoveDialogForm.from',
    defaultMessage: 'From',
  },
  to: {
    id: 'admin.Tokens.TokensMoveDialogForm.to',
    defaultMessage: 'To',
  },
  amount: {
    id: 'admin.Tokens.TokensMoveDialogForm.amount',
    defaultMessage: 'Amount',
  },
  domainTokenAmount: {
    id: 'admin.Tokens.TokensMoveDialogForm.domainTokenAmount',
    defaultMessage: 'Amount: {amount} {symbol}',
  },
  noAmount: {
    id: 'admin.Tokens.TokensMoveDialogForm.noAmount',
    defaultMessage: 'Amount must be greater than zero',
  },
  noBalance: {
    id: 'admin.Tokens.TokensMoveDialogForm.noBalance',
    defaultMessage: 'Insufficient balance in from domain pot',
  },
  noPermissionFrom: {
    id: 'admin.Tokens.TokensMoveDialogForm.noPermissionFrom',
    defaultMessage: 'No permission in from domain',
  },
  noPermissionTo: {
    id: 'admin.Tokens.TokensMoveDialogForm.noPermissionTo',
    defaultMessage: 'No permission in to domain',
  },
  samePot: {
    id: 'admin.Tokens.TokensMoveDialogForm.samePot',
    defaultMessage: 'Cannot move to same domain pot',
  },
});

interface Props {
  cancel: () => void;
  colonyAddress: Address;
  colonyTokenRefs: any; // This type should be improved!
  colonyTokens: any; // This type should be improved!
}

const TokensMoveDialogForm = ({
  cancel,
  colonyAddress,
  colonyTokens,
  colonyTokenRefs,
  handleSubmit,
  isSubmitting,
  isValid,
  setErrors,
  status,
  values,
}: Props & FormikProps<FormValues>) => {
  // Find the currently selected token
  const [selectedTokenRef, selectedToken] = useMemo(
    () => [
      colonyTokenRefs.find(token => token.address === values.tokenAddress),
      colonyTokens.find(token => token.address === values.tokenAddress),
    ],
    [colonyTokenRefs, colonyTokens, values.tokenAddress],
  );

  // Map the colony's tokens to Select options
  const tokenOptions = useMemo(
    () =>
      colonyTokenRefs.map(({ address }) => ({
        value: address,
        label:
          (
            colonyTokens.find(
              ({ address: refAddress }) => refAddress === address,
            ) || { symbol: undefined }
          ).symbol || '???',
      })),
    [colonyTokenRefs, colonyTokens],
  );

  const { data: domains } = useDataFetcher(
    domainsFetcher,
    [colonyAddress],
    [colonyAddress],
  );

  // Map the colony's domains to Select options
  const domainOptions = useMemo(
    () =>
      Object.keys(domains || {})
        .sort()
        .map(id => ({ value: id, label: domains[id].name })),

    [domains],
  );

  // Get from and to domain permissions for current user
  const walletAddress = useSelector(walletAddressSelector);
  const userHasFundingRoleInFromDomain = useSelector(userHasRole, [
    colonyAddress,
    (values.fromDomain || 1).toString(),
    walletAddress,
    ColonyRoles.FUNDING,
  ]);
  const userHasFundingRoleInToDomain = useSelector(userHasRole, [
    colonyAddress,
    (values.toDomain || 1).toString(),
    walletAddress,
    ColonyRoles.FUNDING,
  ]);

  // Get domain token balances from state
  const fromDomainTokenBalanceSelector = useCallback(
    state =>
      tokenBalanceSelector(
        state,
        colonyAddress,
        values.tokenAddress || '',
        (values.fromDomain || 1).toString(),
      ),
    [colonyAddress, values.fromDomain, values.tokenAddress],
  );
  const fromDomainTokenBalance = useSelector(fromDomainTokenBalanceSelector);
  const toDomainTokenBalanceSelector = useCallback(
    state =>
      tokenBalanceSelector(
        state,
        colonyAddress,
        values.tokenAddress || '',
        (values.toDomain || 1).toString(),
      ),
    [colonyAddress, values.toDomain, values.tokenAddress],
  );
  const toDomainTokenBalance = useSelector(toDomainTokenBalanceSelector);

  // Perform form validations
  useEffect(() => {
    const errors: {
      amount?: any;
      fromDomain?: any;
      toDomain?: any;
    } = {};

    if (!(values.amount && values.amount.length)) {
      errors.amount = undefined; // silent error
    } else {
      const convertedAmount = new BigNumber(
        moveDecimal(values.amount, selectedToken.decimals || 18),
      );
      if (convertedAmount.eqn(0)) {
        errors.amount = MSG.noAmount;
      } else if (
        fromDomainTokenBalance &&
        fromDomainTokenBalance.lt(convertedAmount)
      ) {
        errors.amount = MSG.noBalance;
      }
    }

    if (values.fromDomain && !userHasFundingRoleInFromDomain) {
      errors.fromDomain = MSG.noPermissionFrom;
    }

    if (values.toDomain && !userHasFundingRoleInToDomain) {
      errors.toDomain = MSG.noPermissionTo;
    }

    if (
      values.toDomain !== undefined &&
      values.toDomain === values.fromDomain
    ) {
      errors.toDomain = MSG.samePot;
    }

    setErrors(errors);
  }, [
    fromDomainTokenBalance,
    selectedToken.decimals,
    selectedTokenRef,
    setErrors,
    userHasFundingRoleInFromDomain,
    userHasFundingRoleInToDomain,
    values.amount,
    values.fromDomain,
    values.toDomain,
  ]);

  return (
    <>
      <FormStatus status={status} />
      <DialogSection>
        <Heading
          appearance={{ size: 'medium', margin: 'none' }}
          text={MSG.title}
        />
      </DialogSection>
      <DialogSection>
        <Select options={domainOptions} label={MSG.from} name="fromDomain" />
        {values.fromDomain !== undefined && !!values.tokenAddress && (
          <div className={styles.domainPotBalance}>
            <FormattedMessage
              {...MSG.domainTokenAmount}
              values={{
                amount: (
                  <Numeral
                    appearance={{
                      size: 'small',
                      theme: 'grey',
                    }}
                    value={fromDomainTokenBalance || 0}
                    unit={(selectedToken && selectedToken.decimals) || 18}
                    truncate={3}
                  />
                ),
                symbol: selectedToken.symbol || '???',
              }}
            />
          </div>
        )}
      </DialogSection>
      <DialogSection>
        <Select options={domainOptions} label={MSG.to} name="toDomain" />
        {values.toDomain !== undefined && !!values.tokenAddress && (
          <div className={styles.domainPotBalance}>
            <FormattedMessage
              {...MSG.domainTokenAmount}
              values={{
                amount: (
                  <Numeral
                    appearance={{
                      size: 'small',
                      theme: 'grey',
                    }}
                    value={toDomainTokenBalance || 0}
                    unit={(selectedToken && selectedToken.decimals) || 18}
                    truncate={3}
                  />
                ),
                symbol: selectedToken.symbol || '???',
              }}
            />
          </div>
        )}
      </DialogSection>
      <DialogSection>
        <div className={styles.tokenAmount}>
          <div>
            <Input
              label={MSG.amount}
              name="amount"
              appearance={{ theme: 'minimal', align: 'right' }}
              formattingOptions={{
                delimiter: ',',
                numeral: true,
                numeralDecimalScale:
                  (selectedToken && selectedToken.decimals) || 18,
              }}
            />
          </div>
          <div className={styles.tokenAmountSelect}>
            <Select
              options={tokenOptions}
              name="tokenAddress"
              elementOnly
              appearance={{ alignOptions: 'right', theme: 'default' }}
            />
          </div>
          {values.tokenAddress === ZERO_ADDRESS && (
            <div className={styles.tokenAmountUsd}>
              <EthUsd
                appearance={{ theme: 'grey', size: 'small' }}
                value={
                  values.amount && values.amount.length ? values.amount : 0
                }
              />
            </div>
          )}
        </div>
      </DialogSection>
      <DialogSection appearance={{ align: 'right' }}>
        <Button
          appearance={{ theme: 'secondary', size: 'large' }}
          onClick={cancel}
          text={{ id: 'button.back' }}
        />
        <Button
          appearance={{ theme: 'primary', size: 'large' }}
          onClick={handleSubmit}
          text={{ id: 'button.confirm' }}
          loading={isSubmitting}
          disabled={!isValid}
        />
      </DialogSection>
    </>
  );
};

TokensMoveDialogForm.displayName = 'admin.Tokens.TokensMoveDialogForm';

export default TokensMoveDialogForm;
