/* @flow */

import { combineReducers } from 'redux-immutable';

import allAdminsReducer from './allAdmins';
import allColoniesReducer from './allColonies';
import allCommentsReducer from './allComments';
import allDomainsReducer from './allDomains';
import allTokensReducer from './allTokens';
import tasksReducer from './tasks';

import {
  DASHBOARD_ALL_ADMINS,
  DASHBOARD_ALL_COLONIES,
  DASHBOARD_ALL_COMMENTS,
  DASHBOARD_ALL_DOMAINS,
  DASHBOARD_ALL_TOKENS,
  DASHBOARD_TASKS,
} from '../constants';

const dashboardReducer = combineReducers({
  [DASHBOARD_ALL_ADMINS]: allAdminsReducer,
  [DASHBOARD_ALL_COLONIES]: allColoniesReducer,
  [DASHBOARD_ALL_COMMENTS]: allCommentsReducer,
  [DASHBOARD_ALL_DOMAINS]: allDomainsReducer,
  [DASHBOARD_ALL_TOKENS]: allTokensReducer,
  [DASHBOARD_TASKS]: tasksReducer,
});

export default dashboardReducer;
