import { Conf } from 'electron-conf/main'
import type { LocationInfo } from '../renderer/src/lib/types'

export interface LocationsStore {
  locations: LocationInfo[]
  lastActiveZip: string | null
  hasLaunched: boolean
}

const DEFAULTS: LocationsStore = {
  locations: [],
  lastActiveZip: null,
  hasLaunched: false
}

// Singleton — one instance per electron-conf rule: "does not support multiple instances reading and writing the same config"
export const locationsConf = new Conf<LocationsStore>({ name: 'locations', defaults: DEFAULTS })
