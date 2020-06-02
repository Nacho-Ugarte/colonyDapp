import { combineReducers } from 'redux-immutable';

import { RootStateRecord } from '../modules/state';
import adminReducer from '../modules/admin/reducers';
import coreReducer from '../modules/core/reducers';
import usersReducer from '../modules/users/reducers';
import { ADMIN_NAMESPACE } from '../modules/admin/constants';
import { CORE_NAMESPACE } from '../modules/core/constants';
import { USERS_NAMESPACE } from '../modules/users/constants';

const createRootReducer = () =>
  combineReducers(
    {
      [ADMIN_NAMESPACE]: adminReducer,
      [CORE_NAMESPACE]: coreReducer,
      [USERS_NAMESPACE]: usersReducer,
    },
    () => new RootStateRecord(),
  );

export default createRootReducer;
