import React, { useRef, useState, useEffect, useCallback } from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';

import Dialog, { DialogSection } from '~core/Dialog';
import Button, { ActionButton } from '~core/Button';
import Heading from '~core/Heading';
import { mapPayload } from '~utils/actions';
import { ActionTypes } from '~redux/index';
import { Address } from '~types/index';

import { useWhitelistAgreementQuery } from '~data/index';

import AgreementContainer from './AgreementContainer';
import styles from './AgreementDialog.css';

const MSG = defineMessages({
  title: {
    id: 'dashboard.Extensions.Whitelist.AgreementDialog.title',
    defaultMessage: 'Sale agreement',
  },
  agreementExplanation: {
    id: `dashboard.Extensions.WhitelisExtension.AgreementDialog.agreementExplanation`,
    defaultMessage: `Add to the whitelist wallet addresses which should be participating in the token sale. `,
  },
  readCarefully: {
    id: 'dashboard.Extensions.WhitelisExtension.AgreementDialog.readCarefully',
    defaultMessage: 'Read carefully',
  },
  gotItButton: {
    id: 'dashboard.Extensions.Whitelist.AgreementDialog.gotItButton',
    defaultMessage: 'Got it',
  },
  iAgreeButton: {
    id: 'dashboard.Extensions.WhitelisExtension.AgreementDialog.iAgreeButton',
    defaultMessage: 'I agree',
  },
  agreeToTerms: {
    id: 'dashboard.Extensions.WhitelisExtension.AgreementDialog.agreeToTerms',
    defaultMessage: 'By Signing you agree to the terms and conditions',
  },
});

interface Props {
  cancel: () => void;
  close: () => void;
  agreementHash: string;
  back?: () => void;
  isSignable?: boolean;
  colonyAddress?: Address;
}

const AgreementDialog = ({
  cancel,
  close,
  agreementHash,
  isSignable = false,
  back,
  colonyAddress,
}: Props) => {
  const [hasBeenScrolled, setHasBeenScrolled] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const { data, loading } = useWhitelistAgreementQuery({
    variables: { agreementHash },
    fetchPolicy: 'network-only',
  });

  const handleScroll = (e) => {
    const bottom =
      e.target.scrollHeight - 1 - e.target.scrollTop <= e.target.clientHeight;

    if (bottom) {
      setHasBeenScrolled(true);
    }
  };

  useEffect(() => {
    if (
      ref.current !== null &&
      ref.current.clientHeight === ref.current.scrollHeight
    ) {
      setHasBeenScrolled(true);
    }
  }, [data]);

  const signAgreementTransform = useCallback(
    mapPayload(() => ({
      agreementHash,
      colonyAddress,
    })),
    [],
  );

  return (
    <Dialog cancel={cancel}>
      <DialogSection appearance={{ theme: 'sidePadding' }}>
        <Heading
          appearance={{ size: 'medium', margin: 'none' }}
          text={MSG.title}
          className={styles.title}
        />
      </DialogSection>
      {isSignable && (
        <div className={styles.description}>
          <DialogSection appearance={{ theme: 'sidePadding' }}>
            <FormattedMessage {...MSG.agreementExplanation} />
          </DialogSection>
        </div>
      )}
      <DialogSection>
        {isSignable && (
          <div className={styles.readCarefullyText}>
            <FormattedMessage {...MSG.readCarefully} />
          </div>
        )}
        <AgreementContainer
          loading={loading}
          text={data?.whitelistAgreement}
          containerRef={ref}
          handleScroll={handleScroll}
        />
        {isSignable && (
          <div className={styles.agreeToTermsText}>
            <FormattedMessage {...MSG.agreeToTerms} />
          </div>
        )}
      </DialogSection>
      <DialogSection appearance={{ align: 'right', theme: 'footer' }}>
        {back && (
          <Button
            appearance={{ theme: 'secondary', size: 'large' }}
            onClick={back}
            text={{ id: 'button.back' }}
          />
        )}
        {isSignable ? (
          <ActionButton
            appearance={{ theme: 'primary', size: 'large' }}
            submit={ActionTypes.WHITELIST_SIGN_AGREEMENT}
            error={ActionTypes.WHITELIST_SIGN_AGREEMENT_ERROR}
            success={ActionTypes.WHITELIST_SIGN_AGREEMENT_SUCCESS}
            onSuccess={close}
            transform={signAgreementTransform}
            text={MSG.iAgreeButton}
            disabled={!data?.whitelistAgreement || !hasBeenScrolled}
          />
        ) : (
          <Button
            appearance={{ theme: 'primary', size: 'large' }}
            onClick={close}
            text={MSG.gotItButton}
            disabled={!hasBeenScrolled}
          />
        )}
      </DialogSection>
    </Dialog>
  );
};

export default AgreementDialog;
