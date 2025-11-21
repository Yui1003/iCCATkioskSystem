import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertBuildingSchema,
  insertFloorSchema,
  insertRoomSchema,
  insertStaffSchema,
  insertEventSchema,
  insertWalkpathSchema,
  insertDrivepathSchema,
  insertSettingSchema,
  canHaveStaff,
  type POIType
} from "@shared/schema";
import { z } from "zod";
import { findShortestPath } from "./pathfinding";

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

const updateSettingSchema = z.object({
  value: z.string()
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const admin = await storage.getAdminByUsername(username);
      
      if (!admin || admin.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      res.json({ success: true, username: admin.username });
    } catch (error) {
      res.status(400).json({ error: 'Invalid request' });
    }
  });

  // Settings routes
  app.get('/api/settings/:key', async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch setting' });
    }
  });

  app.put('/api/settings/:key', async (req, res) => {
    try {
      const { value } = updateSettingSchema.parse(req.body);
      let setting = await storage.getSetting(req.params.key);
      if (!setting) {
        // Create if doesn't exist
        const data = insertSettingSchema.parse({ key: req.params.key, value, description: null });
        setting = await storage.createSetting(data);
      } else {
        // Update existing
        setting = await storage.updateSetting(req.params.key, value);
      }
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request body', details: error.errors });
      }
      res.status(400).json({ error: 'Failed to update setting' });
    }
  });

  app.get('/api/buildings', async (req, res) => {
    try {
      const buildings = await storage.getBuildings();
      res.json(buildings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch buildings' });
    }
  });

  app.get('/api/buildings/:id', async (req, res) => {
    try {
      const building = await storage.getBuilding(req.params.id);
      if (!building) {
        return res.status(404).json({ error: 'Building not found' });
      }
      res.json(building);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch building' });
    }
  });

  app.post('/api/buildings', async (req, res) => {
    try {
      const data = insertBuildingSchema.parse(req.body);
      const building = await storage.createBuilding(data);
      res.status(201).json(building);
    } catch (error) {
      res.status(400).json({ error: 'Invalid building data' });
    }
  });

  app.put('/api/buildings/:id', async (req, res) => {
    try {
      const data = insertBuildingSchema.parse(req.body);
      const building = await storage.updateBuilding(req.params.id, data);
      if (!building) {
        return res.status(404).json({ error: 'Building not found' });
      }
      res.json(building);
    } catch (error) {
      res.status(400).json({ error: 'Invalid building data' });
    }
  });

  app.delete('/api/buildings/:id', async (req, res) => {
    try {
      const success = await storage.deleteBuilding(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Building not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete building' });
    }
  });

  app.get('/api/floors', async (req, res) => {
    try {
      const floors = await storage.getFloors();
      res.json(floors);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch floors' });
    }
  });

  app.get('/api/floors/:id', async (req, res) => {
    try {
      const floor = await storage.getFloor(req.params.id);
      if (!floor) {
        return res.status(404).json({ error: 'Floor not found' });
      }
      res.json(floor);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch floor' });
    }
  });

  app.post('/api/floors', async (req, res) => {
    try {
      const data = insertFloorSchema.parse(req.body);
      const floor = await storage.createFloor(data);
      res.status(201).json(floor);
    } catch (error) {
      res.status(400).json({ error: 'Invalid floor data' });
    }
  });

  app.put('/api/floors/:id', async (req, res) => {
    try {
      const data = insertFloorSchema.parse(req.body);
      const floor = await storage.updateFloor(req.params.id, data);
      if (!floor) {
        return res.status(404).json({ error: 'Floor not found' });
      }
      res.json(floor);
    } catch (error) {
      res.status(400).json({ error: 'Invalid floor data' });
    }
  });

  app.delete('/api/floors/:id', async (req, res) => {
    try {
      const success = await storage.deleteFloor(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Floor not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete floor' });
    }
  });

  app.get('/api/rooms', async (req, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  });

  app.get('/api/rooms/:id', async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch room' });
    }
  });

  app.post('/api/rooms', async (req, res) => {
    try {
      const data = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(data);
      res.status(201).json(room);
    } catch (error) {
      res.status(400).json({ error: 'Invalid room data' });
    }
  });

  app.put('/api/rooms/:id', async (req, res) => {
    try {
      const data = insertRoomSchema.parse(req.body);
      const room = await storage.updateRoom(req.params.id, data);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      res.json(room);
    } catch (error) {
      res.status(400).json({ error: 'Invalid room data' });
    }
  });

  app.delete('/api/rooms/:id', async (req, res) => {
    try {
      const success = await storage.deleteRoom(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Room not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete room' });
    }
  });

  app.get('/api/staff', async (req, res) => {
    try {
      const staff = await storage.getStaff();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch staff' });
    }
  });

  app.get('/api/staff/:id', async (req, res) => {
    try {
      const staff = await storage.getStaffMember(req.params.id);
      if (!staff) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch staff member' });
    }
  });

  app.post('/api/staff', async (req, res) => {
    try {
      const data = insertStaffSchema.parse(req.body);
      
      // Validate that buildingId (if provided) belongs to a staff-allowed POI type
      if (data.buildingId) {
        const building = await storage.getBuilding(data.buildingId);
        if (!building) {
          return res.status(400).json({ error: 'Building not found' });
        }
        if (!canHaveStaff(building.type as POIType)) {
          return res.status(400).json({ 
            error: `Staff cannot be assigned to ${building.type} POI type. Allowed types: Building, Security Office / Campus Police, Gym / Sports Facility, Library, Administrative Office, Health Services / Clinic` 
          });
        }
      }
      
      const staff = await storage.createStaff(data);
      res.status(201).json(staff);
    } catch (error) {
      res.status(400).json({ error: 'Invalid staff data' });
    }
  });

  app.put('/api/staff/:id', async (req, res) => {
    try {
      const data = insertStaffSchema.parse(req.body);
      
      // Validate that buildingId (if provided) belongs to a staff-allowed POI type
      if (data.buildingId) {
        const building = await storage.getBuilding(data.buildingId);
        if (!building) {
          return res.status(400).json({ error: 'Building not found' });
        }
        if (!canHaveStaff(building.type as POIType)) {
          return res.status(400).json({ 
            error: `Staff cannot be assigned to ${building.type} POI type. Allowed types: Building, Security Office / Campus Police, Gym / Sports Facility, Library, Administrative Office, Health Services / Clinic` 
          });
        }
      }
      
      const staff = await storage.updateStaff(req.params.id, data);
      if (!staff) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      res.json(staff);
    } catch (error) {
      res.status(400).json({ error: 'Invalid staff data' });
    }
  });

  app.delete('/api/staff/:id', async (req, res) => {
    try {
      const success = await storage.deleteStaff(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Staff member not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete staff member' });
    }
  });

  app.get('/api/events', async (req, res) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  });

  app.post('/api/events', async (req, res) => {
    try {
      const data = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(data);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: 'Invalid event data' });
    }
  });

  app.put('/api/events/:id', async (req, res) => {
    try {
      const data = insertEventSchema.parse(req.body);
      const event = await storage.updateEvent(req.params.id, data);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: 'Invalid event data' });
    }
  });

  app.delete('/api/events/:id', async (req, res) => {
    try {
      const success = await storage.deleteEvent(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  app.get('/api/walkpaths', async (req, res) => {
    try {
      const walkpaths = await storage.getWalkpaths();
      res.json(walkpaths);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch walkpaths' });
    }
  });

  app.get('/api/walkpaths/:id', async (req, res) => {
    try {
      const walkpath = await storage.getWalkpath(req.params.id);
      if (!walkpath) {
        return res.status(404).json({ error: 'Walkpath not found' });
      }
      res.json(walkpath);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch walkpath' });
    }
  });

  app.post('/api/walkpaths', async (req, res) => {
    try {
      const data = insertWalkpathSchema.parse(req.body);
      const walkpath = await storage.createWalkpath(data);
      res.status(201).json(walkpath);
    } catch (error) {
      res.status(400).json({ error: 'Invalid walkpath data' });
    }
  });

  app.put('/api/walkpaths/:id', async (req, res) => {
    try {
      const data = insertWalkpathSchema.parse(req.body);
      const walkpath = await storage.updateWalkpath(req.params.id, data);
      if (!walkpath) {
        return res.status(404).json({ error: 'Walkpath not found' });
      }
      res.json(walkpath);
    } catch (error) {
      res.status(400).json({ error: 'Invalid walkpath data' });
    }
  });

  app.delete('/api/walkpaths/:id', async (req, res) => {
    try {
      const success = await storage.deleteWalkpath(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Walkpath not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete walkpath' });
    }
  });

  app.get('/api/drivepaths', async (req, res) => {
    try {
      const drivepaths = await storage.getDrivepaths();
      res.json(drivepaths);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch drivepaths' });
    }
  });

  app.get('/api/drivepaths/:id', async (req, res) => {
    try {
      const drivepath = await storage.getDrivepath(req.params.id);
      if (!drivepath) {
        return res.status(404).json({ error: 'Drivepath not found' });
      }
      res.json(drivepath);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch drivepath' });
    }
  });

  app.post('/api/drivepaths', async (req, res) => {
    try {
      const data = insertDrivepathSchema.parse(req.body);
      const drivepath = await storage.createDrivepath(data);
      res.status(201).json(drivepath);
    } catch (error) {
      res.status(400).json({ error: 'Invalid drivepath data' });
    }
  });

  app.put('/api/drivepaths/:id', async (req, res) => {
    try {
      const data = insertDrivepathSchema.parse(req.body);
      const drivepath = await storage.updateDrivepath(req.params.id, data);
      if (!drivepath) {
        return res.status(404).json({ error: 'Drivepath not found' });
      }
      res.json(drivepath);
    } catch (error) {
      res.status(400).json({ error: 'Invalid drivepath data' });
    }
  });

  app.delete('/api/drivepaths/:id', async (req, res) => {
    try {
      const success = await storage.deleteDrivepath(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Drivepath not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete drivepath' });
    }
  });

  const routeSchema = z.object({
    startId: z.string(),
    startLat: z.number().optional(),
    startLng: z.number().optional(),
    endId: z.string(),
    mode: z.enum(['walking', 'driving'])
  });

  app.post('/api/routes/calculate', async (req, res) => {
    try {
      const { startId, startLat, startLng, endId, mode } = routeSchema.parse(req.body);
      
      let startBuilding;
      if (startId === 'kiosk' && startLat !== undefined && startLng !== undefined) {
        startBuilding = {
          id: 'kiosk',
          name: 'Your Location (Kiosk)',
          lat: startLat,
          lng: startLng,
          type: 'Kiosk',
          description: null,
          departments: null,
          image: null,
          markerIcon: null
        };
      } else {
        startBuilding = await storage.getBuilding(startId);
      }
      
      const endBuilding = await storage.getBuilding(endId);
      
      if (!startBuilding || !endBuilding) {
        return res.status(404).json({ error: 'Building not found' });
      }

      const paths = mode === 'walking' 
        ? await storage.getWalkpaths()
        : await storage.getDrivepaths();

      const route = findShortestPath(startBuilding, endBuilding, paths);

      if (!route) {
        return res.status(404).json({ error: 'No route found' });
      }

      res.json({ route });
    } catch (error) {
      res.status(400).json({ error: 'Invalid request' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
