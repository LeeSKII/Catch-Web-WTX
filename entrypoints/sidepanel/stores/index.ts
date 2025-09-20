import { useDataStore } from './dataStore'
import { useUIStore } from './uiStore'
import { useSettingsStore } from './settingsStore'

// 创建全局store实例
export const dataStore = useDataStore()
export const uiStore = useUIStore()
export const settingsStore = useSettingsStore()

// 导出store hooks
export const useStores = () => ({
  dataStore,
  uiStore,
  settingsStore
})