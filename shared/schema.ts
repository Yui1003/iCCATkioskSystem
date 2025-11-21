import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// POI Types enum
export const poiTypes = [
  "Building",
  "Gate",
  "Canteen",
  "Food Stall",
  "Library",
  "Student Lounge",
  "Car Parking",
  "Motorcycle Parking",
  "Comfort Room",
  "Lecture Hall / Classroom",
  "Administrative Office",
  "Residence Hall / Dormitory",
  "Health Services / Clinic",
  "Gym / Sports Facility",
  "Auditorium / Theater",
  "Laboratory",
  "Faculty Lounge / Staff Room",
  "Study Area",
  "Bookstore",
  "ATM",
  "Chapel / Prayer Room",
  "Green Space / Courtyard",
  "Bus Stop / Shuttle Stop",
  "Bike Parking",
  "Security Office / Campus Police",
  "Waste / Recycling Station",
  "Water Fountain",
  "Print/Copy Center",
  "Other"
] as const;

export type POIType = typeof poiTypes[number];

// POI type subsets for feature gating
export const buildingDepartmentTypes = new Set<POIType>(["Building"]);

export const floorPlanEligibleTypes = new Set<POIType>([
  "Building",
  "Library",
  "Canteen",
  "Lecture Hall / Classroom",
  "Administrative Office",
  "Health Services / Clinic",
  "Gym / Sports Facility",
  "Laboratory"
]);

export const staffAllowedPOITypes = new Set<POIType>([
  "Building",
  "Security Office / Campus Police",
  "Gym / Sports Facility",
  "Library",
  "Administrative Office",
  "Health Services / Clinic"
]);

export const descriptionOnlyTypes = new Set<POIType>([
  "Gate",
  "Food Stall",
  "Student Lounge",
  "Car Parking",
  "Motorcycle Parking",
  "Bike Parking",
  "Comfort Room",
  "Auditorium / Theater",
  "Faculty Lounge / Staff Room",
  "Study Area",
  "Bookstore",
  "ATM",
  "Green Space / Courtyard",
  "Bus Stop / Shuttle Stop",
  "Waste / Recycling Station",
  "Water Fountain",
  "Print/Copy Center",
  "Other"
]);

// Helper predicates for POI type checking
export const canHaveDepartments = (type: POIType): boolean => buildingDepartmentTypes.has(type);
export const canHaveFloorPlan = (type: POIType): boolean => floorPlanEligibleTypes.has(type);
export const canHaveStaff = (type: POIType): boolean => staffAllowedPOITypes.has(type);
export const isDescriptionOnly = (type: POIType): boolean => descriptionOnlyTypes.has(type);

// Kiosk location constant - "You are Here" marker
export const KIOSK_LOCATION = {
  id: 'kiosk',
  name: 'Your Location (Kiosk)',
  lat: 14.403115555479292,
  lng: 120.86635977029803,
  type: 'Kiosk',
  description: null,
  departments: null,
  image: null,
  markerIcon: null
} as const;

// Buildings table
export const buildings = pgTable("buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("Building"),
  description: text("description"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  departments: text("departments").array(),
  image: text("image"),
  markerIcon: text("marker_icon").default("building"),
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({ id: true });
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Building = typeof buildings.$inferSelect;

// Floors table
export const floors = pgTable("floors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  floorNumber: integer("floor_number").notNull(),
  floorName: text("floor_name"),
  floorPlanImage: text("floor_plan_image"),
});

export const insertFloorSchema = createInsertSchema(floors).omit({ id: true });
export type InsertFloor = z.infer<typeof insertFloorSchema>;
export type Floor = typeof floors.$inferSelect;

// Rooms table
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  floorId: varchar("floor_id").notNull(),
  buildingId: varchar("building_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // classroom, office, lab, etc.
  description: text("description"),
  x: real("x").notNull(), // X position on floor plan
  y: real("y").notNull(), // Y position on floor plan
});

export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

// Staff table
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  position: text("position"),
  department: text("department"),
  buildingId: varchar("building_id"),
  floorId: varchar("floor_id"),
  roomId: varchar("room_id"),
  email: text("email"),
  phone: text("phone"),
  photo: text("photo"),
});

export const insertStaffSchema = createInsertSchema(staff).omit({ id: true });
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

// Event classification enum - PostgreSQL enum type
export const eventClassificationEnum = pgEnum("event_classification", ["Event", "Announcement", "Achievement"]);

// Event classification types for TypeScript
export const eventClassifications = [
  "Event",
  "Announcement",
  "Achievement"
] as const;

export type EventClassification = typeof eventClassifications[number];

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  time: text("time"),
  location: text("location"),
  buildingId: varchar("building_id"),
  image: text("image"),
  classification: eventClassificationEnum("classification").notNull().default("Event"),
});

export const insertEventSchema = createInsertSchema(events).omit({ id: true }).extend({
  classification: z.enum(eventClassifications).default("Event"),
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Walkpaths table - multi-node polylines for walking routes
export const walkpaths = pgTable("walkpaths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  nodes: jsonb("nodes").notNull(), // Array of {lat, lng} objects
});

export const insertWalkpathSchema = createInsertSchema(walkpaths).omit({ id: true });
export type InsertWalkpath = z.infer<typeof insertWalkpathSchema>;
export type Walkpath = typeof walkpaths.$inferSelect;

// Drivepaths table - multi-node polylines for driving routes
export const drivepaths = pgTable("drivepaths", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  nodes: jsonb("nodes").notNull(), // Array of {lat, lng} objects
});

export const insertDrivepathSchema = createInsertSchema(drivepaths).omit({ id: true });
export type InsertDrivepath = z.infer<typeof insertDrivepathSchema>;
export type Drivepath = typeof drivepaths.$inferSelect;

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Settings table - for app configuration (inactivity timeout, etc.)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// TypeScript interfaces for complex data structures
export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  icon: string;
}

export interface NavigationRoute {
  start: Building;
  end: Building;
  mode: 'walking' | 'driving';
  polyline: LatLng[];
  steps: RouteStep[];
  totalDistance: string;
}
