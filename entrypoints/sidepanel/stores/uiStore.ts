import { reactive } from 'vue'

export const useUIStore = () => {
  const state = reactive({
    currentTab: 'results',
    isDarkMode: false,
    showToast: false,
    toastMessage: '',
    toastType: 'info' as 'success' | 'error' | 'warning' | 'info'
  })

  const actions = {
    switchTab(tabName: string) {
      state.currentTab = tabName
    },
    
    toggleDarkMode() {
      state.isDarkMode = !state.isDarkMode
    },
    
    showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
      state.toastMessage = message
      state.toastType = type
      state.showToast = true
      setTimeout(() => {
        state.showToast = false
      }, 3000)
    }
  }

  return {
    state,
    ...actions
  }
}