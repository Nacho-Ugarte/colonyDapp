import React from 'react';
import { defineMessages, FormattedDate, FormattedMessage } from 'react-intl';
import {
  useParams,
  Switch,
  Route,
  useRouteMatch,
  Redirect,
} from 'react-router';
import { ColonyRole, ROOT_DOMAIN_ID } from '@colony/colony-js';

import BreadCrumb, { Crumb } from '~core/BreadCrumb';
import Heading from '~core/Heading';
import {
  useColonyExtensionQuery,
  useColonyRolesQuery,
  useLoggedInUser,
} from '~data/index';
import { Address } from '~types/index';
import { SpinnerLoader } from '~core/Preloaders';
import { DialogActionButton } from '~core/Button';
import { Table, TableBody, TableCell, TableRow } from '~core/Table';
import CopyableAddress from '~core/CopyableAddress';
import HookedUserAvatar from '~users/HookedUserAvatar';
import { useTransformer } from '~utils/hooks';
import extensionData from '~data/staticData/extensionData';
import MaskedAddress from '~core/MaskedAddress';
import { ActionTypes } from '~redux/index';
import { ConfirmDialog } from '~core/Dialog';
import PermissionsLabel from '~core/PermissionsLabel';
import {
  COLONY_EXTENSION_DETAILS_ROUTE,
  COLONY_EXTENSION_SETUP_ROUTE,
} from '~routes/index';

import { getUserRolesForDomain } from '../../../transformers';

import styles from './ExtensionDetails.css';
import ExtensionActionButton from './ExtensionActionButton';
import ExtensionSetup from './ExtensionSetup';
import ExtensionStatus from './ExtensionStatus';

const MSG = defineMessages({
  title: {
    id: 'dashboard.Extensions.ExtensionDetails.title',
    defaultMessage: 'Extensions',
  },
  buttonAdd: {
    id: 'dashboard.Extensions.ExtensionDetails.buttonAdd',
    defaultMessage: 'Add',
  },
  status: {
    id: 'dashboard.Extensions.ExtensionDetails.status',
    defaultMessage: 'Status',
  },
  installedBy: {
    id: 'dashboard.Extensions.ExtensionDetails.installedBy',
    defaultMessage: 'Installed by',
  },
  dateCreated: {
    id: 'dashboard.Extensions.ExtensionDetails.dateCreated',
    defaultMessage: 'Date created',
  },
  dateInstalled: {
    id: 'dashboard.Extensions.ExtensionDetails.dateInstalled',
    defaultMessage: 'Date installed',
  },
  latestVersion: {
    id: 'dashboard.Extensions.ExtensionDetails.latestVersion',
    defaultMessage: 'Latest version',
  },
  versionInstalled: {
    id: 'dashboard.Extensions.ExtensionDetails.versionInstalled',
    defaultMessage: 'Version installed',
  },
  contractAddress: {
    id: 'dashboard.Extensions.ExtensionDetails.contractAddress',
    defaultMessage: 'Contract address',
  },
  developer: {
    id: 'dashboard.Extensions.ExtensionDetails.developer',
    defaultMessage: 'Developer',
  },
  permissionsNeeded: {
    id: 'dashboard.Extensions.ExtensionDetails.permissionsNeeded',
    defaultMessage: 'Permissions the extension needs in the colony:',
  },
  buttonUninstall: {
    id: 'dashboard.Extensions.ExtensionDetails.buttonUninstall',
    defaultMessage: 'Uninstall',
  },
  buttonDeprecate: {
    id: 'dashboard.Extensions.ExtensionDetails.buttonDeprecate',
    defaultMessage: 'Deprecate',
  },
  confirmDeprecate: {
    id: 'dashboard.Extensions.ExtensionDetails.confirmDeprecate',
    defaultMessage: 'Yes, deprecate extension',
  },
  textDeprecate: {
    id: 'dashboard.Extensions.ExtensionDetails.textDeprecate',
    defaultMessage: `This extension is currently active and it will be deprecated, not uninstalled immediately.`,
  },
  confirmUninstall: {
    id: 'dashboard.Extensions.ExtensionDetails.confirmUninstall',
    defaultMessage: 'Yes, uninstall extension',
  },
  textUninstall: {
    id: 'dashboard.Extensions.ExtensionDetails.textUninstall',
    defaultMessage: 'Do you really want to uninstall this extension?',
  },
  setup: {
    id: 'dashboard.Extensions.ExtensionDetails.setup',
    defaultMessage: 'Setup',
  },
});

const UserAvatar = HookedUserAvatar();

interface Props {
  colonyAddress: Address;
}

const ExtensionDetails = ({ colonyAddress }: Props) => {
  const { colonyName, extensionId } = useParams<{
    colonyName: string;
    extensionId: string;
  }>();
  const match = useRouteMatch();
  const onSetupRoute = useRouteMatch(COLONY_EXTENSION_SETUP_ROUTE);
  const { walletAddress } = useLoggedInUser();
  const { data, loading } = useColonyExtensionQuery({
    variables: { colonyAddress, extensionId },
  });

  const { data: colonyRolesData } = useColonyRolesQuery({
    variables: { address: colonyAddress },
  });

  const rootUserRoles = useTransformer(getUserRolesForDomain, [
    colonyRolesData && colonyRolesData.colony,
    walletAddress,
    ROOT_DOMAIN_ID,
  ]);

  if (loading) {
    return <SpinnerLoader appearance={{ theme: 'primary', size: 'massive' }} />;
  }

  const canInstall = rootUserRoles.includes(ColonyRole.Root);

  const installedExtension = data ? data.colonyExtension : null;
  const extension = extensionData[extensionId];

  let tableData;

  if (installedExtension) {
    tableData = [
      {
        label: MSG.status,
        value: <ExtensionStatus installedExtension={installedExtension} />,
      },
      {
        label: MSG.installedBy,
        value: (
          <span className={styles.installedBy}>
            <UserAvatar
              address={installedExtension.details.installedBy}
              size="xs"
              notSet={false}
            />
            <span className={styles.installedByAddress}>
              <MaskedAddress address={installedExtension.details.installedBy} />
            </span>
          </span>
        ),
      },
      {
        label: MSG.dateInstalled,
        value: <FormattedDate value={installedExtension.details.installedAt} />,
      },
      {
        label: MSG.versionInstalled,
        value: `v${extension.currentVersion}`,
      },
      {
        label: MSG.contractAddress,
        value: <CopyableAddress>{installedExtension.address}</CopyableAddress>,
      },
      {
        label: MSG.developer,
        value: 'Colony',
      },
    ];
  } else {
    tableData = [
      {
        label: MSG.status,
        value: <ExtensionStatus installedExtension={installedExtension} />,
      },
      {
        label: MSG.dateCreated,
        value: <FormattedDate value={extension.createdAt} />,
      },
      {
        label: MSG.latestVersion,
        value: `v${extension.currentVersion}`,
      },
      {
        label: MSG.developer,
        value: 'Colony',
      },
    ];
  }
  const extensionUrl = `/colony/${colonyName}/extensions/${extensionId}`;
  const breadCrumbs: Crumb[] = [
    [MSG.title, `/colony/${colonyName}/extensions`],
    [extension.name, match.url === extensionUrl ? '' : extensionUrl],
  ];
  if (match.path === COLONY_EXTENSION_SETUP_ROUTE) {
    breadCrumbs.push(MSG.setup);
  }
  return (
    <div className={styles.main}>
      <div>
        <BreadCrumb elements={breadCrumbs} />
        <hr className={styles.headerLine} />
        <div>
          <Switch>
            <Route
              exact
              path={COLONY_EXTENSION_DETAILS_ROUTE}
              component={() => (
                <div className={styles.extensionText}>
                  <Heading
                    tagName="h3"
                    appearance={{ size: 'medium', margin: 'small' }}
                    text={extension.name}
                  />
                  <FormattedMessage {...extension.description} />
                </div>
              )}
            />
            <Route
              exact
              path={COLONY_EXTENSION_SETUP_ROUTE}
              component={() => {
                if (
                  !canInstall ||
                  (installedExtension?.details.initialized &&
                    !installedExtension?.details.missingPermissions.length)
                ) {
                  return <Redirect to={extensionUrl} />;
                }
                return installedExtension ? (
                  <ExtensionSetup
                    extension={extension}
                    installedExtension={installedExtension}
                    colonyAddress={colonyAddress}
                  />
                ) : (
                  <Redirect to={extensionUrl} />
                );
              }}
            />
          </Switch>
        </div>
      </div>
      <aside>
        <div className={styles.extensionDetails}>
          <hr className={styles.headerLine} />
          {!onSetupRoute &&
            canInstall &&
            (!installedExtension?.details.initialized ||
              !!installedExtension?.details.missingPermissions.length) && (
              <div className={styles.buttonWrapper}>
                <ExtensionActionButton
                  colonyAddress={colonyAddress}
                  installedExtension={installedExtension}
                  extension={extension}
                />
              </div>
            )}
          <Table appearance={{ theme: 'lined' }}>
            <TableBody>
              {tableData.map(({ label, value }) => (
                <TableRow key={label.id}>
                  <TableCell className={styles.cellLabel}>
                    <FormattedMessage {...label} />
                  </TableCell>
                  <TableCell className={styles.cellData}>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {canInstall &&
          extension.uninstallable &&
          !installedExtension?.details.deprecated ? (
            <div className={styles.buttonUninstall}>
              <DialogActionButton
                dialog={ConfirmDialog}
                dialogProps={{
                  confirmButtonText: MSG.confirmDeprecate,
                  children: <FormattedMessage {...MSG.textDeprecate} />,
                }}
                appearance={{ theme: 'blue' }}
                submit={ActionTypes.COLONY_EXTENSION_DEPRECATE}
                error={ActionTypes.COLONY_EXTENSION_DEPRECATE_ERROR}
                success={ActionTypes.COLONY_EXTENSION_DEPRECATE_SUCCESS}
                text={MSG.buttonDeprecate}
                values={{ colonyAddress, extensionId }}
              />
            </div>
          ) : null}
          {canInstall &&
          extension.uninstallable &&
          installedExtension?.details.deprecated ? (
            <div className={styles.buttonUninstall}>
              <DialogActionButton
                dialog={ConfirmDialog}
                dialogProps={{
                  confirmButtonText: MSG.confirmUninstall,
                  children: <FormattedMessage {...MSG.textUninstall} />,
                }}
                appearance={{ theme: 'blue' }}
                submit={ActionTypes.COLONY_EXTENSION_UNINSTALL}
                error={ActionTypes.COLONY_EXTENSION_UNINSTALL_ERROR}
                success={ActionTypes.COLONY_EXTENSION_UNINSTALL_SUCCESS}
                text={MSG.buttonUninstall}
                values={{ colonyAddress, extensionId }}
              />
            </div>
          ) : null}
          <div className={styles.permissions}>
            <Heading
              appearance={{ size: 'normal' }}
              tagName="h4"
              text={MSG.permissionsNeeded}
            />
            {extension.neededColonyPermissions.map((permission: ColonyRole) => (
              <PermissionsLabel key={permission} permission={permission} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ExtensionDetails;
