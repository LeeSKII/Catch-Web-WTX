import { reactive, computed } from 'vue'
import type { ExtractedData } from '../types'

export const useDataStore = () => {
  const state = reactive({
    extractedData: { isBookmarked: false } as ExtractedData,
    isLoading: false,
    isPageLoading: false,
    lastError: null as string | null
  })

  const stats = computed(() => ({
    imagesCount: state.extractedData.images?.length || 0,
    linksCount: state.extractedData.links?.length || 0,
    wordsCount: state.extractedData.wordCount || 0,
  }))

  const actions = {
    updateExtractedData(data: ExtractedData) {
      // 保留原有的 isBookmarked 状态
      const currentIsBookmarked = state.extractedData.isBookmarked;
      state.extractedData = {
        ...data,
        isBookmarked: data.isBookmarked !== undefined ? data.isBookmarked : currentIsBookmarked
      };
    },
    
    setLoading(loading: boolean) {
      state.isLoading = loading
    },
    
    setPageLoading(loading: boolean) {
      state.isPageLoading = loading
    },
    
    setError(error: string | null) {
      state.lastError = error
    },
    
    clearData() {
      state.extractedData = { isBookmarked: false } as ExtractedData
      state.lastError = null
    }
  }

  return {
    state,
    stats,
    ...actions
  }
}