class EPADataManager {
  constructor() {
    this.data = null;
    this.lastFetchTime = null;
  }

  async preloadData(forceRefresh = false) {
    try {
      const response = await fetch(`/api/epa${forceRefresh ? '?refresh=true' : ''}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const { data, last_fetch } = await response.json();
      this.data = data;
      this.lastFetchTime = last_fetch;
      
      return this.data;
    } catch (error) {
      console.error('Failed to fetch EPA data:', error);
      throw error;
    }
  }

  getData() {
    return this.data;
  }

  getLastFetchTime() {
    return this.lastFetchTime;
  }
}

export const epaDataManager = new EPADataManager(); 