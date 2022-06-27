import React from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';

import CopyableAddress from '~core/CopyableAddress';
import Heading from '~core/Heading';
import Icon from '~core/Icon';
import Link from '~core/Link';
import Numeral from '~core/Numeral';
import { WALLET_ROUTE } from '~routes/index';
import { useLoggedInUser } from '~data/index';
import { checkIfNetworkIsAllowed } from '~utils/networks';
import { DEFAULT_NETWORK_TOKEN, SUPPORTED_NETWORKS } from '~constants';

import styles from './GasStationHeader.css';

const MSG = defineMessages({
  goToWalletLinkTitle: {
    id: 'users.GasStation.GasStationHeader.goToWalletLinkTitle',
    defaultMessage: 'Go to Wallet',
  },
  network: {
    id: 'users.GasStation.GasStationHeader.network',
    defaultMessage: 'Network: {connectedNetwork} (connected)',
  },
});

interface Props {
  close?: () => void;
  isMobile: boolean;
}

const displayName = 'users.GasStation.GasStationHeader';
const GasStationHeader = ({ close, isMobile }: Props) => {
  const { balance, walletAddress, networkId } = useLoggedInUser();
  const isNetworkAllowed = checkIfNetworkIsAllowed(networkId);
  const connectedNetwork = SUPPORTED_NETWORKS[networkId || 1].shortName;

  return (
    <div className={styles.main}>
      <div className={styles.walletDetails}>
        <div className={styles.walletHeading}>
          <Heading
            appearance={{ margin: 'none', size: 'normal' }}
            text={{ id: 'wallet' }}
          />
        </div>
        <div className={styles.walletAddress}>
          <CopyableAddress>{walletAddress}</CopyableAddress>
        </div>
        <div>
          {isNetworkAllowed && isMobile ? (
            <span className={styles.connectedNetwork}>
              <FormattedMessage
                {...MSG.network}
                values={{ connectedNetwork }}
              />
            </span>
          ) : (
            <Numeral value={balance} suffix={DEFAULT_NETWORK_TOKEN.symbol} />
          )}
        </div>
      </div>
      <div className={styles.actionsContainer}>
        <Link to={WALLET_ROUTE} data-test="userWallet">
          <div className={styles.goToWalletIcon}>
            <Icon
              appearance={{ size: 'medium' }}
              name="arrow-wallet"
              title={MSG.goToWalletLinkTitle}
            />
          </div>
        </Link>
        {close && (
          <button
            className={styles.closeButton}
            onClick={close}
            type="button"
            data-test="closeGasStationButton"
          >
            <Icon
              appearance={{ size: 'normal' }}
              name="close"
              title={{ id: 'button.close' }}
            />
          </button>
        )}
      </div>
    </div>
  );
};

GasStationHeader.displayName = displayName;

export default GasStationHeader;
