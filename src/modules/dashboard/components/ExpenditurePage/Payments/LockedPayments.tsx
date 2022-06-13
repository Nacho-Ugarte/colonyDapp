import React, { useCallback, useState } from 'react';

import { defineMessages, FormattedMessage } from 'react-intl';
import { Recipient as RecipientType } from './types';

import styles from './Payments.css';
import Icon from '~core/Icon';
import { FormSection } from '~core/Fields';
import LockedRecipient from '../Recipient/LockedRecipient';
import UserMention from '~core/UserMention';

const MSG = defineMessages({
  payments: {
    id: 'dashboard.Expenditures.Payments.defaultPayment',
    defaultMessage: 'Payments',
  },
  recipient: {
    id: 'dashboard.Expenditures.Payments.defaultRrecipient',
    defaultMessage: 'Recipient',
  },
  addRecipientLabel: {
    id: 'dashboard.Expenditures.Payments.addRecipientLabel',
    defaultMessage: 'Add recipient',
  },
  minusIconTitle: {
    id: 'dashboard.Expenditures.Payments.minusIconTitle',
    defaultMessage: 'Collapse a single recipient settings',
  },
  plusIconTitle: {
    id: 'dashboard.Expenditures.Payments.plusIconTitle',
    defaultMessage: 'Expand a single recipient settings',
  },
});

interface Props {
  recipients?: RecipientType[];
}

const LockedPayments = ({ recipients }: Props) => {
  const [expandedRecipients, setExpandedRecipients] = useState<
    number[] | undefined
  >(recipients?.map((_, idx) => idx));

  const onToggleButtonClick = useCallback((index) => {
    setExpandedRecipients((expandedIndexes) => {
      const isOpen = expandedIndexes?.find((expanded) => expanded === index);

      if (isOpen !== undefined) {
        return expandedIndexes?.filter((idx) => idx !== index);
      }
      return [...(expandedIndexes || []), index];
    });
  }, []);

  return (
    <div className={styles.paymentContainer}>
      <div className={styles.recipientContainer}>
        <div className={styles.payments}>
          <FormattedMessage {...MSG.payments} />
        </div>
        {recipients?.map((recipient, index) => {
          const isOpen =
            expandedRecipients?.find((idx) => idx === index) !== undefined;

          return (
            <div
              className={styles.singleRecipient}
              // eslint-disable-next-line react/no-array-index-key
              key={index}
            >
              <FormSection appearance={{ border: 'bottom' }}>
                <div className={styles.recipientName}>
                  {isOpen ? (
                    <>
                      <Icon
                        name="minus"
                        onClick={() => onToggleButtonClick(index)}
                        className={styles.signWrapper}
                        title={MSG.minusIconTitle}
                      />
                      <div className={styles.verticalDivider} />
                    </>
                  ) : (
                    <Icon
                      name="plus"
                      onClick={() => onToggleButtonClick(index)}
                      className={styles.signWrapper}
                      title={MSG.plusIconTitle}
                    />
                  )}
                  {index + 1}:{' '}
                  <UserMention username={recipient.recipient.username || ''} />
                  {recipient?.delay?.amount}
                  {recipient?.delay?.time}
                </div>
              </FormSection>
              <LockedRecipient
                recipient={{
                  ...recipient,
                  isExpanded: isOpen,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LockedPayments;
