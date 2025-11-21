import React from "react";
import { Navigation, MapPin } from "lucide-react";
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
import type { Building } from "@shared/schema";
import { KIOSK_LOCATION } from "@shared/schema";

interface GetDirectionsDialogProps {
  open: boolean;
  destination: Building | null;
  buildings: Building[];
  onClose: () => void;
  onNavigate: (startId: string, mode: 'walking' | 'driving') => void;
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

  const handleNavigate = () => {
    if (selectedStart) {
      onNavigate(selectedStart, mode);
    }
  };

  return (
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
  );
}
