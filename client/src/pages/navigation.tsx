import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Navigation as NavigationIcon, TrendingUp, MapPin, Filter, Search, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import CampusMap from "@/components/campus-map";
import BuildingInfoModal from "@/components/building-info-modal";
import FloorPlanViewer from "@/components/floor-plan-viewer";
import GetDirectionsDialog from "@/components/get-directions-dialog";
import type { Building, NavigationRoute, Staff, Floor, Room } from "@shared/schema";
import { poiTypes, KIOSK_LOCATION } from "@shared/schema";
import { useGlobalInactivity } from "@/hooks/use-inactivity";
import { findShortestPath } from "@/lib/pathfinding";
import { getWalkpaths, getDrivepaths, getBuildings, getStaff, getFloors, getRooms } from "@/lib/offline-data";

export default function Navigation() {
  // Return to home after 3 minutes of inactivity
  useGlobalInactivity();
  const [selectedStart, setSelectedStart] = useState<Building | null | typeof KIOSK_LOCATION>(null);
  const [selectedEnd, setSelectedEnd] = useState<Building | null>(null);
  const [mode, setMode] = useState<'walking' | 'driving'>('walking');
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDirectionsDialog, setShowDirectionsDialog] = useState(false);
  const [directionsDestination, setDirectionsDestination] = useState<Building | null>(null);

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ['/api/buildings'],
    queryFn: getBuildings
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    queryFn: getStaff
  });

  const { data: floors = [] } = useQuery<Floor[]>({
    queryKey: ['/api/floors'],
    queryFn: getFloors
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
    queryFn: getRooms
  });

  useEffect(() => {
    setSelectedStart(KIOSK_LOCATION as any);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromId = params.get('from');
    const toId = params.get('to');
    const travelMode = params.get('mode') as 'walking' | 'driving';

    if (fromId && toId && buildings.length > 0) {
      const startBuilding = fromId === 'kiosk' 
        ? { ...KIOSK_LOCATION, description: null, departments: null, image: null, markerIcon: null }
        : buildings.find(b => b.id === fromId);
      const endBuilding = buildings.find(b => b.id === toId);

      if (startBuilding && endBuilding) {
        setSelectedStart(startBuilding as any);
        setSelectedEnd(endBuilding);
        if (travelMode === 'walking' || travelMode === 'driving') {
          setMode(travelMode);
        }
        
        setTimeout(async () => {
          try {
            const routePolyline = await calculateRouteClientSide(
              startBuilding as any,
              endBuilding,
              travelMode || 'walking'
            );

            if (!routePolyline) {
              console.error('Failed to calculate route');
              return;
            }

            const { steps, totalDistance } = generateSmartSteps(
              routePolyline,
              travelMode || 'walking',
              startBuilding.name,
              endBuilding.name
            );

            setRoute({
              start: startBuilding as any,
              end: endBuilding,
              mode: travelMode || 'walking',
              polyline: routePolyline,
              steps,
              totalDistance
            });
          } catch (error) {
            console.error('Error generating route:', error);
          }
        }, 100);
      }
    }
  }, [buildings]);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return (θ * 180 / Math.PI + 360) % 360;
  };

  const getTurnInstruction = (angleDiff: number, travelMode: string): { instruction: string; icon: string } => {
    const absAngle = Math.abs(angleDiff);
    const isWalking = travelMode === 'walking';
    const road = isWalking ? 'pathway' : 'road';

    if (absAngle < 20) {
      return { instruction: `Continue straight on the ${road}`, icon: 'straight' };
    } else if (absAngle < 45) {
      return {
        instruction: angleDiff > 0 ? `Slight right on the ${road}` : `Slight left on the ${road}`,
        icon: angleDiff > 0 ? 'slight-right' : 'slight-left'
      };
    } else if (absAngle < 135) {
      return {
        instruction: angleDiff > 0 ? `Turn right on the ${road}` : `Turn left on the ${road}`,
        icon: angleDiff > 0 ? 'right' : 'left'
      };
    } else if (absAngle < 165) {
      return {
        instruction: angleDiff > 0 ? `Sharp right on the ${road}` : `Sharp left on the ${road}`,
        icon: angleDiff > 0 ? 'sharp-right' : 'sharp-left'
      };
    } else {
      return { instruction: `Make a U-turn on the ${road}`, icon: 'u-turn' };
    }
  };

  const generateSmartSteps = (routePolyline: Array<{ lat: number; lng: number }>, travelMode: 'walking' | 'driving', startName: string, endName: string) => {
    const steps = [];
    let totalDist = 0;

    steps.push({
      instruction: `Start at ${startName}`,
      distance: '0 m',
      icon: 'start'
    });

    // Calculate bearings for each segment
    const bearings: number[] = [];
    for (let i = 0; i < routePolyline.length - 1; i++) {
      const bearing = calculateBearing(
        routePolyline[i].lat,
        routePolyline[i].lng,
        routePolyline[i + 1].lat,
        routePolyline[i + 1].lng
      );
      bearings.push(bearing);
    }

    // Generate turn-based directions
    let accumulatedDistance = 0;

    for (let i = 0; i < routePolyline.length - 1; i++) {
      const dist = calculateDistance(
        routePolyline[i].lat,
        routePolyline[i].lng,
        routePolyline[i + 1].lat,
        routePolyline[i + 1].lng
      );
      totalDist += dist;
      accumulatedDistance += dist;

      const isLastSegment = i === routePolyline.length - 2;
      
      // Check if there's a significant direction change
      let hasSignificantTurn = false;
      if (i < bearings.length - 1) {
        let angleDiff = bearings[i + 1] - bearings[i];
        // Normalize angle difference to -180 to 180
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        
        // Consider it a significant turn if angle change is more than 20 degrees
        hasSignificantTurn = Math.abs(angleDiff) >= 20;
        
        if (hasSignificantTurn || isLastSegment) {
          if (accumulatedDistance > 0 && !isLastSegment) {
            const turnInfo = getTurnInstruction(angleDiff, travelMode);
            steps.push({
              instruction: turnInfo.instruction,
              distance: `${Math.round(accumulatedDistance)} m`,
              icon: turnInfo.icon
            });
            accumulatedDistance = 0;
          }
        }
      }
    }

    // Add final segment if there's accumulated distance
    if (accumulatedDistance > 0) {
      const isWalking = travelMode === 'walking';
      steps.push({
        instruction: `Continue to destination on the ${isWalking ? 'pathway' : 'road'}`,
        distance: `${Math.round(accumulatedDistance)} m`,
        icon: 'straight'
      });
    }

    steps.push({
      instruction: `Arrive at ${endName}`,
      distance: '0 m',
      icon: 'end'
    });

    return { steps, totalDistance: `${Math.round(totalDist)} m` };
  };

  const calculateRouteClientSide = async (
    startBuilding: Building | typeof KIOSK_LOCATION,
    endBuilding: Building,
    travelMode: 'walking' | 'driving'
  ): Promise<Array<{ lat: number; lng: number }> | null> => {
    try {
      const paths = travelMode === 'walking' 
        ? await getWalkpaths()
        : await getDrivepaths();

      if (!paths || paths.length === 0) {
        console.error('[CLIENT] No paths available for pathfinding');
        return null;
      }

      const route = findShortestPath(
        startBuilding as Building,
        endBuilding,
        paths
      );

      return route;
    } catch (error) {
      console.error('[CLIENT] Error calculating route:', error);
      return null;
    }
  };

  const generateRoute = async () => {
    if (!selectedStart || !selectedEnd) return;

    try {
      const routePolyline = await calculateRouteClientSide(
        selectedStart,
        selectedEnd,
        mode
      );

      if (!routePolyline) {
        console.error('Failed to calculate route');
        return;
      }

      const { steps, totalDistance } = generateSmartSteps(
        routePolyline,
        mode,
        selectedStart.name,
        selectedEnd.name
      );

      setRoute({
        start: selectedStart,
        end: selectedEnd,
        mode,
        polyline: routePolyline,
        steps,
        totalDistance
      });
    } catch (error) {
      console.error('Error generating route:', error);
    }
  };

  const resetNavigation = () => {
    setSelectedStart(null);
    setSelectedEnd(null);
    setRoute(null);
  };

  const handleGetDirections = () => {
    if (selectedBuilding) {
      setDirectionsDestination(selectedBuilding);
      setShowDirectionsDialog(true);
    }
  };

  const handleNavigateFromDialog = async (startId: string, travelMode: 'walking' | 'driving') => {
    if (!directionsDestination) return;

    // Handle kiosk location or regular building
    const start = startId === 'kiosk' 
      ? KIOSK_LOCATION as any
      : buildings.find(b => b.id === startId);
    
    if (!start) return;

    // Set the navigation parameters
    setSelectedStart(start);
    setSelectedEnd(directionsDestination);
    setMode(travelMode);

    // Close modals
    setShowDirectionsDialog(false);
    setSelectedBuilding(null);

    // Generate the route
    try {
      const routePolyline = await calculateRouteClientSide(
        start,
        directionsDestination,
        travelMode
      );

      if (!routePolyline) {
        console.error('Failed to calculate route');
        return;
      }

      const { steps, totalDistance } = generateSmartSteps(
        routePolyline,
        travelMode,
        start.name,
        directionsDestination.name
      );

      setRoute({
        start,
        end: directionsDestination,
        mode: travelMode,
        polyline: routePolyline,
        steps,
        totalDistance
      });
    } catch (error) {
      console.error('Error generating route:', error);
    }
  };

  const buildingStaff = selectedBuilding
    ? staff.filter(s => s.buildingId === selectedBuilding.id)
    : [];

  const buildingFloors = selectedBuilding
    ? floors.filter(f => f.buildingId === selectedBuilding.id)
    : [];

  const floorRooms = selectedFloor
    ? rooms.filter(r => r.floorId === selectedFloor.id)
    : [];

  // Filter buildings by type and search query
  const filteredBuildings = buildings.filter(b => {
    const matchesType = filterType === "all" || b.type === filterType;
    const matchesSearch = searchQuery === "" || 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="bg-card border-b border-card-border p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Campus Navigation</h1>
              <p className="text-sm text-muted-foreground">Find your way around CVSU CCAT</p>
            </div>
          </div>
          <Link href="/staff">
            <Button variant="default" data-testid="button-staff-finder">
              <Users className="w-4 h-4 mr-2" />
              Staff Finder
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-96 bg-card md:border-r border-b md:border-b-0 border-card-border p-6 overflow-y-auto flex-shrink-0">
          {!route ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search Buildings
                </label>
                <Input
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-buildings"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter Map Markers
                </label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger data-testid="select-marker-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="all">All Types</SelectItem>
                    {poiTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Starting Point
                </label>
                <Select
                  value={selectedStart?.id}
                  onValueChange={(id) => {
                    if (id === 'kiosk') {
                      setSelectedStart(KIOSK_LOCATION as any);
                    } else {
                      const building = buildings.find(b => b.id === id);
                      setSelectedStart(building || null);
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-start">
                    <SelectValue placeholder="Select starting location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kiosk">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold">{KIOSK_LOCATION.name}</span>
                      </div>
                    </SelectItem>
                    {buildings.map(building => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Destination
                </label>
                <Select
                  value={selectedEnd?.id}
                  onValueChange={(id) => {
                    const building = buildings.find(b => b.id === id);
                    setSelectedEnd(building || null);
                  }}
                >
                  <SelectTrigger data-testid="select-destination">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(building => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Travel Mode
                </label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as 'walking' | 'driving')}>
                  <TabsList className="w-full">
                    <TabsTrigger value="walking" className="flex-1" data-testid="tab-walking">
                      Walking
                    </TabsTrigger>
                    <TabsTrigger value="driving" className="flex-1" data-testid="tab-driving">
                      Driving
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Button
                className="w-full"
                onClick={generateRoute}
                disabled={!selectedStart || !selectedEnd}
                data-testid="button-generate-route"
              >
                <NavigationIcon className="w-4 h-4 mr-2" />
                Generate Route
              </Button>

              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  {filterType === "all" ? "Available Buildings" : `${filterType} Locations`}
                </h3>
                <div className="space-y-2">
                  {filteredBuildings.length > 0 ? (
                    filteredBuildings.map(building => (
                      <div
                        key={building.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg hover-elevate cursor-pointer"
                        onClick={() => setSelectedBuilding(building)}
                        data-testid={`building-list-${building.id}`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground">{building.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{building.type}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No {filterType} locations found
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Route Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetNavigation}
                  data-testid="button-reset-navigation"
                >
                  Restart
                </Button>
              </div>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-medium text-foreground">{route.start.name}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-medium text-foreground">{route.end.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-medium text-foreground">{route.totalDistance}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground capitalize">{route.mode}</span>
                </div>
              </Card>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Directions</h4>
                <div className="space-y-3">
                  {route.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex gap-3"
                      data-testid={`route-step-${index}`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{step.instruction}</p>
                        <p className="text-xs text-muted-foreground">{step.distance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 overflow-hidden">
          <CampusMap
            buildings={filteredBuildings}
            onBuildingClick={setSelectedBuilding}
            selectedBuilding={selectedBuilding}
            routePolyline={route?.polyline}
            routeMode={route?.mode}
          />
        </main>
      </div>

      {selectedBuilding && (
        <BuildingInfoModal
          building={selectedBuilding}
          staff={buildingStaff}
          floors={buildingFloors}
          onClose={() => setSelectedBuilding(null)}
          onOpenFloorPlan={setSelectedFloor}
          onGetDirections={handleGetDirections}
        />
      )}

      {selectedFloor && (
        <FloorPlanViewer
          floor={selectedFloor}
          rooms={floorRooms}
          onClose={() => setSelectedFloor(null)}
        />
      )}

      <GetDirectionsDialog
        open={showDirectionsDialog}
        destination={directionsDestination}
        buildings={buildings}
        onClose={() => setShowDirectionsDialog(false)}
        onNavigate={handleNavigateFromDialog}
      />
    </div>
  );
}
