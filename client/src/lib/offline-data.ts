import type { Walkpath, Drivepath, Building, Staff, Floor, Room, Event } from "@shared/schema";
import baselineData from "./baseline-data.json";

const DATA_CACHE_NAME = 'iccat-data-v3';

let cachedBuildings: Building[] | null = null;
let cachedWalkpaths: Walkpath[] | null = null;
let cachedDrivepaths: Drivepath[] | null = null;
let cachedStaff: Staff[] | null = null;
let cachedFloors: Floor[] | null = null;
let cachedRooms: Room[] | null = null;
let cachedEvents: Event[] | null = null;

async function fetchWithCacheFallback<T>(
  url: string, 
  dataJsonKey: keyof typeof baselineData
): Promise<T> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch (fetchError) {
    console.log(`[OFFLINE] Fetch failed for ${url} (offline or network error), trying cache...`);
  }

  if (window.caches) {
    try {
      const cache = await window.caches.open(DATA_CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        console.log(`[OFFLINE] Retrieved ${url} from CacheStorage`);
        return await cachedResponse.json();
      }
    } catch (cacheError) {
      console.error(`[OFFLINE] CacheStorage error for ${url}:`, cacheError);
    }
  }

  console.log(`[OFFLINE] Using embedded baseline data for ${dataJsonKey}`);
  return baselineData[dataJsonKey] as T;
}

export async function getWalkpaths(): Promise<Walkpath[]> {
  if (cachedWalkpaths) {
    console.log('[OFFLINE] Using in-memory cached walkpaths');
    return cachedWalkpaths;
  }

  const walkpaths = await fetchWithCacheFallback<Walkpath[]>('/api/walkpaths', 'walkpaths');
  cachedWalkpaths = walkpaths;
  console.log('[OFFLINE] Loaded walkpaths:', walkpaths.length);
  return walkpaths;
}

export async function getDrivepaths(): Promise<Drivepath[]> {
  if (cachedDrivepaths) {
    console.log('[OFFLINE] Using in-memory cached drivepaths');
    return cachedDrivepaths;
  }

  const drivepaths = await fetchWithCacheFallback<Drivepath[]>('/api/drivepaths', 'drivepaths');
  cachedDrivepaths = drivepaths;
  console.log('[OFFLINE] Loaded drivepaths:', drivepaths.length);
  return drivepaths;
}

export async function getBuildings(): Promise<Building[]> {
  if (cachedBuildings) {
    console.log('[OFFLINE] Using in-memory cached buildings');
    return cachedBuildings;
  }

  const buildings = await fetchWithCacheFallback<Building[]>('/api/buildings', 'buildings');
  cachedBuildings = buildings;
  console.log('[OFFLINE] Loaded buildings:', buildings.length);
  return buildings;
}

export async function getStaff(): Promise<Staff[]> {
  if (cachedStaff) {
    console.log('[OFFLINE] Using in-memory cached staff');
    return cachedStaff;
  }

  const staff = await fetchWithCacheFallback<Staff[]>('/api/staff', 'staff');
  cachedStaff = staff;
  console.log('[OFFLINE] Loaded staff:', staff.length);
  return staff;
}

export async function getFloors(): Promise<Floor[]> {
  if (cachedFloors) {
    console.log('[OFFLINE] Using in-memory cached floors');
    return cachedFloors;
  }

  const floors = await fetchWithCacheFallback<Floor[]>('/api/floors', 'floors');
  cachedFloors = floors;
  console.log('[OFFLINE] Loaded floors:', floors.length);
  return floors;
}

export async function getRooms(): Promise<Room[]> {
  if (cachedRooms) {
    console.log('[OFFLINE] Using in-memory cached rooms');
    return cachedRooms;
  }

  const rooms = await fetchWithCacheFallback<Room[]>('/api/rooms', 'rooms');
  cachedRooms = rooms;
  console.log('[OFFLINE] Loaded rooms:', rooms.length);
  return rooms;
}

export async function getEvents(): Promise<Event[]> {
  if (cachedEvents) {
    console.log('[OFFLINE] Using in-memory cached events');
    return cachedEvents;
  }

  const events = await fetchWithCacheFallback<Event[]>('/api/events', 'events');
  cachedEvents = events;
  console.log('[OFFLINE] Loaded events:', events.length);
  return events;
}

export function clearAllCache() {
  cachedBuildings = null;
  cachedWalkpaths = null;
  cachedDrivepaths = null;
  cachedStaff = null;
  cachedFloors = null;
  cachedRooms = null;
  cachedEvents = null;
  console.log('[OFFLINE] All data cache cleared');
}

export function clearPathCache() {
  cachedWalkpaths = null;
  cachedDrivepaths = null;
  console.log('[OFFLINE] Path cache cleared');
}
