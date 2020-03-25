import React from 'react';

import Avatar from '~core/Avatar';
import InfoPopover, { Props as InfoPopoverProps } from '~core/InfoPopover';
import Link from '~core/NavLink';
import { Address } from '~types/index';
import { AnyUser } from '~data/index';

import { getUsername } from '../../../users/transformers';

import styles from './UserAvatar.css';

interface BaseProps {
  /** Address of the current user for identicon fallback */
  address: Address;

  /** Avatar image URL (can be a base64 encoded url string) */
  avatarURL?: string;

  /** Is passed through to Avatar */
  className?: string;

  /** Avatars that are not set have a different placeholder */
  notSet?: boolean;

  /** If true the UserAvatar links to the user's profile */
  showLink?: boolean;

  /** Whether to show or not show the InfoPopover tooltip over the avatar */
  showInfo?: boolean;

  /** Avatar size (default is between `s` and `m`) */
  size?: 'xxs' | 'xs' | 's' | 'm' | 'l' | 'xl';

  /** The corresponding user object if available */
  user?: AnyUser;
}

/** Used for the infopopover */
interface PropsForReputation extends BaseProps {
  colonyAddress?: Address;
  skillId?: number;
}

export type Props = BaseProps | PropsForReputation;

const displayName = 'UserAvatar';

const UserAvatar = ({
  address,
  avatarURL,
  className,
  showInfo,
  showLink,
  notSet,
  size,
  user = {
    id: address,
    profile: { walletAddress: address },
  },
  ...rest
}: Props) => {
  const username = getUsername(user);
  let popoverProps: InfoPopoverProps = {
    trigger: showInfo ? 'click' : 'disabled',
    user,
  };
  if ('colonyAddress' in rest) {
    const { colonyAddress, skillId } = rest;
    popoverProps = {
      ...popoverProps,
      colonyAddress,
      skillId,
    };
  }
  const avatar = (
    <InfoPopover {...popoverProps}>
      <div className={styles.main}>
        <Avatar
          avatarURL={avatarURL}
          className={className}
          notSet={notSet}
          placeholderIcon="circle-person"
          seed={address && address.toLowerCase()}
          size={size}
          title={showInfo ? '' : username || address}
        />
      </div>
    </InfoPopover>
  );
  if (showLink && username) {
    // Won't this always be lowercase?
    return <Link to={`/user/${username.toLowerCase()}`}>{avatar}</Link>;
  }
  return avatar;
};

UserAvatar.displayName = displayName;

export default UserAvatar;
