import { Address } from '~types/index';
import { log } from '~utils/debug';
import apolloCache from './cache';
import {
  UnsubscribeFromColonyMutationResult,
  SubscribeToColonyMutationResult,
  UserColoniesQuery,
  UserColoniesQueryVariables,
  UserColoniesDocument,
  ColonyMembersWithReputationQuery,
  ColonyMembersWithReputationQueryVariables,
  ColonyMembersWithReputationDocument,
  ProcessedColonyQuery,
  ProcessedColonyQueryVariables,
  ProcessedColonyDocument,
} from './generated';
import { ContextModule, TEMP_getContext } from '~context/index';

type Cache = typeof apolloCache;

const cacheUpdates = {
  unsubscribeFromColony(colonyAddress: Address) {
    return (cache: Cache, { data }: UnsubscribeFromColonyMutationResult) => {
      /*
       * Update the list of subscribed user, with reputation, but only for the
       * "All Domains" selection
       */
      try {
        if (data?.unsubscribeFromColony) {
          const {
            id: unsubscribedUserWalletAddress,
          } = data.unsubscribeFromColony;
          const cacheData = cache.readQuery<
            ColonyMembersWithReputationQuery,
            ColonyMembersWithReputationQueryVariables
          >({
            query: ColonyMembersWithReputationDocument,
            variables: {
              colonyAddress,
              /*
               * We only care about the "All Domains" entry here, since this is
               * the only one that displays all the subscribed colony members
               *
               * The other, actual domains, show all users that have reputation,
               * iregardless of wheter they're subscribed to the colony or not
               */
              domainId: 0,
            },
          });
          if (cacheData?.colonyMembersWithReputation) {
            const { colonyMembersWithReputation } = cacheData;
            // eslint-disable-next-line max-len
            const updatedUsersWithReputationList = colonyMembersWithReputation.filter(
              (userAddress) => !(userAddress === unsubscribedUserWalletAddress),
            );
            cache.writeQuery<
              ColonyMembersWithReputationQuery,
              ColonyMembersWithReputationQueryVariables
            >({
              query: ColonyMembersWithReputationDocument,
              data: {
                colonyMembersWithReputation: updatedUsersWithReputationList,
              },
              variables: {
                colonyAddress,
                domainId: 0,
              },
            });
          }
        }
      } catch (e) {
        log.verbose(e);
        log.verbose(
          'No se puede actualizar el caché de suscripciones de Colony - aún no se ha cargado',
        );
      }
      /*
       * Update the list of colonies the user is subscribed to
       * This is in use in the subscribed colonies component(s)
       */
      try {
        if (data?.unsubscribeFromColony) {
          const {
            id: unsubscribedUserWalletAddress,
          } = data.unsubscribeFromColony;
          const cacheData = cache.readQuery<
            UserColoniesQuery,
            UserColoniesQueryVariables
          >({
            query: UserColoniesDocument,
            variables: {
              address: unsubscribedUserWalletAddress,
            },
          });
          if (cacheData?.user?.processedColonies) {
            const {
              user: { processedColonies },
              user,
            } = cacheData;
            const updatedSubscribedColonies = processedColonies.filter(
              (subscribedColony) =>
                !(subscribedColony?.colonyAddress === colonyAddress),
            );
            cache.writeQuery<UserColoniesQuery, UserColoniesQueryVariables>({
              query: UserColoniesDocument,
              data: {
                user: {
                  ...user,
                  processedColonies: updatedSubscribedColonies,
                },
              },
              variables: {
                address: unsubscribedUserWalletAddress,
              },
            });
          }
        }
      } catch (e) {
        log.verbose(e);
        log.verbose(
          'No se puede actualizar el caché de suscripciones de Colony - aún no se ha cargado',
        );
      }
    };
  },
  subscribeToColony(colonyAddress: Address) {
    return async (cache: Cache, { data }: SubscribeToColonyMutationResult) => {
      const apolloClient = TEMP_getContext(ContextModule.ApolloClient);
      /*
       * Update the list of subscribed user, with reputation, but only for the
       * "All Domains" selection
       */
      try {
        if (data?.subscribeToColony) {
          const { id: subscribedUserAddress } = data.subscribeToColony;
          const cacheData = cache.readQuery<
            ColonyMembersWithReputationQuery,
            ColonyMembersWithReputationQueryVariables
          >({
            query: ColonyMembersWithReputationDocument,
            variables: {
              colonyAddress,
              /*
               * We only care about the "All Domains" entry here, since this is
               * the only one that displays all the subscribed colony members
               *
               * The other, actual domains, show all users that have reputation,
               * iregardless of wheter they're subscribed to the colony or not
               */
              domainId: 0,
            },
          });
          if (cacheData?.colonyMembersWithReputation) {
            const { colonyMembersWithReputation } = cacheData;
            const updatedUsersWithReputationList = [
              ...colonyMembersWithReputation,
              subscribedUserAddress,
            ];
            cache.writeQuery<
              ColonyMembersWithReputationQuery,
              ColonyMembersWithReputationQueryVariables
            >({
              query: ColonyMembersWithReputationDocument,
              data: {
                colonyMembersWithReputation: updatedUsersWithReputationList,
              },
              variables: {
                colonyAddress,
                domainId: 0,
              },
            });
          }
        }
      } catch (e) {
        log.verbose(e);
        log.verbose(
          'No se puede actualizar el caché de suscripciones de Colony - aún no se ha cargado',
        );
      }
      /*
       * Update the list of colonies the user is subscribed to
       * This is in use in the subscribed colonies component(s)
       */
      try {
        if (data?.subscribeToColony) {
          const { id: subscribedUserAddress } = data.subscribeToColony;
          const cacheData = cache.readQuery<
            UserColoniesQuery,
            UserColoniesQueryVariables
          >({
            query: UserColoniesDocument,
            variables: {
              address: subscribedUserAddress,
            },
          });
          if (cacheData?.user?.processedColonies) {
            const {
              user: { processedColonies },
              user,
            } = cacheData;
            let newlySubscribedColony;
            try {
              newlySubscribedColony = cache.readQuery<
                ProcessedColonyQuery,
                ProcessedColonyQueryVariables
              >({
                query: ProcessedColonyDocument,
                variables: {
                  address: colonyAddress,
                },
              });
            } catch (error) {
              const newColonyQuery = await apolloClient.query<
                ProcessedColonyQuery,
                ProcessedColonyQueryVariables
              >({
                query: ProcessedColonyDocument,
                variables: {
                  address: colonyAddress,
                },
              });
              newlySubscribedColony = newColonyQuery?.data;
            }
            if (newlySubscribedColony?.processedColony) {
              const updatedSubscribedColonies = [
                ...processedColonies,
                newlySubscribedColony.processedColony,
              ];
              cache.writeQuery<UserColoniesQuery, UserColoniesQueryVariables>({
                query: UserColoniesDocument,
                data: {
                  user: {
                    ...user,
                    processedColonies: updatedSubscribedColonies,
                  },
                },
                variables: {
                  address: subscribedUserAddress,
                },
              });
            }
          }
        }
      } catch (e) {
        log.verbose(e);
        log.verbose(
          'No se puede actualizar el caché de suscripciones de Colony - aún no se ha cargado',
        );
      }
    };
  },
};

export default cacheUpdates;
