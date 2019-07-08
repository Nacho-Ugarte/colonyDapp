/* @flow */

import type { Saga } from 'redux-saga';

import { call, put, takeEvery } from 'redux-saga/effects';
import nanoid from 'nanoid';

import type { Action } from '~redux';

import { putError, raceError } from '~utils/saga/effects';
import { filterUniqueAction } from '~utils/actions';
import { CONTEXT, getContext } from '~context';
import { ACTIONS } from '~redux';

import { uploadIpfsData } from '../actionCreators';

export function* ipfsUpload(data: string): Saga<string> {
  const id = nanoid();
  yield put(uploadIpfsData(data, id));

  const [
    {
      payload: { ipfsHash },
    },
    error,
  ] = yield raceError(
    filterUniqueAction(id, ACTIONS.IPFS_DATA_UPLOAD_SUCCESS),
    filterUniqueAction(id, ACTIONS.IPFS_DATA_UPLOAD_ERROR),
  );

  if (error) {
    throw new Error(error);
  }

  return ipfsHash;
}

function* ipfsDataUpload({
  meta,
  payload: { ipfsData },
}: Action<typeof ACTIONS.IPFS_DATA_UPLOAD>): Saga<*> {
  try {
    const ipfsNode = yield* getContext(CONTEXT.IPFS_NODE);

    const ipfsHash = yield call([ipfsNode, ipfsNode.addString], ipfsData);

    yield put<Action<typeof ACTIONS.IPFS_DATA_UPLOAD_SUCCESS>>({
      type: ACTIONS.IPFS_DATA_UPLOAD_SUCCESS,
      meta,
      payload: { ipfsHash, ipfsData },
    });
  } catch (error) {
    return yield putError(ACTIONS.IPFS_DATA_UPLOAD_ERROR, error, meta);
  }
  return null;
}

function* ipfsDataFetch({
  meta,
  payload: { ipfsHash },
}: Action<typeof ACTIONS.IPFS_DATA_FETCH>): Saga<*> {
  try {
    const ipfsNode = yield* getContext(CONTEXT.IPFS_NODE);
    const ipfsData = yield call([ipfsNode, ipfsNode.getString], ipfsHash);

    yield put<Action<typeof ACTIONS.IPFS_DATA_FETCH_SUCCESS>>({
      type: ACTIONS.IPFS_DATA_FETCH_SUCCESS,
      meta,
      payload: { ipfsHash, ipfsData },
    });
  } catch (error) {
    return yield putError(ACTIONS.IPFS_DATA_FETCH_ERROR, error, meta);
  }
  return null;
}

export default function* ipfsSagas(): Saga<void> {
  yield takeEvery(ACTIONS.IPFS_DATA_UPLOAD, ipfsDataUpload);
  yield takeEvery(ACTIONS.IPFS_DATA_FETCH, ipfsDataFetch);
}
