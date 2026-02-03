'use client';

import { useState, useCallback, useSyncExternalStore, useMemo } from 'react';

const STORAGE_KEY = 'hug-jeonse-favorites';

function getStoredFavorites(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load favorites:', error);
  }
  return [];
}

function saveFavorites(favorites: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
  }
}

// Custom event for cross-tab sync
const FAVORITES_CHANGE_EVENT = 'favorites-change';

function subscribe(callback: () => void): () => void {
  window.addEventListener(FAVORITES_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(FAVORITES_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) || '[]';
}

function getServerSnapshot(): string {
  return '[]';
}

export function useFavorites() {
  const storeValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [, forceUpdate] = useState({});

  const favorites = useMemo(() => JSON.parse(storeValue) as number[], [storeValue]);
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const addFavorite = useCallback((propertyId: number) => {
    const current = getStoredFavorites();
    if (!current.includes(propertyId)) {
      const updated = [...current, propertyId];
      saveFavorites(updated);
      window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
      forceUpdate({});
    }
  }, []);

  const removeFavorite = useCallback((propertyId: number) => {
    const current = getStoredFavorites();
    const updated = current.filter(id => id !== propertyId);
    saveFavorites(updated);
    window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
    forceUpdate({});
  }, []);

  const toggleFavorite = useCallback((propertyId: number) => {
    const current = getStoredFavorites();
    if (current.includes(propertyId)) {
      const updated = current.filter(id => id !== propertyId);
      saveFavorites(updated);
    } else {
      const updated = [...current, propertyId];
      saveFavorites(updated);
    }
    window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
    forceUpdate({});
  }, []);

  const isFavorite = useCallback((propertyId: number) => {
    return favoritesSet.has(propertyId);
  }, [favoritesSet]);

  const clearFavorites = useCallback(() => {
    saveFavorites([]);
    window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
    forceUpdate({});
  }, []);

  return {
    favorites,
    favoritesSet,
    isLoaded: true,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    count: favorites.length,
  };
}
