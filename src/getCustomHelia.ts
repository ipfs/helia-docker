import { LevelBlockstore } from 'blockstore-level'
import { LevelDatastore } from 'datastore-level'
import { createHelia, type Helia, type HeliaInit } from 'helia'
import { bitswap, trustlessGateway } from 'helia/block-brokers'
import { USE_LIBP2P, FILE_BLOCKSTORE_PATH, FILE_DATASTORE_PATH, TRUSTLESS_GATEWAYS, USE_BITSWAP, USE_TRUSTLESS_GATEWAYS } from './constants.js'
import type { Libp2p } from '@libp2p/interface'

export async function getCustomHelia (): Promise<Helia> {
  const config: Partial<HeliaInit<Libp2p<any>>> = {
    blockBrokers: []
  }

  if (USE_BITSWAP) {
    config.blockBrokers?.push(bitswap())
  }

  if (TRUSTLESS_GATEWAYS != null && USE_TRUSTLESS_GATEWAYS) {
    config.blockBrokers?.push(trustlessGateway({ gateways: TRUSTLESS_GATEWAYS }))
  } else if (USE_TRUSTLESS_GATEWAYS) {
    config.blockBrokers?.push(trustlessGateway())
  }

  /**
   * TODO: Unblock support for custom blockstores and datastores, currently not working with docker due to volume mounting requirements.
   */
  if (FILE_BLOCKSTORE_PATH != null) {
    config.blockstore = new LevelBlockstore(FILE_BLOCKSTORE_PATH)
  }

  if (FILE_DATASTORE_PATH != null) {
    config.datastore = new LevelDatastore(FILE_DATASTORE_PATH)
  }

  if (!USE_LIBP2P) {
    config.libp2p = {
      start: false
    }
  }

  return createHelia(config)
}
