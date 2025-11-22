import React from "react";
import { Navigation, MapPin, Car, Bike } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import type { Building, VehicleType } from "@shared/schema";
import { KIOSK_LOCATION } from "@shared/schema";

interface GetDirectionsDialogProps {
  open: boolean;
  destination: Building | null;
  buildings: Building[];
  onClose: () => void;
  onNavigate: (startId: string, mode: 'walking' | 'driving', vehicleType?: VehicleType) => void;
}

export default function GetDirectionsDialog({
  open,
  destination,
  buildings,
  onClose,
  onNavigate
}: GetDirectionsDialogProps) {
  const [selectedStart, setSelectedStart] = React.useState<string>("kiosk");
  const [mode, setMode] = React.useState<'walking' | 'driving'>('walking');
  const [showVehicleSelector, setShowVehicleSelector] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState<VehicleType | null>(null);

  // Reset vehicle selection when dialog opens with a new destination
  React.useEffect(() => {
    if (open) {
      setSelectedVehicle(null);
      setShowVehicleSelector(false);
      setSelectedStart("kiosk");
    }
  }, [open, destination]);

  const handleNavigate = () => {
    if (selectedStart) {
      if (mode === 'driving' && !selectedVehicle) {
        setShowVehicleSelector(true);
      } else {
        onNavigate(selectedStart, mode, selectedVehicle || undefined);
        onClose();
      }
    }
  };

  const handleVehicleSelection = (vehicle: VehicleType) => {
    setSelectedVehicle(vehicle);
    setShowVehicleSelector(false);
    onNavigate(selectedStart, mode, vehicle);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-get-directions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Get Directions
            </DialogTitle>
            <DialogDescription>
              Choose your starting point and travel mode to navigate to {destination?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Starting Point
              </label>
              <Select value={selectedStart} onValueChange={setSelectedStart}>
                <SelectTrigger data-testid="select-dialog-start">
                  <SelectValue placeholder="Select starting location" />
                </SelectTrigger>
                <SelectContent className="z-[1002]">
                  <SelectItem value="kiosk">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">{KIOSK_LOCATION.name}</span>
                    </div>
                  </SelectItem>
                  {buildings
                    .filter(b => b.id !== destination?.id)
                    .map(building => (
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
                  <TabsTrigger value="walking" className="flex-1" data-testid="dialog-tab-walking">
                    Walking
                  </TabsTrigger>
                  <TabsTrigger value="driving" className="flex-1" data-testid="dialog-tab-driving">
                    Driving
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-dialog-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNavigate}
                disabled={!selectedStart}
                className="flex-1"
                data-testid="button-dialog-navigate"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVehicleSelector} onOpenChange={setShowVehicleSelector}>
        <DialogContent className="sm:max-w-md z-[9999]" data-testid="dialog-directions-vehicle-selector">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Choose Your Vehicle
            </DialogTitle>
            <DialogDescription>
              Select the vehicle you'll be using to reach {destination?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <Button
              variant="outline"
              className="h-28 flex flex-col gap-2 hover-elevate active-elevate-2"
              onClick={() => handleVehicleSelection('car')}
              data-testid="button-directions-vehicle-car"
            >
              <Car className="w-8 h-8" />
              <span className="font-semibold">Car</span>
            </Button>

            <Button
              variant="outline"
              className="h-28 flex flex-col gap-2 hover-elevate active-elevate-2"
              onClick={() => handleVehicleSelection('motorcycle')}
              data-testid="button-directions-vehicle-motorcycle"
            >
              <Bike className="w-8 h-8" />
              <span className="font-semibold">Motorcycle</span>
            </Button>

            <Button
              variant="outline"
              className="h-28 flex flex-col gap-2 hover-elevate active-elevate-2"
              onClick={() => handleVehicleSelection('bike')}
              data-testid="button-directions-vehicle-bike"
            >
              <Bike className="w-8 h-8" />
              <span className="font-semibold">Bike</span>
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowVehicleSelector(false)}
              className="flex-1"
              data-testid="button-directions-vehicle-cancel"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
